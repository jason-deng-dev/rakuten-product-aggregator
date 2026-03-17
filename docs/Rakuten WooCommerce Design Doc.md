**Project:** rakuten-product-aggregator

**Platform:** running.moximoxi.net — Japanese marathon platform for Chinese runners

**GitHub:** [https://github.com/jason-deng-dev/rakuten-product-aggregator](https://github.com/jason-deng-dev/rakuten-product-aggregator)

**Author:** Jason Deng

**Date:** March 2026

**Status:** In Development

---

## 1. Problem Statement

### 1.1 Context

running.moximoxi.net serves Chinese runners interested in Japanese running products. One of the platform's four core destinations is `/shop/` — a curated store selling Japanese running nutrition and gear (FANCL, Amino Vital, Pocari Sweat, SAVAS PRO, salt tabs).

Currently, products are added to WooCommerce manually. Each product requires: finding it on Rakuten, translating the name and description from Japanese, calculating a sale price with margin and shipping, downloading images, and creating the WooCommerce listing by hand. This bottleneck limits how many products the store can carry and how quickly new products can be added.

### 1.2 The Problem

Product ingestion needs to be:

- **Automated** — fetch directly from Rakuten, no manual copy-paste
- **Translated** — product names and descriptions are in Japanese; the platform audience reads Chinese
- **Priced intelligently** — sale price must account for Rakuten cost, estimated shipping, and target margin
- **Scalable** — bulk import dozens of products at once, not one at a time
- **Browsable** — staff (and portfolio reviewers) need a UI to search, filter, and select products before importing

### 1.3 Goals

- Build a full-stack web app that fetches running products from Rakuten via API
- Display products with search, filtering by genre/category, and popularity ranking
- Translate product names and descriptions via DeepL API
- Calculate auto-pricing using a margin formula (Rakuten price + shipping estimate + margin %)
- Push selected products to WooCommerce via REST API (one-click and bulk import)
- Cache Rakuten API results in PostgreSQL with TTL-based freshness logic
- Deploy as a standalone portfolio piece, independently of WordPress

### 1.4 Non-Goals

- Real-time price sync after initial WooCommerce import (v1 is import-only)
- Customer-facing product browsing (this is an internal/admin tool + portfolio piece)
- Automated scheduled imports without human review (imports are user-triggered)
- Sourcing products from marketplaces other than Rakuten in v1

---

## 2. Dual-Output Architecture

Like the Marathon Hub, this project serves two consumers:

|Output|Purpose|Audience|
|---|---|---|
|**WooCommerce integration**|Production product ingestion for running.moximoxi.net/shop/|Store admin (Jason)|
|**Portfolio frontend**|Standalone deployable app demonstrating full-stack + API integration|Hiring managers, portfolio reviewers|

Both outputs use the same Express backend and PostgreSQL cache. The WooCommerce push is an action triggered from the portfolio UI — the two outputs are the same app, not separate systems.

---

## 3. System Architecture

### 3.1 High-Level Overview

```
FETCH → CACHE → TRANSLATE → PRICE → DISPLAY → IMPORT
```

- **FETCH:** Rakuten APIs return raw product data (Japanese)
- **CACHE:** Results stored in PostgreSQL with TTL for rate limit protection
- **TRANSLATE:** DeepL translates names and descriptions to Chinese
- **PRICE:** Auto-pricing formula calculates sale price
- **DISPLAY:** React SPA displays products with search, filter, sort
- **IMPORT:** WooCommerce REST API receives selected products

### 3.2 Component Breakdown

#### rakutenAPI.js (exists, two functions working)

- `searchByKeyword(keyword, options)` — Ichiba Item Search API
- `searchByGenre(genreId, options)` — Ichiba Genre Search API
- `getRanking(genreId, options)` — Ichiba Ranking API (new)
- `getGenreInfo(genreId)` — Ichiba Genre Search API for genre tree (new)
- Returns normalized product objects

#### normalizeItems.js (exists as helper, needs extraction)

- Maps raw Rakuten API response fields to internal product schema
- Handles missing fields gracefully (null-safe)
- Deduplicates by `itemCode` across search and ranking results

#### genres.js (exists — curated genre ID map)

- Maps internal category names to Rakuten genre IDs
- Used by rakutenAPI.js to target specific product categories
- See Section 6 for full category structure

#### db/cache.js (new)

- PostgreSQL interface for product cache
- `getCachedProducts(query)` — returns cached results if fresh (< 24h)
- `cacheProducts(products, query)` — stores results with `fetched_at` timestamp
- `invalidateCache(query)` — force-refresh specific query
- TTL logic: if `fetched_at < now - 24h` → treat as stale, re-fetch from Rakuten

#### deepl.js (new)

- Wraps DeepL API for JA → ZH-HANS translation
- `translateProduct(product)` — translates `name` and `description` fields
- `translateBatch(products)` — batch translation to minimize API calls
- Caches translated text in PostgreSQL alongside product data (translate once, reuse)

#### pricing.js (new)

- `calculatePrice(rakutenPrice, options)` — applies margin formula
- Returns `{ sale_price, cost_price, margin_pct, shipping_estimate }`
- Configurable margin % and shipping estimate per category

#### woocommerce.js (new)

- Wraps WooCommerce REST API (Consumer Key + Consumer Secret auth)
- `pushProduct(product)` — creates single WooCommerce product
- `pushBulk(products)` — sequential bulk push with per-item result logging
- `checkExists(sku)` — checks if product already exists by SKU before pushing
- Maps internal product schema to WooCommerce product fields

#### Express API server / index.js (exists, needs productionizing)

- REST endpoints consumed by React SPA
- Orchestrates: cache check → Rakuten fetch → normalize → translate → price
- Handles WooCommerce push requests from frontend

#### React SPA frontend (not started)

- Product browsing, filtering, search, detail view
- Import controls: single product and bulk selection
- Pricing preview before import

### 3.3 Data Flow

```
React SPA (user searches / browses)
    ↓  (GET /api/products)
Express API
    ↓  (cache check)
PostgreSQL cache
    ├── FRESH (< 24h): return cached results
    └── STALE / MISS:
            ↓  (API call)
        Rakuten APIs (Search / Ranking / Genre)
            ↓  (normalize)
        normalizeItems.js
            ↓  (cache + translate)
        PostgreSQL (store with fetched_at)
        deepl.js (JA → ZH-HANS, cache translation)
            ↓
        pricing.js (apply margin formula)
            ↓
        Express API response
            ↓
React SPA (displays products with translated names, calculated prices)
    ↓  (user selects + clicks Import)
Express API
    ↓  (POST /api/woocommerce/push)
woocommerce.js
    ↓  (WooCommerce REST API)
running.moximoxi.net/shop/ (product live in store)
```

---

## 4. Data Design

### 4.1 Internal Product Schema

```json
{
  "item_code": "amino-vital-pro-30sticks",
  "rakuten_item_code": "amovital:10000123",
  "name_ja": "アミノバイタル プロ 30本入",
  "name_zh": "氨基活力 PRO 30支装",
  "description_ja": "...",
  "description_zh": "...",
  "images": [
    "https://thumbnail.image.rakuten.co.jp/@0_mall/amovital/cabinet/img01.jpg"
  ],
  "rakuten_price": 3240,
  "sale_price": 4980,
  "cost_price": 3240,
  "shipping_estimate": 800,
  "margin_pct": 20,
  "genre_id": "505814",
  "genre_name": "Amino Acid",
  "category": "nutrition",
  "stock_status": "instock",
  "rakuten_url": "https://item.rakuten.co.jp/amovital/...",
  "fetched_at": "2026-03-17T02:00:00Z",
  "translated_at": "2026-03-17T02:01:00Z",
  "wc_product_id": null,
  "wc_pushed_at": null
}
```

### 4.2 PostgreSQL Schema

```sql
CREATE TABLE products (
  id               SERIAL PRIMARY KEY,
  item_code        VARCHAR(255) UNIQUE NOT NULL,
  rakuten_item_code VARCHAR(255),
  name_ja          TEXT,
  name_zh          TEXT,
  description_ja   TEXT,
  description_zh   TEXT,
  images           JSONB,
  rakuten_price    INTEGER,
  sale_price       INTEGER,
  cost_price       INTEGER,
  shipping_estimate INTEGER,
  margin_pct       DECIMAL(5,2),
  genre_id         VARCHAR(50),
  genre_name       VARCHAR(100),
  category         VARCHAR(50),
  stock_status     VARCHAR(20) DEFAULT 'instock',
  rakuten_url      TEXT,
  fetched_at       TIMESTAMP,
  translated_at    TIMESTAMP,
  wc_product_id    INTEGER,
  wc_pushed_at     TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE import_log (
  id            SERIAL PRIMARY KEY,
  item_code     VARCHAR(255),
  wc_product_id INTEGER,
  status        VARCHAR(20), -- 'success', 'failed', 'skipped'
  error_message TEXT,
  imported_at   TIMESTAMP DEFAULT NOW()
);
```

### 4.3 Pricing Formula

```
sale_price = ceil((rakuten_price + shipping_estimate) / (1 - margin_pct))
```

**Default values (configurable per category):**

|Category|Shipping Estimate|Target Margin|
|---|---|---|
|Nutrition / Supplements|¥800|20%|
|Running Gear|¥1,200|22%|
|Recovery & Care|¥800|20%|
|Sportswear|¥1,500|25%|
|Training Equipment|¥1,500|22%|

**Example:**

```
Rakuten price: ¥3,240
Shipping estimate: ¥800
Margin: 20%

sale_price = ceil((3240 + 800) / (1 - 0.20))
           = ceil(4040 / 0.80)
           = ceil(5050)
           = ¥5,050
```

The pricing formula and per-category shipping/margin config are stored in a `pricing_config.js` file — adjustable without touching business logic.

### 4.4 Express API Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`GET`|`/api/products`|Product list, supports query params|
|`GET`|`/api/products/:itemCode`|Single product detail|
|`GET`|`/api/products/ranking`|Top products by Rakuten ranking|
|`GET`|`/api/genres`|Genre tree for filter UI|
|`POST`|`/api/products/refresh`|Force cache invalidation + re-fetch|
|`POST`|`/api/woocommerce/push`|Push single product to WooCommerce|
|`POST`|`/api/woocommerce/push-bulk`|Push array of products to WooCommerce|
|`GET`|`/api/woocommerce/status/:itemCode`|Check if product already in WooCommerce|

**Query params for `/api/products`:**

|Param|Values|Example|
|---|---|---|
|`category`|`nutrition`, `gear`, `recovery`, `sportswear`, `training`|`?category=nutrition`|
|`genre_id`|Rakuten genre ID|`?genre_id=505814`|
|`keyword`|Search string|`?keyword=amino+vital`|
|`sort`|`popularity`, `price_asc`, `price_desc`, `newest`|`?sort=popularity`|
|`min_price`|Integer (¥)|`?min_price=500`|
|`max_price`|Integer (¥)|`?max_price=5000`|
|`imported`|`true`, `false`|`?imported=false`|

---

## 5. WooCommerce Integration — Technical Decision

### 5.1 Options Considered

|Approach|Pros|Cons|
|---|---|---|
|**WooCommerce REST API (Consumer Key/Secret)**|Official, documented, safe, works over HTTPS|Slightly more setup than direct DB|
|Direct DB insert|Fast, no HTTP overhead|Bypasses WooCommerce hooks, pricing logic, stock management — dangerous for a live store|
|WP CLI|Simple for one-off runs|Requires SSH, not callable from Node API|

### 5.2 Decision: WooCommerce REST API

Use the WooCommerce REST API (`/wp-json/wc/v3/products`) authenticated with Consumer Key and Consumer Secret (generated in WooCommerce → Settings → Advanced → REST API).

**Rationale:**

- Official integration path — WooCommerce's hooks, stock management, and category logic all fire correctly
- Works over HTTPS from the Node backend without server access
- Consumer Key/Secret is revocable and scoped (read/write)
- Idempotent: check by SKU (`item_code`) before pushing — update if exists, create if not

### 5.3 WooCommerce Product Field Mapping

|Internal field|WooCommerce field|
|---|---|
|`name_zh`|`name`|
|`description_zh`|`description`|
|`sale_price`|`regular_price`|
|`images`|`images` (array of `{ src }`)|
|`category`|`categories` (mapped to WC category ID)|
|`stock_status`|`stock_status`|
|`item_code`|`sku`|
|`rakuten_url`|`external_url` (product source attribution)|

### 5.4 Idempotency Strategy

Before every push:

1. `GET /wp-json/wc/v3/products?sku={item_code}` — check if product exists
2. If exists → `PUT` update with latest translated name, description, price
3. If not → `POST` create new product
4. Log result to `import_log` table

---

## 6. Product Categories & Genre Map

### 6.1 Category Structure

```
🏃 Running Gear
  ├── Shoes
  ├── Apparel
  ├── GPS / Watch
  └── Accessories (pouches, armbands, insoles)

💪 Training
  ├── Fitness Machines
  ├── Yoga / Pilates
  └── Track & Field

🥤 Nutrition & Supplements
  ├── Sports Drinks
  ├── Protein
  ├── Amino Acid
  ├── Vitamins & Minerals
  └── Recovery (Collagen, Citric Acid, Probiotics)

🧴 Recovery & Care
  ├── Massage Products
  ├── Stretching Equipment
  ├── Foot Care
  └── Sports Care Products

👕 Sportswear
  ├── Men's
  ├── Women's
  ├── Underwear
  └── Bags & Accessories
```

### 6.2 genres.js Structure

```javascript
module.exports = {
  nutrition: {
    label: "🥤 Nutrition & Supplements",
    subgenres: {
      sports_drinks: { label: "Sports Drinks", genreId: "XXXXXX" },
      protein:       { label: "Protein",        genreId: "XXXXXX" },
      amino_acid:    { label: "Amino Acid",      genreId: "505814" },
      vitamins:      { label: "Vitamins & Minerals", genreId: "XXXXXX" },
      recovery:      { label: "Recovery",        genreId: "XXXXXX" }
    }
  },
  gear: {
    label: "🏃 Running Gear",
    subgenres: {
      shoes:       { label: "Shoes",       genreId: "XXXXXX" },
      apparel:     { label: "Apparel",     genreId: "XXXXXX" },
      gps_watch:   { label: "GPS / Watch", genreId: "XXXXXX" },
      accessories: { label: "Accessories", genreId: "XXXXXX" }
    }
  },
  // ... recovery, training, sportswear
}
```

Genre IDs for incomplete entries are fetched via the Rakuten Ichiba Genre Search API and populated before launch.

---

## 7. DeepL Translation Pipeline

### 7.1 Translation Strategy

- Translate `name_ja` → `name_zh` and `description_ja` → `description_zh`
- Source language: `JA` (Japanese)
- Target language: `ZH-HANS` (Simplified Chinese — matches platform audience)
- Translate once, store in PostgreSQL — never re-translate the same `item_code` unless explicitly invalidated
- Batch translation: collect all untranslated products in a request, send as array to DeepL to minimize API call count

### 7.2 Translation Cache Logic

```
On product fetch:
  if translated_at IS NULL → add to translation queue
  if translated_at IS NOT NULL → use cached translation

On translation queue flush:
  POST to DeepL /v2/translate with array of texts
  Update name_zh, description_zh, translated_at in PostgreSQL
```

### 7.3 Fallback

If DeepL API is unavailable or quota exceeded:

- Return product with `name_zh = name_ja` (raw Japanese) flagged as untranslated
- UI shows "Translation pending" badge on affected products
- Do not block product display or import

---

## 8. Technical Decisions

|Decision|Choice|Alternatives Considered|Rationale|
|---|---|---|---|
|Caching layer|PostgreSQL with 24h TTL|In-memory only, Redis|PostgreSQL already in stack; persistent across restarts; enables translation caching alongside product data; 24h TTL balances freshness vs rate limit protection|
|Translation|DeepL JA → ZH-HANS|Google Translate, manual|DeepL produces higher quality output for Japanese technical/product text; ZH-HANS matches platform audience|
|WooCommerce integration|WooCommerce REST API|Direct DB insert, WP CLI|Official path; hooks fire correctly; no SSH dependency; revocable auth|
|Pricing|Formula-based (configurable per category)|Manual per-product, flat markup|Configurable margins per category reflects real shipping cost differences; formula is auditable and adjustable|
|Frontend|React SPA|EJS (existing MVC)|React demonstrates modern frontend skills; consistent with Marathon Hub portfolio approach; filtering-heavy UI suits SPA|
|Data source|Rakuten Ichiba APIs (Search + Ranking + Genre)|Manual scraping, other marketplaces|Official Rakuten API — reliable, documented, rate-limited in a known way; covers search intent + popularity signal|
|Language|Node.js / JavaScript|Python|Consistent with rest of stack; no context switching|

---

## 9. React SPA Frontend

### 9.1 Overview

A standalone React application consuming the Express API. Same deployment pattern as the Marathon Hub frontend — independently hosted, does not depend on WordPress being live.

### 9.2 Feature Spec

**Product listing page (main view):**

- Card grid of products, default sorted by popularity (Rakuten ranking)
- Each card: translated product name, image, calculated sale price, category badge, import status badge (imported / not imported)
- Click card → product detail view

**Filter + search panel:**

- Filter by category: All / Running Gear / Nutrition / Recovery / Training / Sportswear
- Filter by subcategory/genre: dynamic based on selected category
- Sort: Popularity / Price low-high / Price high-low / Newest
- Price range slider
- Keyword search (triggers new Rakuten API call via Express)
- "Not yet imported" toggle — show only products not yet in WooCommerce

**Product detail view:**

- Full product info: translated name, description, images (carousel), calculated price breakdown
- Price breakdown: Rakuten cost + shipping estimate + margin % = sale price
- Import button (single product push to WooCommerce)
- Link to original Rakuten listing

**Bulk import:**

- Checkbox selection on product cards
- "Import selected (N)" action bar appears when items are checked
- Confirm modal showing selected products + total before pushing
- Per-product result feedback after bulk push (success / failed / skipped)

**UI state handling:**

- Loading skeleton on fetch
- "Translation pending" badge on untranslated products
- Import status badge persists after push (sourced from `wc_product_id` in DB)
- Error state if API or WooCommerce is unreachable

### 9.3 Stack

|Layer|Choice|
|---|---|
|Frontend|React (Vite)|
|Styling|Tailwind CSS|
|API client|axios|
|Backend|Express + Node.js|
|Database|PostgreSQL|
|Deployment|Railway / Render|

---

## 10. Implementation Phases

### 10.1 Current Status

|Component|Status|Notes|
|---|---|---|
|rakutenAPI.js|🔧 Partial|Two functions working (keyword search, genre search); ranking not implemented|
|normalizeItems.js|🔧 Partial|Exists as inline helper, needs extraction to module|
|genres.js|🔧 Partial|Structure exists, some genre IDs missing|
|db/cache.js|❌ Not started|PostgreSQL cache layer|
|deepl.js|❌ Not started|Waiting on DeepL API key|
|pricing.js|❌ Not started|Formula defined, not implemented|
|woocommerce.js|❌ Not started|WooCommerce REST API integration|
|Express API|🔧 Partial|MVC structure set up, endpoints not fully implemented|
|React SPA|❌ Not started|—|
|Authentication|❌ Not started|—|
|Deployment|❌ Not started|—|

### 10.2 Phase 1 — Data Pipeline

1. Extract `normalizeItems.js` as standalone module
2. Add `getRanking()` to rakutenAPI.js
3. Fill in missing genre IDs in genres.js via Genre Search API
4. Build `db/cache.js` — PostgreSQL product cache with TTL logic
5. Build `pricing.js` — formula implementation with per-category config
6. Test full fetch → normalize → cache → price pipeline end-to-end

**Exit criteria:** Express API returns normalized, priced products from PostgreSQL cache. Cache miss triggers Rakuten fetch. Cache hit returns stored results. Prices match formula.

### 10.3 Phase 2 — Translation + WooCommerce

1. Obtain DeepL API key, implement `deepl.js` with batch translation and cache
2. Wire translation into fetch pipeline: fetch → normalize → translate → cache
3. Set up WooCommerce REST API credentials on running.moximoxi.net
4. Build `woocommerce.js` with push, bulk push, and SKU existence check
5. Implement import endpoints: `POST /api/woocommerce/push` and `/push-bulk`
6. Test single product push → verify product appears in WooCommerce store

**Exit criteria:** A product fetched from Rakuten can be pushed to WooCommerce with translated name/description and auto-calculated price in under 10 seconds.

### 10.4 Phase 3 — React Frontend + Deployment

1. Build React SPA: product listing, filter panel, detail view, bulk import UI
2. Wire all API endpoints into frontend
3. Add authentication (admin-only access — this is an internal tool)
4. Deploy Express API + React frontend to Railway or Render
5. Smoke test full flow: search → browse → translate → price preview → import → verify in WooCommerce

**Exit criteria:** Portfolio frontend is live at a public URL. Full import flow works end-to-end. Deployed independently of WordPress.

---

## 11. Engineering Challenges & Solutions

### 11.1 Rakuten API Rate Limits

**Challenge:** Rakuten Ichiba APIs have rate limits (varies by plan). Heavy browsing in the UI could exhaust the daily quota quickly.

**Solution:** PostgreSQL cache with 24h TTL. The vast majority of browse sessions hit cached results — only cache misses and forced refreshes call the Rakuten API. Rate limit errors are caught, logged, and returned to the UI as a "data temporarily unavailable" state without crashing the app.

### 11.2 Japanese → Chinese Translation Quality

**Challenge:** Running product descriptions often contain technical terms (amino acid types, supplement compounds, shoe technology names) that translate poorly with generic translation services.

**Solution:** DeepL produces significantly better results than alternatives for Japanese technical product text. Additionally, translated text is stored in PostgreSQL — if a translation is wrong, it can be manually corrected once and the fix persists. The UI exposes the original Japanese alongside the translation for admin review.

### 11.3 Price Accuracy

**Challenge:** Rakuten prices change. A product cached at ¥3,240 yesterday might be ¥3,580 today, making the auto-calculated sale price stale.

**Solution:** 24h cache TTL ensures prices refresh daily. Before any WooCommerce push, the system re-fetches the product from Rakuten to get the current price and recalculates before importing. This adds one API call per import but guarantees the pushed price reflects current Rakuten cost.

### 11.4 WooCommerce Push Failures

**Challenge:** WooCommerce REST API calls can fail mid-bulk-import (auth error, timeout, malformed image URL).

**Solution:** Bulk push is sequential with per-product try/catch, not a single transaction. Each result (success/failed/skipped) is written to the `import_log` table immediately. If 8 of 10 products succeed and 2 fail, the 8 are in WooCommerce and the 2 failures are logged with error messages for retry. The UI shows per-product results after a bulk push.

### 11.5 Image Handling

**Challenge:** Rakuten product images are hotlinked from Rakuten's CDN. If Rakuten removes the image or changes the URL, WooCommerce product images break.

**Solution:** On import, download images to the WordPress media library via WooCommerce's `images[].src` field — WooCommerce will sideload them into the media library automatically. This makes product images self-contained in WordPress, not dependent on Rakuten CDN.

---

## 12. Portfolio & Resume Framing

### 12.1 What This Project Demonstrates

- **Real marketplace API integration** — Rakuten Ichiba APIs with search, ranking, and genre tree traversal; not a toy API
- **Multi-API orchestration** — Rakuten + DeepL + WooCommerce REST in a single pipeline with error isolation per service
- **PostgreSQL as a cache layer** — TTL-based freshness logic, not just a dumb data store
- **Pricing business logic** — configurable margin formula with per-category shipping estimates
- **Production system** — imports go directly into a live WooCommerce store serving real users
- **Full-stack React + Express** — filtering-heavy SPA with multi-state UI (loading, translated, imported, error)

### 12.2 Talking Points for Interviews

**"Tell me about a project involving external APIs."**

> Built a product aggregator that orchestrates three external APIs in a single pipeline: Rakuten Ichiba for product data, DeepL for Japanese-to-Chinese translation, and WooCommerce REST for store import. Each service has independent error handling — if DeepL is down, products still display in Japanese with a "translation pending" flag. If WooCommerce is unreachable, the import queues and logs without losing data.

**"How did you handle API rate limits?"**

> Implemented a PostgreSQL cache layer with a 24-hour TTL. Browse sessions hit the cache — only cache misses and forced refreshes call the Rakuten API. Before any WooCommerce import, we re-fetch from Rakuten to get the current price, so the one API call that matters most is always fresh.

**"Walk me through the pricing logic."**

> The formula is: sale price = (Rakuten cost + shipping estimate) / (1 - margin%). Shipping estimates and margin percentages are configurable per category — nutrition products ship lighter than equipment, so they have lower shipping estimates and slightly lower margins. The config lives in a single file, so adjusting margins doesn't touch business logic.

---

## 13. Open Questions

- **DeepL API key:** Waiting on this to unblock translation implementation. Free tier (500k chars/month) should be sufficient for v1.
- **Missing genre IDs in genres.js:** Need to call Rakuten Genre Search API to populate incomplete entries before launch.
- **Authentication:** Admin-only access needed before deployment. Options: simple HTTP Basic Auth, JWT, or session-based. Needs decision.
- **Image sideloading:** WooCommerce's automatic image sideloading on import needs testing — some CDN images may block hotlink requests.
- **Ranking API coverage:** Rakuten Ranking API may not cover all genre IDs in genres.js. Need to test which genres return ranking data and which fall back to search.
- **Currency display:** Products are priced in JPY. Does the WooCommerce store display in JPY or CNY? Affects how sale_price is stored and displayed.

---

## 14. Repository Structure

```
rakuten-product-aggregator/
├── server/
│   ├── index.js                  # Express app entry point
│   ├── routes/
│   │   ├── products.js           # GET /api/products, /api/products/:id
│   │   ├── ranking.js            # GET /api/products/ranking
│   │   ├── genres.js             # GET /api/genres
│   │   └── woocommerce.js        # POST /api/woocommerce/push, /push-bulk
│   ├── controllers/
│   │   ├── productController.js
│   │   └── woocommerceController.js
│   ├── services/
│   │   ├── rakutenAPI.js         # Rakuten API wrapper (exists, partial)
│   │   ├── normalizeItems.js     # Product normalization (exists as helper)
│   │   ├── deepl.js              # DeepL translation (new)
│   │   ├── pricing.js            # Margin formula (new)
│   │   └── woocommerce.js        # WooCommerce REST API wrapper (new)
│   ├── db/
│   │   ├── cache.js              # PostgreSQL cache layer (new)
│   │   └── schema.sql            # Table definitions
│   └── config/
│       ├── genres.js             # Rakuten genre ID map (exists, partial)
│       └── pricing_config.js     # Per-category margin + shipping config (new)
└── client/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── ProductCard.jsx
        │   ├── ProductDetail.jsx
        │   ├── FilterPanel.jsx
        │   ├── BulkImportBar.jsx
        │   └── ImportResultModal.jsx
        └── hooks/
            ├── useProducts.js
            └── useImport.js
```

---
