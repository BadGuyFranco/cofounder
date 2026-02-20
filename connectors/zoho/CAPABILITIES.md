# Zoho CRM Connector Capabilities

What this connector can do for you.

## Edition-Aware Usage

- Capabilities vary by Zoho CRM edition (`standard`, `professional`, `enterprise`, `ultimate`)
- The connector stores your expected edition per org in `/memory/connectors/zoho/<org>.json` as `edition`
- Before using advanced automation features, confirm edition with:
  - `node scripts/auth.js edition --org <name>`
- Update edition when your plan changes:
  - `node scripts/auth.js edition --org <name> --edition professional`

## Record Management

- List, view, create, update, and delete records in any module
- Supported modules: Leads, Contacts, Accounts, Deals, Products, Tasks, Calls, Events, Notes, Quotes, Invoices, Vendors, and custom modules
- Convert Leads to Contacts/Accounts/Deals
- Upsert records (insert or update based on duplicate check)
- Get related records between modules
- Filter records with criteria

## Search and Queries

- Keyword search across modules
- COQL queries (SQL-like syntax for complex searches)
- Criteria-based filtering
- Sort and paginate results

## Workflow Automation

- List, create, update, and delete workflow rules
- Enable and disable workflow rules
- Configure trigger types for create, edit, create_or_edit, delete, field update, date triggers, scoring triggers, and email triggers
- Build nested criteria logic with AND/OR groups for field-level segmentation
- Attach and inspect instant actions on workflow conditions
- Build scheduled actions where supported by trigger type
- View workflow action wiring and dependencies
- Create automation end-to-end by API (action + workflow + criteria + activation)

## Workflow Scheduled Actions

Scheduled actions delay execution after a workflow triggers. The API has specific constraints.

### Creating scheduled actions via API

The Zoho API requires at least one instant action per workflow condition. To create a workflow where the only real action is delayed:

1. Create an email notification action via `POST /settings/automation/email_notifications`
2. Create the workflow with a no-op instant action (e.g., `add_tags` with an existing tag) and the email as a scheduled action

```json
{
  "conditions": [{
    "sequence_number": 1,
    "instant_actions": {
      "actions": [{
        "type": "add_tags",
        "details": {
          "tags": [{ "name": "existing-tag-name", "id": "tag_id" }]
        },
        "related_details": null
      }]
    },
    "scheduled_actions": [{
      "execute_after": {
        "period": "minutes",
        "unit": 2
      },
      "actions": [{
        "id": "email_notification_action_id",
        "type": "email_notifications"
      }]
    }]
  }]
}
```

### Scheduled action field mapping

The `execute_after` object uses `period` for the time unit string and `unit` for the integer count. This is the opposite of what you might expect.

| Key | Type | Values |
|-----|------|--------|
| `period` | string | `minutes`, `hours`, `business_hours`, `days`, `business_days`, `weeks`, `months`, `years` |
| `unit` | integer | Number of periods to wait |

### API constraints for scheduled actions

- `instant_actions` is mandatory per condition; you cannot have only scheduled actions
- `repeat: true` and scheduled actions are mutually exclusive. Set `repeat: false` when using scheduled actions.
- Minimum delay for `minutes` is 2. `unit: 1` with `period: "minutes"` returns `DEPENDENT_MISMATCH`.
- The `id` in scheduled action `actions` must reference a pre-existing email notification action, task action, etc. You cannot define action details inline.
- Scheduled actions cannot be added to an existing workflow via update if it was created with only instant actions. Delete and recreate.

### Creating the email notification action

Before referencing an email notification in a workflow, create it separately:

```
POST /settings/automation/email_notifications
```

Required fields: `name`, `feature_type` ("workflow"), `module` (api_name + id), `template` (id + name), `recipients` (to array).

When sending to external email addresses (not CRM users), `from_address` is required. Use `type: "merge_field"` with `api_name: "${!Current.User.Email}"` for current user's email.

Recipient format for direct email addresses:
```json
{
  "type": "emails",
  "details": {
    "emails": ["recipient@example.com"]
  }
}
```

## Email Notification Actions (Automation Actions)

- List, create, update, and delete email notification actions
- Bind email templates to notification actions
- Configure recipients using direct emails and supported CRM recipient resource types
- Configure sender identity with supported from-address types (including organization email addresses)
- Reuse one email notification action across multiple workflow rules
- Link email notification action IDs into workflow instant actions (`type: email_notifications`)

## Cross-Brand Workflow Patterns

- Build shared automation rules that route multiple brands through one workflow
- Segment by business context fields such as `Entity_Affiliation`, `Lead_Source`, and status fields
- Support one shared template/action pattern for multi-brand website form notifications
- Keep one automation layer while preserving brand attribution inside record criteria and template merge fields
- Implement and maintain these cross-brand rules fully via API, not only via UI

### Common pattern: Website form alerts

- Create one reusable email template in Contacts
- Create one email notification action that references that template and target recipient(s)
- Create one workflow rule on Contacts with criteria for website submissions
- Attach the email notification action as an instant action in the workflow rule

## Blueprint Process Automation

- Get blueprint transitions for records
- Execute transitions to move records through processes
- View required fields for each transition
- Support for all blueprint-enabled modules

## Deal Pipelines

- List all pipelines
- View pipeline stages with probabilities
- Create new pipelines with custom stages
- Update pipeline names and stage order
- Delete pipelines (with deal transfer)

## Scoring Rules

- List and manage lead/contact scoring rules
- Create field-based scoring criteria
- Create signal-based scoring rules
- Enable, disable, clone scoring rules
- Execute scoring on existing records
- Get entity scores for individual records

## Webhook Integrations

- List, create, update, delete webhooks
- Configure webhook URLs and HTTP methods
- Set up module and custom parameters
- Configure authentication headers

## Module Management

- List all standard and custom modules
- View module metadata and settings
- Create and update custom modules
- View layouts for each module
- View related lists between modules

## Field Management

- List fields in any module
- View field metadata (type, required, unique)
- Create custom fields (text, picklist, lookup, etc.)
- Update and delete custom fields
- Get picklist values for fields
- Manage global picklists

## User and Organization

- List and view users
- View current user details
- List roles and role hierarchy
- List profiles and permissions
- View territories
- Get organization details (read-only)
- View business hours, fiscal year, holidays
- List configured currencies

## Tag Management

- List tags in any module
- Create, update, delete tags
- Add and remove tags from records
- Merge tags
- Get record count per tag

## Bulk Operations

- Bulk read: Export up to 200,000 records
- Bulk write: Import up to 25,000 records per file
- Check job status
- Download results
- Support for insert, update, and upsert operations

## Multi-Organization

- Configure multiple Zoho organizations
- Switch between organizations with --org flag
- Separate authentication per organization
- Support for all Zoho data centers (US, EU, IN, AU, JP, CN, CA)

## Email Templates

- List all email templates (by module or globally)
- Get full template details including subject, HTML content, merge tokens, and folder
- Create new email templates with subject, HTML content, module binding, and folder assignment
- Update existing email templates (subject, content, name)
- Delete email templates
- Required fields for creation: `name`, `subject`, `module` (api_name + id), `editor_mode` ("rich_text"), `category` ("normal"), `content` (HTML)
- Optional: `folder` (id) to organize templates into folders
- Merge tokens use Zoho format: `${!Contacts.First_Name}`, `${!Contacts.id}`, etc.

## Zoho v8 API Notes

### Workflow status format

The v8 API returns and expects `status` as an object, not a string:

- Enable: `{ "status": { "active": true } }`
- Disable: `{ "status": { "active": false, "delete_schedule_action": false } }`

The `delete_schedule_action` field is required when deactivating a workflow. Set to `false` to preserve scheduled actions, `true` to cancel pending scheduled actions.

## Limitations

- Organization settings are read-only (modify via Zoho web UI)
- Blueprint configuration is read-only (create via Zoho web UI)
- Assignment rule creation not supported (view only)
- Real-time notifications require external webhook server
- Bulk operations limited by Zoho plan quotas
- API rate limits based on Zoho edition (5,000 to unlimited credits/day)
