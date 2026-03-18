# Deployment Guide — Multi-Pod Setup

## TL;DR for 2-3 pods at your office

**You must use sticky sessions (session affinity) on your load balancer.**
Without it, real-time collaboration breaks silently across pods.

---

## Why sticky sessions are required

WebSocket connections and in-memory user state live inside each pod's process.
If User A connects to Pod 1 and User B connects to Pod 2, card updates from
User A won't reach User B — they're on different pods with separate WebSocket managers.

The database syncs between pods (cards are persisted), but live collaboration
(real-time card appearance, active user list) requires all users in a session
to land on the same pod.

### Kubernetes (nginx-ingress)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "retro-pod"
    nginx.ingress.kubernetes.io/session-cookie-expires: "172800"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "172800"
```

### nginx (standalone)

```nginx
upstream retro_backend {
    ip_hash;  # sticky by client IP
    server pod1:8000;
    server pod2:8000;
    server pod3:8000;
}
```

### DigitalOcean App Platform / Load Balancer

Enable "Sticky Sessions" in the load balancer settings. Set the cookie TTL
to at least 4 hours (longer than your longest retro session).

---

## Database considerations

The app uses SQLite. For multi-pod deployments:

### Single host (multiple containers on one machine)

Mount the same volume into all containers. SQLite's WAL mode + `busy_timeout`
handles concurrent reads well. Concurrent writes are serialized — fine for
a retro tool at low concurrency.

```yaml
# docker-compose.yml — all pods share one volume
services:
  retro-1:
    volumes:
      - retro-data:/data
  retro-2:
    volumes:
      - retro-data:/data
volumes:
  retro-data:
```

### Multi-node Kubernetes

SQLite over a network filesystem (NFS/EFS) has locking issues. For multi-node:

1. **Simplest:** Run a single pod with `replicas: 1` and a persistent volume.
   Use a liveness probe + restart policy for resilience. For a biweekly retro
   tool this is sufficient.

2. **Scalable:** Migrate to PostgreSQL. The schema is simple, the migration is
   straightforward. Replace `aiosqlite` with `asyncpg` and update `DATABASE_PATH`
   to a connection string.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `/data/retro.db` | SQLite file path |
| `SESSION_RETENTION_HOURS` | `336` (14 days) | How long to keep sessions |
| `MAX_CARDS_PER_SESSION` | `200` | Max cards per board |

---

## Recommended setup for your use case

- 2-3 pods behind nginx with `ip_hash` or cookie-based sticky sessions
- Shared volume for SQLite (single host)
- `SESSION_RETENTION_HOURS=336` (boards last 2 weeks — covers biweekly cadence)
- Teams share their retro URL in Slack at the start of each sprint
