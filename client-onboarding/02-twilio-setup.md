# Twilio — Credential Setup Guide

This guide walks you through creating a Twilio account and getting a phone number so your AI agent can make and receive voice calls. No coding required.

> **Start the phone-number step early.** Indian phone numbers require a regulatory/KYC approval that takes **1–3 business days**. The account itself takes 5 minutes.

---

## What we need from you (the end goal)

| # | Credential | Looks like |
|---|---|---|
| 1 | **Account SID** | starts with `AC...`, 34 characters |
| 2 | **Auth Token** | a 32-character string |
| 3 | **Phone Number** | in international format, e.g. `+9180XXXXXXXX` |

How to send these securely is at the bottom.

---

## Step 1 — Create a Twilio account

1. Go to **https://www.twilio.com/try-twilio**
2. Sign up with your **work email** and a password
3. Verify your **email** (click the link they send)
4. Verify your **phone number** (enter the code they text you)
5. When asked a few onboarding questions:
   - "Which Twilio product?" → **Voice**
   - "What do you want to build?" → **Voice / IVR** (or skip)
   - "How do you want to build?" → **With code** (or skip)

You'll land on the **Twilio Console**.

---

## Step 2 — Copy your Account SID and Auth Token

1. On the Console **dashboard home** (https://console.twilio.com), scroll to **Account Info**
2. **Account SID** ← *credential #1*
3. **Auth Token** — click **Show** to reveal it ← *credential #2*

> Keep the Auth Token private — it's like a password for your whole account.

---

## Step 3 — Add funds

Twilio is pay-as-you-go. A trial account works for early testing but is limited (it can only call verified numbers and prepends a trial message).

1. Go to **Admin → Billing** (or **Billing** in the top menu)
2. Add a payment method and a small starting balance (e.g. $20) is plenty to begin
3. To remove trial limits, click **Upgrade** when prompted

---

## Step 4 — Complete India regulatory requirements (Indian numbers only)

India requires a **Regulatory Bundle** (KYC) before you can buy a local number. This is a one-time process.

1. Go to **Phone Numbers → Regulatory Compliance → Bundles**
2. Click **Create a Regulatory Bundle**
3. Choose **India** and the number type you want (Local / Mobile / Toll-Free)
4. Provide:
   - Business name and address (must match your documents)
   - A **business registration document** (GST certificate, incorporation cert, etc.)
   - An **address proof** (utility bill, rental agreement, etc.)
   - An authorized representative's ID
5. Submit

> **Lead time: 1–3 business days** for Twilio to approve the bundle. You can do Steps 1–3 immediately and just wait on this one.

---

## Step 5 — Buy a phone number

Once your regulatory bundle is approved:

1. Go to **Phone Numbers → Manage → Buy a Number**
2. Set **Country = India**
3. Tick the **Voice** capability checkbox (we need voice; SMS is optional)
4. Search, pick a number you like, click **Buy**
5. Attach the approved regulatory bundle if prompted
6. Note the number in full international format, e.g. `+9180XXXXXXXX` ← *credential #3*

> Don't worry about configuring the number's webhook URL — our team does that once we connect it.

---

## How to send us the credentials (securely)

The Auth Token can control your whole Twilio account, so **please don't paste it into plain WhatsApp or email.**

Preferred options (any one):
- A password manager shared note (1Password, Bitwarden "Send", etc.)
- A temporary secret-sharing link (e.g. https://onetimesecret.com)

Send us this filled-in checklist:

```
Account SID:   AC________________________
Auth Token:    __________
Phone Number:  +91________
```

---

## Quick troubleshooting

| Problem | Fix |
|---|---|
| Can't buy an Indian number | Your regulatory bundle isn't approved yet (Step 4). Wait for the email. |
| "Trial account" message plays on calls | Upgrade the account (Step 3) to remove trial limits. |
| Number search returns nothing | Loosen filters — try a different city/area code, or Mobile instead of Local. |
| Lost the Auth Token | You can rotate it from Account Info → but tell us first, since the old one stops working immediately. |

Questions at any step? Send us a screenshot — happy to help.
