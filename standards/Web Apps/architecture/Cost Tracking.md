# Cost Tracking Architecture

This document describes the cost tracking pattern for transparent, real-time billing of external service usage.

## Philosophy

**Customers deserve to know exactly what they're paying for.**

Every external service call that costs money is tracked, aggregated, and displayed transparently. Users see itemized bills with actual costs AND markup separated.

## Core Concepts

### Cost Events

Every billable operation creates a cost event:

```typescript
interface CostEvent {
  id: string;
  tenantId: string;
  category: CostCategory;
  quantity: number;
  unitCost: number;        // Cost per unit (high precision)
  totalCost: number;       // quantity * unitCost
  description: string;     // Human-readable description
  metadata?: object;       // Additional context
  createdAt: Date;
}

type CostCategory = 
  | 'email'      // Email sending
  | 'storage'    // File storage
  | 'compute'    // Processing time
  | 'bandwidth'  // Data transfer
  | 'sms'        // SMS messages
  | 'ai'         // AI/LLM usage
  | 'api';       // External API calls
```

### High Precision Storage

Micro-costs require high precision. Store with 6 decimal places:

```prisma
model CostEvent {
  id          String   @id @default(cuid())
  tenantId    String
  category    String
  quantity    Int
  unitCost    Decimal  @db.Decimal(10, 6)  // e.g., 0.000100
  totalCost   Decimal  @db.Decimal(10, 6)
  description String
  metadata    Json?
  createdAt   DateTime @default(now())
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([tenantId, category])
  @@index([tenantId, createdAt])
}
```

### Monthly Aggregation

Aggregate costs monthly for billing:

```prisma
model MonthlyBill {
  id          String   @id @default(cuid())
  tenantId    String
  month       String   // YYYY-MM format
  
  // Cost breakdown by category
  emailCost     Decimal @db.Decimal(10, 2) @default(0)
  storageCost   Decimal @db.Decimal(10, 2) @default(0)
  computeCost   Decimal @db.Decimal(10, 2) @default(0)
  bandwidthCost Decimal @db.Decimal(10, 2) @default(0)
  smsCost       Decimal @db.Decimal(10, 2) @default(0)
  aiCost        Decimal @db.Decimal(10, 2) @default(0)
  apiCost       Decimal @db.Decimal(10, 2) @default(0)
  
  // Totals
  subtotal      Decimal @db.Decimal(10, 2) @default(0)
  markupPercent Decimal @db.Decimal(5, 2)  @default(16)
  markupAmount  Decimal @db.Decimal(10, 2) @default(0)
  total         Decimal @db.Decimal(10, 2) @default(0)
  
  // Status
  status        String  @default("draft") // draft, finalized, paid
  finalizedAt   DateTime?
  
  tenant        Tenant  @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, month])
  @@index([tenantId])
}
```

## Implementation

### Cost Tracking Service

```typescript
// modules/cost-tracking/cost-tracking.service.ts

import { prisma, type Prisma } from '@your-app/database';

// Cost rates by category (update as vendor pricing changes)
const COST_RATES: Record<string, number> = {
  email: 0.0001,      // $0.10 per 1000 emails
  storage: 0.023,     // $0.023 per GB per month
  compute: 0.00001,   // $0.01 per 1000 compute units
  bandwidth: 0.09,    // $0.09 per GB
  sms: 0.0075,        // $0.0075 per SMS
  ai_input: 0.003,    // $3 per 1M input tokens
  ai_output: 0.015,   // $15 per 1M output tokens
  api: 0.001,         // $0.001 per API call
};

export class CostTrackingService {
  /**
   * Track a billable operation.
   * Call this AFTER the operation succeeds.
   */
  async trackOperation(
    tenantId: string,
    category: string,
    quantity: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const unitCost = COST_RATES[category] || 0;
    const totalCost = unitCost * quantity;

    // Create cost event
    await prisma.costEvent.create({
      data: {
        tenantId,
        category,
        quantity,
        unitCost,
        totalCost,
        description,
        metadata: metadata as Prisma.JsonObject,
      },
    });

    // Update monthly aggregation
    await this.updateMonthlyBill(tenantId, category, totalCost);
  }

  /**
   * Track AI usage with separate input/output token costs.
   */
  async trackAIUsage(
    tenantId: string,
    inputTokens: number,
    outputTokens: number,
    description: string
  ): Promise<number> {
    const inputCost = (inputTokens / 1000) * COST_RATES.ai_input;
    const outputCost = (outputTokens / 1000) * COST_RATES.ai_output;
    const totalCost = inputCost + outputCost;

    await prisma.costEvent.create({
      data: {
        tenantId,
        category: 'ai',
        quantity: inputTokens + outputTokens,
        unitCost: totalCost / (inputTokens + outputTokens),
        totalCost,
        description,
        metadata: { inputTokens, outputTokens },
      },
    });

    await this.updateMonthlyBill(tenantId, 'ai', totalCost);
    
    return totalCost;
  }

  /**
   * Get current month's spending for a tenant.
   */
  async getCurrentMonthSpending(tenantId: string): Promise<MonthlySpending> {
    const currentMonth = this.getCurrentMonth();
    
    const bill = await prisma.monthlyBill.findUnique({
      where: {
        tenantId_month: { tenantId, month: currentMonth },
      },
    });

    if (!bill) {
      return this.emptySpending();
    }

    return {
      month: currentMonth,
      breakdown: {
        email: Number(bill.emailCost),
        storage: Number(bill.storageCost),
        compute: Number(bill.computeCost),
        bandwidth: Number(bill.bandwidthCost),
        sms: Number(bill.smsCost),
        ai: Number(bill.aiCost),
        api: Number(bill.apiCost),
      },
      subtotal: Number(bill.subtotal),
      markupPercent: Number(bill.markupPercent),
      markupAmount: Number(bill.markupAmount),
      total: Number(bill.total),
    };
  }

  /**
   * Get detailed cost events for a tenant.
   */
  async getCostEvents(
    tenantId: string,
    options: {
      category?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<CostEvent[]> {
    return prisma.costEvent.findMany({
      where: {
        tenantId,
        ...(options.category && { category: options.category }),
        ...(options.startDate && { createdAt: { gte: options.startDate } }),
        ...(options.endDate && { createdAt: { lte: options.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 100,
    });
  }

  /**
   * Update monthly bill aggregation.
   */
  private async updateMonthlyBill(
    tenantId: string,
    category: string,
    amount: number
  ): Promise<void> {
    const currentMonth = this.getCurrentMonth();
    
    // Get tenant's markup percentage
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { markupPercent: true },
    });
    const markupPercent = tenant?.markupPercent ?? 16;

    // Upsert monthly bill
    const categoryField = `${category}Cost` as keyof MonthlyBill;
    
    await prisma.$transaction(async (tx) => {
      // Get or create bill
      let bill = await tx.monthlyBill.findUnique({
        where: { tenantId_month: { tenantId, month: currentMonth } },
      });

      if (!bill) {
        bill = await tx.monthlyBill.create({
          data: {
            tenantId,
            month: currentMonth,
            markupPercent,
          },
        });
      }

      // Update category cost
      const updateData: Record<string, unknown> = {
        [categoryField]: { increment: amount },
      };

      // Calculate new totals
      const currentSubtotal = Number(bill.subtotal) + amount;
      const markupAmount = currentSubtotal * (markupPercent / 100);
      const total = currentSubtotal + markupAmount;

      await tx.monthlyBill.update({
        where: { id: bill.id },
        data: {
          ...updateData,
          subtotal: currentSubtotal,
          markupAmount,
          total,
        },
      });
    });
  }

  private getCurrentMonth(): string {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  }

  private emptySpending(): MonthlySpending {
    return {
      month: this.getCurrentMonth(),
      breakdown: {
        email: 0,
        storage: 0,
        compute: 0,
        bandwidth: 0,
        sms: 0,
        ai: 0,
        api: 0,
      },
      subtotal: 0,
      markupPercent: 16,
      markupAmount: 0,
      total: 0,
    };
  }
}

interface MonthlySpending {
  month: string;
  breakdown: Record<string, number>;
  subtotal: number;
  markupPercent: number;
  markupAmount: number;
  total: number;
}
```

### Usage in Services

```typescript
// modules/email/email.service.ts

import { CostTrackingService } from '../cost-tracking';

export class EmailService {
  private costTracker = new CostTrackingService();

  async sendEmail(tenantId: string, params: SendEmailParams): Promise<EmailResult> {
    // Send the email
    const result = await this.provider.sendEmail(params);
    
    // Track the cost AFTER success
    if (result.success) {
      await this.costTracker.trackOperation(
        tenantId,
        'email',
        1,
        `Email to ${params.to}`,
        { subject: params.subject }
      );
    }
    
    return result;
  }

  async sendCampaign(
    tenantId: string,
    recipients: string[],
    template: EmailTemplate
  ): Promise<BulkEmailResult> {
    const result = await this.provider.sendBulkEmail(/* ... */);
    
    // Track successful sends
    if (result.successful > 0) {
      await this.costTracker.trackOperation(
        tenantId,
        'email',
        result.successful,
        `Campaign: ${template.name}`,
        { 
          campaignId: template.id,
          total: recipients.length,
          successful: result.successful,
          failed: result.failed,
        }
      );
    }
    
    return result;
  }
}
```

### API Endpoints

```typescript
// modules/cost-tracking/cost-tracking.router.ts

import { Router } from 'express';
import { getTenantId } from '../../cofounder/tenant';
import { CostTrackingService } from './cost-tracking.service';

const router = Router();
const service = new CostTrackingService();

// Get current month spending
router.get('/current', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const spending = await service.getCurrentMonthSpending(tenantId);
    res.json({ success: true, data: spending });
  } catch (error) {
    next(error);
  }
});

// Get cost events (detailed breakdown)
router.get('/events', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { category, startDate, endDate, limit } = req.query;
    
    const events = await service.getCostEvents(tenantId, {
      category: category as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

// Get historical bills
router.get('/bills', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    
    const bills = await prisma.monthlyBill.findMany({
      where: { tenantId },
      orderBy: { month: 'desc' },
      take: 12,
    });
    
    res.json({ success: true, data: bills });
  } catch (error) {
    next(error);
  }
});

export { router as costTrackingRouter };
```

## Frontend Display

### Cost Dashboard Component

```tsx
// components/costs/CostDashboard.tsx

import { useCostsStore } from '@/stores/costs';
import { formatCurrency, formatNumber } from '@/utils/formatting';

export function CostDashboard(): JSX.Element {
  const { spending, events, isLoading } = useCostsStore();

  if (isLoading || !spending) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">
          {spending.month} Costs
        </h2>
        
        {/* Breakdown */}
        <div className="space-y-2 mb-4">
          {Object.entries(spending.breakdown).map(([category, cost]) => (
            cost > 0 && (
              <div key={category} className="flex justify-between">
                <span className="text-gray-600 capitalize">{category}</span>
                <span>{formatCurrency(cost)}</span>
              </div>
            )
          ))}
        </div>
        
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCurrency(spending.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              Platform fee ({spending.markupPercent}%)
            </span>
            <span className="text-gray-500">
              {formatCurrency(spending.markupAmount)}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatCurrency(spending.total)}</span>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-medium">Recent Activity</h3>
        </div>
        <div className="divide-y">
          {events.map(event => (
            <div key={event.id} className="p-4 flex justify-between">
              <div>
                <p className="text-sm font-medium">{event.description}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(event.createdAt)} · {event.category}
                </p>
              </div>
              <span className="text-sm">
                {formatCurrency(event.totalCost)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Common Mistakes

### Tracking Before Success

```typescript
// WRONG - Tracks cost even if operation fails
await costTracker.trackOperation(tenantId, 'email', 1, 'Send email');
await emailProvider.sendEmail(params); // Might fail!

// CORRECT - Track after success
const result = await emailProvider.sendEmail(params);
if (result.success) {
  await costTracker.trackOperation(tenantId, 'email', 1, 'Send email');
}
```

### Forgetting to Track

```typescript
// WRONG - Uses external service without tracking
async function processImage(tenantId: string, imageUrl: string) {
  const result = await aiProvider.describeImage(imageUrl);
  return result;
}

// CORRECT - Always track billable operations
async function processImage(tenantId: string, imageUrl: string) {
  const result = await aiProvider.describeImage(imageUrl);
  await costTracker.trackAIUsage(
    tenantId,
    result.inputTokens,
    result.outputTokens,
    'Image description'
  );
  return result;
}
```

### Low Precision Storage

```typescript
// WRONG - Loses precision on micro-costs
model CostEvent {
  totalCost Float  // 0.0001 becomes 0.00009999...
}

// CORRECT - Use Decimal with sufficient precision
model CostEvent {
  totalCost Decimal @db.Decimal(10, 6)  // Exact 0.000100
}
```

## Updating Cost Rates

When vendor pricing changes:

1. Update `COST_RATES` in the service
2. Document the change with date
3. Old events retain their original costs
4. New events use new rates

```typescript
// Keep history of rate changes
const COST_RATES = {
  email: 0.0001,  // Updated 2024-06-01 (was 0.00015)
  // ...
};
```

## Billing Integration

For actual payment processing:

1. Finalize monthly bill after month ends
2. Create invoice in Stripe (or payment provider)
3. Mark bill as `finalized`
4. Process payment
5. Mark bill as `paid`

This architecture tracks costs in real-time but doesn't handle actual payment processing. That's a separate module.
