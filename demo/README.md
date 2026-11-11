# Presentation mode

A separate local backend filled with a full season of data, so the whole app can be shown without waiting for a real race weekend. It never touches production.

- Its own Docker Compose project (`lightsout-demo`), with the API on port 3010 and Postgres on port 5440.
- Six players in one group ("Demo Paddock") who predicted the finished 2026 races. The grading job then scores those races against the real Jolpica-F1 results.
- A fake "Presentation Grand Prix" that locks a few minutes after seeding. Ricky and Lena haven't predicted it yet, everyone else has.
- A small local proxy in front of Jolpica-F1 that passes every request through, except the result of the fake race. That result appears once you run `finish`, so the normal grading job scores it like any other race.

## Run it

```sh
python3 demo/demo.py up        # start db, api and the proxy
python3 demo/demo.py seed 10   # data, demo race locks in 10 minutes
python3 demo/demo.py app       # Metro with the app pointed at the demo api
```

Sign in as `ricky@demo.lightsout.app` with the password `lightsout-demo`.

## During the demo

| Step                                      | Command                |
| ----------------------------------------- | ---------------------- |
| Lock the demo race now (reveals picks)    | `lock`                 |
| Publish its result (graded within ~1 min) | `finish`               |
| Check lockout time and points             | `status`               |
| Stop, keeping data / deleting it          | `down` / `down --wipe` |

Run `seed` again to reset the demo race.
