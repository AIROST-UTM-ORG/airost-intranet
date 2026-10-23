# Deployment and infrastructure architecture

Guide for the deployment architecture, reverse proxy topologies, secret synchronization, and edge tunnel routing of the AIROST Intranet.

---

## 1. System topology overview

The AIROST intranet runs across three environments:
- **Local Development**: Docker Compose on developer workstations (`http://localhost:3000` client, `http://localhost:4000` server).
- **Staging**: Hosted on `ideacentre-a` (`https://intranet-staging.airost.dev`).
- **Production**: Hosted on `ideacentre-a` (`https://intranet.airost.dev`).

```
Internet / Cloudflare Edge (DNS & SSL)
                 │
                 ▼ Cloudflare Tunnel (QUIC)
          [cloudflared-core]
                 │ (proxy-net Docker Network)
   ┌─────────────┼────────────────────────────┐
   │             │                            │
   ▼             ▼                            ▼
[Client SPA]  [Express Server]          [Dopbase Vault]
(:80 Nginx)   (:8080 Node.js)           (:8840 Secrets API)
                 │
                 ▼ (internal network)
          [MongoDB Instance]
          (:27017 Database)
```

---

## 2. Ingress routing and reverse proxy rules

To support single-page applications without CORS issues or hardcoded hostnames, all public requests route through Cloudflare Tunnel ingress rules before hitting internal services:

### Cloudflare Tunnel ingress order

Rule priority is strictly top-to-bottom:

| Hostname | Path Matching | Target Service | Purpose |
| :--- | :--- | :--- | :--- |
| `intranet.airost.dev` | `^/api` | `http://airost-server-prod:8080` | Express REST API |
| `intranet.airost.dev` | `^/auth` | `http://airost-server-prod:8080` | Google OAuth & session authentication |
| `intranet.airost.dev` | `/*` (default) | `http://airost-client-prod:80` | React client HTML shell & static assets |
| `intranet-staging.airost.dev` | `^/api` | `http://airost-server-staging:8080` | Staging REST API |
| `intranet-staging.airost.dev` | `^/auth` | `http://airost-server-staging:8080` | Staging Google OAuth & sessions |
| `intranet-staging.airost.dev` | `/*` (default) | `http://airost-client-staging:80` | Staging React client & assets |
| `dopbase.airost.dev` | `/*` | `http://dopbase:8840` | Secret management web UI and API |
| `vault.airost.dev` | `/*` | `http://vaultwarden:80` | Password vault |

> [!IMPORTANT]
> Specific subpaths (`^/api` and `^/auth`) **must** appear before the root fallback `/*`. If the root rule is placed higher, Nginx intercepts backend requests and returns 404s for API and OAuth endpoints.

---

## 3. Client URL resolution: Relative routing

In production and staging, the client **must not** rely on a hardcoded build-time `REACT_APP_API_URL`.

- **Development**: Webpack dev server proxies or connects directly to `http://localhost:4000`.
- **Deployed Environments**: The client bundle uses relative paths (e.g. `/api/users`, `/auth/google`). This makes build artifacts environment-agnostic: the same container image runs without modification across development, staging, or production domains.

---

## 4. Google OAuth 2.0 configuration

Google OAuth requires exact URI matching for authentication callbacks.

### Authorized redirect URIs
In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- **Production**: `https://intranet.airost.dev/auth/google/callback`
- **Staging**: `https://intranet-staging.airost.dev/auth/google/callback`
- **Local Dev**: `http://localhost:4000/auth/google/callback`

### Server environment variables
When running behind HTTPS proxies:
- `COOKIE_SECURE=true` ensures the session cookie includes the `Secure` flag and `SameSite=None` or `Lax`.
- `REACT_APP_URL` must point to the canonical public origin (e.g. `https://intranet.airost.dev`).

---

## 5. Secret management with Dopbase

Project secrets are centrally stored and encrypted in the internal Dopbase instance (`https://dopbase.airost.dev`) under project `intranet`.

### Synchronizing secrets to Docker Stacks

On the deployment host (`ideacentre-a`):
- A runner token is saved in `/opt/stacks/core/dopbase-runner.env`.
- An automated synchronization script `/opt/stacks/sync-secrets.sh` exports live secrets via `dopbase export`.
- A systemd timer (`dopbase-sync.timer`) executes the sync on boot and every 15 minutes.

To trigger an immediate synchronization manually:
```bash
sudo systemctl start dopbase-sync.service
```
