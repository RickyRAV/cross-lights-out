# Present mode

A second backend for live demos, full of data, so the whole app can be shown without waiting for a race weekend. It runs from `docker-compose.present.yml` on this branch with its own database and never touches production.

- Six players in the group "Demo Paddock" have picks for every finished 2026 race. The API's normal grading job scores them against the real Jolpica-F1 results.
- A "Presentation Grand Prix" is always coming up, locking every 15 minutes. Alex, Mara and Jonas predict it straight away, Lena never does, and Ricky and Nikola predict it live in the app. Two minutes after lockout it gets a result and is graded like any other race. Only the last four are kept.
- The `present` service sits between the API and Jolpica-F1. It passes everything through, except the results of those demo races.

Accounts: `ricky@demo.lightsout.app` and `nikola@demo.lightsout.app`, password `lightsout-demo`.

## Start the app in present mode

```sh
pnpm present         # deployed present backend, opens the Android emulator
pnpm present:local   # local one on port 3004
```

## Run it locally

```sh
docker compose -f docker-compose.present.yml up -d --build
docker compose -f docker-compose.present.yml logs -f present
```

Seeding takes about two minutes, because the API allows only five logins per minute.

## Deploy

1. In Coolify, add a new Docker Compose resource from `RickyRAV/cross-lights-out`, branch `demo/presentation-mode`, compose file `docker-compose.present.yml`. Leave Domains empty. Optionally set `PRESENT_JWT_SECRET` and `PRESENT_DB_PASSWORD`.
2. Add this router, middleware and service to `lightsout-backend.yml`, next to the production ones, and keep those unchanged. The priority has to be higher than the production router's 500, otherwise production also catches `/present`.

```yaml
http:
  routers:
    lightsout-present-router:
      rule: 'Host(`lightsout-api.w11core.cc`) && PathPrefix(`/present`)'
      priority: 1000
      service: lightsout-present-service
      middlewares:
        - geoblock@docker
        - crowdsec@docker
        - lightsout-present-strip
      entryPoints:
        - websecure
      tls:
        certResolver: cloudflare
        domains:
          - main: 'lightsout-api.w11core.cc'
  middlewares:
    lightsout-present-strip:
      stripPrefix:
        prefixes:
          - '/present'
  services:
    lightsout-present-service:
      loadBalancer:
        servers:
          - url: 'http://host.docker.internal:3004'
        passHostHeader: true
```

3. Check it with `curl https://lightsout-api.w11core.cc/present/api/v1/health`.
