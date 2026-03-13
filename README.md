# Health Services — Frontend

A full-featured web portal for the XYZ Health Services platform, built with Next.js 15, React 19, TypeScript, and Material UI 7. The UI consumes the Health Services REST API and supports three roles: Patient, Doctor, and Admin.

## Overview

- **Patient Portal** — appointment booking, history, profile management
- **Doctor Portal** — schedule management, availability slots, patient appointments
- **Admin Portal** — clinic & doctor management, slot administration, user oversight
- **Authentication** — JWT-based login / sign-up / password reset

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Component Library | MUI v7 (Material UI) |
| Language | TypeScript |
| Forms | React Hook Form + Zod |
| Date handling | Day.js + MUI X Date Pickers |
| Charts | ApexCharts + react-apexcharts |
| Icons | Phosphor Icons |
| HTTP Client | Axios (via centralised `apiClient`) |
| Package manager | pnpm |
| Containerisation | Docker (multi-stage build) |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Health Services backend running at `http://localhost:8000`

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/amanjogiris/health.git
cd health/health_frontend
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment**

Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Start the development server**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker

The backend's `docker-compose.yml` includes the frontend service. From `health_backend/`:

```bash
docker compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:8000   |

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server (hot reload) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm format:write` | Format all files with Prettier |

## Application Structure

### Pages

```
src/app/
├── auth/
│   ├── sign-in/          Login page
│   ├── sign-up/          Registration page
│   └── reset-password/   Password reset
└── dashboard/
    ├── page.tsx          Dashboard home / analytics
    ├── account/          User account settings
    ├── admins/           Admin user management
    ├── appointments/     Appointment list & management
    ├── clinics/          Clinic directory & management
    ├── customers/        Customer (patient) management
    ├── doctors/          Doctor directory & management
    ├── integrations/     Third-party integrations
    ├── patients/         Patient profiles
    └── settings/         Application settings
```

### Services (API Layer)

```
src/services/
├── apiClient.ts          Axios instance with JWT auth headers
├── authService.ts        Login, register, logout, profile
├── appointmentService.ts Booking, cancellation, listing
└── doctorService.ts      Doctor search, profile, availability
```

### Source Layout

```
health_frontend/
├── src/
│   ├── app/              Next.js App Router pages & layouts
│   ├── components/       Reusable UI components
│   ├── contexts/         React context providers (auth, etc.)
│   ├── hooks/            Custom React hooks
│   ├── lib/              Shared utilities and helpers
│   ├── services/         API client & service modules
│   ├── styles/           Global styles and theme
│   ├── types/            TypeScript type definitions
│   ├── config.ts         App-wide configuration constants
│   └── paths.ts          Centralised route path definitions
├── public/
│   └── assets/           Static images and icons
├── next.config.js        Next.js configuration
├── tsconfig.json         TypeScript configuration
├── eslint.config.mjs     ESLint configuration
├── prettier.config.mjs   Prettier configuration
├── Dockerfile            Multi-stage production image
└── pnpm-lock.yaml
```

## Authentication Flow

1. User submits credentials on `/auth/sign-in`
2. `authService.login()` calls `POST /api/v1/auth/login`
3. JWT is stored (auth context / local storage)
4. `apiClient` attaches `Authorization: Bearer <token>` to every request
5. On logout, `POST /api/v1/auth/logout` invalidates the token server-side

## Role-Based Navigation

| Role | Access |
|---|---|
| **Patient** | Dashboard, Appointments, Account |
| **Doctor** | Dashboard, Schedule, Appointments, Account |
| **Admin** | All pages including Clinics, Doctors, Patients, Admins, Settings |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable Next.js telemetry |

## Key Dependencies

```json
{
  "next": "15.3.3",
  "react": "19.1.0",
  "@mui/material": "7.1.1",
  "@mui/x-date-pickers": "8.5.1",
  "react-hook-form": "7.57.0",
  "zod": "3.25.57",
  "apexcharts": "4.7.0",
  "dayjs": "1.11.13",
  "@phosphor-icons/react": "2.1.10"
}
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MUI Documentation](https://mui.com/material-ui/)
- [Health Services API Docs](http://localhost:8000/docs)
- [Backend README](../health_backend/readme.md)

## License

This project is part of the ASCEND training program. UI components based on [Devias Material Kit React](https://devias.io) (MIT).

---

**Last Updated**: March 13, 2026  
**App Version**: 1.0.0

