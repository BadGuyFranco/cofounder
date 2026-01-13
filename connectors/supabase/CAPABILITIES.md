# Supabase Connector Capabilities

Complete reference for all available scripts, commands, and workflows.

## Available Scripts

### Account-Level (Management API)

| Script | Purpose |
|--------|---------|
| `management.js` | List/create/delete projects, get API keys, configure credentials |

### Project-Level (require `--project <name>`)

| Script | Purpose | Destructive? |
|--------|---------|--------------|
| `projects.js` | Get project info and health | read-only |
| `tables.js` | List tables and schema info | read-only |
| `records.js` | Create, read, update, delete records | delete |
| `storage.js` | Manage storage buckets and files | delete |
| `auth.js` | Manage auth users | delete |
| `functions.js` | List and invoke edge functions | varies |
| `sql.js` | Execute raw SQL queries | varies |

**Note:** `<name>` is the human-readable project name (e.g., `test-project`) or the project reference ID.

## Getting Script Help

```bash
node scripts/management.js help
node scripts/projects.js help
node scripts/tables.js help
node scripts/records.js help
node scripts/storage.js help
node scripts/auth.js help
node scripts/functions.js help
node scripts/sql.js help
```

## Key Concepts

**Access Token:** Account-level authentication for the Management API. Created in dashboard under Account > Access Tokens. Starts with `sbp_`.

**Project:** A Supabase instance with database, auth, storage, and functions. Each has a unique reference ID (e.g., `abcdefghijkl`).

**Service Role Key:** Project-level admin key that bypasses Row Level Security. Auto-retrieved via `management.js configure`.

**Project Reference:** The subdomain in your project URL (e.g., `abcdefghijkl` from `https://abcdefghijkl.supabase.co`). Locally, projects are stored using human-readable names (e.g., `test-project.env`).

## Management Commands

### List Projects
```bash
node scripts/management.js list
node scripts/management.js list --verbose
```

### List Organizations
```bash
node scripts/management.js orgs
```

### Get Project Info
```bash
node scripts/management.js info <project-ref>
```

### Get Project API Keys
```bash
node scripts/management.js keys <project-ref>
```

### Create a New Project
```bash
node scripts/management.js create "project-name"
node scripts/management.js create "project-name" --region us-west-1
node scripts/management.js create "project-name" --org <org-id> --region eu-west-1
```

### Configure Project for Local Use
```bash
node scripts/management.js configure <project-ref>
```
This auto-retrieves API keys and saves them locally.

### Pause/Restore Project
```bash
node scripts/management.js pause <project-ref>
node scripts/management.js restore <project-ref>
```

### Delete Project
```bash
node scripts/management.js delete <project-ref>
node scripts/management.js delete <project-ref> --force
```

## Available Regions

| Region | Location |
|--------|----------|
| `us-east-1` | US East (N. Virginia) - Default |
| `us-west-1` | US West (N. California) |
| `eu-west-1` | Europe (Ireland) |
| `eu-west-2` | Europe (London) |
| `eu-central-1` | Europe (Frankfurt) |
| `ap-southeast-1` | Asia Pacific (Singapore) |
| `ap-northeast-1` | Asia Pacific (Tokyo) |
| `ap-south-1` | Asia Pacific (Mumbai) |
| `sa-east-1` | South America (Sao Paulo) |

## Database Operations

### List Tables
```bash
node scripts/tables.js list --project test-project
```

### Get Table Schema
```bash
node scripts/tables.js schema <table-name> --project <name>
node scripts/tables.js schema users --project test-project --verbose
```

### List Records
```bash
node scripts/records.js list <table> --project <name>
node scripts/records.js list users --project test-project
node scripts/records.js list users --project test-project --limit 10
node scripts/records.js list users --project test-project --select "id,email,name"
```

### Filter Records
```bash
node scripts/records.js list users --project test-project --filter "role=eq.admin"
node scripts/records.js list users --project test-project --filter "age=gt.18"
node scripts/records.js list orders --project test-project --filter "status=in.(pending,processing)"
```

### Get Single Record
```bash
node scripts/records.js get <table> --filter "id=eq.123" --project <name>
```

### Create Record
```bash
node scripts/records.js create <table> --data '{"field": "value"}' --project <name>
node scripts/records.js create users --data '{"email": "user@example.com", "name": "John"}' --project test-project
```

### Create Multiple Records
```bash
node scripts/records.js create <table> --data '[{"name": "A"}, {"name": "B"}]' --project <name>
```

### Update Records
```bash
node scripts/records.js update <table> --filter "id=eq.123" --data '{"field": "newvalue"}' --project <name>
node scripts/records.js update users --filter "id=eq.1" --data '{"name": "Jane"}' --project test-project
```

### Upsert Records
```bash
node scripts/records.js upsert <table> --data '{"id": 1, "name": "John"}' --conflict "id" --project <name>
```

### Delete Records
```bash
node scripts/records.js delete <table> --filter "id=eq.123" --project <name>
node scripts/records.js delete users --filter "id=eq.1" --project test-project --force
```

## Filter Operators

Supabase uses PostgREST filter syntax:

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equals | `status=eq.active` |
| `neq` | Not equals | `status=neq.deleted` |
| `gt` | Greater than | `age=gt.18` |
| `gte` | Greater or equal | `age=gte.21` |
| `lt` | Less than | `price=lt.100` |
| `lte` | Less or equal | `price=lte.50` |
| `like` | Pattern match | `name=like.*john*` |
| `ilike` | Case-insensitive like | `email=ilike.*@gmail.com` |
| `in` | In list | `status=in.(active,pending)` |
| `is` | Is null/true/false | `deleted_at=is.null` |

Multiple filters: `--filter "role=eq.admin&active=eq.true"`

## Storage Operations

### List Buckets
```bash
node scripts/storage.js buckets --project test-project
```

### Create Bucket
```bash
node scripts/storage.js create-bucket <bucket-name> --project <name>
node scripts/storage.js create-bucket public-assets --public --project test-project
```

### Delete Bucket
```bash
node scripts/storage.js delete-bucket <bucket-name> --project <name>
node scripts/storage.js delete-bucket old-files --force --project test-project
```

### List Files
```bash
node scripts/storage.js list <bucket> --project <name>
node scripts/storage.js list my-bucket images/ --project test-project
```

### Upload File
```bash
node scripts/storage.js upload <bucket> <local-path> [remote-path] --project <name>
node scripts/storage.js upload my-bucket ./photo.jpg --project test-project
node scripts/storage.js upload my-bucket ./photo.jpg images/photo.jpg --project test-project
```

### Download File
```bash
node scripts/storage.js download <bucket> <remote-path> [local-path] --project <name>
node scripts/storage.js download my-bucket images/photo.jpg ./downloaded.jpg --project test-project
```

### Delete File
```bash
node scripts/storage.js delete <bucket> <path> --project <name>
node scripts/storage.js delete my-bucket images/old.jpg --force --project test-project
```

### Get Signed URL
```bash
node scripts/storage.js url <bucket> <path> --project <name>
node scripts/storage.js url my-bucket images/photo.jpg --expires 604800 --project test-project
```

## Auth Operations

### List Users
```bash
node scripts/auth.js list --project test-project
node scripts/auth.js list --page 1 --per_page 10 --project test-project
```

### Get User
```bash
node scripts/auth.js get <user-id> --project <name>
```

### Create User
```bash
node scripts/auth.js create --email "user@example.com" --password "secure123" --project <name>
node scripts/auth.js create --email "user@example.com" --password "pass" --data '{"name": "John"}' --project test-project
```

### Update User
```bash
node scripts/auth.js update <user-id> --data '{"email": "new@example.com"}' --project <name>
node scripts/auth.js update <user-id> --data '{"user_metadata": {"name": "Jane"}}' --project test-project
node scripts/auth.js update <user-id> --data '{"ban_duration": "24h"}' --project test-project
```

### Delete User
```bash
node scripts/auth.js delete <user-id> --project <name>
node scripts/auth.js delete <user-id> --force --project test-project
```

## Functions Operations

### List Functions
```bash
node scripts/functions.js list --project test-project
```

### Invoke Edge Function
```bash
node scripts/functions.js invoke <function-name> --project <name>
node scripts/functions.js invoke process-data --data '{"input": "test"}' --project test-project
```

### Invoke RPC (Database Function)
```bash
node scripts/functions.js rpc <function-name> --project <name>
node scripts/functions.js rpc calculate_total --data '{"order_id": 123}' --project test-project
```

## SQL Operations

**Note:** Requires `exec_sql` function to be created in your database. Run `node scripts/sql.js setup` for instructions.

### Execute Query
```bash
node scripts/sql.js "SELECT * FROM users LIMIT 10" --project <name>
node scripts/sql.js "SELECT COUNT(*) FROM orders" --project test-project
```

### Execute from File
```bash
node scripts/sql.js --file query.sql --project <name>
```

## Project Health

### Get Project Info
```bash
node scripts/projects.js info --project test-project
node scripts/projects.js info --project test-project --verbose
```

### Health Check
```bash
node scripts/projects.js health --project test-project
```

## Global Options

All project-level scripts support:

| Option | Description |
|--------|-------------|
| `--project <name>` | Target project by human-readable name or ref (required if multiple configured) |
| `--verbose` | Show full API responses |
| `--limit N` | Max records to return (default: 100) |
| `--offset N` | Number of records to skip |
| `--force` | Skip delete confirmations |

## Rate Limits

Supabase enforces rate limits based on your plan:
- **Free tier:** 500 requests per day for edge functions
- **Pro tier:** Higher limits based on plan

Database queries are limited by connection pool size, not request count.

## Tips

- Use `management.js configure` to auto-retrieve and store project credentials with human-readable names
- All scripts require `--project <name>` when multiple projects are configured
- Table and column names are case-sensitive
- Use `--verbose` to debug API responses
- The `service_role` key bypasses Row Level Security (RLS)
- Free tier projects pause after 1 week of inactivity; use `management.js restore` to resume
- Column names in Supabase typically use snake_case
- You can use either the human-readable project name (e.g., `test-project`) or the project reference ID
