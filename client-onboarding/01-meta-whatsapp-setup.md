# Meta WhatsApp — Credential Setup Guide

This guide walks you through getting the WhatsApp Business credentials our team needs to connect your AI agent to WhatsApp. No coding required — it's all clicks in Meta's web dashboards.

> **Start this first.** Meta business verification and message-template approval each take **24–48 hours** and sometimes get rejected once for minor reasons. The earlier you begin, the smoother launch day goes.

---

## What we need from you (the end goal)

By the end of this guide you'll hand us six things:

| # | Credential | Looks like |
|---|---|---|
| 1 | **App ID** | a long number, e.g. `1234567890123456` |
| 2 | **App Secret** | a 32-character string |
| 3 | **Phone Number ID** | a long number |
| 4 | **WhatsApp Business Account ID** | a long number |
| 5 | **Permanent Access Token** | a long string starting with `EAA...` |
| 6 | **Verify Token** | a password **you make up** (see Step 6) |

Don't worry about what these mean — just follow the steps and collect them in a note. How to send them securely is at the bottom.

---

## Step 1 — Create a Meta Business Account

1. Go to **https://business.facebook.com**
2. Click **Create Account** (top right)
3. Enter your **business name**, **your name**, and **work email**
4. Follow the prompts to finish

> If your business already has a Meta Business account (used for Facebook/Instagram ads), you can reuse it — just make sure you have **admin** access.

---

## Step 2 — Verify your business

This unlocks production messaging (without it you're limited to test numbers).

1. In Business Settings, go to **Security Center**
2. Click **Start Verification**
3. Provide your business details and upload a supporting document — typically one of:
   - Business registration / incorporation certificate
   - GST certificate
   - Utility bill in the business name
4. Submit

> **Lead time: 1–2 business days.** You can continue with the steps below while this is pending.

---

## Step 3 — Create a Meta App

1. Go to **https://developers.facebook.com/apps**
2. Click **Create App**
3. For "What do you want your app to do?" choose **Other** → **Next**
4. Select app type **Business** → **Next**
5. Name it (e.g. *"YourBrand WhatsApp"*), pick your Business Account → **Create App**

---

## Step 4 — Add the WhatsApp product

1. On your new app's dashboard, find **WhatsApp** in the product list → click **Set up**
2. Select your Business Account when prompted
3. You'll land on the **WhatsApp → API Setup** page

On this page you'll already see:
- A **test phone number** Meta gives you for free
- A **Phone Number ID** ← *this is credential #3*
- A **WhatsApp Business Account ID** ← *this is credential #4*
- A **temporary access token** (valid 24h — we'll replace it in Step 7)

Note down the Phone Number ID and WhatsApp Business Account ID.

---

## Step 5 — Get your App ID and App Secret

1. In the left sidebar: **App settings → Basic**
2. **App ID** is at the top ← *credential #1*
3. Next to **App Secret**, click **Show**, enter your password ← *credential #2*

---

## Step 6 — Create a Verify Token (you invent this)

The "Verify Token" isn't something Meta gives you — it's a secret password **you choose** that we configure on both sides so Meta and our server can trust each other.

1. Make up a strong random string — e.g. `veerox-wh-9f3k2p7q-secure`
2. Write it down ← *credential #6*

That's it. Just pick one and keep it with the others.

---

## Step 7 — Generate a Permanent Access Token

The token from Step 4 expires in 24 hours. We need a permanent one via a **System User**.

1. Go to **Business Settings** (https://business.facebook.com/settings)
2. Left sidebar: **Users → System Users**
3. Click **Add**, name it (e.g. *"Veerox API"*), role **Admin** → **Create**
4. With the system user selected, click **Add Assets** → **Apps** → select your app → enable **Full control** → **Save**
5. Click **Generate New Token**
   - Select your app
   - Token expiration: **Never**
   - Under permissions, tick: **`whatsapp_business_messaging`** and **`whatsapp_business_management`**
6. Click **Generate** → copy the token (starts with `EAA...`) ← *credential #5*

> **Important:** Meta shows this token **only once**. Copy it immediately. If you lose it, just generate a new one.

---

## Step 8 — (Optional but recommended) Submit message templates

If you'll ever message customers *first* (outside a 24-hour reply window) — e.g. appointment reminders — those messages must use pre-approved templates.

1. Go to **WhatsApp Manager** → **Message Templates** → **Create Template**
2. Create two simple ones to start (our team will tell you the exact wording):
   - `appointment_confirmation`
   - `lead_followup`
3. Submit for review

> **Lead time: 24–48 hours.** First submissions are often rejected for small reasons (a stray emoji, wrong category). Budget for one re-submission. Submit early even if you won't use them until later.

---

## Step 9 — Add a real phone number (when ready for production)

The free test number only messages a handful of pre-approved testers. For real customers:

1. On the **WhatsApp → API Setup** page, click **Add phone number**
2. Use a number that is **not** already registered on the WhatsApp consumer/Business app
3. Verify it via SMS or call
4. This gives you a new **Phone Number ID** — send us the updated one

---

## How to send us the credentials (securely)

These are sensitive — anyone with them can send messages as your business. **Please do not paste them into plain WhatsApp or email.**

Preferred options (any one):
- A password manager shared note (1Password, Bitwarden "Send", etc.)
- An encrypted file we'll provide
- A temporary secret-sharing link (e.g. https://onetimesecret.com)

Send us this filled-in checklist:

```
App ID:                       __________
App Secret:                   __________
Phone Number ID:              __________
WhatsApp Business Account ID: __________
Permanent Access Token:       EAA________
Verify Token (you chose):     __________
```

---

## Quick troubleshooting

| Problem | Fix |
|---|---|
| "Token expired" | You used the Step 4 temporary token. Generate the permanent one (Step 7). |
| Can't add a phone number | The number is already on the regular WhatsApp app — delete that account first, or use a fresh number. |
| Template rejected | Check the category is correct and remove emojis/links. Resubmit. |
| Business verification stuck | Make sure the uploaded document name exactly matches your business name. |

Questions at any step? Send us a screenshot — happy to point you to the right button.
