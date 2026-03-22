#!/bin/bash
# ============================================================
# send-to-bob.sh -- Oscar's communication channel to Bob
# ============================================================
# Sends a message to Bob's Claude Code session running in tmux.
#
# Usage:
#   ./send-to-bob.sh "What did you find in research?"
#   ./send-to-bob.sh --read          (capture Bob's latest output)
#   ./send-to-bob.sh --read N        (capture last N lines)
#   ./send-to-bob.sh --status        (check if Bob's session is alive)
#
# Oscar calls this from within his Claude Code session via Bash tool.
# ============================================================

set -euo pipefail

TMUX_SESSION="comarketer-bob"

# --- Check tmux session exists ---
if ! tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
  echo "Error: Bob's tmux session ($TMUX_SESSION) is not running."
  echo "Launch Oscar.command first to start both sessions."
  exit 1
fi

# --- Parse arguments ---
if [ $# -eq 0 ]; then
  echo "Usage:"
  echo "  send-to-bob.sh \"message\"     Send a message to Bob"
  echo "  send-to-bob.sh --read        Read Bob's latest output"
  echo "  send-to-bob.sh --read N      Read last N lines of Bob's output"
  echo "  send-to-bob.sh --status      Check if Bob's session is alive"
  exit 0
fi

case "$1" in
  --status)
    echo "Bob's session ($TMUX_SESSION) is running."
    tmux list-panes -t "$TMUX_SESSION" -F "#{pane_width}x#{pane_height} #{pane_current_command}"
    ;;

  --read)
    LINES="${2:-100}"
    # Capture the visible pane content plus scrollback
    tmux capture-pane -t "$TMUX_SESSION" -p -S "-$LINES"
    ;;

  *)
    # Send the message as keystrokes to Bob's Claude Code input
    MESSAGE="$*"
    echo "Sending to Bob: $MESSAGE"
    # Use a brief pause between sending text and pressing Enter
    # to ensure Claude Code receives the full message
    tmux send-keys -t "$TMUX_SESSION" "$MESSAGE" Enter
    echo "Message sent. Use --read to check Bob's response."
    ;;
esac
