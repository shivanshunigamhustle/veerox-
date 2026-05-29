"""Tests for the WhatsApp webhook handlers (verification + receipt)."""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

import pytest
from httpx import AsyncClient

from apps.api.config import settings

VERIFY_TOKEN = "test-verify-token"
APP_SECRET = "test-app-secret"  # noqa: S105 — test fixture


@pytest.fixture(autouse=True)
def _pin_meta_creds(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "meta_verify_token", VERIFY_TOKEN)
    monkeypatch.setattr(settings, "meta_app_secret", APP_SECRET)


def _sign(body: bytes, secret: str = APP_SECRET) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@pytest.mark.asyncio
async def test_verify_returns_challenge_on_token_match(client: AsyncClient) -> None:
    response = await client.get(
        "/webhook/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": VERIFY_TOKEN,
            "hub.challenge": "challenge-12345",
        },
    )
    assert response.status_code == 200
    assert response.text == "challenge-12345"


@pytest.mark.asyncio
async def test_verify_rejects_wrong_token(client: AsyncClient) -> None:
    response = await client.get(
        "/webhook/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "WRONG",
            "hub.challenge": "challenge-12345",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_verify_rejects_wrong_mode(client: AsyncClient) -> None:
    response = await client.get(
        "/webhook/whatsapp",
        params={
            "hub.mode": "unsubscribe",
            "hub.verify_token": VERIFY_TOKEN,
            "hub.challenge": "challenge-12345",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_post_rejects_missing_signature(client: AsyncClient) -> None:
    response = await client.post(
        "/webhook/whatsapp",
        content=b'{"object":"whatsapp_business_account"}',
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_post_rejects_bad_signature(client: AsyncClient) -> None:
    body = b'{"object":"whatsapp_business_account"}'
    bad_sig = _sign(body, secret="not-the-real-secret")  # noqa: S106
    response = await client.post(
        "/webhook/whatsapp",
        content=body,
        headers={
            "content-type": "application/json",
            "x-hub-signature-256": bad_sig,
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_post_accepts_good_signature_and_returns_fast(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The handler must ACK 200 without awaiting the LLM (Meta's <15s rule)."""
    # Patch process_inbound on the *webhook* module — that's the binding
    # FastAPI will hand to BackgroundTasks.
    from apps.api.channels.whatsapp import webhook as webhook_module

    captured: dict[str, Any] = {}

    async def fake_process_inbound(payload: dict[str, Any]) -> None:
        captured["payload"] = payload

    monkeypatch.setattr(webhook_module, "process_inbound", fake_process_inbound)

    body_dict = {"object": "whatsapp_business_account", "entry": []}
    body = json.dumps(body_dict).encode()
    sig = _sign(body)

    response = await client.post(
        "/webhook/whatsapp",
        content=body,
        headers={
            "content-type": "application/json",
            "x-hub-signature-256": sig,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    # BackgroundTasks run after the response is sent; httpx awaits the full
    # lifecycle including the background, so by the time we assert here the
    # task has executed.
    assert captured.get("payload") == body_dict
