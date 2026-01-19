# IDE Self-Identification Prompt

```
Run: env | grep -iE "(cursor|windsurf)" | head -5

If result contains "windsurf" or WINDSURF_* env vars → You are in Windsurf Cascade
If result contains "cursor" or CURSOR_* env vars → You are in Cursor
```

On macOS, you can also check: `echo $__CFBundleIdentifier`
