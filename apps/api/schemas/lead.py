from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LeadCreate(BaseModel):
    org_id: UUID
    user_id: UUID
    name: str | None = None
    phone: str | None = None
    intent: str | None = None
    metadata_: dict | None = None


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    user_id: UUID
    name: str | None
    phone: str | None
    intent: str | None
    metadata_: dict | None
    created_at: datetime
