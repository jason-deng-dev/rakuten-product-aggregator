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

## General Rules
- Never overwrite or modify `.env` — use `.env.example` for new keys
- Always read the relevant section of the design doc before implementing a new component
- Pricing formula is defined in Section 4.3 of the design doc — do not modify the formula without updating the doc
- If something is unclear or undecided in the design doc, flag it and add it to Section 13 (Open Questions) rather than making assumptions