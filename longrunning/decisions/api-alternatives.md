# API Alternatives — Cost & Timeline Analysis

For each of the four external APIs in the stack, here are the realistic alternatives, what each costs, and how each affects the 4-day sprint timeline. All costs are in Indian Rupees (₹) — provider USD pricing is converted at **₹85 = $1**. Pricing verified 2026-05; rates and the exchange rate change — re-check before committing.

Recommendations are at the bottom of each section.

---

## 1. OpenAI Realtime API (voice channel)

**Default pick.** Speech-in / speech-out in one session. Built-in voice activity detection, turn-taking, and interruption handling. End-to-end round-trip latency ~500ms.

### Pricing

| Component | Rate |
|-----------|------|
| Audio input | ₹5.10 / min |
| Audio output | ₹20.40 / min |
| Combined typical call | **~₹25.50 / min of conversation** |

A 5-minute call ≈ ₹127.50 in audio costs alone, plus standard GPT-4o text tokens for the reasoning side (~₹4.25-8.50).

### Alternatives

#### A. Classic pipeline: Twilio → Whisper → GPT-4o → ElevenLabs → Twilio

| | |
|---|---|
| **Latency** | 3-4 seconds per turn (vs 500ms) |
| **Cost** | Whisper ₹0.51/min + GPT-4o tokens (₹0.85-4.25/turn) + ElevenLabs ₹25.50/1k chars (~₹4.25-12.75 per response) = **~₹8.50-17/min** |
| **Dev impact** | **+2 to +3 days.** You write VAD, turn-taking, and interruption logic yourself. Day 3 becomes Day 3-5. |
| **Verdict** | Cheaper per minute but kills demo quality and blows the 4-day budget. **Avoid unless cost is the dominant constraint.** |

#### B. Deepgram Voice Agent API

| | |
|---|---|
| **Latency** | ~700ms |
| **Cost** | ~₹6.80/min combined (Nova-3 STT + LLM passthrough + Aura TTS) |
| **Dev impact** | Same as Realtime (~1 day for Day 3) but fewer reference examples, less battle-tested with Hindi |
| **Verdict** | **~70% cheaper than Realtime.** Worth a real evaluation if monthly OpenAI bill becomes painful. Hindi quality needs explicit testing. |

#### C. Google Gemini Live API

| | |
|---|---|
| **Latency** | ~600ms |
| **Cost** | Free preview today; GA pricing ~₹25.50/1M input tokens + audio premiums (final pricing pending) |
| **Dev impact** | Similar to Realtime (~1 day) |
| **Verdict** | **Hindi code-mixing quality unproven** for production. Risky for a Hindi-first client. Revisit in 6 months. |

#### D. Self-hosted (Whisper.cpp + Piper TTS + local LLM)

| | |
|---|---|
| **Latency** | 1-2 seconds with good hardware |
| **Cost** | ₹17,000-42,500/mo GPU server, no per-minute charge |
| **Dev impact** | **+5 to +7 days** plus ongoing ops burden |
| **Verdict** | Wrong shape for a 4-day sprint. **Possible Phase 2** if cost becomes existential. |

#### E. LiveKit Agents + OpenAI Realtime

| | |
|---|---|
| **Latency** | Comparable to direct Realtime |
| **Cost** | LiveKit cloud ~₹0.43/min on top of OpenAI Realtime costs (additive, not a replacement) |
| **Dev impact** | **-0.5 day.** Better WebRTC abstraction. Trivial to add a browser-based voice channel later. |
| **Verdict** | Worth considering if you anticipate adding browser voice or SIP trunking. **Costs slightly more but buys flexibility.** |

### Recommendation

**Stay with OpenAI Realtime for the sprint.** It's the only option that hits the 4-day target with demo-quality voice. Track per-minute costs from Day 1; if the pilot crosses ~50 hours/month of voice traffic, evaluate Deepgram for Phase 2.

---

## 2. OpenAI GPT-4o (chat brain)

**Default pick.** Native Hindi + Hinglish code-mixing, top-tier tool-calling reliability.

### Pricing

| Component | Rate |
|-----------|------|
| Input tokens | ₹212.50 / 1M |
| Output tokens | ₹850 / 1M |
| Typical chat turn | **₹0.43 - ₹1.70** |

### Alternatives

#### A. Anthropic Claude Sonnet 4.6

| | |
|---|---|
| **Cost** | ₹255 / 1M input + ₹1,275 / 1M output (~1.3x GPT-4o) |
| **Hindi quality** | Excellent — comparable or better for code-mixed Hinglish |
| **Tool calling** | Arguably best-in-class |
| **Dev impact** | **Zero for chat.** Drop-in via `anthropic` SDK. |
| **Catch** | Can't use Anthropic for Realtime voice — you'd run two providers and lose the "one brain" purity. The Agent Core's `llm.py` would have to dispatch by channel. |
| **Verdict** | Strong technically. **Skip for the sprint** — the two-provider split breaks the architectural invariant. Reconsider if voice moves off OpenAI Realtime. |

#### B. Anthropic Claude Haiku 4.5

| | |
|---|---|
| **Cost** | ₹85 / 1M input + ₹425 / 1M output (~40% of GPT-4o) |
| **Quality** | Good for routing, intent classification, simple turns; weaker for complex multi-tool flows |
| **Dev impact** | Same as Sonnet — drop-in |
| **Verdict** | **Consider as a fallback** for cheap turns alongside Sonnet, but same two-provider problem as A. |

#### C. Google Gemini 1.5 Pro / 2.0 Flash

| | |
|---|---|
| **Cost** | Pro ₹106.25 / 1M input + ₹425 / 1M output; Flash much cheaper |
| **Hindi quality** | Decent but lags GPT-4o for very colloquial code-mixing |
| **Dev impact** | Zero (drop-in via google-genai SDK) |
| **Verdict** | Cheaper but **Hindi-mixed performance is the risk for this client.** Skip. |

#### D. Mistral Large / Llama 3.3 70B (via Together, Groq, etc.)

| | |
|---|---|
| **Cost** | ₹17 - ₹51 / 1M tokens — by far the cheapest |
| **Hindi quality** | Weak for natural code-mixing |
| **Verdict** | Skip for Hindi-first client. |

#### E. GPT-4o-mini

| | |
|---|---|
| **Cost** | ₹12.75 / 1M input + ₹51 / 1M output (~6% of GPT-4o) |
| **Hindi quality** | Acceptable for simple turns, weaker for complex |
| **Dev impact** | Zero — same OpenAI SDK |
| **Verdict** | **Use as a router.** Classify the user's intent cheaply, escalate to GPT-4o only for complex turns. This is what the PDF hints at. |

### Recommendation

**Stay with GPT-4o as the primary brain.** Add GPT-4o-mini as a cheap-router fallback for intent classification — it's a one-day Phase 2 task that can cut 40-60% of token cost.

---

## 3. Twilio (voice telephony)

**Default pick.** Best Media Streams support, mature SDK, and there's a well-known Twilio reference repo for the Realtime bridge — that's worth a half-day of saved work on Day 3.

### Pricing (India)

| Component | Rate |
|-----------|------|
| Phone number | ₹85-1,275 / mo |
| Inbound (mobile) | ~₹0.50 / min |
| Outbound (mobile) | ~₹3-5 / min |
| Media Streams | ~₹0.34 / min |

### Alternatives

#### A. Plivo

| | |
|---|---|
| **Cost** | ~30-40% cheaper than Twilio for India |
| **Dev impact** | **+1 day.** Media streaming is less mature; fewer reference implementations for the OpenAI Realtime bridge. |
| **Verdict** | Defer until pilot volume justifies the engineering cost. |

#### B. Exotel

| | |
|---|---|
| **Cost** | ~₹0.40/min inbound, ₹0.90-2/min outbound. India-native, friendly to Indian KYC requirements. |
| **Dev impact** | **+1 to +2 days** to validate their media-streaming equivalent against OpenAI Realtime |
| **Verdict** | Strong choice for **India-scale Phase 2.** Skip for the sprint — you'll burn Day 3 on bridge debugging. |

#### C. Telnyx

| | |
|---|---|
| **Cost** | ~20-30% cheaper than Twilio |
| **Dev impact** | **+0.5 to +1 day.** Closest Twilio-equivalent with mature WebSocket media streaming. |
| **Verdict** | Reasonable swap if cost matters more than ecosystem maturity. |

#### D. Vonage / AWS Chime SDK

| | |
|---|---|
| **Verdict** | Comparable to Twilio cost-wise. Less material reason to switch. |

#### E. Pure SIP (FreeSWITCH/Asterisk + a SIP trunk)

| | |
|---|---|
| **Cost** | Cheapest at scale |
| **Dev impact** | **+3 to +5 days** + ongoing ops |
| **Verdict** | **Phase 3 only.** Wrong shape for a 4-day sprint. |

### Recommendation

**Stay with Twilio for the sprint.** The reference repo for Twilio Media Streams + OpenAI Realtime is the single biggest Day 3 risk reducer. Revisit Exotel for Phase 2 once India call volume is real.

---

## 4. Meta WhatsApp Cloud API (direct)

**Default pick.** Cheapest of all options, no middleman, and the proposal's no-vendor-lock-in clause basically mandates it — the client owns the Meta Business account directly.

### Pricing (India, per-conversation)

| Conversation type | Meta charge |
|---|---|
| Marketing | ₹0.7846 / conv |
| Utility | ₹0.115 / conv |
| Authentication | ₹0.115 / conv |
| Service (within 24h customer-initiated window) | **Free** |
| Platform/Cloud API fee | ₹0 |

A "conversation" is a 24-hour window. Many messages within it = one charge.

### Alternatives (all are BSPs sitting on top of Meta)

#### A. Twilio WhatsApp

| | |
|---|---|
| **Cost** | Meta conv price + Twilio markup (~₹0.43 per message) |
| **Dev impact** | **-0.5 day.** Twilio SDK is already in the project for voice. |
| **Verdict** | Adds vendor coupling. **Rejected by the no-lock-in clause.** |

#### B. 360dialog

| | |
|---|---|
| **Cost** | Flat ~₹4,250-8,500/mo + Meta conv price. No per-message markup. |
| **Dev impact** | Similar to direct. |
| **Verdict** | Worthwhile at very high volume. **Overkill at sprint scale.** |

#### C. Gupshup / Wati / AiSensy (Indian BSPs)

| | |
|---|---|
| **Cost** | ₹2,550-8,500/mo subscription tiers |
| **Dev impact** | **-0.5 to -1 day** — their dashboards and SDKs handle templates, contacts, campaign UI for free. |
| **Verdict** | Good fit for "we want a dashboard out of the box" clients. **Veerox wants ownership** — direct wins. |

### Recommendation

**Direct Meta Cloud API. No alternatives are competitive given the no-lock-in clause.** Heads-up: business verification and template approval take 24-48 hours minimum and templates often get rejected once — submit them on Day 1 even if you won't use them until Day 4.

---

## Quick-decision summary

| API | Recommendation | If you change your mind, the alternative is | Cost impact | Timeline impact |
|---|---|---|---|---|
| OpenAI Realtime | **Keep** | Deepgram Voice Agent | -70% per minute | Day 3 +0 to +1 |
| OpenAI GPT-4o | **Keep + add 4o-mini router** | Claude Sonnet (chat-only, breaks one-brain rule) | -40-60% with router | +1 day to add router (Phase 2) |
| Twilio | **Keep for sprint** | Exotel for India Phase 2 | -50% on India minutes | Day 3 +1 to +2 |
| Meta WhatsApp Cloud | **Keep (direct, no BSP)** | None worth picking | n/a | n/a |

**Net:** The PDF's defaults are the right picks for a 4-day sprint. The opportunities to revisit live in Phase 2, not now.
