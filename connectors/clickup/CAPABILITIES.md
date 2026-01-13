# ClickUp Connector Capabilities

What this connector can do for you.

## Workspaces

- List all workspaces you have access to
- View workspace details and members

## Spaces

- List spaces in a workspace
- Create new spaces with features configured
- Update space settings (name, privacy, color)
- Delete spaces

## Folders

- List folders in a space
- Create new folders
- Rename folders
- Delete folders

## Lists

- List all lists in a folder
- List folderless lists in a space
- Create lists in folders or directly in spaces
- Update list settings
- Delete lists

## Tasks

- Create tasks with full details (name, description, status, priority, due date)
- Update any task property
- Assign tasks to team members
- Set custom field values on tasks
- Move tasks between lists
- Delete tasks
- Search tasks across workspace
- Create and manage subtasks

## Comments

- Add comments to tasks
- Add comments to lists
- Update comment text
- Mark comments as resolved
- Assign comments to users
- Delete comments

## Time Tracking

- Start and stop timers on tasks
- Create manual time entries
- View time entries for tasks
- Get time entries within date ranges
- View currently running timer
- Update and delete time entries

## Goals

- Create goals with due dates and owners
- Create key results (number, currency, boolean, percentage, automatic)
- Update goal and key result progress
- Track completion percentage
- Delete goals and key results

## Views

- List views on spaces, folders, and lists
- Create views (list, board, calendar, gantt, timeline, table, etc.)
- Get tasks from specific views
- Update view settings (grouping, sorting, filters)
- Delete views

## Tags

- List tags in a space
- Create tags with custom colors
- Rename tags
- Add tags to tasks
- Remove tags from tasks
- Delete tags from space

## Custom Fields

- List custom field definitions
- Set field values on tasks (text, number, checkbox, dropdown, date, etc.)
- Remove field values from tasks

## Checklists

- Create checklists on tasks
- Add checklist items
- Mark items as complete
- Assign items to users
- Create nested checklist items
- Update and delete checklists and items

## Dependencies

- Add dependencies between tasks (blocking relationships)
- Add links between tasks (non-blocking references)
- Remove dependencies and links

## Attachments

- Upload files to tasks

## Webhooks

- List webhooks in workspace
- Create webhooks for various events (task, list, folder, space, goal changes)
- Filter webhooks to specific spaces, folders, lists, or tasks
- Update webhook endpoints and events
- Delete webhooks

## Members

- List workspace members
- View members with access to specific tasks
- View members with access to specific lists

## Guests

- Invite guests to tasks by email
- Set guest permissions (view, edit, comment)
- List guests on tasks
- Remove guests from tasks

## Templates

- List task templates in workspace
- Create tasks from templates

## Limitations

- 100 requests per minute rate limit
- Personal tokens have full account access (no granular scopes)
- Some features require paid plans (Goals, Dashboards, Guests)
- Subtask hierarchy limited to one level in API
- Bulk operations limited to 100 items per request
- Template creation/management requires web interface
- File attachments have size limits based on plan
- Webhook endpoints must be HTTPS