"""Meta Cloud API webhook — verification handshake + inbound receipt.

The POST handler does the absolute minimum on the request thread (signature
verification + parse + enqueue) and hands the message off to the adapter
via FastAPI ``BackgroundTasks``. Meta retries any webhook that doesn't ACK
within ~15 seconds — see ``longrunning/operations/pitfalls.md``.
"""

from __future__ import annotations

import hmac
from hashlib import sha256
from typing import Any

import structlog
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse

from apps.api.channels.whatsapp.adapter import process_inbound
from apps.api.config import settings

logger = structlog.get_logger(__name__)

router = APIRouter(tags=["whatsapp"])


# Meta sends the signature with the ``sha256=`` prefix. Comparing the prefix
# along with the digest keeps the hmac.compare_digest call constant-time and
# format-aware.
_SIGNATURE_HEADER = "X-Hub-Signature-256"
_SIGNATURE_PREFIX = "sha256="


def _verify_signature(body: bytes, header_value: str | None) -> bool:
    """Constant-time HMAC-SHA256 verification of the raw request body."""
    if not header_value or not header_value.startswith(_SIGNATURE_PREFIX):
        return False
    if not settings.meta_app_secret:
        # No secret configured — reject rather than silently accept. Local
        # dev should set META_APP_SECRET in .env even if it's a dummy value.
        logger.warning("whatsapp_webhook_no_app_secret")
        return False

    expected = hmac.new(
        settings.meta_app_secret.encode("utf-8"),
        body,
        sha256,
    ).hexdigest()
    expected_full = f"{_SIGNATURE_PREFIX}{expected}"
    return hmac.compare_digest(expected_full, header_value)


@router.get("/webhook/whatsapp")
async def verify_webhook(
    # FastAPI translates dots in query-param names to underscores: Meta sends
    # ``hub.mode`` / ``hub.verify_token`` / ``hub.challenge`` on the wire, but
    # we receive them here as ``hub_mode`` / ``hub_verify_token`` / ``hub_challenge``.
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
) -> PlainTextResponse:
    """Meta verification handshake. Must complete in <10s."""
    if (
        hub_mode == "subscribe"
        and hub_verify_token
        and settings.meta_verify_token
        and hmac.compare_digest(hub_verify_token, settings.meta_verify_token)
        and hub_challenge is not None
    ):
        logger.info("whatsapp_webhook_verified")
        return PlainTextResponse(hub_challenge)

    logger.warning(
        "whatsapp_webhook_verification_failed",
        mode=hub_mode,
        token_present=bool(hub_verify_token),
    )
    raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/webhook/whatsapp")
async def receive_webhook(
    request: Request,
    background: BackgroundTasks,
) -> dict[str, str]:
    """Inbound message receipt.

    Order is load-bearing: raw body first (for HMAC), then verify, then
    parse, then enqueue, then 200. Do NOT await the LLM here — Meta retries
    on >15s and the user gets duplicate replies.
    """
    body_bytes = await request.body()
    signature = request.headers.get(_SIGNATURE_HEADER) or request.headers.get(
        _SIGNATURE_HEADER.lower()
    )

    if not _verify_signature(body_bytes, signature):
        logger.warning("whatsapp_webhook_bad_signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload: dict[str, Any] = await request.json()
    except ValueError:
        # Meta sometimes sends an empty body for some operations — log and ack.
        logger.warning("whatsapp_webhook_invalid_json")
        return {"status": "ok"}

    background.add_task(process_inbound, payload)
    logger.info("whatsapp_webhook_received", object_type=payload.get("object"))
    return {"status": "ok"}
