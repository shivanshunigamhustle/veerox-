"""Tests for apps.api.core.memory — history loader and turn persistence."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.core.memory import load_last_n, persist_turn
from apps.api.db.models import Conversation, Message, Org, User

# UUIDs reused across tests — keeping them stable makes failures easier to read.
ORG_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000aaa")
CONV_ID = uuid.UUID("00000000-0000-0000-0000-000000000bbb")


async def _seed_org_and_user(db: AsyncSession) -> None:
    db.add(Org(id=ORG_ID, name="Test Org"))
    db.add(User(id=USER_ID, org_id=ORG_ID, phone="+910000000001", name="Test"))
    db.add(Conversation(id=CONV_ID, org_id=ORG_ID, user_id=USER_ID, channel="whatsapp"))
    await db.commit()


async def _add_message(
    db: AsyncSession,
    role: str,
    content: str,
    *,
    minutes_ago: int,
) -> None:
    msg = Message(
        org_id=ORG_ID,
        conversation_id=CONV_ID,
        user_id=USER_ID,
        role=role,
        content=content,
        channel="whatsapp",
        created_at=datetime.now(UTC) - timedelta(minutes=minutes_ago),
    )
    db.add(msg)
    await db.commit()


async def test_load_last_n_returns_chronological_order(db_session: AsyncSession) -> None:
    """Oldest message first, newest last — the order the LLM wants."""
    await _seed_org_and_user(db_session)
    await _add_message(db_session, "user", "first", minutes_ago=30)
    await _add_message(db_session, "assistant", "second", minutes_ago=20)
    await _add_message(db_session, "user", "third", minutes_ago=10)

    history = await load_last_n(db_session, USER_ID, n=10)

    assert [m["content"] for m in history] == ["first", "second", "third"]
    assert [m["role"] for m in history] == ["user", "assistant", "user"]


async def test_load_last_n_count_cap(db_session: AsyncSession) -> None:
    """The n parameter caps the number of messages returned (newest kept)."""
    await _seed_org_and_user(db_session)
    for i in range(10):
        await _add_message(db_session, "user", f"msg-{i}", minutes_ago=10 - i)

    history = await load_last_n(db_session, USER_ID, n=3)

    # n=3 selects the 3 newest, then reverses → ["msg-7","msg-8","msg-9"].
    assert [m["content"] for m in history] == ["msg-7", "msg-8", "msg-9"]


async def test_load_last_n_token_budget_drops_oldest(db_session: AsyncSession) -> None:
    """Token-budget cap drops oldest first — guards the 'tool-heavy turn' case."""
    await _seed_org_and_user(db_session)
    # Each ~ 100-char message is ~25 tokens. Five of them are ~125 tokens.
    for i in range(5):
        await _add_message(db_session, "user", "x" * 100, minutes_ago=10 - i)

    history = await load_last_n(db_session, USER_ID, n=10, token_budget=60)

    # Some oldest entries are dropped to land under the 60-token budget.
    assert len(history) < 5
    # Whatever survives is the most-recent tail in chronological order.
    assert all(m["content"] == "x" * 100 for m in history)


async def test_persist_turn_writes_user_and_assistant_rows(db_session: AsyncSession) -> None:
    """persist_turn inserts both rows in one commit; tokens attributed to assistant."""
    await _seed_org_and_user(db_session)

    await persist_turn(
        db_session,
        conversation_id=CONV_ID,
        user_id=USER_ID,
        org_id=ORG_ID,
        channel="whatsapp",
        user_text="hello",
        assistant_text="hi back",
        tokens_in=10,
        tokens_out=4,
    )

    rows = (
        await db_session.execute(
            select(Message).where(Message.conversation_id == CONV_ID).order_by(Message.role.asc())
        )
    ).scalars().all()

    assert len(rows) == 2
    by_role = {r.role: r for r in rows}
    assert by_role["user"].content == "hello"
    assert by_role["user"].tokens_in is None
    assert by_role["assistant"].content == "hi back"
    assert by_role["assistant"].tokens_in == 10
    assert by_role["assistant"].tokens_out == 4
