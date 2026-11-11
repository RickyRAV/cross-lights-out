#!/usr/bin/env python3
"""Presentation mode for Lights Out: a throwaway local backend with demo data.

  python3 demo/demo.py up            start demo db + api (port 3010) and the Jolpica proxy
  python3 demo/demo.py seed [MIN]    accounts, group, graded past races, demo race locking in MIN minutes (default 10)
  python3 demo/demo.py lock          lock the demo race right now (reveals picks)
  python3 demo/demo.py finish        publish the demo race result; the real grading job scores it within ~1 min
  python3 demo/demo.py status        what's going on
  python3 demo/demo.py down          stop everything (data kept); `down --wipe` deletes the demo database

  python3 demo/demo.py app           start Metro with the app pointed at the demo api (Android emulator)
Never touches production.
"""
import json
import os
import random
import signal
import subprocess
import sys
import time
from datetime import datetime
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
STATE = HERE / ".state"
PROJECT = "lightsout-demo"
API = "http://localhost:3010/api/v1"
PROXY_PORT = 3011
JOLPICA = "https://api.jolpi.ca/ergast/f1"
DEMO_ROUND = "99"
DEMO_NAME = "Presentation Grand Prix"
DEMO_CIRCUIT = "FH Technikum Wien"
PASSWORD = "lightsout-demo"
USERS = [
    ("ricky@demo.lightsout.app", "Ricky"),
    ("nikola@demo.lightsout.app", "Nikola"),
    ("alex@demo.lightsout.app", "Alex"),
    ("mara@demo.lightsout.app", "Mara"),
    ("jonas@demo.lightsout.app", "Jonas"),
    ("lena@demo.lightsout.app", "Lena"),
]
ENV = {
    **os.environ,
    "API_PORT": "3010",
    "POSTGRES_PORT": "5440",
    "GRADING_INTERVAL_MINUTES": "1",
    "RACE_CALENDAR_CACHE_TTL_HOURS": "720",
    "JOLPICA_BASE_URL": f"http://host.docker.internal:{PROXY_PORT}",
    "LOG_LEVEL": "info",
}


def log(msg):
    print(msg, flush=True)


def compose(*args, capture=False):
    cmd = ["docker", "compose", "-p", PROJECT, "-f", str(REPO / "docker-compose.yml"), *args]
    return subprocess.run(cmd, env=ENV, check=True, text=True, capture_output=capture, timeout=600)


def sql(query):
    out = compose("exec", "-T", "db", "psql", "-U", "lightsout", "-d", "lightsout",
                  "-v", "ON_ERROR_STOP=1", "-At", "-c", query, capture=True)
    return out.stdout.strip()


def http(method, path, body=None, token=None, base=API):
    req = urllib.request.Request(base + path, method=method,
                                 data=None if body is None else json.dumps(body).encode())
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def season():
    return time.gmtime().tm_year


def demo_race_id():
    return f"{season()}-{DEMO_ROUND}"


# ---------- Jolpica proxy: real Jolpica, except the demo race's result ----------

class Proxy(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.split("?")[0].endswith(f"/{DEMO_ROUND}/results.json"):
            result_file = STATE / "demo-result.json"
            order = json.loads(result_file.read_text()) if result_file.exists() else None
            races = [] if order is None else [{
                "Results": [{"position": str(i + 1), "Driver": {"code": c, "driverId": c.lower()}}
                            for i, c in enumerate(order)]
            }]
            return self.reply(200, json.dumps({"MRData": {"RaceTable": {"Races": races}}}).encode())
        try:
            with urllib.request.urlopen(JOLPICA + self.path, timeout=30) as r:
                self.reply(r.status, r.read())
        except urllib.error.HTTPError as e:
            self.reply(e.code, e.read())
        except Exception:
            self.reply(502, b"{}")

    def reply(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def proxy_pid():
    pid_file = STATE / "proxy.pid"
    if not pid_file.exists():
        return None
    pid = int(pid_file.read_text())
    try:
        os.kill(pid, 0)
        return pid
    except OSError:
        return None


def start_proxy():
    if proxy_pid():
        return
    proc = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "_proxy"],
                            stdout=open(STATE / "proxy.log", "a"), stderr=subprocess.STDOUT,
                            start_new_session=True)
    (STATE / "proxy.pid").write_text(str(proc.pid))


# ---------- commands ----------

def cmd_up():
    STATE.mkdir(exist_ok=True)
    start_proxy()
    log("building and starting demo db + api (first run takes a few minutes)...")
    subprocess.run(["pnpm", "--filter", "@lightsout/shared", "build"], cwd=REPO, check=True,
                   capture_output=True, timeout=300)
    compose("up", "-d", "--build", "--wait")
    for _ in range(60):
        try:
            if http("GET", "/health")[0] == 200:
                log(f"demo api up at {API}")
                return
        except Exception:
            pass
        time.sleep(2)
    sys.exit("api did not become healthy, check: docker compose -p lightsout-demo logs api")


def auth_call(path, body):
    while True:
        status, reply = http("POST", path, body)
        if status != 429:
            return status, reply
        log("auth rate limit (5/min) hit, waiting a minute...")
        time.sleep(61)


def sign_in(email, name):
    status, body = auth_call("/auth/register", {"email": email, "password": PASSWORD, "displayName": name})
    if status == 409:
        status, body = auth_call("/auth/login", {"email": email, "password": PASSWORD})
    if status not in (200, 201):
        sys.exit(f"sign-in failed for {email}: {status} {body}")
    return body["accessToken"], body["user"]["id"]


def real_top10(race_id):
    year, rnd = race_id.split("-")
    with urllib.request.urlopen(f"{JOLPICA}/{year}/{rnd}/results.json", timeout=30) as r:
        races = json.loads(r.read())["MRData"]["RaceTable"]["Races"]
    if not races:
        return None
    results = sorted(races[0]["Results"], key=lambda x: int(x["position"]))
    return [x["Driver"]["code"] for x in results if x["Driver"].get("code")][:10]


def believable_pick(top10, rng):
    """A fan's guess: mostly the real front-runners, shuffled a bit."""
    pool = top10[:]
    for i in range(len(pool) - 1):
        if rng.random() < 0.55:
            j = min(len(pool) - 1, i + rng.choice([1, 1, 2, 3]))
            pool[i], pool[j] = pool[j], pool[i]
    return pool[:5]


def q(s):
    return "'" + s.replace("'", "''") + "'"


def cmd_seed(minutes):
    accounts = [(email, name, *sign_in(email, name)) for email, name in USERS]
    ricky_token = accounts[0][2]

    status, groups = http("GET", "/groups", token=ricky_token)
    if not groups:
        status, group = http("POST", "/groups", {"name": "Demo Paddock"}, token=ricky_token)
        if status not in (200, 201):
            sys.exit(f"group create failed: {status} {group}")
    else:
        group = groups[0]
    for _, _, token, _ in accounts[1:]:
        http("POST", "/groups/join", {"inviteCode": group["inviteCode"]}, token=token)

    status, races = http("GET", "/races", token=ricky_token)
    if status != 200:
        sys.exit(f"could not load the race calendar: {status} {races}")
    http("GET", "/drivers", token=ricky_token)

    now = time.time()
    def ts(r):
        return datetime.fromisoformat(r["lockoutAt"].replace("Z", "+00:00")).timestamp()

    past = sorted((r for r in races if r["raceId"].split("-")[1] != DEMO_ROUND and ts(r) < now),
                  key=ts)

    rng = random.Random(7)
    statements, graded_ids, last_top = [], [], None
    for race in past:
        top = real_top10(race["raceId"])
        if not top:
            continue
        last_top = top
        graded_ids.append(race["raceId"])
        for index, (_, _, _, user_id) in enumerate(accounts):
            if index > 0 and rng.random() < 0.15:
                continue
            pick = believable_pick(top, rng)
            statements.append(
                "INSERT INTO predictions (user_id, race_id, predicted_order, submitted_at, locked_at) VALUES "
                f"({q(user_id)}, {q(race['raceId'])}, {q(json.dumps(pick))}::jsonb, "
                f"{q(race['lockoutAt'])}::timestamptz - interval '1 day', {q(race['lockoutAt'])}::timestamptz) "
                "ON CONFLICT (user_id, race_id) DO NOTHING;")
    if graded_ids:
        ids = ", ".join(q(i) for i in graded_ids)
        # Let the real grading job (re)grade these races so their scores come from scoring.ts.
        statements.append(f"DELETE FROM race_results r WHERE r.race_id IN ({ids}) AND EXISTS ("
                          "SELECT 1 FROM predictions p LEFT JOIN scores s ON s.prediction_id = p.id "
                          "WHERE p.race_id = r.race_id AND s.id IS NULL);")

    demo_id = demo_race_id()
    (STATE / "demo-result.json").unlink(missing_ok=True)
    (STATE / "demo-top10.json").write_text(json.dumps(last_top or []))
    statements += [
        f"DELETE FROM scores WHERE prediction_id IN (SELECT id FROM predictions WHERE race_id = {q(demo_id)});",
        f"DELETE FROM predictions WHERE race_id = {q(demo_id)};",
        f"DELETE FROM race_results WHERE race_id = {q(demo_id)};",
        "INSERT INTO race_calendar (race_id, name, circuit, lockout_at, cached_at) VALUES "
        f"({q(demo_id)}, {q(DEMO_NAME)}, {q(DEMO_CIRCUIT)}, now() + interval '{int(minutes)} minutes', now()) "
        "ON CONFLICT (race_id) DO UPDATE SET lockout_at = excluded.lockout_at, cached_at = now();",
    ]
    if last_top:
        for _, _, _, user_id in accounts[1:-1]:
            pick = believable_pick(last_top, rng)
            statements.append(
                "INSERT INTO predictions (user_id, race_id, predicted_order, locked_at) VALUES "
                f"({q(user_id)}, {q(demo_id)}, {q(json.dumps(pick))}::jsonb, "
                f"(SELECT lockout_at FROM race_calendar WHERE race_id = {q(demo_id)}));")
    sql("BEGIN; " + " ".join(statements) + " COMMIT;")

    log(f"group 'Demo Paddock', invite code {group['inviteCode']}")
    log(f"accounts (password '{PASSWORD}'): " + ", ".join(e for e, *_ in USERS))
    log(f"past races with picks: {', '.join(graded_ids) or 'none'} (graded by the real job within ~1 min)")
    log(f"'{DEMO_NAME}' locks in {minutes} min. Everyone but Ricky and Lena has predicted.")


def cmd_lock():
    demo_id = demo_race_id()
    sql(f"UPDATE race_calendar SET lockout_at = now() WHERE race_id = {q(demo_id)}; "
        f"UPDATE predictions SET locked_at = now() WHERE race_id = {q(demo_id)};")
    log("demo race locked: picks are revealed on Race Detail (pull to refresh or reopen it)")


def cmd_finish():
    demo_id = demo_race_id()
    locked = sql(f"SELECT lockout_at <= now() FROM race_calendar WHERE race_id = {q(demo_id)}")
    if locked != "t":
        sys.exit("demo race hasn't locked yet: run `lock` first (grading only looks at locked races)")
    top = json.loads((STATE / "demo-top10.json").read_text() or "[]")
    order = believable_pick(top, random.Random(99)) if top else ["VER", "NOR", "LEC", "PIA", "HAM"]
    (STATE / "demo-result.json").write_text(json.dumps(order))
    log(f"result published: {' '.join(order)}")
    log("the API's grading job picks it up within ~60 s; Race Detail, History and Leaderboard update on their own")


def cmd_status():
    log(f"proxy: {'running' if proxy_pid() else 'stopped'}")
    try:
        log(f"api: {http('GET', '/health')[0]}")
    except Exception:
        log("api: down")
        return
    log(sql("SELECT race_id || '  lockout ' || to_char(lockout_at AT TIME ZONE 'Europe/Vienna', 'HH24:MI:SS') "
            "|| CASE WHEN lockout_at <= now() THEN '  (locked)' ELSE '' END "
            f"FROM race_calendar WHERE race_id = {q(demo_race_id())}") or "demo race: not seeded")
    log(sql("SELECT u.display_name || ': ' || coalesce(sum(s.points), 0) || ' pts' FROM users u "
            "LEFT JOIN predictions p ON p.user_id = u.id LEFT JOIN scores s ON s.prediction_id = p.id "
            "GROUP BY u.display_name ORDER BY 1"))


def cmd_down(wipe):
    pid = proxy_pid()
    if pid:
        os.kill(pid, signal.SIGTERM)
    compose("down", *(["-v"] if wipe else []))
    log("demo stopped" + (" and database wiped" if wipe else ""))


def main():
    args = sys.argv[1:] or ["help"]
    STATE.mkdir(exist_ok=True)
    match args[0]:
        case "_proxy":
            ThreadingHTTPServer(("0.0.0.0", PROXY_PORT), Proxy).serve_forever()
        case "up":
            cmd_up()
        case "seed":
            cmd_seed(int(args[1]) if len(args) > 1 else 10)
        case "lock":
            cmd_lock()
        case "finish":
            cmd_finish()
        case "app":
            os.execvpe("pnpm", ["pnpm", "--filter", "@lightsout/mobile", "start", "--clear"],
                       {**os.environ, "EXPO_PUBLIC_API_URL": "http://10.0.2.2:3010/api/v1"})
        case "status":
            cmd_status()
        case "down":
            cmd_down("--wipe" in args)
        case _:
            print(__doc__)


if __name__ == "__main__":
    main()
