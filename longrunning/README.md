# Veerox AI — Planning Docs

Working notes for the 4-day Voice + WhatsApp agent build. Source-of-truth lives in code; this folder is for decisions, tradeoffs, and reference material.

Docs are grouped by category. Open the folder relevant to what you're doing.

## Layout

```
longrunning/
├── README.md                    ← you are here (index)
├── architecture/                ← how the system is shaped
│   ├── architecture.md
│   └── diagrams.md
├── decisions/                   ← what we picked and why
│   ├── tech-stack.md
│   └── api-alternatives.md
├── planning/                    ← how we build it, step by step
│   ├── plan.md
│   ├── scaffold-plan.md
│   └── implementation-plan.md
└── operations/                  ← gotchas + runbook
    └── pitfalls.md
```

## Contents

### architecture/ — how the system is shaped

| File | What's in it |
|------|--------------|
| [architecture/architecture.md](architecture/architecture.md) | System overview, the "one brain, two mouths" pattern, component responsibilities |
| [architecture/diagrams.md](architecture/diagrams.md) | All ASCII diagrams in one place (system, voice sequence, WhatsApp sequence, tool-call flow, DB schema) |

### decisions/ — what we picked and why

| File | What's in it |
|------|--------------|
| [decisions/tech-stack.md](decisions/tech-stack.md) | Refined stack — what the PDF specified + everything missing from it |
| [decisions/api-alternatives.md](decisions/api-alternatives.md) | Cost + dev-timeline comparison for the four external APIs (OpenAI Realtime, GPT-4o, Twilio, Meta WhatsApp). Read this before locking provider choices. |

### planning/ — how we build it

| File | What's in it |
|------|--------------|
| [planning/plan.md](planning/plan.md) | Day-by-day plan with concrete deliverables and parallelization notes |
| [planning/scaffold-plan.md](planning/scaffold-plan.md) | Directory tree + workstream-by-workstream scaffold breakdown |
| [planning/implementation-plan.md](planning/implementation-plan.md) | The detailed file-by-file build sheet — includes the **control plane** that the admin dashboard owns by Day 4 |

### operations/ — gotchas + runbook

| File | What's in it |
|------|--------------|
| [operations/pitfalls.md](operations/pitfalls.md) | The non-obvious gotchas that eat timelines on this kind of build — keep this open during the sprint |

## How to use these docs

- **Before starting Day 1**: read `architecture/architecture.md` and `decisions/tech-stack.md`. Lock the picks in `decisions/api-alternatives.md`.
- **During the sprint**: keep `operations/pitfalls.md` open. Work from `planning/implementation-plan.md` — it's the file-by-file checklist.
- **If scope changes**: update `planning/plan.md` and `planning/implementation-plan.md` together so they stay in sync.
- **At the end**: the client handoff README lives in the repo root, not here. These docs are internal.

## Conventions

- Costs are quoted in INR (₹) throughout. Provider USD pricing is converted at ₹85 = $1. Last verified 2026-05.
- Latency numbers are end-to-end round-trip unless noted.
- "Dev impact" is engineer-days deviation from the baseline plan in [planning/plan.md](planning/plan.md).
