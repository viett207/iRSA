#!/usr/bin/env python3
"""
Shared AI prompt logger — works with Claude Code, Gemini CLI, Codex, Cursor,
and Copilot. Only explicit user-prompt events are written to
.ai-log/session.jsonl; tool-use and lifecycle events are ignored.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

VN_TZ = timezone(timedelta(hours=7))

# Keep this allowlist in addition to the hook configuration. It prevents a
# stale/global editor configuration from turning tool calls or stop events into
# log entries if it invokes this script directly.
PROMPT_EVENTS = {
    "claude": {"UserPromptSubmit"},
    "gemini": {"BeforeAgent"},
    "codex": {"UserPromptSubmit"},
    "cursor": {"beforeSubmitPrompt"},
    # Copilot's hook is named userPromptSubmitted, while some payload versions
    # report the normalized UserPromptSubmit event name.
    "copilot": {"userPromptSubmitted", "UserPromptSubmit"},
}


def git(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""


def detect_tool(data: dict) -> str:
    """Detect which AI tool sent this hook event.

    Priority:
      1. --tool=NAME CLI argument (cross-platform: works in cmd.exe, PowerShell, bash)
      2. AI_TOOL_NAME env var (legacy, bash-only when set inline)
      3. Heuristics from payload shape
    """
    for arg in sys.argv[1:]:
        if arg.startswith("--tool="):
            return arg.split("=", 1)[1].lower()
    tool_env = os.environ.get("AI_TOOL_NAME", "").lower()
    if tool_env:
        return tool_env
    # Heuristics
    if "transcript_path" in data:
        return "codex"
    if data.get("hook_event_name", "").startswith(("Before", "After", "Session", "Pre", "Notification")):
        return "gemini"
    if data.get("hook_event_name", "")[0:1].islower():
        # camelCase event names → Cursor or Copilot
        if "workspace_roots" in data:
            return "cursor"
        if "toolName" in data:
            return "copilot"
    if "hook_event_name" in data:
        return "claude"
    return "unknown"


def normalize(data: dict, tool: str) -> dict | None:
    """Normalize an explicit user-prompt payload to a common log entry."""
    event = data.get("hook_event_name") or data.get("event", "")
    if event not in PROMPT_EVENTS.get(tool, set()):
        return None

    ts = datetime.now(VN_TZ).isoformat()

    # Resolve repo from git origin. When cwd is not a git working tree (or
    # origin isn't set), skip the event entirely — these entries can't be
    # tied back to a team on the server and would just clutter the pending
    # queue forever.
    origin = git("git remote get-url origin")
    if not origin:
        return None
    repo = origin.rstrip("/").split("/")[-1]
    if repo.endswith(".git"):
        repo = repo[:-4]

    base = {
        "ts": ts,
        "tool": tool,
        "event": event,
        "session_id": (
            data.get("session_id") or
            data.get("conversation_id") or
            data.get("generation_id") or ""
        ),
        "model": data.get("model", ""),
        "repo": repo,
        "branch": git("git rev-parse --abbrev-ref HEAD"),
        "commit": git("git rev-parse --short HEAD"),
        "student": git("git config user.email"),
    }

    if tool == "claude":
        base.update({"prompt": data.get("prompt", "")[:1000]})

    elif tool == "gemini":
        base.update({"prompt": data.get("prompt", "")[:1000]})

    elif tool == "codex":
        base.update({
            "prompt": data.get("prompt", "")[:1000],
            "turn_id": data.get("turn_id", ""),
            "transcript_path": data.get("transcript_path", ""),
        })

    elif tool == "cursor":
        base.update({
            "prompt": data.get("prompt", "")[:1000],
            "files_context": data.get("attachments", []),
        })

    elif tool == "copilot":
        base.update({"prompt": data.get("prompt", "")[:1000]})

    # A prompt hook without text is not a user-authored prompt and must not
    # create a row in Phoenix.
    prompt = base.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return None

    return base


def main():
    # Read stdin as UTF-8 explicitly. On Windows, sys.stdin defaults to the
    # system code page (e.g. cp1252), which corrupts non-Latin1 prompts
    # (Vietnamese, CJK, emoji) into mojibake. The hook payload is always UTF-8.
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace").strip()
    if not raw:
        sys.exit(0)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        sys.exit(0)

    tool = detect_tool(data)
    entry = normalize(data, tool)
    if not entry:
        sys.exit(0)

    log_dir = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "session.jsonl"

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    # Hooks are side-effect-only: logging must not alter the submitted prompt.
    # Emit an empty response object because hook schemas are strict.
    print("{}")


if __name__ == "__main__":
    main()
