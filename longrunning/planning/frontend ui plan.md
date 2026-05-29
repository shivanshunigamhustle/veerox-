# Veerox AI — UI Architecture Plan (Production Level)

_Admin dashboard (`apps/web`) — Next.js 14 control plane for the voice + WhatsApp agent._

_Last updated: 2026-05-29_

---

## 1. Purpose & scope

This document covers **only the frontend** (`apps/web`) — the admin control plane operators use to
watch conversations, manage leads, handle escalations, trigger outbound contact, and pause the agent.
It defines the production-grade target architecture: structure, state, data flow, components, design
system, performance, accessibility, security, and the path from today's scaffold to production.

Backend, voice, and deployment plans live in `implementation-plan.md`.

---

## 2. Design principles

1. **Control plane, not a CRM.** Every screen answers one of: _What is the agent doing? Is it OK?
   Can I intervene?_ No feature ships without a clear operator job.
2. **One backend capability = one UI surface.** A backend endpoint without a control surface is
   half-done.
3. **Server state is the source of truth.** The UI never invents data; it reflects the API. Optimistic
   updates are explicit and reconciled.
4. **Fast feedback.** Skeletons on load, live polling for in-flight conversations, instant kill-switch.
5. **Calm, professional visual language.** Dark slate sidebar, indigo accents, generous whitespace,
   SVG icons (Lucide) — never emojis in production chrome.
6. **Accessible & keyboard-first.** WCAG 2.1 AA target; every action reachable without a mouse.

---

## 3. Current stack & state

| Concern | Today | Production target |
|---|---|---|
| Framework | Next.js 14 (App Router) | Same |
| Language | TypeScript (strict) | Same + stricter lint gates |
| Styling | Tailwind CSS 3.4 | Same + design tokens |
| Icons | lucide-react | Same |
| Data fetching | hand-rolled `apiFetch` + `useEffect` | **TanStack Query** (caching, retries, polling) |
| Auth | admin token in `localStorage` | Token in **httpOnly cookie** via route handler |
| State mgmt | local `useState` | Server-state via Query + minimal UI state (Zustand if needed) |
| Forms | manual | **react-hook-form + zod** |
| Tests | none | Vitest + Testing Library + Playwright (e2e) |
| Error handling | per-page try/catch | Error boundaries + global toast system |

---

## 4. Directory architecture (target)

```
apps/web/src/
├── app/                              # App Router (route = folder)
│   ├── layout.tsx                    # Root shell: <Nav/> + <main/> + providers
│   ├── globals.css                   # Tailwind base + tokens + scrollbar
│   ├── (auth)/
│   │   └── login/page.tsx            # Token sign-in (no sidebar layout)
│   ├── (dashboard)/                  # Authenticated group — shares sidebar shell
│   │   ├── page.tsx                  # Dashboard home (stats, kill-switch)
│   │   ├── conversations/
│   │   │   ├── page.tsx              # List (channel, live dot, status)
│   │   │   └── [id]/page.tsx         # Live transcript (5s polling)
│   │   ├── leads/page.tsx            # Lead inbox + CSV export + filters
│   │   ├── escalations/page.tsx      # Human-handoff queue + "Mark handled"
│   │   ├── dial/page.tsx             # Outbound call trigger
│   │   ├── users/[id]/page.tsx       # User profile + outbound WhatsApp
│   │   └── settings/page.tsx         # Read-only prompts + tools + config
│   └── api/                          # Route handlers (BFF layer)
│       └── auth/                     # Set/clear httpOnly cookie
├── components/
│   ├── nav.tsx                       # Sidebar navigation
│   ├── layout/                       # Shell, page-header, empty-state
│   ├── conversations/                # transcript-bubble, channel-badge, live-dot
│   ├── leads/                        # intent-badge, lead-table
│   ├── escalations/                  # urgency-badge, source-badge
│   ├── dashboard/                    # stat-card, kill-switch-banner
│   └── ui/                           # Primitives: button, card, table, input,
│                                     #   badge, skeleton, toast, dialog, spinner
├── lib/
│   ├── api.ts                        # Typed fetch wrapper (base, auth, errors)
│   ├── query.ts                      # TanStack Query client + keys
│   ├── hooks/                        # useStats, useConversations, useKillSwitch…
│   ├── types.ts                      # Types mirroring backend Pydantic schemas
│   └── format.ts                     # Date, phone, currency, duration helpers
└── styles/tokens.ts                  # Design tokens (colors, spacing, radii)
```

**Route groups** `(auth)` and `(dashboard)` let the login page skip the sidebar shell while every
authenticated page inherits it — no per-page layout duplication.

---

## 5. Page inventory & operator jobs

| Route | Operator job | Key data (endpoint) | Live? |
|---|---|---|---|
| `/login` | Authenticate | sets admin token | — |
| `/` (Dashboard) | "Is the agent healthy? Pause it." | `GET /admin/stats`, `POST /admin/kill-switch` | poll 10s |
| `/conversations` | Browse all chats/calls | `GET /admin/conversations` | poll 10s |
| `/conversations/[id]` | Watch a live transcript | `GET /admin/conversations/{id}/messages` | **poll 5s** |
| `/leads` | Work the lead inbox, export | `GET /admin/leads`, `GET /admin/leads.csv` | poll 30s |
| `/escalations` | Pick up human handoffs | `GET /admin/escalations`, delete from queue | poll 5s |
| `/dial` | Place an outbound call | `POST /admin/outbound/call` | — |
| `/users/[id]` | Take over a chat (send WhatsApp) | `POST /admin/outbound/whatsapp` | — |
| `/settings` | Inspect prompts + tools | `GET /admin/prompts`, `/admin/tools`, `/admin/settings` | — |

---

## 6. Data & state architecture

### 6.1 Three tiers of state
- **Server state** (conversations, leads, stats) → **TanStack Query**. Handles caching, dedupe,
  background refetch, retry-with-backoff, and polling via `refetchInterval`.
- **UI state** (modal open, selected filter) → local `useState`; lift to **Zustand** only if shared.
- **Auth state** → httpOnly cookie, read server-side; a tiny context exposes `isAuthed`.

### 6.2 Query key convention (`lib/query.ts`)
```
["stats"]
["conversations", { channel, status }]
["conversation", id, "messages"]
["leads", { intent }]
["escalations"]
```
Mutations (kill-switch, outbound, mark-handled) call `queryClient.invalidateQueries` on the
affected key so the UI reconciles automatically.

### 6.3 Live data strategy
Polling (not WebSockets) is the MVP choice — simple, matches the backend's incremental DB writes.
- Conversation detail: `refetchInterval: 5000` while `ended_at === null`, else stop.
- Escalations: `refetchInterval: 5000`.
- Dashboard/lists: 10–30s.
- **Phase 2:** swap to SSE/WebSocket behind the same hook signature — pages don't change.

### 6.4 The BFF auth layer
Move the token out of `localStorage` (XSS-exposed) into an **httpOnly cookie** set by a Next.js
route handler (`app/api/auth`). Client calls go through the same `apiFetch`, but the cookie travels
automatically and JS can't read it. This is the single most important production security change.

---

## 7. Component system

### 7.1 UI primitives (`components/ui/`)
`Button`, `Card`, `Table`, `Input`, `Badge`, `Skeleton`, `Spinner`, `Toast`, `Dialog`,
`EmptyState`. Each is style-only, prop-driven, and unaware of the API. Variants via `cva`
(class-variance-authority) for type-safe Tailwind variants.

### 7.2 Domain components
Composed from primitives, aware of types but not of fetching:
`StatCard`, `KillSwitchBanner`, `TranscriptBubble`, `ChannelBadge`, `LiveDot`, `IntentBadge`,
`UrgencyBadge`, `SourceBadge`, `LeadTable`, `EscalationTable`.

### 7.3 Page components
Own data fetching (via hooks) + layout; delegate all rendering to domain/UI components. Keeps pages
thin and testable.

### 7.4 Shared states every list must implement
1. **Loading** — skeleton rows (never a bare spinner for tables).
2. **Empty** — `EmptyState` with icon + message + optional CTA.
3. **Error** — inline error card with retry.
4. **Success** — the data.

---

## 8. Design system

### 8.1 Tokens (`styles/tokens.ts`)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#f1f5f9` (slate-100) | App background |
| `--surface` | `#ffffff` | Cards, tables |
| `--sidebar` | `#0f172a` (slate-900) | Navigation |
| `--primary` | `#4f46e5` (indigo-600) | Actions, active nav |
| `--text` | `#334155` (slate-700) | Body |
| `--muted` | `#64748b` (slate-500) | Secondary text |
| `--success / warning / danger` | emerald-600 / amber-600 / red-600 | Status |
| radii | `xl` (12px) / `2xl` (16px) | Cards / containers |

### 8.2 Status color language (consistent everywhere)
- **Live / in-progress** → amber + pulsing dot
- **Ended / done** → slate
- **Success** → emerald
- **Urgent / error** → red
- **Voice** → indigo · **WhatsApp** → emerald (channel badges)

### 8.3 Typography & spacing
System font stack; page titles `text-2xl font-extrabold`; section `text-sm font-bold uppercase
tracking-widest`; 8px spacing grid; tables `px-5 py-3.5`.

---

## 9. Performance

- **Server Components by default**; mark interactive leaves `"use client"` only where needed.
- **Code-split** heavy pages (transcript view) via dynamic import.
- **Route prefetching** through `next/link` (default).
- **Query caching** eliminates duplicate fetches across navigations.
- **Memoize** table rows; virtualize (`@tanstack/react-virtual`) when lists exceed ~200 rows.
- **Bundle budget:** first-load JS < 150 KB gzip per route; track in CI.
- **Images/icons:** tree-shaken Lucide imports only (no full-set import).

---

## 10. Accessibility (WCAG 2.1 AA)

- Semantic landmarks (`<nav> <main>`), one `<h1>` per page.
- All interactive elements keyboard-reachable; visible focus rings (`focus-visible:ring-2`).
- Color never the sole signal — pair badges with icon + text.
- `aria-live="polite"` on the kill-switch banner and toast region.
- Contrast ≥ 4.5:1 for text; verified in CI with axe.
- Forms: every input has a `<label>`; errors linked via `aria-describedby`.

---

## 11. Security (frontend)

| Risk | Mitigation |
|---|---|
| Token theft via XSS | httpOnly cookie (not `localStorage`) |
| CSRF on mutations | SameSite=Strict cookie + token check server-side |
| Leaking API base/secrets | only `NEXT_PUBLIC_*` exposed; secrets server-only |
| Unauthed page flash | server-side auth check in `(dashboard)` layout → redirect |
| Dependency CVEs | `npm audit` + Dependabot in CI |
| Content injection in transcripts | render as text, never `dangerouslySetInnerHTML` |

---

## 12. Quality & tooling

- **Lint/format:** ESLint (next config) + Prettier — CI-enforced.
- **Types:** `tsc --noEmit` strict; no `any` in committed code.
- **Unit/component:** Vitest + Testing Library (badges, hooks, formatters).
- **E2E:** Playwright — login → dashboard → pause agent → open conversation.
- **Visual:** optional Chromatic/Storybook for the `ui/` primitives.
- **CI gates:** lint + typecheck + unit + build must pass to merge.

---

## 13. Error handling & feedback

- **Global error boundary** (`app/error.tsx`) for render crashes → friendly fallback + reload.
- **Toast system** for mutation outcomes (call placed, message sent, agent paused).
- **Per-query error** surfaces as an inline card with a Retry button.
- **Offline/timeout:** Query retry (3×, backoff); after that, actionable error copy.

---

## 14. Production build & deploy

- `next build` → standalone output; served by `next start` or static export behind Caddy.
- Env via `.env.production` (`NEXT_PUBLIC_API_URL` = the prod API origin).
- Containerized in the existing Dockerfile (multi-stage: deps → build → runner).
- Health: a `/healthz` route handler for the uptime monitor.
- CDN/caching headers on static assets; no-cache on the HTML shell.

---

## 15. Roadmap — scaffold → production

| Phase | Work | Outcome |
|---|---|---|
| **U1 — Foundation** | Add TanStack Query + provider; centralize hooks; route groups `(auth)`/`(dashboard)` | Clean data layer, no `useEffect` fetching |
| **U2 — Security** | Move token to httpOnly cookie; server-side auth guard | No token in `localStorage` |
| **U3 — Components** | Extract `ui/` primitives with `cva`; standardize loading/empty/error | Consistent, reusable system |
| **U4 — Live & feedback** | Polling hooks for live conv/escalations; toast system; error boundary | Real-time feel, clear feedback |
| **U5 — Quality** | Vitest + Playwright + a11y checks in CI | Regression-safe |
| **U6 — Perf & polish** | Bundle budgets, virtualization, prefetch, visual QA | Fast, production-grade |

---

## 16. Out of scope (Phase 2)

Multi-tenant org switcher · real SSO/OAuth login · WebSocket/SSE live stream · call-recording
playback · dark mode toggle · in-app prompt editing · analytics charts beyond stat cards ·
mobile-native app.

---

_This is the source of truth for the Veerox AI admin dashboard frontend. Build order:
**U1 → U2 → U3 → U4 → U5 → U6**, each phase independently shippable._
