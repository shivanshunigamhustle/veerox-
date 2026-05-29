"""Outbound + media client for the Meta WhatsApp Cloud API.

Three async functions plus a shared, module-level ``httpx.AsyncClient`` for
connection pooling. Transient HTTP errors are logged with ``structlog`` and
propagated to the caller — the adapter / admin route decides whether to
swallow or escalate.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from apps.api.config import settings

logger = structlog.get_logger(__name__)


# Shared connection pool. Reused across all calls to keep TLS handshakes off
# the hot path for back-to-back outbound messages.
_http: httpx.AsyncClient = httpx.AsyncClient(timeout=10.0)


_GRAPH_BASE = "https://graph.facebook.com"


def _graph_url(path: str) -> str:
    """Build a Graph API URL pinned to the configured version + phone-number id.

    ``path`` is anything that follows the phone-number id (e.g. ``"/messages"``
    or ``""``). Pass ``path=""`` for endpoints that *are* the phone-number id
    itself.
    """
    return (
        f"{_GRAPH_BASE}/{settings.meta_graph_api_version}"
        f"/{settings.meta_phone_number_id}{path}"
    )


def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.meta_access_token}"}


async def send_text(to_e164: str, body: str) -> dict[str, Any]:
    """Send a plain-text WhatsApp message via the Graph API.

    Returns the raw JSON response (which contains the outbound message id).
    Raises ``httpx.HTTPStatusError`` on a non-2xx response.
    """
    url = _graph_url("/messages")
    payload = {
        "messaging_product": "whatsapp",
        "to": to_e164,
        "type": "text",
        "text": {"body": body},
    }
    try:
        r = await _http.post(url, json=payload, headers=_auth_headers())
        r.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(
            "whatsapp_send_text_failed",
            to=to_e164,
            error=str(exc),
            status=getattr(getattr(exc, "response", None), "status_code", None),
        )
        raise

    data: dict[str, Any] = r.json()
    logger.info(
        "whatsapp_send_text_ok",
        to=to_e164,
        wa_message_id=_extract_outbound_id(data),
    )
    return data


async def download_media(media_id: str) -> bytes:
    """Download a media blob from Meta in two steps.

    1. ``GET /{media_id}`` returns JSON with a short-lived signed ``url``.
    2. ``GET <url>`` (with the same Bearer header) returns the raw bytes.

    Raises ``httpx.HTTPStatusError`` on a non-2xx response from either call.
    """
    # Step 1: resolve the media id to a download URL.
    meta_url = f"{_GRAPH_BASE}/{settings.meta_graph_api_version}/{media_id}"
    try:
        meta_r = await _http.get(meta_url, headers=_auth_headers())
        meta_r.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(
            "whatsapp_media_lookup_failed",
            media_id=media_id,
            error=str(exc),
            status=getattr(getattr(exc, "response", None), "status_code", None),
        )
        raise

    meta_payload = meta_r.json()
    download_url = meta_payload.get("url")
    if not download_url:
        logger.warning("whatsapp_media_lookup_no_url", media_id=media_id, payload=meta_payload)
        raise RuntimeError(f"Meta media lookup returned no url for {media_id}")

    # Step 2: fetch the actual bytes. The CDN URL still requires the bearer
    # token — failing to send it returns a 401 with a misleading body.
    try:
        bin_r = await _http.get(download_url, headers=_auth_headers())
        bin_r.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(
            "whatsapp_media_download_failed",
            media_id=media_id,
            error=str(exc),
            status=getattr(getattr(exc, "response", None), "status_code", None),
        )
        raise

    logger.info(
        "whatsapp_media_downloaded",
        media_id=media_id,
        mime=meta_payload.get("mime_type"),
        bytes=len(bin_r.content),
    )
    return bin_r.content


async def mark_read(message_id: str) -> None:
    """POST a read receipt for an inbound message.

    Best-effort: failures are logged but do NOT raise — losing a read
    receipt should not poison the surrounding reply pipeline.
    """
    url = _graph_url("/messages")
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }
    try:
        r = await _http.post(url, json=payload, headers=_auth_headers())
        r.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning(
            "whatsapp_mark_read_failed",
            message_id=message_id,
            error=str(exc),
            status=getattr(getattr(exc, "response", None), "status_code", None),
        )
        return

    logger.info("whatsapp_mark_read_ok", message_id=message_id)


def _extract_outbound_id(payload: dict[str, Any]) -> str | None:
    """Pull the WhatsApp message id out of a Graph API send-text response."""
    messages = payload.get("messages")
    if isinstance(messages, list) and messages:
        first = messages[0]
        if isinstance(first, dict):
            wa_id = first.get("id")
            if isinstance(wa_id, str):
                return wa_id
    return None
