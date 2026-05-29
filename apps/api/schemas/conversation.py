from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    user_id: UUID
    channel: str
    started_at: datetime
    ended_at: datetime | None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    conversation_id: UUID
    user_id: UUID
    role: str
    content: str
    channel: str
    tokens_in: int | None
    tokens_out: int | None
    audio_secs: float | None
    created_at: datetime
