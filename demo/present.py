"""Keeps the present backend full of data.

Runs next to the API in docker-compose.present.yml and does two jobs:
- serves as the API's Jolpica-F1 base URL, passing every request through to the real
  Jolpica-F1, except results for the Presentation Grand Prix rounds, which it makes up
  once a round is two minutes past lockout
- seeds six players in one group with picks for every finished race of the season, then
  keeps an upcoming Presentation Grand Prix every 15 minutes that the bots predict
"""
import json
import os
import random
import subprocess
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

API = os.environ.get("API_URL", "http://api:3000/api/v1")
JOLPICA = os.environ.get("JOLPICA_UPSTREAM", "https://api.jolpi.ca/ergast/f1")
PASSWORD = os.environ.get("PRESENT_PASSWORD", "lightsout-demo")
PORT = 8080
FIRST_DEMO_ROUND = 100
RESULT_DELAY_S = 120
CYCLE_MINUTES = 15
KEEP_FINISHED_DEMO_RACES = 4
UPCOMING_DEMO_RACES = 6
DEMO_NAME = "Presentation Grand Prix"
DEMO_CIRCUIT = "FH Technikum Wien"
HUMANS = [("ricky@demo.lightsout.app", "Ricky"), ("nikola@demo.lightsout.app", "Nikola")]
BOTS = [
    ("alex@demo.lightsout.app", "Alex"),
    ("mara@demo.lightsout.app", "Mara"),
    ("jonas@demo.lightsout.app", "Jonas"),
    ("lena@demo.lightsout.app", "Lena"),
]
LAZY_BOT = "Lena"

latest_top10 = []


def log(msg):
    print(msg, flush=True)


def sql(query):
    out = subprocess.run(["psql", "-v", "ON_ERROR_STOP=1", "-At", "-c", query],
                         check=True, text=True, capture_output=True, timeout=60)
    return out.stdout.strip()


def q(value):
    return "'" + str(value).replace("'", "''") + "'"


def http(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method,
                                 data=None if body is None else json.dumps(body).encode())
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def jolpica(path):
    with urllib.request.urlopen(JOLPICA + path, timeout=30) as r:
        return json.loads(r.read())


def round_of(race_id):
    return int(race_id.split("-")[1])


def believable_pick(top10, rng):
    pool = top10[:]
    for i in range(len(pool) - 1):
        if rng.random() < 0.55:
            j = min(len(pool) - 1, i + rng.choice([1, 1, 2, 3]))
            pool[i], pool[j] = pool[j], pool[i]
    return pool[:5]


# Jolpica-F1 stand-in

class Proxy(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        parts = self.path.split("?")[0].strip("/").split("/")
        if len(parts) == 3 and parts[2] == "results.json" and parts[1].isdigit() \
                and int(parts[1]) >= FIRST_DEMO_ROUND:
            return self.reply(200, json.dumps(demo_result(f"{parts[0]}-{parts[1]}")).encode())
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


def demo_result(race_id):
    lockout = sql(f"SELECT extract(epoch FROM lockout_at) FROM race_calendar WHERE race_id = {q(race_id)}")
    races = []
    if lockout and time.time() >= float(lockout) + RESULT_DELAY_S and latest_top10:
        order = believable_pick(latest_top10, random.Random(f"{race_id}-result"))
        races = [{"Results": [{"position": str(i + 1), "Driver": {"code": c, "driverId": c.lower()}}
                              for i, c in enumerate(order)]}]
    return {"MRData": {"RaceTable": {"Races": races}}}


# Seeding

def sign_in(email, name):
    body = {"email": email, "password": PASSWORD, "displayName": name}
    path = "/auth/register"
    while True:
        status, reply = http("POST", path, body)
        if status == 409 and path == "/auth/register":
            path, body = "/auth/login", {"email": email, "password": PASSWORD}
            continue
        if status == 429:
            time.sleep(61)
            continue
        if status in (200, 201):
            return reply["accessToken"], reply["user"]["id"]
        raise RuntimeError(f"sign-in failed for {email}: {status} {reply}")


def wait_for_api():
    while True:
        try:
            if http("GET", "/health")[0] == 200:
                return
        except Exception:
            pass
        time.sleep(3)


def seed():
    global latest_top10
    players = {}
    for email, name in HUMANS + BOTS:
        players[name] = sign_in(email, name)
    token = players["Ricky"][0]

    _, groups = http("GET", "/groups", token=token)
    group = groups[0] if groups else http("POST", "/groups", {"name": "Demo Paddock"}, token=token)[1]
    for name, (other, _) in players.items():
        if name != "Ricky":
            http("POST", "/groups/join", {"inviteCode": group["inviteCode"]}, token=other)

    _, races = http("GET", "/races", token=token)
    http("GET", "/drivers", token=token)

    now = datetime.now(timezone.utc)
    finished = sorted((r for r in races if round_of(r["raceId"]) < FIRST_DEMO_ROUND
                       and datetime.fromisoformat(r["lockoutAt"].replace("Z", "+00:00")) < now),
                      key=lambda r: r["lockoutAt"])

    rng = random.Random(7)
    statements, seeded = [], []
    for race in finished:
        year, rnd = race["raceId"].split("-")
        found = jolpica(f"/{year}/{rnd}/results.json")["MRData"]["RaceTable"]["Races"]
        if not found:
            continue
        results = sorted(found[0]["Results"], key=lambda x: int(x["position"]))
        top10 = [x["Driver"]["code"] for x in results if x["Driver"].get("code")][:10]
        latest_top10 = top10
        seeded.append(race["raceId"])
        for name, (_, user_id) in players.items():
            if name not in ("Ricky", "Nikola") and rng.random() < 0.15:
                continue
            statements.append(
                "INSERT INTO predictions (user_id, race_id, predicted_order, submitted_at, locked_at) VALUES "
                f"({q(user_id)}, {q(race['raceId'])}, {q(json.dumps(believable_pick(top10, rng)))}::jsonb, "
                f"{q(race['lockoutAt'])}::timestamptz - interval '1 day', {q(race['lockoutAt'])}::timestamptz) "
                "ON CONFLICT (user_id, race_id) DO NOTHING;")
    if seeded:
        # Races graded before their picks existed get graded again by the API's own job.
        statements.append(
            f"DELETE FROM race_results r WHERE r.race_id IN ({', '.join(q(i) for i in seeded)}) AND EXISTS ("
            "SELECT 1 FROM predictions p LEFT JOIN scores s ON s.prediction_id = p.id "
            "WHERE p.race_id = r.race_id AND s.id IS NULL);")
        sql("BEGIN; " + " ".join(statements) + " COMMIT;")
    log(f"seeded {len(seeded)} finished races for {len(players)} players, invite code {group['inviteCode']}")
    return {name: user_id for name, (_, user_id) in players.items()}


# Rolling Presentation Grand Prix

def keep_demo_race(user_ids):
    # The app caches the calendar for an hour, so keep more than an hour of demo races ahead.
    step = CYCLE_MINUTES * 60
    while True:
        upcoming = int(sql(f"SELECT count(*) FROM race_calendar WHERE name = {q(DEMO_NAME)} AND lockout_at > now()"))
        if upcoming >= UPCOMING_DEMO_RACES:
            break
        year = datetime.now(timezone.utc).year
        last = sql(f"SELECT max(split_part(race_id, '-', 2)::int) FROM race_calendar WHERE name = {q(DEMO_NAME)}")
        latest = sql(f"SELECT extract(epoch FROM max(lockout_at))::bigint FROM race_calendar "
                     f"WHERE name = {q(DEMO_NAME)} AND lockout_at > now()")
        race_id = f"{year}-{max(int(last or 0) + 1, FIRST_DEMO_ROUND)}"
        if latest:
            lockout = int(latest) + step
        else:
            lockout = (int(time.time()) // step + 1) * step
            if lockout - time.time() < 4 * 60:
                lockout += step
        statements = [
            "INSERT INTO race_calendar (race_id, name, circuit, lockout_at) VALUES "
            f"({q(race_id)}, {q(DEMO_NAME)}, {q(DEMO_CIRCUIT)}, to_timestamp({lockout}));"]
        rng = random.Random(race_id)
        for name, user_id in user_ids.items():
            if name in ("Ricky", "Nikola", LAZY_BOT):
                continue
            statements.append(
                "INSERT INTO predictions (user_id, race_id, predicted_order, locked_at) VALUES "
                f"({q(user_id)}, {q(race_id)}, {q(json.dumps(believable_pick(latest_top10, rng)))}::jsonb, "
                f"to_timestamp({lockout}));")
        sql("BEGIN; " + " ".join(statements) + " COMMIT;")
        log(f"{race_id} locks at {datetime.fromtimestamp(lockout, timezone.utc):%H:%M} UTC")

    old = (f"SELECT race_id FROM race_calendar WHERE name = {q(DEMO_NAME)} AND lockout_at <= now() "
           f"ORDER BY lockout_at DESC OFFSET {KEEP_FINISHED_DEMO_RACES}")
    sql("BEGIN; "
        f"DELETE FROM scores WHERE prediction_id IN (SELECT id FROM predictions WHERE race_id IN ({old})); "
        f"DELETE FROM predictions WHERE race_id IN ({old}); "
        f"DELETE FROM race_results WHERE race_id IN ({old}); "
        f"DELETE FROM race_calendar WHERE race_id IN ({old}); COMMIT;")


def main():
    threading.Thread(target=ThreadingHTTPServer(("0.0.0.0", PORT), Proxy).serve_forever,
                     daemon=True).start()
    wait_for_api()
    while True:
        try:
            user_ids = seed()
            break
        except Exception as error:
            log(f"seeding failed, retrying in 30 s: {error}")
            time.sleep(30)
    while True:
        try:
            keep_demo_race(user_ids)
        except Exception as error:
            log(f"demo race update failed: {error}")
        time.sleep(30)


if __name__ == "__main__":
    main()
