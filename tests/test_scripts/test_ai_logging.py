import json

import pytest

from scripts import log_cursor, log_hook


def _fake_git(command: str) -> str:
    values = {
        "git remote get-url origin": "https://example.com/team/P-164.git",
        "git rev-parse --abbrev-ref HEAD": "main",
        "git rev-parse --short HEAD": "abc1234",
        "git config user.email": "student@example.com",
    }
    return values.get(command, "")


@pytest.mark.parametrize(
    ("tool", "event"),
    [
        ("claude", "UserPromptSubmit"),
        ("gemini", "BeforeAgent"),
        ("codex", "UserPromptSubmit"),
        ("cursor", "beforeSubmitPrompt"),
        ("copilot", "userPromptSubmitted"),
        ("copilot", "UserPromptSubmit"),
    ],
)
def test_normalize_accepts_only_explicit_prompt_events(
    monkeypatch, tool, event
):
    monkeypatch.setattr(log_hook, "git", _fake_git)

    entry = log_hook.normalize(
        {"hook_event_name": event, "prompt": "Prompt written by user"},
        tool,
    )

    assert entry is not None
    assert entry["prompt"] == "Prompt written by user"
    assert "tool_input" not in entry
    assert "tool_response" not in entry


@pytest.mark.parametrize(
    ("tool", "event"),
    [
        ("claude", "PostToolUse"),
        ("claude", "postToolUse"),
        ("claude", "Stop"),
        ("cursor", "stop"),
        ("gemini", "AfterModel"),
        ("gemini", "SessionEnd"),
        ("codex", "Stop"),
        ("copilot", "sessionEnd"),
    ],
)
def test_normalize_rejects_tool_and_lifecycle_events(tool, event):
    entry = log_hook.normalize(
        {
            "hook_event_name": event,
            "tool_input": {"prompt": "generated internally"},
            "tool_response": "command output",
        },
        tool,
    )

    assert entry is None


def test_normalize_rejects_empty_prompt_hook(monkeypatch):
    monkeypatch.setattr(log_hook, "git", _fake_git)

    assert log_hook.normalize(
        {"hook_event_name": "UserPromptSubmit", "prompt": "   "},
        "claude",
    ) is None


def test_cursor_scanner_excludes_subagent_user_messages(tmp_path):
    project_dir = tmp_path / "project"
    transcript_dir = project_dir / "agent-transcripts" / "conversation-1"
    subagent_dir = transcript_dir / "subagents"
    subagent_dir.mkdir(parents=True)

    main_entry = {
        "role": "user",
        "message": {"content": "<user_query>Human prompt</user_query>"},
    }
    generated_entry = {
        "role": "user",
        "message": {"content": "<user_query>Generated subagent task</user_query>"},
    }
    (transcript_dir / "conversation-1.jsonl").write_text(
        json.dumps(main_entry) + "\n", encoding="utf-8"
    )
    (subagent_dir / "subagent-1.jsonl").write_text(
        json.dumps(generated_entry) + "\n", encoding="utf-8"
    )

    messages = list(
        log_cursor.iter_user_inputs(
            [project_dir], cutoff=None, only_conv=None, repo_root_n=""
        )
    )

    assert [message["text"] for message in messages] == ["Human prompt"]
