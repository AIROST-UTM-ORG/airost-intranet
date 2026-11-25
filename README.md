# AIROST intranet

Internal operations portal for AIROST club members, managing project boards, documentation spaces, authentication, and member profiles.

## Architecture

The system consists of three components:
- React single-page application (client) on port 3000.
- Express REST API (server) on port 4000.
- MongoDB database on port 27017.

## Local development

Follow the [developer setup guide](docs/developer-setup.md) to configure environment variables, run containers, seed mock data, and inspect logs.

Quick start with Docker Compose:

```bash
docker compose up --build
```

## Contributing and workflow

Refer to the project guidelines before opening pull requests or proposing changes:
- [Contributing guidelines](CONTRIBUTING.md) for branch naming rules, conventional commits, PR formats, and review approval policies.
- [Project context](AGENTS.md) for coding standards, project rules, and architectural expectations.

## Testing

Run tests from the respective package directory:

```bash
# Client tests
cd client && npm test

# Server tests
cd server && npm test
```
