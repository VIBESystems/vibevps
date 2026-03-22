# VIBEVps

**Open-source web dashboard for managing Proxmox VE hypervisors and virtual machines.**

VIBEVps is a project entirely built with [Claude Code](https://claude.ai/code) (Anthropic's AI coding agent). The source code, development rules, and architecture are documented in the [`CLAUDE.md`](./CLAUDE.md) file, which serves as a guide for Claude during development.

## Key Features

- Dashboard with overview of all hypervisors and VMs
- Full VM management: start, stop, restart, delete
- VM creation from templates with cloud-init configuration (hostname, static IP, DNS)
- Built-in web SSH console (xterm.js + WebSocket)
- Hypervisor filter on Dashboard, VM, and Template pages
- Responsive layout for mobile and tablet
- Built-in automatic update system (free, no license required)
- Real-time updates via WebSocket

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Fastify + TypeScript (ESM) |
| Frontend | React + Vite + TailwindCSS v4 |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| SSH Terminal | xterm.js + ssh2 |
| UI | Radix UI + custom components |

## Local Installation (Development)

```bash
# Clone the repository
cd vibevps

# Install dependencies
npm install

# Start in development mode (backend :3001 + frontend :5173)
npm run dev
```

Default credentials: `admin` / `admin123!`

## How to Contribute

VIBEVps is an open-source project built with Claude Code. The [`CLAUDE.md`](./CLAUDE.md) file contains all the rules, conventions, and architecture that Claude uses to generate code consistent with the project.

### Contribution Workflow

The process to add a new feature or fix is as follows:

#### 1. Develop and test locally

- Fork the repository
- Open Claude Code in the project directory — it will automatically read `CLAUDE.md`
- Describe to Claude the feature or fix you want to implement
- Claude will first create a technical specification in `docs/` and wait for your approval
- After implementation, **test everything locally** and verify it works correctly

#### 2. Generate the update package

Once the feature is tested and working:

- Ask Claude to generate the update package (version bump + build + zip)
- Claude will follow the semantic versioning rules defined in `CLAUDE.md`
- A zip file will be generated in `installer/updates/{VERSION}/` and the `manifest.json` will be updated

#### 3. Open a Pull Request

- Push your changes to your fork
- Open a PR to the main repository
- Clearly describe what you added/changed and how to test it

#### 4. Review and publication

- The project administrator will test the PR to verify:
  - That the code works correctly
  - That there are no vulnerabilities or malicious code
  - That the project conventions are respected
- Once approved, the PR is merged and the update is published on VIBEVault
- Users will receive the update automatically through the built-in system

> **Note:** The software is and will always remain free. This review process exists solely to ensure the security and quality of updates distributed to users in production.

## Project Structure

```
vibevps/
├── backend/          # Fastify API + TypeScript
│   └── src/
│       ├── server.ts           # Entry point
│       ├── config.ts           # Configuration
│       ├── db/                 # SQLite schema and database
│       ├── auth/               # JWT authentication
│       ├── hypervisors/        # Adapter pattern for Proxmox
│       ├── vms/                # VM management
│       ├── templates/          # VM templates
│       ├── updates/            # Update system
│       └── ws/                 # WebSocket hub
├── frontend/         # React + Vite + TailwindCSS
│   └── src/
│       ├── pages/              # App pages
│       ├── components/         # UI components
│       ├── store/              # Zustand stores
│       └── api/                # API client
├── installer/        # Build scripts and update packages
├── docs/             # Technical specs and documentation
└── CLAUDE.md         # Development rules for Claude Code
```

## License

Open-source — [MIT License](./LICENSE)
