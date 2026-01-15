# Provider Abstraction Pattern

This document describes the provider abstraction pattern for integrating external services in a vendor-independent way.

## Philosophy

**Never lock your business logic to a specific vendor.**

External services change pricing, deprecate features, or go out of business. By abstracting them behind interfaces, you can:

- Swap vendors without touching business logic
- Test with mock implementations
- Support multiple providers simultaneously
- Track costs uniformly

## The Pattern

```
Interface (what you need)
    ↓
Implementation (specific vendor)
    ↓
Service (uses interface, not implementation)
```

## Example: Email Provider

### Step 1: Define the Interface

What capabilities do you need? Not what AWS SES offers, but what your application requires.

```typescript
// modules/email/providers/provider.interface.ts

export interface SendEmailParams {
  to: string | string[];
  from: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  cost: number;
  error?: string;
}

export interface BulkEmailResult {
  total: number;
  successful: number;
  failed: number;
  results: EmailResult[];
  totalCost: number;
}

/**
 * Email Provider Interface
 * 
 * All email providers must implement this interface.
 * This enables vendor-independent email operations.
 */
export interface EmailProvider {
  /** Provider identifier */
  name: string;
  
  /** Send a single email */
  sendEmail(params: SendEmailParams): Promise<EmailResult>;
  
  /** Send bulk emails (batched for efficiency) */
  sendBulkEmail(params: SendEmailParams[]): Promise<BulkEmailResult>;
  
  /** Validate an email address */
  validateEmail(email: string): Promise<{ isValid: boolean; reason?: string }>;
  
  /** Get cost per email for this provider */
  getCostPerEmail(): number;
}
```

### Step 2: Implement for Specific Vendor

```typescript
// modules/email/providers/aws-ses.provider.ts

import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand } from '@aws-sdk/client-ses';
import type { EmailProvider, SendEmailParams, EmailResult, BulkEmailResult } from './provider.interface';

export class AWSSESProvider implements EmailProvider {
  name = 'aws-ses';
  private client: SESClient;
  private costPerEmail = 0.0001; // $0.10 per 1000 emails

  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    try {
      const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
      
      const command = new SendEmailCommand({
        Source: params.fromName 
          ? `${params.fromName} <${params.from}>`
          : params.from,
        Destination: {
          ToAddresses: toAddresses,
        },
        Message: {
          Subject: { Data: params.subject },
          Body: {
            Html: { Data: params.html },
            Text: params.text ? { Data: params.text } : undefined,
          },
        },
        ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
      });

      const response = await this.client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
        cost: this.costPerEmail * toAddresses.length,
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBulkEmail(params: SendEmailParams[]): Promise<BulkEmailResult> {
    const results: EmailResult[] = [];
    let totalCost = 0;

    // Send in batches to respect rate limits
    const batchSize = 50;
    for (let i = 0; i < params.length; i += batchSize) {
      const batch = params.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(p => this.sendEmail(p))
      );
      results.push(...batchResults);
      
      // Rate limit: 14 emails/second for SES
      if (i + batchSize < params.length) {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    for (const result of results) {
      totalCost += result.cost;
    }

    return {
      total: params.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      totalCost,
    };
  }

  async validateEmail(email: string): Promise<{ isValid: boolean; reason?: string }> {
    // Basic validation - SES doesn't have a validate endpoint
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: emailRegex.test(email),
      reason: emailRegex.test(email) ? undefined : 'Invalid email format',
    };
  }

  getCostPerEmail(): number {
    return this.costPerEmail;
  }
}
```

### Step 3: Alternative Implementation (for comparison)

```typescript
// modules/email/providers/sendgrid.provider.ts

import sgMail from '@sendgrid/mail';
import type { EmailProvider, SendEmailParams, EmailResult, BulkEmailResult } from './provider.interface';

export class SendGridProvider implements EmailProvider {
  name = 'sendgrid';
  private costPerEmail = 0.0003; // $0.30 per 1000 emails

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    try {
      const [response] = await sgMail.send({
        to: params.to,
        from: { email: params.from, name: params.fromName },
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
      });

      return {
        success: response.statusCode === 202,
        messageId: response.headers['x-message-id'] as string,
        cost: this.costPerEmail,
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBulkEmail(params: SendEmailParams[]): Promise<BulkEmailResult> {
    // SendGrid supports batch sending natively
    const results: EmailResult[] = [];
    
    for (const p of params) {
      const result = await this.sendEmail(p);
      results.push(result);
    }

    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    return {
      total: params.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      totalCost,
    };
  }

  async validateEmail(email: string): Promise<{ isValid: boolean; reason?: string }> {
    // SendGrid has email validation API (separate product)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: emailRegex.test(email),
    };
  }

  getCostPerEmail(): number {
    return this.costPerEmail;
  }
}
```

### Step 4: Service Uses Interface

```typescript
// modules/email/email.service.ts

import type { EmailProvider, SendEmailParams, EmailResult } from './providers/provider.interface';
import { CostTrackingService } from '../cost-tracking';

export class EmailService {
  private costTracker = new CostTrackingService();

  constructor(private provider: EmailProvider) {}

  /**
   * Send a single email.
   * Provider is injected - service doesn't know or care which one.
   */
  async send(
    tenantId: string,
    params: SendEmailParams
  ): Promise<EmailResult> {
    const result = await this.provider.sendEmail(params);
    
    if (result.success) {
      // Track cost using provider's cost method
      await this.costTracker.trackOperation(
        tenantId,
        'email',
        1,
        `Email to ${Array.isArray(params.to) ? params.to.length : 1} recipients`
      );
    }
    
    return result;
  }

  /**
   * Send campaign to multiple recipients.
   */
  async sendCampaign(
    tenantId: string,
    recipients: string[],
    template: { subject: string; html: string; text?: string },
    from: { email: string; name?: string }
  ): Promise<BulkEmailResult> {
    const params: SendEmailParams[] = recipients.map(to => ({
      to,
      from: from.email,
      fromName: from.name,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }));

    const result = await this.provider.sendBulkEmail(params);

    // Track costs for successful sends
    if (result.successful > 0) {
      await this.costTracker.trackOperation(
        tenantId,
        'email',
        result.successful,
        `Campaign: ${result.successful} emails sent`
      );
    }

    return result;
  }

  /**
   * Get cost estimate for sending to N recipients.
   */
  estimateCost(recipientCount: number): number {
    return this.provider.getCostPerEmail() * recipientCount;
  }
}
```

### Step 5: Provider Factory

```typescript
// modules/email/providers/index.ts

import type { EmailProvider } from './provider.interface';
import { AWSSESProvider } from './aws-ses.provider';
import { SendGridProvider } from './sendgrid.provider';

export type EmailProviderType = 'aws-ses' | 'sendgrid';

/**
 * Create email provider instance based on configuration.
 */
export function createEmailProvider(type?: EmailProviderType): EmailProvider {
  const providerType = type || (process.env.EMAIL_PROVIDER as EmailProviderType) || 'aws-ses';
  
  switch (providerType) {
    case 'aws-ses':
      return new AWSSESProvider();
    case 'sendgrid':
      return new SendGridProvider();
    default:
      throw new Error(`Unknown email provider: ${providerType}`);
  }
}

// Re-export interface
export type { EmailProvider, SendEmailParams, EmailResult, BulkEmailResult } from './provider.interface';
```

### Step 6: Wire It Up

```typescript
// modules/email/index.ts

import { EmailService } from './email.service';
import { createEmailProvider } from './providers';

// Create service with configured provider
export const emailService = new EmailService(createEmailProvider());

// Export for dependency injection in tests
export { EmailService } from './email.service';
export { createEmailProvider } from './providers';
export type { EmailProvider, SendEmailParams, EmailResult } from './providers';
```

## More Examples

### Storage Provider

```typescript
// providers/storage/provider.interface.ts

export interface StorageProvider {
  name: string;
  
  upload(key: string, data: Buffer, contentType: string): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
  
  getCostPerGB(): number;
}

// Implementations: S3Provider, CloudflareR2Provider, etc.
```

### Payment Provider

```typescript
// providers/payments/provider.interface.ts

export interface PaymentProvider {
  name: string;
  
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
  createSubscription(params: SubscriptionParams): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getInvoices(customerId: string): Promise<Invoice[]>;
  
  getTransactionFeePercent(): number;
}

// Implementations: StripeProvider, etc.
```

### SMS Provider

```typescript
// providers/sms/provider.interface.ts

export interface SMSProvider {
  name: string;
  
  sendSMS(to: string, message: string): Promise<SMSResult>;
  sendBulkSMS(messages: { to: string; message: string }[]): Promise<BulkSMSResult>;
  
  getCostPerSMS(): number;
}

// Implementations: TwilioProvider, etc.
```

## Testing with Mock Providers

```typescript
// modules/email/providers/__mocks__/mock.provider.ts

import type { EmailProvider, SendEmailParams, EmailResult } from '../provider.interface';

export class MockEmailProvider implements EmailProvider {
  name = 'mock';
  
  sentEmails: SendEmailParams[] = [];
  shouldFail = false;

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    if (this.shouldFail) {
      return { success: false, cost: 0, error: 'Mock failure' };
    }
    
    this.sentEmails.push(params);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      cost: 0.0001,
    };
  }

  async sendBulkEmail(params: SendEmailParams[]): Promise<BulkEmailResult> {
    const results = await Promise.all(params.map(p => this.sendEmail(p)));
    return {
      total: params.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      totalCost: results.reduce((sum, r) => sum + r.cost, 0),
    };
  }

  async validateEmail(email: string): Promise<{ isValid: boolean }> {
    return { isValid: email.includes('@') };
  }

  getCostPerEmail(): number {
    return 0.0001;
  }

  // Test helpers
  reset(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}
```

### Using in Tests

```typescript
// modules/email/__tests__/email.service.test.ts

import { EmailService } from '../email.service';
import { MockEmailProvider } from '../providers/__mocks__/mock.provider';

describe('EmailService', () => {
  let service: EmailService;
  let mockProvider: MockEmailProvider;

  beforeEach(() => {
    mockProvider = new MockEmailProvider();
    service = new EmailService(mockProvider);
  });

  it('should send email through provider', async () => {
    await service.send('tenant-1', {
      to: 'test@example.com',
      from: 'sender@app.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(mockProvider.sentEmails).toHaveLength(1);
    expect(mockProvider.sentEmails[0].to).toBe('test@example.com');
  });

  it('should handle provider failures', async () => {
    mockProvider.shouldFail = true;

    const result = await service.send('tenant-1', {
      to: 'test@example.com',
      from: 'sender@app.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Mock failure');
  });
});
```

## Common Mistakes

### Direct SDK Imports in Services

```typescript
// WRONG - Service is locked to AWS
import { SESClient } from '@aws-sdk/client-ses';

class EmailService {
  private ses = new SESClient({ region: 'us-east-1' });
  
  async send(params) {
    await this.ses.send(/* ... */);
  }
}

// CORRECT - Service uses interface
import type { EmailProvider } from './providers/provider.interface';

class EmailService {
  constructor(private provider: EmailProvider) {}
  
  async send(params) {
    await this.provider.sendEmail(params);
  }
}
```

### Vendor-Specific Data in Interface

```typescript
// WRONG - SES-specific parameter names
interface EmailParams {
  sesMessageId?: string;
  sesConfigurationSet?: string;
}

// CORRECT - Generic names
interface EmailParams {
  messageId?: string;
  tags?: Record<string, string>;
}
```

### Leaking Implementation Details

```typescript
// WRONG - Returns SES-specific error
return {
  error: `SES error: ${sesError.code}`,
};

// CORRECT - Generic error format
return {
  error: error.message,
  errorCode: 'SEND_FAILED',
};
```

## When to Abstract

**Always abstract:**
- Email sending
- Payment processing
- File storage
- SMS/notifications
- Any paid external service

**Consider abstracting:**
- Analytics
- Logging services
- Feature flags
- A/B testing

**Probably don't abstract:**
- Authentication (Clerk is opinionated, integration is deep)
- Database (Prisma is already an abstraction)
- Cache (Redis is standard enough)

## File Organization

```
modules/[feature]/
├── index.ts                    # Public exports
├── [feature].service.ts        # Business logic (uses interface)
├── [feature].router.ts         # HTTP endpoints
├── types.ts                    # Zod schemas
├── README.md                   # Documentation
└── providers/
    ├── index.ts                # Factory + re-exports
    ├── provider.interface.ts   # Interface definition
    ├── [vendor1].provider.ts   # First implementation
    ├── [vendor2].provider.ts   # Second implementation
    └── __mocks__/
        └── mock.provider.ts    # Test mock
```
