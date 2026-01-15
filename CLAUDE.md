# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARIA (AI Regulatory IND Assistant) is an AI-powered Next.js application that generates regulatory-compliant IND (Investigational New Drug) reports. It uses Gemini and Claude APIs for content generation, AWS Cognito for authentication, and PostgreSQL for data storage.

**Vercel Project**: `projects/ind-report-writer`

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **UI**: React 18, Shadcn/UI, Radix UI, Tailwind CSS
- **Database**: PostgreSQL (Vercel Postgres) with Prisma ORM
- **Storage**: Vercel Blob for file uploads
- **Auth**: AWS Cognito with Amplify UI
- **AI**: Google Gemini (primary), Anthropic Claude (secondary)
- **State**: Zustand, TanStack React Query
- **Testing**: Playwright (E2E)

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build (runs prisma generate first)
npm run lint         # Run ESLint
npm start            # Start production server

# Database
npx prisma db push   # Apply schema changes
npx prisma studio    # Visual database browser
npx prisma generate  # Regenerate Prisma client

# Testing
npx playwright test              # Run all E2E tests
npx playwright test --headed     # Run tests with visible browser
npx playwright test <file>       # Run specific test file

# AWS Setup (Windows)
npm run setup:cognito    # Configure Cognito user pool
npm run cleanup:cognito  # Remove Cognito resources
```

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── agent/         # AI agent (invoke, memory, status)
│   │   ├── auth/          # Cognito auth (login, logout, me, sync)
│   │   ├── reports/[id]/  # Report operations (generate, export, chat, qc)
│   │   └── upload/        # File upload handling
│   ├── reports/           # Report pages (list, new, [id], qc)
│   └── settings/          # User settings
├── components/            # React components
│   ├── ui/               # Shadcn/UI primitives
│   ├── report/           # Report-specific components
│   ├── chat/             # Chat interface
│   └── auth/             # Auth UI components
├── lib/
│   ├── ai/               # AI integration
│   │   ├── claude.ts     # Claude API wrapper
│   │   ├── gemini.ts     # Gemini API wrapper
│   │   └── prompts/      # System prompts per report type
│   ├── auth/             # Cognito helpers, AuthContext
│   ├── agent/            # DynamoDB memory client
│   └── db/prisma.ts      # Prisma client singleton
├── hooks/                # Custom React hooks
├── types/index.ts        # Global TypeScript types
└── middleware.ts         # Auth guards, route protection
```

### Key Patterns

**API Routes**: Located at `src/app/api/`, use Next.js route handlers with dynamic `[id]` segments.

**Auth Flow**: Middleware at `src/middleware.ts` protects `/reports/*` and `/settings` routes. Demo mode bypasses auth with `?demo=true`.

**AI Integration**: Both Gemini and Claude support streaming. Prompts are organized by report type in `src/lib/ai/prompts/`.

**Database**: Prisma schema at `prisma/schema.prisma` defines models for User, Report, UploadedFile, ChatMessage, QCResult, and ApiSettings.

### Report Workflow

1. User uploads files (CSV, Excel, PDF, images)
2. System extracts metadata via AI
3. Generates report draft (Gemini/Claude)
4. Interactive refinement via chat
5. Quality control checks
6. Export to Word/PDF

### Report Types (Enum)

PK_REPORT, TOXICOLOGY, CMC, CLINICAL_PHARMACOLOGY, BIOANALYTICAL, ADME, PHARMACOLOGY

### Report Status Flow

DRAFT → GENERATING → REVIEW → QC_PENDING → QC_COMPLETE → FINALIZED → EXPORTED

## AWS Resources

- **Cognito**: User authentication
- **DynamoDB**: Agent memory storage (table: `aria-agent-memory`)
- **Lambda/Step Functions**: Async task orchestration

Config files in `aws/` directory for IAM, Lambda, and Step Functions.

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID` - Cognito
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `ADMIN_EMAILS` - Comma-separated admin emails
- `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` - AI API keys (can also set in UI)

## Important Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Route protection, auth redirects, demo mode |
| `prisma/schema.prisma` | Database schema with all models and enums |
| `src/lib/ai/prompts/` | System prompts for each report type |
| `src/lib/agent/memory-client.ts` | DynamoDB memory operations |
| `src/types/index.ts` | Global TypeScript types |
| `next.config.js` | Webpack aliases for jsPDF, 50MB upload limit |

## Notes

- Prisma client auto-generates on `npm install` via postinstall hook
- jsPDF canvas errors handled by webpack alias in `next.config.js`
- Server actions body limit set to 50MB for large file uploads
- Path alias `@/*` maps to `./src/*`
