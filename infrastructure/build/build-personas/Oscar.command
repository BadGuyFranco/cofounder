#!/bin/bash
# ============================================================
# Oscar -- Build Orchestrator Launcher (CoMarketer)
# ============================================================
# Double-click this file to launch a two-session build:
#   1. Bob (Builder) runs in a tmux session
#   2. Oscar (Orchestrator) runs in this terminal
#
# The founder can watch Bob by opening another Terminal tab and
# running:  tmux attach -t comarketer-bob
#
# Both sessions load the CoMarketer workspace:
#   cofounder/, memory/, CoMarketer/, Infrastructure Template/
# ============================================================

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

# --- Resolve paths relative to this script ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COFOUNDER_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SHARED_DIR="$(dirname "$COFOUNDER_DIR")"
CLAUDE_CONFIG_DIR="$SHARED_DIR/claude"
WS_FILE="$SHARED_DIR/Workspaces/CoMarketer.code-workspace"

if [ ! -f "$WS_FILE" ]; then
  echo "Error: Workspace file not found: $WS_FILE"
  exit 1
fi

# --- Parse workspace and resolve directories ---
WS_FILE_DIR="$(dirname "$WS_FILE")"

declare -a RESOLVED_DIRS=()
declare -a DIR_NAMES=()

while IFS= read -r line; do
  RAW_PATH=$(echo "$line" | sed -n 's/.*"path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  RAW_NAME=$(echo "$line" | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

  if [ -n "$RAW_PATH" ]; then
    ABSOLUTE_PATH="$(cd "$WS_FILE_DIR" && cd "$RAW_PATH" 2>/dev/null && pwd)" || true
    if [ -n "$ABSOLUTE_PATH" ] && [ -d "$ABSOLUTE_PATH" ]; then
      DISPLAY_NAME="${RAW_NAME:-$(basename "$ABSOLUTE_PATH")}"
      RESOLVED_DIRS+=("$ABSOLUTE_PATH")
      DIR_NAMES+=("$DISPLAY_NAME")
    fi
  fi
done < <(python3 -c "
import json, sys
with open('$WS_FILE') as f:
    ws = json.load(f)
for folder in ws.get('folders', []):
    parts = []
    if 'name' in folder:
        parts.append('\"name\": \"' + folder['name'] + '\"')
    parts.append('\"path\": \"' + folder['path'] + '\"')
    print('{' + ', '.join(parts) + '}')
")

if [ ${#RESOLVED_DIRS[@]} -eq 0 ]; then
  echo "Error: No valid directories found in workspace"
  exit 1
fi

# --- Build --add-dir flags ---
PRIMARY_DIR="${RESOLVED_DIRS[0]}"
ADD_DIR_FLAGS=""
for i in "${!RESOLVED_DIRS[@]}"; do
  if [ "$i" -gt 0 ]; then
    ADD_DIR_FLAGS="$ADD_DIR_FLAGS --add-dir \"${RESOLVED_DIRS[$i]}\""
  fi
done

# --- Auto-trust primary directory ---
CLAUDE_JSON="$HOME/.claude.json"
if [ -f "$CLAUDE_JSON" ]; then
  python3 -c "
import json
p = '$CLAUDE_JSON'
d = '$PRIMARY_DIR'
with open(p) as f: data = json.load(f)
if 'projects' not in data: data['projects'] = {}
if d not in data['projects']: data['projects'][d] = {}
if not data['projects'][d].get('hasTrustDialogAccepted'):
    data['projects'][d]['hasTrustDialogAccepted'] = True
    with open(p, 'w') as f: json.dump(data, f, indent=2)
"
fi

# --- Auto-fix execute permission on send-to-bob.sh ---
SEND_SCRIPT="$SCRIPT_DIR/send-to-bob.sh"
if [ -f "$SEND_SCRIPT" ] && [ ! -x "$SEND_SCRIPT" ]; then
  chmod +x "$SEND_SCRIPT"
fi

TMUX_SESSION="comarketer-bob"

echo ""
echo "========================================"
echo "  Oscar -- Build Orchestrator"
echo "  Workspace: CoMarketer"
echo "========================================"
echo ""
echo "  Directories:"
for i in "${!DIR_NAMES[@]}"; do
  echo "    ${DIR_NAMES[$i]} -> ${RESOLVED_DIRS[$i]}"
done
echo ""

# --- Kill any existing Bob session ---
if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
  echo "  Found existing Bob session ($TMUX_SESSION). Killing it."
  tmux kill-session -t "$TMUX_SESSION"
fi

# --- Launch Bob in tmux ---
echo "  Launching Bob in tmux session: $TMUX_SESSION"
echo ""

BOB_CMD="cd \"$PRIMARY_DIR\" && CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --dangerously-skip-permissions --add-dir \"$CLAUDE_CONFIG_DIR\" $ADD_DIR_FLAGS"

tmux new-session -d -s "$TMUX_SESSION" -x 200 -y 50
tmux send-keys -t "$TMUX_SESSION" "$BOB_CMD" Enter

echo "  Bob is running in tmux session: $TMUX_SESSION"
echo ""
echo "  To watch Bob, open another Terminal tab and run:"
echo "    tmux attach -t $TMUX_SESSION"
echo ""
echo "  To send a message to Bob from Oscar's session:"
echo "    $SCRIPT_DIR/send-to-bob.sh \"Your message here\""
echo ""
echo "  Starting Oscar..."
echo ""

# --- Launch Oscar in this terminal ---
# Oscar gets the same workspace context but operates as the orchestrator persona.
# His initial prompt tells him to read his playbook and begin the checkpoint protocol.
OSCAR_PROMPT="You are Oscar, the Build Orchestrator for CoMarketer. Read your playbook at infrastructure/build/build-personas/oscar.md and the persona model at infrastructure/build/build-personas/AGENTS.md. Then read PRIORITIES.md, the active plan status, and SESSION_LOG.md (last 2-3 entries). Bob is running in a separate tmux session ($TMUX_SESSION). You communicate with Bob using the send-to-bob.sh script. Begin your checkpoint protocol based on what you find in the current state of work."

cd "$PRIMARY_DIR"
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1
eval claude --dangerously-skip-permissions --add-dir \"$CLAUDE_CONFIG_DIR\" $ADD_DIR_FLAGS -p \""$OSCAR_PROMPT"\"
