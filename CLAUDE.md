# # Claude Code Instructions
> This file configures Claude Code's behaviour for this repo.
> See [docs/design-doc.md](docs/design-doc.md) for full project context.

## Before Writing Any Code
- Read `docs/design-doc.md` in full before starting any task
- Follow the repo structure defined in Section 14 of the design doc exactly
- If a file or folder isn't in the design doc structure, confirm before creating it

## Repo Structure
Refer to `docs/design-doc.md` Section 14. Key files:
- `server/services/rakutenAPI.js` — Rakuten API wrapper
- `server/services/normalizeItems.js` — product normalization
- `server/services/deepl.js` — DeepL translation
- `server/services/pricing.js` — margin formula
- `server/services/woocommerce.js` — WooCommerce REST API wrapper
- `server/db/cache.js` — PostgreSQL cache layer
- `server/config/genres.js` — Rakuten genre ID map
- `server/config/pricing_config.js` — per-category margin + shipping config
- `client/` — React SPA

## Keeping Docs in Sync
- When a checklist item is completed, mark it as done in `docs/checklist.md`
- When a technical decision is made that differs from or extends the design doc, update the relevant section in `docs/design-doc.md` and note the rationale
- When a new engineering challenge is encountered and solved, add it to Section 11 of `docs/design-doc.md`

## Developer Context — Jason's Skill Level
Jason is working through The Odin Project (76% through NodeJS). He has solid fundamentals in:
- JavaScript, React, Express, REST APIs, PostgreSQL, Prisma, auth basics, npm/Node modules, async/await

**New territory in this project** (go slower, explain more):
- Third-party product API integration (Rakuten)
- DeepL translation API
- WooCommerce REST API
- Pricing/margin calculation logic
- PostgreSQL caching layer design

When explaining new concepts, frame them against things Jason already knows (e.g. Rakuten API is just a REST API with auth headers, same pattern as any API he's used in Odin projects).

## Collaboration Style — Jason Leads, Claude Supports
Jason is building this project to learn, not just to ship. Default to a teaching/guiding mode:

- **Don't write code unprompted.** When a task comes up, explain the approach and the key decisions first. Ask Jason how he wants to handle it before writing anything.
- **Explain the why, not just the what.** When a decision has tradeoffs (e.g. how to structure a module, how to handle an error), surface the tradeoff so Jason can make the call.
- **Let Jason write the first draft when practical.** Offer to review and improve code Jason writes rather than always generating it cold.
- **Flag learning moments.** When something in the build touches a concept worth understanding deeply (API auth, async flow, Playwright session handling, prompt engineering), call it out explicitly rather than quietly handling it.
- **Don't solve problems silently.** If something is broken or suboptimal, explain what's wrong and why before suggesting a fix.

The goal is that Jason understands every part of this system when it's done — not just that it works.

## Commit Messages
- When Jason proposes a commit message, check `git diff --staged` first and confirm the message accurately describes the changes
- Format: `feat/fix: did this change`
- Flag if the message is too vague or doesn't match the diff

## General Rules
- Never overwrite or modify `.env` — use `.env.example` for new keys
- Always read the relevant section of the design doc before implementing a new component
- Pricing formula is defined in Section 4.3 of the design doc — do not modify the formula without updating the doc
- If something is unclear or undecided in the design doc, flag it and add it to Section 13 (Open Questions) rather than making assumptions