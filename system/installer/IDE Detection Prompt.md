# IDE Self-Identification Prompt

```
Run: env | grep -iE "(cursor|windsurf|antigravity)" | head -5

If result contains "windsurf" or WINDSURF_* env vars → You are in Windsurf Cascade
If result contains "cursor" or CURSOR_* env vars → You are in Cursor
If result contains "antigravity" or ANTIGRAVITY_* env vars → You are in Antigravity
```

On macOS, you can also check: `echo $__CFBundleIdentifier`
If env vars are empty but the bundle identifier includes "antigravity", treat the IDE as Antigravity.
If env vars are empty and the bundle identifier does not indicate Windsurf/Cursor/Antigravity, treat the IDE as a generic editor.
