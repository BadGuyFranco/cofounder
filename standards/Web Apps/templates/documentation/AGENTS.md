# [Project Name] - AI Agent Instructions

> **For Cursor, Claude, GitHub Copilot, and other AI development assistants.**
> Read this before generating any code for this project.

---

## Quick Reference

```
Project: [Project Name]
Stack: React + TypeScript + Express + PostgreSQL + Prisma
Style: Strict TypeScript, modular architecture
```

---

## Before Writing Any Code

1. **Read `docs/PRINCIPLES.md`** - Core philosophy that guides all decisions
2. **Check existing patterns** - Look at similar modules before creating new ones
3. **Verify constraints** - [Multi-tenancy/Cost tracking/Other] as applicable

---

## Code Generation Rules

### TypeScript Standards

```typescript
// DO: Strict types, explicit returns, descriptive names
async function createRecord(
  tenantId: string, 
  input: CreateRecordInput
): Promise<Record> {
  // Implementation
}

// DON'T: any types, implicit returns, single-letter names
async function create(t: any, i: any) {
  // Implementation
}
```

### Module Creation Pattern

When creating a new module, follow this structure:

```
modules/[name]/
├── index.ts              # Public exports only
├── README.md             # Required documentation
├── types.ts              # Zod schemas + TypeScript types
├── [name].service.ts     # Business logic
├── [name].router.ts      # Express routes (if needed)
└── providers/            # External service wrappers (if needed)
    └── provider.interface.ts
```

### Required Patterns

```typescript
// [PATTERN 1 - e.g., Tenant Isolation]
// Every query filters by tenantId
const records = await prisma.record.findMany({
  where: { tenantId },
});

// [PATTERN 2 - e.g., Cost Tracking]
// External service calls track costs
await costTracker.trackOperation(tenantId, 'category', quantity, 'description');

// [PATTERN 3 - e.g., Provider Abstraction]
// Services use interfaces, not implementations
class MyService {
  constructor(private provider: ProviderInterface) {}
}
```

---

## API Endpoint Pattern

```typescript
// modules/[name]/[name].router.ts

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Validation schema
const createInputSchema = z.object({
  name: z.string().min(1).max(255),
  // ... other fields
});

// Endpoint with proper error handling
router.post('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);  // From auth middleware
    const input = createInputSchema.parse(req.body);
    
    const result = await service.create(tenantId, input);
    
    res.status(201).json({
      success: true,
      data: result,
      meta: {
        requestId: res.locals.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);  // Let error middleware handle it
  }
});
```

---

## Common Mistakes to Avoid

### 1. [Mistake Category]
```typescript
// WRONG
[bad pattern]

// CORRECT
[good pattern]
```

### 2. [Mistake Category]
```typescript
// WRONG
[bad pattern]

// CORRECT
[good pattern]
```

### 3. Using `any` Type
```typescript
// WRONG
function process(data: any): any { ... }

// CORRECT
function process(data: ProcessInput): ProcessResult { ... }
```

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Module entry | `index.ts` | `modules/contacts/index.ts` |
| Types | `types.ts` | `modules/contacts/types.ts` |
| Service | `[name].service.ts` | `contacts.service.ts` |
| Router | `[name].router.ts` | `contacts.router.ts` |
| Provider interface | `provider.interface.ts` | `providers/provider.interface.ts` |
| Tests | `[name].test.ts` | `contacts.service.test.ts` |

---

## Documentation Requirements

### Every Module README Must Include:
1. **Purpose** - What this module does
2. **API Endpoints** - Routes with request/response examples
3. **Usage Examples** - Code snippets for common operations
4. **Configuration** - Any environment variables needed

### JSDoc for Public Functions:
```typescript
/**
 * Create a new record for a tenant.
 * 
 * @param tenantId - The tenant's unique identifier
 * @param input - Record creation data
 * @returns The created record
 * @throws ConflictError if unique constraint violated
 */
async create(tenantId: string, input: CreateInput): Promise<Record>
```

---

## Frontend Patterns

### Component Structure
```
src/
├── components/
│   ├── ai-assistant/      # AI Assistant overlay
│   ├── navigation/        # Nav system
│   └── layout/            # Layout wrappers
├── pages/                 # Route-level components
├── stores/                # Zustand state
└── hooks/                 # Custom hooks
```

### Component Convention
```tsx
interface MyComponentProps {
  data: DataType;
  onAction: (id: string) => void;
}

export function MyComponent({ data, onAction }: MyComponentProps): JSX.Element {
  return (/* JSX */);
}
```

### Zustand Store Pattern
```typescript
interface MyState {
  items: Item[];
  isLoading: boolean;
  fetchItems: () => Promise<void>;
}

export const useMyStore = create<MyState>((set) => ({
  items: [],
  isLoading: false,
  fetchItems: async () => {
    set({ isLoading: true });
    const result = await fetch('/api/v1/items').then(r => r.json());
    set({ items: result.data, isLoading: false });
  },
}));
```

### AI Context Registration

**Every page should register its context with the AI Assistant:**

```tsx
import { useAIContext } from '@/components/ai-assistant';

function MyPage() {
  useAIContext({
    page: 'my-page',
    pageTitle: 'My Page Title',
    pageDescription: 'What this page does',
    availableActions: [
      { 
        id: 'action-id', 
        label: 'Action label',
        description: 'What this action does',
        destructive: false,
        requiresConfirmation: false
      },
    ],
  });
  
  return (/* ... */);
}
```

---

## Quick Commands

```bash
# Development
npm run dev           # Start all
npm run dev:api       # API only
npm run dev:web       # Frontend only

# Database
npm run db:generate   # After schema changes
npm run db:migrate    # Create migration
npm run db:studio     # Visual database browser

# Quality
npm run lint          # Check code
npm run typecheck     # Verify types
npm run test          # Run tests
```

---

## Questions to Ask Before Implementing

1. Does this align with the principles in `docs/PRINCIPLES.md`?
2. Is there an existing module/pattern I should follow?
3. [Project-specific constraint question]?
4. Is this the simplest solution that works?
5. Would a new developer understand this code?

---

## Related Documentation

- [CONTEXT.md](CONTEXT.md) - **Start here** - Universal project context
- [docs/PRINCIPLES.md](docs/PRINCIPLES.md) - Core philosophy
- [docs/architecture.md](docs/architecture.md) - System architecture
- [docs/DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md) - Full technical spec
- [docs/PROGRESS.md](docs/PROGRESS.md) - Implementation status

---

## Maintenance: Keeping CONTEXT.md Current

**After completing significant work** (finishing a domain, major architectural changes, priority shifts):

1. Update `CONTEXT.md` progress percentages
2. Adjust "Immediate Priorities" if they've changed
3. Update the "Last updated" date

This keeps the universal context accurate for future sessions.
