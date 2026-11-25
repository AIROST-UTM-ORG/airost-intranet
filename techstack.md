# AIROST intranet tech stack and package management

Technical stack, packages, libraries, architecture, and deployment configurations used in the AIROST Intranet project.

---

## 1. High-level architecture

The repository is organized as a decoupled two-tier application containing a React Single Page Application (SPA) frontend and a Node.js / Express REST API backend.

```mermaid
graph TD
    subgraph Client ["Frontend (client/) - Port 3000"]
        UI["React 19 + Tailwind CSS + DaisyUI / Ant Design"]
        Router["React Router DOM v6"]
        State["Redux Toolkit + TanStack Query + AuthContext"]
        HTTP["Axios Client"]
    end

    subgraph Server ["Backend (server/) - Port 4000"]
        Express["Express.js Server"]
        Auth["Passport.js (Google OAuth 2.0)"]
        Session["Express Session + Connect-Mongo"]
        ORM["Mongoose ODM"]
        GAPI["Google APIs (Google Calendar SDK)"]
    end

    subgraph Cloud ["External Services"]
        Atlas[("MongoDB Atlas")]
        GoogleCloud["Google Cloud Platform (OAuth & Calendar API)"]
    end

    HTTP -->|REST Requests / JSON| Express
    Router --> UI
    State --> UI
    Express --> Auth
    Auth -->|OAuth Verification| GoogleCloud
    Express --> Session
    Session --> Atlas
    ORM --> Atlas
    GAPI -->|JWT Service Account| GoogleCloud
```

---

## 2. Frontend tech stack (client/)

- Directory: `client/`
- Configuration: `client/package.json`
- Dev port: 3000 (proxies to `http://localhost:4000/`)

### Core and framework
| Package | Version | Description |
| :--- | :--- | :--- |
| **React** | `^19.1.0` | Core UI library for component-based architecture. |
| **React DOM** | `^19.1.0` | React rendering engine for the web DOM. |
| **react-scripts** | `^5.0.1` | Create React App build pipeline, Webpack bundler, and Babel configuration. |

### Routing and navigation
| Package | Version | Description |
| :--- | :--- | :--- |
| **react-router-dom** | `^6.10.0` | Declarative routing, route protection (`RequireAuth`), and navigation. |

### State management and data fetching
| Package | Version | Description |
| :--- | :--- | :--- |
| **@reduxjs/toolkit** | `^2.6.1` | Modern Redux store for global complex state (such as Project Tracking boards). |
| **react-redux** | `^9.2.0` | React bindings for Redux. |
| **@tanstack/react-query** | `^5.32.0` | Server-state synchronization, caching, and mutation management. |
| **React Context API** | Native | Application-wide authentication state provider (`AuthProvider`). |

### UI, styling, and design systems
| Package | Version | Description |
| :--- | :--- | :--- |
| **tailwindcss** | `^3.4.3` | Utility-first CSS framework. |
| **daisyui** | `^4.10.2` | Tailwind CSS component library providing pre-styled utility components and themes. |
| **antd** | `^5.18.0` | Ant Design component system (used for Modals, inputs, and enterprise components). |
| **mdb-react-ui-kit** | `^6.0.0` | Material Design for Bootstrap React UI kit. |
| **framer-motion** | `^11.1.7` | Production-ready motion and gesture library for animations. |
| **react-icons** | `^4.12.0` | Unified icon library (Bootstrap Icons, FontAwesome, etc.). |

### Forms, rich text, and utilities
| Package | Version | Description |
| :--- | :--- | :--- |
| **axios** | `^1.5.1` | Promise-based HTTP client for REST API communication. |
| **react-hook-form** | `^7.51.4` | Form state management and validation. |
| **react-select** | `^5.7.7` | Flexible select and autocomplete input controls. |
| **react-quill** | `^2.0.0` | Rich text WYSIWYG editor for documentation creation. |
| **react-tailwindcss-datepicker** | `^1.6.6` | Date range picker designed for Tailwind CSS. |
| **date-fns** | `^3.1.0` | Modern JavaScript date utility library. |
| **moment** | `^2.30.1` | Legacy JavaScript date/time parser and formatter. |
| **lodash** | `^4.17.21` | Utility functions for array/object manipulation and debouncing. |
| **uuid** | `^11.1.0` | RFC-compliant UUID generator for unique IDs. |

---

## 3. Backend tech stack (server/)

- Directory: `server/`
- Configuration: `server/package.json`
- Dev port: 4000 (configured via `.env` or defaulting to `4000`)

### Runtime, server, and routing
| Package | Version | Description |
| :--- | :--- | :--- |
| **Node.js** | `>=18.0.0` | JavaScript runtime (Docker uses Node 18; local env runs Node 20/24). |
| **express** | `^4.18.2` | Minimal web framework for REST API endpoints. |
| **cors** | `^2.8.5` | Cross-Origin Resource Sharing middleware for client-server communication. |
| **dotenv** | `^16.3.1` | Environment variable loader from `.env` file. |
| **nodemon** | `^3.0.1` | Development utility to monitor file changes and restart the process. |

### Database and ODM
| Package | Version | Description |
| :--- | :--- | :--- |
| **MongoDB Atlas** | Cloud | Managed cloud NoSQL database cluster. |
| **mongoose** | `^6.10.0` | Object Data Modeling (ODM) library for MongoDB validation, models, and queries. |
| **mongodb** | `^5.7.0` | Official MongoDB native driver for Node.js. |

### Authentication and sessions
| Package | Version | Description |
| :--- | :--- | :--- |
| **passport** | `^0.5.3` | Authentication middleware for Node.js. |
| **passport-google-oauth20** | `^2.0.0` | Passport strategy for authenticating with Google OAuth 2.0. |
| **express-session** | `^1.17.3` | Session middleware for Express. |
| **connect-mongo** | `^5.0.0` | MongoDB-backed session storage for Express sessions. |
| **cookie-session** | `^2.1.0` | Cookie-based session handling utility. |

### Cloud integrations and external services
| Package | Version | Description |
| :--- | :--- | :--- |
| **googleapis** | `^130.0.0` | Official Google APIs client library (used for Google Calendar synchronization). |

---

## 4. Package management and deployment

### Monorepo setup
The project functions as an independent two-tier repository without monorepo tooling (no npm workspaces, Lerna, or Turborepo).
- Each package (`client/` and `server/`) maintains its own `package.json` and `package-lock.json`.
- Both directories require separate `npm install` runs before starting development.

### Development scripts

#### Backend (server/)
- `npm run dev`: starts the server using `nodemon` with `NODE_ENV=development`.
- `npm start`: runs `node server.js` directly.

#### Frontend (client/)
- `npm start`: starts React development server on port 3000 (`set PORT=3000 && react-scripts start`).
- `npm run build`: compiles production static assets via Webpack.
- `npm test`: runs unit and integration test suites using Jest and React Testing Library.

### Containerization and deployment
- Dockerfile: `server/Dockerfile`
- Target environment: Google Cloud Run
- Base image: `node:18`
- Production port: `8080`

---

## 5. Technical review and recommendations

1. Misplaced server dependencies:
   `@tanstack/react-query` and `git-filter-repo` are listed in `server/package.json`. These are frontend or maintenance tools and are not backend runtime dependencies.

2. Frontend UI library duplication:
   The client includes three UI frameworks: Tailwind CSS with DaisyUI, Ant Design, and MDB React UI Kit. Standardizing on Tailwind CSS and DaisyUI reduces bundle size and avoids style collisions.

3. Date library redundancy:
   Both `date-fns` and `moment` are installed. Migrating existing `moment` calls to `date-fns` removes the deprecated dependency.

4. Node.js version alignment:
   Local development environments run Node 20 or 24, while the production container targets Node 18. Aligning local engines or updating the Dockerfile to an updated LTS image ensures consistent runtime behavior.
