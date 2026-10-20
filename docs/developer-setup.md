# Developer setup guide

Instructions to run, configure, seed, and troubleshoot the local AIROST intranet development stack.

## Prerequisites

Install the following dependencies before starting:

- **Docker and Docker Compose**: Docker Engine 24+ with Docker Compose v2.
- **Node.js and npm**: Node.js 20 LTS and npm 10+ if running tests or development scripts outside Docker.

## Environment configuration

The project uses `.env` files to configure runtime ports, database connections, and authentication secrets.

### 1. Root and server configuration

Copy the template from the project root:

```bash
cp .env.example .env
```

If running the backend directly on the host rather than inside Docker, create `server/.env`:

```bash
cp .env.example server/.env
```

Server variables:

| Variable | Default (Dev) | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port for the Express backend server. |
| `NODE_ENV` | `development` | Runtime environment mode. Set to `development` locally. |
| `MONGO_URI` | `mongodb://mongodb:27017/airost_intranet` | MongoDB connection URI. Use `mongodb://localhost:27017/airost_intranet` for host development. |
| `PASSPORT_SECRET` | `local_dev_passport_secret` | Secret used to sign session cookies. |
| `GOOGLE_CLIENT_ID` | Empty | Google OAuth 2.0 client ID for member authentication. |
| `GOOGLE_CLIENT_SECRET` | Empty | Google OAuth 2.0 client secret. |
| `REACT_APP_URL` | `http://localhost:3000` | Frontend URL allowed for CORS and OAuth redirection. |
| `COOKIE_SECURE` | `false` | Cookie secure attribute. Keep `false` for local HTTP. |
| `CALENDAR_ID` | `none` | Optional Google Calendar ID. |
| `CREDENTIALS` | `{}` | Optional Google Calendar service account JSON string. |

Never commit `.env` files or real credentials to Git.

### 2. Client configuration

The client container connects to the backend API via `REACT_APP_API_URL`. When developing the frontend on your host machine without Docker, create `client/.env`:

```bash
cat <<EOF > client/.env
PORT=3000
REACT_APP_API_URL=http://localhost:4000
EOF
```

Client variables:

| Variable | Default (Dev) | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the React development server. |
| `REACT_APP_API_URL` | `http://localhost:4000` | Backend API base URL consumed by axios calls. |
| `CHOKIDAR_USEPOLLING` | `true` | Enables polling for file changes inside container volumes. |
| `WDS_SOCKET_PORT` | `0` | Webpack Dev Server WebSocket port for hot reloading. |

## Starting the environment

Spin up the complete development environment with Docker Compose:

```bash
docker compose up --build
```

Compose launches three services:

1. **MongoDB**: Database engine listening on port `27017`.
2. **Server**: Node.js backend listening on port `4000`.
3. **Client**: React frontend with hot reload listening on port `3000`.

### Verifying running services

Check container status:

```bash
docker compose ps
```

Visit the application endpoints in your browser:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- MongoDB: `localhost:27017`

To stop all running containers:

```bash
docker compose down
```

## Database management

The database uses MongoDB with Mongoose. Collections are initialized automatically when documents are written.

### Seeding mock data

To sign in or test administrative workflows locally, insert a verified user into MongoDB:

```bash
docker compose exec mongodb mongosh airost_intranet --eval '
db.verifiedusers.insertOne({
  name: "Dev Admin",
  email: "admin@airost.org",
  position: ["admin"]
});
'
```

To seed a sample project:

```bash
docker compose exec mongodb mongosh airost_intranet --eval '
db.projects.insertOne({
  projectId: 1,
  title: "AIROST Portal",
  description: "Internal intranet platform for club management.",
  status: "In Progress"
});
'
```

Verify seeded documents:

```bash
docker compose exec mongodb mongosh airost_intranet --eval 'db.verifiedusers.find()'
```

### Resetting the database

To wipe the local database completely, remove the persistent volume:

```bash
docker compose down -v
```

Alternatively, drop the database from inside `mongosh` without restarting containers:

```bash
docker compose exec mongodb mongosh airost_intranet --eval 'db.dropDatabase()'
```

## Troubleshooting

### Port collisions

If a service fails to start because a port is occupied:

1. **Port 3000 occupied**:
   Identify the process:
   ```bash
   lsof -i :3000
   ```
   Terminate the conflicting process:
   ```bash
   kill -9 <PID>
   ```

2. **Port 4000 occupied**:
   Identify and stop the conflicting backend process:
   ```bash
   lsof -i :4000
   kill -9 <PID>
   ```

3. **Port 27017 occupied**:
   A local MongoDB instance may already be running on your system. Stop it with:
   ```bash
   sudo systemctl stop mongod
   ```

### Inspecting container logs

Follow container logs in real time:

```bash
# View all logs
docker compose logs -f

# View backend server logs
docker compose logs -f server

# View frontend client logs
docker compose logs -f client

# View MongoDB logs
docker compose logs -f mongodb
```

### Rebuilding specific services

When dependencies change in `package.json`, rebuild the target container:

```bash
docker compose up -d --build server
docker compose up -d --build client
```
