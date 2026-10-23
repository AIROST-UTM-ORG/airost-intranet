# AIROST intranet

Internal operations portal for AIROST club members, managing project boards, documentation spaces, authentication, and member profiles.

## Architecture

The system consists of three primary components:

- **Client**: React single-page application built with Create React App and Tailwind CSS. Runs on port `3000`.
- **Server**: Express REST API with session authentication and Google OAuth 2.0. Runs on port `4000`.
- **Database**: MongoDB instance for member data, projects, and documents. Runs on port `27017`.

For details on production reverse proxy routing, Cloudflare Tunnel ingress rules, and secret management, see the [Deployment and infrastructure architecture guide](docs/deployment-and-network-architecture.md).

## Local development

Follow the step-by-step instructions in the developer guide to configure environment variables, run containers, seed mock data, and inspect logs:

- [Developer setup guide](docs/developer-setup.md)

Quick start with Docker Compose:

```bash
docker compose up --build
```

## Contributing and workflow

Refer to the project guidelines before opening pull requests or proposing changes:

- [Contributing guidelines](CONTRIBUTING.md) for branch naming rules, conventional commits, PR formats, and review approval policies.
- [Project context](AGENTS.md) for coding standards, project rules, and architectural expectations.
