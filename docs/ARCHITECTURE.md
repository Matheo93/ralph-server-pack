# FamilyLoad Architecture

## Overview

FamilyLoad is a family task management application built with Next.js 15, designed to help parents share the mental load of managing household and child-related tasks.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun 1.3+ |
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL (via AWS RDS) |
| Cache | Redis (ElastiCache) |
| Storage | AWS S3 |
| Auth | AWS Cognito |
| Push Notifications | Firebase Cloud Messaging |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Validation | Zod |
| Testing | Vitest + Playwright |

## Directory Structure

```
familyload/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes (login, register)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── children/       # Child management
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── settings/       # User settings
│   │   │   └── tasks/          # Task management
│   │   ├── api/                # API routes
│   │   │   ├── notifications/  # Notification endpoints
│   │   │   ├── v1/             # Mobile REST API
│   │   │   └── vocal/          # Voice command processing
│   │   └── layout.tsx          # Root layout
│   │
│   ├── components/             # React components
│   │   ├── custom/             # App-specific components
│   │   └── ui/                 # shadcn/ui components
│   │
│   ├── hooks/                  # React hooks
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── useVocalRecording.ts # Voice recording
│   │   └── ...
│   │
│   ├── lib/                    # Utilities and services
│   │   ├── actions/            # Server actions
│   │   ├── api/                # API utilities
│   │   ├── auth/               # Auth helpers
│   │   ├── aws/                # AWS integrations
│   │   ├── constants/          # App constants & messages
│   │   ├── data/               # Static data (milestones, vaccines)
│   │   ├── firebase/           # Firebase configuration
│   │   ├── services/           # Business logic services
│   │   ├── validations/        # Zod schemas
│   │   └── vocal/              # Voice processing
│   │
│   ├── tests/                  # Unit tests
│   └── types/                  # TypeScript types
│
├── e2e/                        # End-to-end tests
├── public/                     # Static assets
└── docs/                       # Documentation
```

## Core Features

### 1. Task Management
- Create, update, delete tasks
- Assign to household members
- Categorize tasks (école, santé, quotidien, etc.)
- Priority levels and deadlines
- Voice command creation

### 2. Load Balancing
- Track task distribution between parents
- Detect imbalances (warning at 60%, critical at 70%)
- Suggest rebalancing
- Non-judgmental notifications

### 3. Child Timeline
- Track events per child
- Milestone tracking by age
- Vaccination calendar (French schedule)
- Birthday reminders

### 4. Voice Commands
- Record voice notes
- Transcribe via OpenAI Whisper
- Semantic analysis with GPT-4
- French date/time expression parsing
- Confidence scoring

### 5. Push Notifications
- Firebase Cloud Messaging
- Deadline reminders
- Streak risk alerts
- Balance warnings
- Task completion notifications

### 6. Mobile API (v1)
- RESTful API for Flutter app
- Bearer token authentication
- Rate limiting
- Offline sync support

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│   Next.js API   │────▶│   PostgreSQL    │
│   (React)       │◀────│   (Server)      │◀────│   (RDS)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │     Redis       │
                        │  (Cache/Rate)   │
                        └─────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│      S3         │   │   Firebase      │   │    OpenAI       │
│   (Storage)     │   │   (Push)        │   │   (Voice AI)    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## Security

### Authentication
- AWS Cognito for user authentication
- Session-based auth for web
- Bearer token auth for mobile API
- Token hashing in database

### Row-Level Security (RLS)
All tables use PostgreSQL RLS policies:
- Users can only access their household's data
- Automatic filtering by `current_user_id()`

### Input Validation
- All inputs validated with Zod schemas
- Parameterized SQL queries
- Rate limiting per user

## Performance Optimizations

### Server-Side
- Connection pooling for database
- Redis caching for frequent queries
- Background job processing

### Client-Side
- React Server Components by default
- Lazy loading for heavy components
- Optimistic UI updates
- Image optimization via Next.js

## Testing Strategy

### Unit Tests (Vitest)
- 750+ tests
- Business logic validation
- Schema validation
- Date parsing
- Load calculations

### E2E Tests (Playwright)
- Critical user flows
- Auth flows
- Task CRUD
- Voice recording

## Environment Variables

```bash
# Database
DATABASE_URL=
REDIS_URL=

# AWS
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=

# Auth
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# OpenAI
OPENAI_API_KEY=

# Cron
CRON_SECRET=
```

## API Endpoints

### Web API (Internal)
- `/api/vocal/*` - Voice processing
- `/api/notifications/*` - Notification management

### Mobile API (v1)
- `POST /api/v1/auth` - Login
- `PUT /api/v1/auth` - Refresh token
- `DELETE /api/v1/auth` - Logout
- `GET/POST /api/v1/tasks` - Task CRUD
- `GET/POST /api/v1/children` - Children CRUD
- `GET /api/v1/household` - Household info
- `POST /api/v1/sync` - Offline sync
- `GET /api/v1/docs` - OpenAPI spec

## Deployment

### Production
- Vercel for Next.js hosting
- AWS RDS for PostgreSQL
- AWS ElastiCache for Redis
- AWS S3 for file storage

### CI/CD
- GitHub Actions for testing
- Automatic deployment on main push
- Preview deployments for PRs

## Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass: `bun test src/tests/`
4. Run type check: `bunx tsc --noEmit`
5. Run build: `bun run build`
6. Submit PR with description
