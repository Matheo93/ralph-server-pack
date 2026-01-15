# FamilyLoad Setup Guide

## Prerequisites

- [Bun](https://bun.sh/) 1.3+
- [Node.js](https://nodejs.org/) 20+ (for some tools)
- PostgreSQL 15+ or access to AWS RDS
- Redis (local or ElastiCache)
- AWS account (S3, Cognito)
- Firebase project
- OpenAI API key

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/familyload.git
cd familyload
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in the required values (see Environment Variables section below).

### 4. Database Setup

Run the migrations:

```bash
bun run db:migrate
```

Seed initial data (optional):

```bash
bun run db:seed
```

### 5. Start Development Server

```bash
bun run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL="postgresql://user:password@localhost:5432/familyload"
REDIS_URL="redis://localhost:6379"

# =============================================================================
# AWS
# =============================================================================
AWS_REGION="eu-west-3"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="familyload-uploads"

# =============================================================================
# COGNITO (Authentication)
# =============================================================================
COGNITO_USER_POOL_ID="eu-west-3_xxxxx"
COGNITO_CLIENT_ID="your-client-id"
COGNITO_CLIENT_SECRET="your-client-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# =============================================================================
# FIREBASE (Push Notifications)
# =============================================================================
FIREBASE_PROJECT_ID="familyload-xxxxx"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@familyload.iam.gserviceaccount.com"

# =============================================================================
# OPENAI (Voice Commands)
# =============================================================================
OPENAI_API_KEY="sk-xxxxx"

# =============================================================================
# CRON (Scheduled Jobs)
# =============================================================================
CRON_SECRET="your-secure-cron-secret"
```

## Local Database Setup

### Option 1: PostgreSQL via Docker

```bash
docker run --name familyload-db \
  -e POSTGRES_USER=familyload \
  -e POSTGRES_PASSWORD=familyload \
  -e POSTGRES_DB=familyload \
  -p 5432:5432 \
  -d postgres:15
```

### Option 2: Local PostgreSQL

```bash
createdb familyload
psql familyload < schema.sql
```

### Redis via Docker

```bash
docker run --name familyload-redis \
  -p 6379:6379 \
  -d redis:7
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
bun test src/tests/

# Run specific test file
bun test src/tests/assignment.test.ts

# Run with coverage
bun test --coverage
```

### E2E Tests

```bash
# Install Playwright browsers
bunx playwright install

# Run E2E tests
bun run test:e2e
```

### Type Check

```bash
bunx tsc --noEmit
```

## Building for Production

```bash
# Build the application
bun run build

# Start production server
bun run start
```

## Common Tasks

### Add a new API endpoint

1. Create route file in `src/app/api/`
2. Add Zod validation schema in `src/lib/validations/`
3. Write tests in `src/tests/`
4. Update API documentation

### Add a new component

1. Create component in `src/components/custom/`
2. Use `'use client'` directive only if needed
3. Import UI components from `@/components/ui`
4. Follow naming convention: `PascalCase.tsx`

### Add a new server action

1. Create in `src/lib/actions/`
2. Add `'use server'` directive
3. Validate inputs with Zod
4. Handle errors gracefully
5. Write tests

### Add a new database table

1. Create migration SQL in `src/lib/aws/`
2. Add RLS policies
3. Create TypeScript types in `src/types/`
4. Update relevant services

## Troubleshooting

### Build fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
bun install
bun run build
```

### Tests fail

```bash
# Check TypeScript errors first
bunx tsc --noEmit

# Run specific failing test with verbose output
bun test src/tests/problematic.test.ts --verbose
```

### Database connection issues

1. Verify `DATABASE_URL` is correct
2. Check if database is running
3. Verify network access (firewall, VPN)
4. Check connection pooling limits

### Redis connection issues

1. Verify `REDIS_URL` is correct
2. Check if Redis is running
3. Test connection: `redis-cli ping`

### Firebase push notification issues

1. Verify Firebase credentials
2. Check service account permissions
3. Verify device tokens are valid
4. Check Firebase console for errors

## Project Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun test` | Run all tests |
| `bun test src/tests/` | Run unit tests only |
| `bunx tsc --noEmit` | Type check |
| `bun run lint` | Lint code |
| `bun run lint:fix` | Fix lint issues |

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Bun Documentation](https://bun.sh/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zod Documentation](https://zod.dev/)
- [Vitest Documentation](https://vitest.dev/)

## Support

If you encounter issues:

1. Check existing issues on GitHub
2. Search documentation
3. Ask in the team Slack channel
4. Create a new issue with detailed reproduction steps
