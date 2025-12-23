# AI Assistant Architecture

This document describes the AI Assistant overlay pattern: a slide-out panel that helps users navigate, understand, and interact with the application.

## Philosophy

**AI is a helper, not a gatekeeper.**

Users can always do everything manually. The AI assistant makes common tasks faster and helps users discover features, but it never becomes a required interface.

## Overview

The AI Assistant is:
- A slide-out panel from the right side of the screen
- Triggered by Cmd/Ctrl+K or a header button
- Context-aware (knows what page the user is on)
- Capable of navigation, explanations, and actions
- Cost-tracked (for transparent billing)

## Component Architecture

```
src/components/ai-assistant/
├── AIAssistantPanel.tsx      # Slide-out panel container
├── AIAssistantTrigger.tsx    # Header button (+ keyboard shortcut)
├── AIConversation.tsx        # Message thread display
├── AIMessage.tsx             # Individual message bubble
├── AIMessageInput.tsx        # Text input with send button
├── AICostDisplay.tsx         # Session cost footer
├── AIContextIndicator.tsx    # Shows current page context
├── AIActionProgress.tsx      # Action execution feedback
├── context/
│   ├── AIAssistantProvider.tsx  # Global state (open/close, conversation)
│   └── AIContextProvider.tsx    # Page context registration
├── hooks/
│   └── useAIContext.ts       # Hook for pages to register context
├── types.ts                  # TypeScript interfaces
└── index.ts                  # Public exports
```

## Page Context System

Every page registers its context so the AI understands what the user is viewing.

### Context Registration Hook

```typescript
// hooks/useAIContext.ts
import { useEffect } from 'react';
import { useAIContextValue } from '../context/AIContextProvider';
import type { AIPageContext } from '../types';

export function useAIContext(context: AIPageContext): void {
  const { setPageContext } = useAIContextValue();
  
  useEffect(() => {
    setPageContext(context);
    
    // Clear context on unmount
    return () => setPageContext(null);
  }, [
    context.page,
    context.pageTitle,
    context.recordId,
    JSON.stringify(context.availableActions),
    JSON.stringify(context.activeFilters),
    JSON.stringify(context.selectedItems),
  ]);
}
```

### Using in Pages

```tsx
// pages/ContactsList.tsx
import { useAIContext } from '@/components/ai-assistant';

function ContactsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  useAIContext({
    page: 'contacts-list',
    pageTitle: 'All Contacts',
    pageDescription: 'View and manage your contacts.',
    recordType: 'contact',
    availableActions: [
      {
        id: 'create-contact',
        label: 'Create new contact',
        description: 'Open the form to add a new contact',
        destructive: false,
        requiresConfirmation: false,
      },
      {
        id: 'import-contacts',
        label: 'Import contacts',
        description: 'Import contacts from CSV',
        destructive: false,
        requiresConfirmation: false,
      },
      {
        id: 'bulk-delete',
        label: 'Delete selected contacts',
        description: 'Delete the selected contacts',
        destructive: true,
        requiresConfirmation: true,
        parameters: [{ name: 'contactIds', type: 'string[]', required: true }],
      },
    ],
    activeFilters: {
      search: searchQuery,
    },
    selectedItems: Array.from(selectedIds),
  });
  
  return (/* ... */);
}
```

### Record View Context

```tsx
// pages/ContactDetail.tsx
function ContactDetail({ contactId }: { contactId: string }) {
  const { data: contact } = useContact(contactId);
  
  useAIContext({
    page: 'contact-detail',
    pageTitle: contact?.name || 'Contact',
    pageDescription: 'Viewing contact details.',
    recordType: 'contact',
    recordId: contactId,
    recordSummary: contact 
      ? `${contact.firstName} ${contact.lastName} - ${contact.email}`
      : undefined,
    currentTab: 'overview',
    availableActions: [
      {
        id: 'edit-contact',
        label: 'Edit this contact',
        description: 'Make changes to contact information',
        destructive: false,
        requiresConfirmation: false,
      },
      {
        id: 'send-email',
        label: 'Send email',
        description: 'Compose an email to this contact',
        destructive: false,
        requiresConfirmation: false,
      },
      {
        id: 'delete-contact',
        label: 'Delete contact',
        description: 'Permanently remove this contact',
        destructive: true,
        requiresConfirmation: true,
      },
    ],
    visibleFields: [
      { name: 'firstName', label: 'First Name', editable: true },
      { name: 'lastName', label: 'Last Name', editable: true },
      { name: 'email', label: 'Email', editable: true },
      { name: 'phone', label: 'Phone', editable: true },
    ],
  });
  
  return (/* ... */);
}
```

## TypeScript Interfaces

```typescript
// types.ts

export interface AIPageContext {
  /** Route identifier (e.g., 'contacts-list', 'contact-detail') */
  page: string;
  
  /** Human-readable title for the current view */
  pageTitle: string;
  
  /** Brief description of what this page does */
  pageDescription?: string;
  
  /** Type of record being viewed (contact, project, invoice, etc.) */
  recordType?: string;
  
  /** ID of specific record if viewing/editing one */
  recordId?: string;
  
  /** Brief summary of the current record */
  recordSummary?: string;
  
  /** Available actions on this page */
  availableActions: AIAction[];
  
  /** Fields visible in forms/views */
  visibleFields?: AIFieldContext[];
  
  /** Current tab if tabbed interface */
  currentTab?: string;
  
  /** Active filters/search */
  activeFilters?: Record<string, unknown>;
  
  /** Selected items for bulk operations */
  selectedItems?: string[];
}

export interface AIAction {
  /** Unique identifier */
  id: string;
  
  /** Human-readable label */
  label: string;
  
  /** What this action does */
  description?: string;
  
  /** Is this destructive? (delete, remove, etc.) */
  destructive: boolean;
  
  /** Should user confirm before executing? */
  requiresConfirmation: boolean;
  
  /** Parameters needed to execute */
  parameters?: AIActionParameter[];
}

export interface AIActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]';
  required: boolean;
  description?: string;
}

export interface AIFieldContext {
  name: string;
  label: string;
  editable: boolean;
  currentValue?: unknown;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
  tokenCount?: number;
  cost?: number;
}

export interface AISuggestion {
  id: string;
  type: 'navigate' | 'show_me' | 'do_it';
  label: string;
  path?: string;        // For navigate
  action?: AIAction;    // For do_it
}

export interface AIConversation {
  sessionId: string;
  messages: AIMessage[];
  isLoading: boolean;
  sessionCost: number;
  error?: string;
}

export interface AISpendingStatus {
  sessionCost: number;
  monthlySpend: number;
  monthlyLimit: number;
  isAtLimit: boolean;
  warningThreshold: number;
}
```

## Panel Implementation

### Main Panel Component

```tsx
// AIAssistantPanel.tsx
import { Fragment, useCallback } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAIAssistant } from './context/AIAssistantProvider';
import { useAIContextValue } from './context/AIContextProvider';
import { AIConversation } from './AIConversation';
import { AIMessageInput } from './AIMessageInput';
import { AICostDisplay } from './AICostDisplay';
import { AIContextIndicator } from './AIContextIndicator';
import type { AISuggestion } from './types';

export function AIAssistantPanel(): JSX.Element {
  const navigate = useNavigate();
  const {
    isOpen,
    closePanel,
    conversation,
    sendMessage,
    spendingStatus,
  } = useAIAssistant();
  
  const { pageContext } = useAIContextValue();

  const handleSendMessage = useCallback((message: string) => {
    sendMessage(message, pageContext);
  }, [sendMessage, pageContext]);

  const handleSuggestionClick = (suggestion: AISuggestion) => {
    if (suggestion.type === 'navigate' && suggestion.path) {
      navigate(suggestion.path);
      closePanel();
    } else {
      handleSendMessage(suggestion.label);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closePanel}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" />
        </TransitionChild>

        {/* Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white shadow-2xl rounded-l-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <SparklesIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold">AI Assistant</h2>
                          <p className="text-[10px] text-gray-400">⌘K to toggle</p>
                        </div>
                      </div>
                      <button onClick={closePanel} className="p-2 hover:bg-gray-100 rounded-lg">
                        <XMarkIcon className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Context indicator */}
                    <AIContextIndicator context={pageContext} />

                    {/* Conversation */}
                    <AIConversation
                      messages={conversation.messages}
                      isLoading={conversation.isLoading}
                      onSuggestionClick={handleSuggestionClick}
                    />

                    {/* Cost display */}
                    <AICostDisplay
                      sessionCost={conversation.sessionCost}
                      spendingStatus={spendingStatus}
                    />

                    {/* Input */}
                    <AIMessageInput
                      onSend={handleSendMessage}
                      isLoading={conversation.isLoading}
                      disabled={spendingStatus?.isAtLimit}
                    />
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
```

### Keyboard Shortcut

```tsx
// AIAssistantTrigger.tsx
import { useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useAIAssistant } from './context/AIAssistantProvider';

export function AIAssistantTrigger(): JSX.Element {
  const { isOpen, openPanel, closePanel } = useAIAssistant();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (isOpen) {
          closePanel();
        } else {
          openPanel();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openPanel, closePanel]);

  return (
    <button
      onClick={openPanel}
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
    >
      <SparklesIcon className="w-4 h-4" />
      <span>AI</span>
      <kbd className="text-[10px] text-gray-400">⌘K</kbd>
    </button>
  );
}
```

## Backend API

### Message Endpoint

```typescript
// modules/ai-assistant/ai-assistant.router.ts
import { Router } from 'express';
import { z } from 'zod';
import { getTenantId, getContext } from '../../pro accelerator/tenant';
import { AIAssistantService } from './ai-assistant.service';

const router = Router();
const service = new AIAssistantService();

const messageSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  pageContext: z.object({
    page: z.string(),
    pageTitle: z.string(),
    availableActions: z.array(z.object({
      id: z.string(),
      label: z.string(),
      destructive: z.boolean(),
    })).optional(),
  }).optional(),
});

router.post('/message', async (req, res, next) => {
  try {
    const { tenantId, userId } = getContext(req);
    const input = messageSchema.parse(req.body);
    
    const response = await service.processMessage(
      tenantId,
      userId,
      input.message,
      input.sessionId,
      input.pageContext
    );
    
    res.json({
      success: true,
      data: response,
      spendingStatus: await service.getSpendingStatus(tenantId),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/spending-status', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const status = await service.getSpendingStatus(tenantId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

export { router as aiAssistantRouter };
```

### Service with Cost Tracking

```typescript
// modules/ai-assistant/ai-assistant.service.ts
import { prisma } from '@your-app/database';
import { CostTrackingService } from '../cost-tracking';

const PRICING = {
  inputCostPer1K: 0.003,   // $3 per 1M input tokens
  outputCostPer1K: 0.015,  // $15 per 1M output tokens
};

export class AIAssistantService {
  private costTracker = new CostTrackingService();

  async processMessage(
    tenantId: string,
    userId: string,
    message: string,
    sessionId?: string,
    pageContext?: PageContext
  ): Promise<AIMessageResponse> {
    // Generate or reuse session ID
    const session = sessionId || crypto.randomUUID();
    
    // TODO: In Phase 3, this calls actual LLM
    // For now, return placeholder response
    const response = this.generatePlaceholderResponse(message, pageContext);
    
    // Track cost (even for placeholder, to test infrastructure)
    const inputTokens = Math.ceil(message.length / 4);
    const outputTokens = Math.ceil(response.content.length / 4);
    const cost = this.calculateCost(inputTokens, outputTokens);
    
    await this.costTracker.trackOperation(
      tenantId,
      'ai',
      1,
      `AI message: ${message.substring(0, 50)}...`
    );
    
    // Store session cost
    await prisma.aiSessionCost.upsert({
      where: { sessionId: session },
      create: {
        tenantId,
        userId,
        sessionId: session,
        inputTokens,
        outputTokens,
        dollarCost: cost,
      },
      update: {
        inputTokens: { increment: inputTokens },
        outputTokens: { increment: outputTokens },
        dollarCost: { increment: cost },
      },
    });
    
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.content,
      suggestions: response.suggestions,
      tokenCount: inputTokens + outputTokens,
      cost,
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1000) * PRICING.inputCostPer1K 
         + (outputTokens / 1000) * PRICING.outputCostPer1K;
  }

  async getSpendingStatus(tenantId: string): Promise<AISpendingStatus> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const [monthlyUsage, settings] = await Promise.all([
      prisma.aiMonthlyUsage.findUnique({
        where: { tenantId_month: { tenantId, month: currentMonth } },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { aiMonthlyLimit: true, aiWarningThreshold: true },
      }),
    ]);
    
    const monthlyLimit = settings?.aiMonthlyLimit ?? 50;
    const warningThreshold = settings?.aiWarningThreshold ?? 0.8;
    const monthlySpend = monthlyUsage?.totalCost ?? 0;
    
    return {
      sessionCost: 0, // Set by frontend from conversation
      monthlySpend,
      monthlyLimit,
      isAtLimit: monthlySpend >= monthlyLimit,
      warningThreshold,
    };
  }
}
```

## Suggestion Types

The AI can return three types of suggestions:

### Navigate

Take the user to a different page:

```typescript
{
  type: 'navigate',
  label: 'View all contacts',
  path: '/contacts/all'
}
```

### Show Me

Explain how to do something (teaching mode):

```typescript
{
  type: 'show_me',
  label: 'Show me how to import contacts',
}
```

### Do It

Execute an action:

```typescript
{
  type: 'do_it',
  label: 'Create this contact',
  action: {
    id: 'create-contact',
    label: 'Create contact',
    destructive: false,
    requiresConfirmation: false,
    parameters: [
      { name: 'email', type: 'string', required: true },
      { name: 'firstName', type: 'string', required: false },
    ]
  }
}
```

## Security

### Forbidden Actions

Some actions are never allowed via AI:

```typescript
const FORBIDDEN_ACTIONS = [
  'delete_account',
  'change_billing',
  'export_all_data',
  'delete_all_contacts',
  'modify_user_permissions',
];
```

### Destructive Action Flow

1. AI proposes action
2. User sees confirmation dialog
3. For high-risk actions, require typing confirmation
4. Action logged with full audit trail
5. Undo offered (if applicable)

## Implementation Phases

### Phase 1: Foundation
- Panel UI with slide animation
- Cmd/Ctrl+K keyboard shortcut
- Message thread display
- Cost tracking infrastructure

### Phase 2: Context & Navigation
- Page context registration
- Context indicator in panel
- Navigation suggestions
- "Show me how" teaching mode

### Phase 3: LLM Integration
- Connect to OpenAI/Anthropic API
- Prompt engineering with context
- Real AI responses
- Token counting from API

### Phase 4: Actions
- Execute actions from suggestions
- Visual feedback during execution
- Confirmation dialogs
- Undo capability
- Audit logging
