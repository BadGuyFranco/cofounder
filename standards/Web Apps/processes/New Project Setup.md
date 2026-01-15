# New Project Setup Process

This document provides a step-by-step guide for setting up a new web application project using the Web Tech Stack library.

## Overview

Setting up a new project follows this flow:

```
1. Requirements Discovery     →  Understand what we're building
2. Create Project Directory   →  Set up folder structure
3. Initialize Monorepo        →  Create package.json and configs
4. Set Up Database Package    →  Prisma schema and client
5. Set Up API                 →  Express backend with modules
6. Set Up Web                 →  React frontend with components
7. Install Cursor Rules       →  AI collaboration guardrails
8. Create Documentation       →  CONTEXT.md, AGENTS.md, etc.
9. Initial Commit             →  Git repository setup
10. Handoff                   →  Summary and next steps
```

## Step 1: Requirements Discovery

Before creating any files, run through the discovery process.

**See:** `../discovery/Requirements Discovery.md`

**Output:** A clear understanding of:
- Project name and purpose
- Core features (3-5 main user activities)
- Multi-tenancy decision (yes/no)
- External service integrations
- MVP scope

## Step 2: Create Project Directory

Create the folder structure:

```bash
mkdir -p [project-name]/{apps/{api,web}/src,packages/{database,types,utils}/src,docs/architecture/decisions,.cursor/rules,infrastructure}
```

Result:
```
[project-name]/
├── .cursor/
│   └── rules/
├── apps/
│   ├── api/
│   │   └── src/
│   └── web/
│       └── src/
├── packages/
│   ├── database/
│   │   └── src/
│   ├── types/
│   │   └── src/
│   └── utils/
│       └── src/
├── docs/
│   └── architecture/
│       └── decisions/
└── infrastructure/
```

## Step 3: Initialize Monorepo

### Root package.json

```json
{
  "name": "[project-name]",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "dev:api": "npm run dev -w @[project]/api",
    "dev:web": "npm run dev -w @[project]/web",
    "build": "npm run build --workspaces --if-present",
    "db:generate": "npm run generate -w @[project]/database",
    "db:migrate": "npm run migrate -w @[project]/database",
    "db:push": "npm run push -w @[project]/database",
    "db:studio": "npm run studio -w @[project]/database",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Root tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### .eslintrc.json

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  },
  "ignorePatterns": ["node_modules", "dist", "build"]
}
```

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### .gitignore

```
# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/

# Prisma
packages/database/prisma/*.db
packages/database/prisma/*.db-journal
```

## Step 4: Set Up Database Package

### packages/database/package.json

```json
{
  "name": "@[project]/database",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "push": "prisma db push",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0"
  },
  "devDependencies": {
    "prisma": "^5.10.0"
  }
}
```

### packages/database/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// === MULTI-TENANCY (if applicable) ===

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Settings
  markupPercent Float @default(16)
  
  // Relations
  users     User[]
  // Add other models here
}

model User {
  id        String   @id @default(cuid())
  tenantId  String
  clerkId   String   @unique
  email     String
  firstName String?
  lastName  String?
  role      String   @default("member")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([clerkId])
}

// === ADD YOUR DOMAIN MODELS HERE ===
```

### packages/database/src/index.ts

```typescript
export { PrismaClient } from '@prisma/client';
export type * from '@prisma/client';

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Step 5: Set Up API

### apps/api/package.json

```json
{
  "name": "@[project]/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@[project]/database": "*",
    "@[project]/types": "*",
    "@[project]/utils": "*",
    "@clerk/express": "^1.0.0",
    "cors": "^2.8.5",
    "express": "^4.18.0",
    "helmet": "^7.1.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.0",
    "@types/express": "^4.17.0",
    "nodemon": "^3.0.0",
    "tsx": "^4.7.0"
  }
}
```

### apps/api/src/main.ts

```typescript
import { app } from './app.js';
import { logger } from './cofounder/logger.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});
```

### apps/api/src/app.ts

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import { errorHandler } from './middleware/error-handler.js';
import { requestContextMiddleware } from './middleware/request-context.js';
import { healthRouter } from './modules/health/health.router.js';
// Import other routers here

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(clerkMiddleware());

// Public routes
app.use('/api/v1/health', healthRouter);

// Protected routes (require auth)
app.use('/api/v1/*', requestContextMiddleware);
// app.use('/api/v1/[module]', [module]Router);

// Error handling
app.use(errorHandler);

export { app };
```

### Create Initial Module Structure

```
apps/api/src/
├── main.ts
├── app.ts
├── config/
│   └── environment.ts
├── middleware/
│   ├── auth.ts
│   ├── error-handler.ts
│   └── request-context.ts
├── modules/
│   └── health/
│       └── health.router.ts
└── shared/
    ├── errors.ts
    └── logger.ts
```

## Step 6: Set Up Web

### apps/web/package.json

```json
{
  "name": "@[project]/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@[project]/types": "*",
    "@clerk/clerk-react": "^5.0.0",
    "@headlessui/react": "^2.0.0",
    "@heroicons/react": "^2.1.0",
    "clsx": "^2.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.1.0"
  }
}
```

### Create Initial Component Structure

```
apps/web/src/
├── main.tsx
├── App.tsx
├── components/
│   ├── ai-assistant/          # AI Assistant overlay
│   │   ├── AIAssistantPanel.tsx
│   │   ├── AIAssistantTrigger.tsx
│   │   ├── context/
│   │   │   ├── AIAssistantProvider.tsx
│   │   │   └── AIContextProvider.tsx
│   │   ├── hooks/
│   │   │   └── useAIContext.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── layout/
│   │   └── AppLayout.tsx
│   └── navigation/
│       └── Navigation.tsx
├── pages/
│   └── Dashboard.tsx
├── stores/
├── hooks/
├── config/
└── styles/
    └── globals.css
```

## Step 7: Install Cursor Rules

Copy cursor rules from `../templates/cursor-rules/` to `[project]/.cursor/rules/`:

- `000-truth-seeking.mdc`
- `001-single-source-of-truth.mdc`
- `002-architecture.mdc`
- `003-code-quality.mdc`
- `004-module-structure.mdc`

**Customize as needed:**
- Update `002-architecture.mdc` based on whether multi-tenancy is enabled
- Add project-specific constraints

## Step 8: Create Documentation

### Create from templates:

1. **CONTEXT.md** (root) - Copy from `../templates/documentation/CONTEXT.md`
   - Fill in project name, description, users
   - Update current state table
   - Set priorities

2. **AGENTS.md** (root) - Copy from `../templates/documentation/AGENTS.md`
   - Fill in project-specific patterns
   - Update common mistakes section
   - Add any project-specific constraints

3. **docs/REQUIREMENTS.md** - Create from discovery notes

4. **docs/PRINCIPLES.md** - Project-specific principles

5. **docs/PROGRESS.md** - Implementation tracking

6. **docs/architecture.md** - System architecture

7. **docs/architecture/decisions/** - Initial ADRs

## Step 9: Initial Commit

```bash
cd [project-name]
git init
git add .
git commit -m "Initial project setup

- Monorepo structure with apps/api, apps/web, packages/*
- TypeScript + ESLint + Prettier configured
- Prisma database package initialized
- Express API skeleton
- React frontend skeleton with AI Assistant
- Cursor rules installed
- Documentation structure created"
```

## Step 10: Handoff

Present summary to user:

```markdown
## Project [Name] Created

### Structure
- [x] Monorepo with npm workspaces
- [x] apps/api (Express + TypeScript)
- [x] apps/web (React + TypeScript + Tailwind)
- [x] packages/database (Prisma + PostgreSQL)
- [x] packages/types (shared types)
- [x] packages/utils (shared utilities)

### Configuration
- [x] TypeScript strict mode
- [x] ESLint + Prettier
- [x] Cursor rules installed

### Documentation
- [x] CONTEXT.md - Universal entry point
- [x] AGENTS.md - AI collaboration guide
- [x] docs/REQUIREMENTS.md - What we're building

### Architecture
- [x] Multi-tenancy: [enabled/disabled]
- [x] AI Assistant overlay: included
- [x] Auth: Clerk configured
- [x] Database: Prisma schema ready

### Next Steps
1. Create `.env` file with DATABASE_URL and Clerk keys
2. Run `npm install`
3. Run `npm run db:push` to create database
4. Run `npm run dev` to start development
5. Build first feature module

### First Module Suggestion
Based on requirements, start with: [suggested module]
```

## Checklist

Use this checklist to verify setup is complete:

```
[ ] Project directory created
[ ] Root package.json with workspaces
[ ] Root tsconfig.json
[ ] ESLint and Prettier configs
[ ] .gitignore

[ ] packages/database initialized
[ ] Prisma schema with base models
[ ] Database client export

[ ] apps/api initialized
[ ] Express app with middleware
[ ] Health check endpoint
[ ] Error handling

[ ] apps/web initialized
[ ] Vite configured
[ ] Tailwind CSS configured
[ ] AI Assistant components
[ ] Basic layout

[ ] Cursor rules installed
[ ] CONTEXT.md created
[ ] AGENTS.md created
[ ] Requirements documented
[ ] Architecture decisions recorded

[ ] Git repository initialized
[ ] Initial commit made

[ ] Handoff summary provided
```
