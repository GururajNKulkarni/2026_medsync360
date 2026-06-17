# MedSync 360

Medical referral management platform for hospital departments.

## Documentation

| Document | Description |
|----------|-------------|
| [REFERRAL_AND_MEDICATION_JOURNEY.md](docs/REFERRAL_AND_MEDICATION_JOURNEY.md) | **Referral lifecycle, medication journey, DB tables, setup SQL, flow diagrams** |
| [MEDSYNC_PROJECT_DOCUMENTATION.md](docs/MEDSYNC_PROJECT_DOCUMENTATION.md) | Full project documentation |

## Quick Start

```bash
npm install
npm run dev
```

## Environment Variables
Create a `.env` file in the project root using the following keys (see `.env.example` if present):

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=service_role_key
VITE_SENTRY_DSN=your_sentry_dsn
```
