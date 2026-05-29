"""CLI REPL for manually exercising AgentCore during development.

Usage:
    python -m apps.api.cli.chat [--channel voice|whatsapp] [--user-id <uuid>]

Defaults to the seeded demo user (``scripts/seed.py``). Useful for the Day 1
acceptance gate — confirms the brain works end-to-end without any channel
adapter in the path.
"""

from __future__ import annotations

import argparse
import asyncio
import uuid
from typing import Literal, cast

from apps.api.core.agent import agent_core
from apps.api.db.session import AsyncSessionLocal

# Matches the user inserted by ``scripts/seed.py`` — running the REPL right
# after seeding "just works" without needing to look up an id first.
DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


async def _repl(user_id: uuid.UUID, channel: Literal["voice", "whatsapp"]) -> None:
    print(f"Veerox CLI — channel={channel} user_id={user_id}")
    print("Type your message (Ctrl-C or :q to exit).\n")

    while True:
        try:
            text = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye.")
            return

        if not text:
            continue
        if text in {":q", ":quit", ":exit"}:
            print("Bye.")
            return

        # A fresh session per turn keeps transaction lifetimes short — the
        # same pattern channel adapters will use in Day 2/3.
        async with AsyncSessionLocal() as db:
            try:
                reply = await agent_core.handle_turn(
                    db=db,
                    user_id=user_id,
                    channel=channel,
                    input_text=text,
                )
            except Exception as exc:  # noqa: BLE001 — REPL surface; show the user
                print(f"[error] {type(exc).__name__}: {exc}\n")
                continue

        print(f"Agent: {reply}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Veerox CLI chat REPL")
    parser.add_argument("--channel", choices=["voice", "whatsapp"], default="whatsapp")
    parser.add_argument(
        "--user-id",
        type=uuid.UUID,
        default=DEFAULT_USER_ID,
        help="UUID of the user (defaults to the seeded demo user)",
    )
    args = parser.parse_args()
    channel = cast(Literal["voice", "whatsapp"], args.channel)

    asyncio.run(_repl(user_id=args.user_id, channel=channel))


if __name__ == "__main__":
    main()
