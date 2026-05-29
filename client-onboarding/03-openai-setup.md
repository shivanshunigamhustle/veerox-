# OpenAI — Credential Setup Guide

This guide walks you through creating an OpenAI account and getting the API key that powers your AI agent's understanding and voice. No coding required.

> This is the quickest of the three (about 10 minutes). The only thing to watch is **enabling billing** and confirming **Realtime API** access for voice.

---

## What we need from you (the end goal)

| # | Credential | Looks like |
|---|---|---|
| 1 | **API Key** | starts with `sk-...`, a long string |

That's the only credential. There are a couple of account settings to confirm too (Steps 3–4). How to send it securely is at the bottom.

---

## Step 1 — Create an OpenAI account

1. Go to **https://platform.openai.com/signup**
2. Sign up with your **work email** (or Google/Microsoft login)
3. Verify your email and phone number if prompted

> **Note:** This is the **API platform** (platform.openai.com), which is different from ChatGPT. Even if you already pay for ChatGPT Plus, the API is billed separately — you still need to do Step 3.

---

## Step 2 — Set up your organization (if prompted)

1. Enter your **business/organization name**
2. This name appears on invoices — use your company name

---

## Step 3 — Add billing (required)

The API doesn't work until a payment method is on file. This is **separate** from any ChatGPT subscription.

1. Go to **Settings → Billing** (https://platform.openai.com/account/billing)
2. Click **Add payment method**, enter a card
3. Add an initial credit balance (e.g. **$20–50** to start) — the agent draws from this as it's used
4. *(Recommended)* Set a **monthly usage limit** and an **email alert threshold** under **Billing → Limits** so there are no surprises

> Our team will share expected monthly cost estimates separately. Voice (Realtime) is the largest driver — we'll keep you informed before any large bills.

---

## Step 4 — Confirm Realtime API access (for voice)

The voice feature uses OpenAI's **Realtime API**. On most accounts this is available automatically once billing is active, but let's confirm.

1. Go to **https://platform.openai.com/docs/models**
2. In the model list, look for a model named like **`gpt-4o-realtime-preview`** (or "Realtime")
3. If you can see it listed, you're good
4. If you get an "access" or "not available" message, contact OpenAI support (or let us know) — sometimes it needs a quick verification step on newer accounts

---

## Step 5 — Create the API key

1. Go to **https://platform.openai.com/api-keys**
2. Click **Create new secret key**
3. Name it (e.g. *"Veerox Agent"*)
4. *(Optional)* Set permissions to **All** (default)
5. Click **Create secret key**
6. **Copy it immediately** — it starts with `sk-...` ← *credential #1*

> **Important:** OpenAI shows the key **only once**. If you close the window without copying, just delete it and create a new one.

---

## How to send us the credential (securely)

The API key spends real money from your balance, so **please don't paste it into plain WhatsApp or email.**

Preferred options (any one):
- A password manager shared note (1Password, Bitwarden "Send", etc.)
- A temporary secret-sharing link (e.g. https://onetimesecret.com)

Send us:

```
OpenAI API Key:  sk-________________________________________
```

---

## Quick troubleshooting

| Problem | Fix |
|---|---|
| "You exceeded your quota" | Your credit balance is empty or no card is on file. Add billing (Step 3). |
| "Model not found: gpt-4o-realtime-preview" | Realtime access isn't active yet — confirm Step 4 or contact OpenAI support. |
| Lost the key | Delete it on the API Keys page and create a new one — tell us so we swap it in. |
| Worried about overspend | Set a hard monthly limit under Billing → Limits (Step 3). |

---

## A note on safety

- You can **revoke** the key any time from the API Keys page — it stops working instantly. Useful if you ever suspect it leaked.
- You own this key and the account. We only use it to run your agent; you can rotate it whenever you like and we'll do a one-line swap on our side.

Questions at any step? Send us a screenshot — happy to help.
