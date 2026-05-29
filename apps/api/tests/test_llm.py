"""Tests for apps.api.core.llm — the OpenAI chat-completions wrapper.

We don't go through the real network. The wrapper exposes a private
``_create_completion`` thin coroutine that the public ``chat_completion``
delegates to — we monkeypatch that seam and feed in fake SDK-shaped objects.
This keeps the tests fast and free of the openai SDK's transport details.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pytest

from apps.api.core import llm
from apps.api.core.llm import ChatResult, chat_completion

# ---------------------------------------------------------------------------
# Minimal fakes that quack like the openai SDK's return types — only the
# attributes the wrapper reads need to be present.
# ---------------------------------------------------------------------------


@dataclass
class _FakeFunction:
    name: str
    arguments: str


@dataclass
class _FakeToolCall:
    id: str
    function: _FakeFunction


@dataclass
class _FakeMessage:
    content: str | None
    tool_calls: list[_FakeToolCall] | None = None


@dataclass
class _FakeChoice:
    message: _FakeMessage
    finish_reason: str = "stop"


@dataclass
class _FakeUsage:
    prompt_tokens: int
    completion_tokens: int


@dataclass
class _FakeResponse:
    choices: list[_FakeChoice]
    usage: _FakeUsage


def _patch_completion(monkeypatch: pytest.MonkeyPatch, response: _FakeResponse) -> None:
    async def fake(**_kwargs: Any) -> _FakeResponse:
        return response

    monkeypatch.setattr(llm, "_create_completion", fake)


async def test_chat_completion_parses_text_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    """Plain text response → ChatResult with content and zero tool calls."""
    _patch_completion(
        monkeypatch,
        _FakeResponse(
            choices=[
                _FakeChoice(message=_FakeMessage(content="Hello there.", tool_calls=None))
            ],
            usage=_FakeUsage(prompt_tokens=12, completion_tokens=4),
        ),
    )

    result = await chat_completion(messages=[{"role": "user", "content": "hi"}])

    assert isinstance(result, ChatResult)
    assert result.content == "Hello there."
    assert result.tool_calls == []
    assert result.tokens_in == 12
    assert result.tokens_out == 4
    assert result.finish_reason == "stop"


async def test_chat_completion_extracts_tool_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    """Response with tool_calls → ToolCall list preserves id, name, arguments_json."""
    _patch_completion(
        monkeypatch,
        _FakeResponse(
            choices=[
                _FakeChoice(
                    message=_FakeMessage(
                        content=None,
                        tool_calls=[
                            _FakeToolCall(
                                id="call_abc",
                                function=_FakeFunction(
                                    name="capture_lead",
                                    arguments='{"phone":"+91...","intent":"demo"}',
                                ),
                            )
                        ],
                    ),
                    finish_reason="tool_calls",
                )
            ],
            usage=_FakeUsage(prompt_tokens=50, completion_tokens=10),
        ),
    )

    result = await chat_completion(
        messages=[{"role": "user", "content": "book me"}],
        tools=[{"type": "function", "function": {"name": "capture_lead"}}],
    )

    assert result.content is None
    assert len(result.tool_calls) == 1
    tc = result.tool_calls[0]
    assert tc.id == "call_abc"
    assert tc.name == "capture_lead"
    assert tc.arguments_json == '{"phone":"+91...","intent":"demo"}'
    assert result.finish_reason == "tool_calls"
