from __future__ import annotations

from pydantic import BaseModel, Field


class OutboundWhatsappIn(BaseModel):
    phone: str = Field(..., description="Recipient phone number in E.164 format.")
    text: str = Field(..., min_length=1, description="Message body to send.")


class OutboundCallIn(BaseModel):
    to_phone: str = Field(..., description="Destination phone number in E.164 format.")


class KillSwitchIn(BaseModel):
    enabled: bool = Field(..., description="True to engage the kill switch, False to release it.")


class KillSwitchOut(BaseModel):
    enabled: bool


class PromptsOut(BaseModel):
    base: str
    voice_append: str
    whatsapp_append: str


class OutboundWhatsappOut(BaseModel):
    status: str
    phone: str
    text: str
    # Meta Graph API message id returned by send_text. None when the local-dev
    # fallback path was taken (META_ACCESS_TOKEN unset) — see admin.outbound_whatsapp.
    wa_message_id: str | None = None


class OutboundCallOut(BaseModel):
    call_sid: str
    status: str
