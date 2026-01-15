# Multi-Tenancy Architecture

This document describes the row-level tenant isolation pattern used in multi-tenant SaaS applications.

## Overview

Multi-tenancy means multiple customers (tenants) share the same application and database, but each can only see their own data. This pattern enables:

- Single deployment serving many customers
- Per-customer billing and usage tracking
- Data isolation without separate databases
- Efficient resource utilization

## Core Principle

**Every database table that stores customer data has a `tenantId` column, and every query filters by it.**

No exceptions. This is enforced at the middleware level and verified in code review.

## Database Schema Pattern

### Every Table Needs tenantId

```prisma
model Contact {
  id        String   @id @default(cuid())
  tenantId  String   // Required on all tenant-scoped tables
  email     String
  firstName String?
  lastName  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, email])  // Unique within tenant, not globally
  @@index([tenantId])          // Index for query performance
}
```

### Tenant Table

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique  // For subdomains: {slug}.yourapp.com
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Settings
  markupPercent Float    @default(16)  // Cost-plus pricing markup
  
  // Relations to all tenant-scoped data
  users     User[]
  contacts  Contact[]
  // ... all other models
}
```

### User-Tenant Relationship

```prisma
model User {
  id        String   @id @default(cuid())
  tenantId  String
  clerkId   String   @unique  // External auth provider ID
  email     String
  role      String   @default("member")  // owner, admin, member
  createdAt DateTime @default(now())
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([clerkId])
}
```

## Middleware Implementation

### Extract Tenant from Auth

```typescript
// middleware/request-context.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@your-app/database';

export interface RequestContext {
  tenantId: string;
  userId: string;
  userRole: string;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export async function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get user from auth middleware (Clerk)
    const clerkUserId = req.auth?.userId;
    
    if (!clerkUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Look up user and tenant
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      include: { tenant: true },
    });
    
    if (!user) {
      res.status(403).json({ error: 'User not found' });
      return;
    }
    
    // Attach context to request
    req.context = {
      tenantId: user.tenantId,
      userId: user.id,
      userRole: user.role,
    };
    
    next();
  } catch (error) {
    next(error);
  }
}
```

### Helper Function

```typescript
// shared/tenant.ts
import type { Request } from 'express';

/**
 * Get tenant ID from request context.
 * Throws if not available (should never happen with proper middleware).
 */
export function getTenantId(req: Request): string {
  if (!req.context?.tenantId) {
    throw new Error('Tenant context not available');
  }
  return req.context.tenantId;
}

/**
 * Get full request context.
 */
export function getContext(req: Request): RequestContext {
  if (!req.context) {
    throw new Error('Request context not available');
  }
  return req.context;
}
```

## Service Layer Pattern

### Always Filter by Tenant

```typescript
// modules/contacts/contacts.service.ts
import { prisma, type Contact } from '@your-app/database';

export class ContactsService {
  /**
   * Get all contacts for a tenant.
   * tenantId is REQUIRED - no default, no fallback.
   */
  async list(tenantId: string): Promise<Contact[]> {
    return prisma.contact.findMany({
      where: { tenantId },  // Always filter
      orderBy: { createdAt: 'desc' },
    });
  }
  
  /**
   * Get a single contact.
   * Verifies the contact belongs to the tenant.
   */
  async getById(tenantId: string, contactId: string): Promise<Contact | null> {
    return prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId,  // Ensures tenant ownership
      },
    });
  }
  
  /**
   * Create a contact.
   * tenantId is set on creation, cannot be changed.
   */
  async create(tenantId: string, input: CreateContactInput): Promise<Contact> {
    return prisma.contact.create({
      data: {
        tenantId,  // Set tenant ownership
        ...input,
      },
    });
  }
  
  /**
   * Update a contact.
   * Uses findFirst + update pattern to verify ownership.
   */
  async update(
    tenantId: string, 
    contactId: string, 
    input: UpdateContactInput
  ): Promise<Contact> {
    // Verify ownership first
    const existing = await this.getById(tenantId, contactId);
    if (!existing) {
      throw new NotFoundError('Contact');
    }
    
    return prisma.contact.update({
      where: { id: contactId },
      data: input,
    });
  }
  
  /**
   * Delete a contact.
   * Verifies ownership before deletion.
   */
  async delete(tenantId: string, contactId: string): Promise<void> {
    const existing = await this.getById(tenantId, contactId);
    if (!existing) {
      throw new NotFoundError('Contact');
    }
    
    await prisma.contact.delete({
      where: { id: contactId },
    });
  }
}
```

## Router Pattern

### Always Pass Tenant from Context

```typescript
// modules/contacts/contacts.router.ts
import { Router } from 'express';
import { getTenantId, getContext } from '../../cofounder/tenant';
import { ContactsService } from './contacts.service';

const router = Router();
const service = new ContactsService();

router.get('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const contacts = await service.list(tenantId);
    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const contact = await service.getById(tenantId, req.params.id);
    
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    
    res.json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const contact = await service.create(tenantId, req.body);
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
});

export { router as contactsRouter };
```

## Common Mistakes

### Missing Tenant Filter

```typescript
// WRONG - Returns ALL contacts across ALL tenants
const contacts = await prisma.contact.findMany();

// CORRECT - Filtered to tenant
const contacts = await prisma.contact.findMany({
  where: { tenantId },
});
```

### Trusting Client-Provided Tenant

```typescript
// WRONG - Client could send any tenantId
const tenantId = req.body.tenantId;

// CORRECT - Get from authenticated context
const tenantId = getTenantId(req);
```

### Optional Tenant Parameter

```typescript
// WRONG - Makes tenant optional
async function list(tenantId?: string) {
  const where = tenantId ? { tenantId } : {};
  return prisma.contact.findMany({ where });
}

// CORRECT - Tenant is required
async function list(tenantId: string) {
  return prisma.contact.findMany({ where: { tenantId } });
}
```

### Not Verifying Ownership on Update/Delete

```typescript
// WRONG - Could update any contact
await prisma.contact.update({
  where: { id: contactId },
  data: input,
});

// CORRECT - Verify tenant first
const existing = await prisma.contact.findFirst({
  where: { id: contactId, tenantId },
});
if (!existing) throw new NotFoundError('Contact');

await prisma.contact.update({
  where: { id: contactId },
  data: input,
});
```

## Testing Multi-Tenancy

### Unit Test Pattern

```typescript
describe('ContactsService', () => {
  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  
  beforeEach(async () => {
    // Create contacts in both tenants
    await prisma.contact.create({
      data: { tenantId: tenantA, email: 'a@example.com' },
    });
    await prisma.contact.create({
      data: { tenantId: tenantB, email: 'b@example.com' },
    });
  });
  
  it('should only return contacts for the specified tenant', async () => {
    const service = new ContactsService();
    const contacts = await service.list(tenantA);
    
    expect(contacts).toHaveLength(1);
    expect(contacts[0].email).toBe('a@example.com');
  });
  
  it('should not allow access to other tenant data', async () => {
    const service = new ContactsService();
    
    // Get tenant B's contact ID
    const tenantBContact = await prisma.contact.findFirst({
      where: { tenantId: tenantB },
    });
    
    // Try to access from tenant A - should return null
    const result = await service.getById(tenantA, tenantBContact!.id);
    expect(result).toBeNull();
  });
});
```

## When NOT to Use Multi-Tenancy

Skip tenant isolation when:

- Building an internal tool for a single organization
- Building a personal project
- Data sharing between "tenants" is a core feature
- Single-user application

You can add multi-tenancy later, but it requires:
- Adding tenantId to all tables (migration)
- Updating all queries
- Handling existing data (backfill tenantId)

It's significantly easier to build it in from the start if there's any chance you'll need it.
