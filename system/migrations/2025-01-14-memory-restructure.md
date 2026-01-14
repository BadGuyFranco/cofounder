# Migration: Memory Directory Restructure

**Version:** 2025-01-14  
**Breaking:** Yes  
**Affects:** All users with existing `/memory/` directory

## What Changed

The `/memory/` directory now mirrors the `/cofounder/` structure:

| Old Path | New Path |
|----------|----------|
| `/memory/Connectors/` | `/memory/connectors/` |
| `/memory/Content Author/` | `/memory/tools/Content Author/` |
| `/memory/Image Generator/` | `/memory/tools/Image Generator/` |
| `/memory/Video Generator/` | `/memory/tools/Video Generator/` |
| `/memory/Documentor/` | `/memory/tools/Documentor/` |
| `/memory/my plans/` | `/memory/plans/` |

## Why

- Consistent structure: `/memory/` now mirrors `/cofounder/`
- Clearer organization: tools config in `tools/`, connector credentials in `connectors/`
- Eliminates case-sensitivity issues (`Connectors` vs `connectors`)

## Migration Steps

Run these commands from your workspace root:

```bash
cd /path/to/your/memory/

# 1. Create new structure
mkdir -p tools
mkdir -p plans
mkdir -p system

# 2. Move tool configs to tools/
[ -d "Content Author" ] && mv "Content Author" tools/
[ -d "Image Generator" ] && mv "Image Generator" tools/
[ -d "Video Generator" ] && mv "Video Generator" tools/
[ -d "Documentor" ] && mv "Documentor" tools/

# 3. Rename Connectors to connectors (lowercase)
[ -d "Connectors" ] && mv "Connectors" connectors

# 4. Move plans
[ -d "my plans" ] && mv "my plans"/* plans/ 2>/dev/null && rmdir "my plans"

# 5. Update version
echo "2025-01-14" > system/version.txt
```

## Verification

After migration, your `/memory/` structure should be:

```
/memory/
├── system/version.txt              ← Contains "2025-01-14"
├── tools/
│   ├── Content Author/
│   │   └── voice.md
│   ├── Image Generator/
│   ├── Video Generator/
│   └── Documentor/
├── connectors/
│   └── [platform]/.env
├── my tools/
├── my connectors/
├── plans/
└── README.md
```

Verify with:

```bash
ls -la /memory/
ls -la /memory/tools/
ls -la /memory/connectors/
cat /memory/system/version.txt
```

## Rollback

If you need to revert (not recommended):

```bash
cd /path/to/your/memory/

# Move tools back to root
mv tools/Content\ Author ./
mv tools/Image\ Generator ./
mv tools/Video\ Generator ./
mv tools/Documentor ./
rmdir tools

# Rename connectors back
mv connectors Connectors

# Move plans back
mkdir "my plans"
mv plans/* "my plans"/
rmdir plans

# Reset version
rm system/version.txt
```

## Updated Files

This migration updated 90+ files in `/cofounder/`:
- All connector scripts (utils.js, auth.js)
- All AGENTS.md and SETUP.md files
- Documentation and templates
- Cursor rules

## Questions?

If migration fails or you encounter issues, the old paths will simply not be found by the updated tools. Re-run the migration steps above.
