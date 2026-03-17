# Rakuten Product Aggregator → WooCommerce

A full-stack internal tool that fetches Japanese running products from the Rakuten marketplace, translates them from Japanese to Chinese via DeepL, calculates sale prices using a configurable margin formula, and imports selected products directly into a live WooCommerce store.

Built for [running.moximoxi.net](https://running.moximoxi.net) — a marathon platform for Chinese runners interested in Japanese running products.

## What It Does

- Fetches running products from Rakuten Ichiba via Search, Genre, and Ranking APIs
- Caches results in PostgreSQL with 24h TTL to protect against rate limits
- Translates Japanese product names and descriptions to Simplified Chinese via DeepL (translate once, cache forever)
- Auto-calculates sale prices: `ceil((rakuten_price + shipping_estimate) / (1 - margin_pct))` with per-category config
- React SPA for browsing, filtering, and selecting products before import
- One-click and bulk import to WooCommerce via the REST API (idempotent by SKU)

## Stack

- Node.js / Express
- PostgreSQL
- Rakuten Ichiba APIs (Item Search, Ranking, Genre Search)
- DeepL API
- WooCommerce REST API
- React (Vite) + Tailwind CSS

## Architecture

See [docs/design-doc.md](docs/design-doc.md) for full system architecture, data schema, pricing formula, API design, and technical decisions.

## Running Locally
```bash
git clone https://github.com/jason-deng-dev/rakuten-product-aggregator
cd rakuten-product-aggregator
npm install
cp .env.example .env
# Add Rakuten API key, DeepL API key, WooCommerce credentials to .env
node server/index.js
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/products | Product list with filters |
| GET | /api/products/:itemCode | Single product detail |
| GET | /api/products/ranking | Top products by Rakuten ranking |
| GET | /api/genres | Genre tree for filter UI |
| POST | /api/woocommerce/push | Push single product to WooCommerce |
| POST | /api/woocommerce/push-bulk | Bulk push to WooCommerce |

## Status

In development — see [docs/checklist.md](docs/checklist.md) for current progress.