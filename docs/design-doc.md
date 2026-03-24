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

- Build a customer-facing React storefront for browsing and purchasing Japanese running products
- Two entry points: browse by genre (stored products) or keyword search (DB-first, live Rakuten fill-up to 10)
- Translate product names and descriptions via DeepL API (JA → ZH-HANS)
- Calculate auto-pricing using a margin formula (Rakuten price + shipping estimate + margin %)
- Cart with preset shipping costs per genre, shown clearly at checkout with adjustment caveat
- Checkout collects customer email and phone number; support contact via WeChat
- Push purchased products to WooCommerce at checkout for order and payment processing via Stripe
- Cache Rakuten API results and translations in PostgreSQL permanently (store all scraped products)
- Deploy as a standalone app, independently of WordPress

### 1.4 Non-Goals

- Real-time price sync after initial WooCommerce import (v1 is import-only)
- Automated scheduled imports without human review (imports are user-triggered)
- Sourcing products from marketplaces other than Rakuten in v1

---

## 2. Architecture Role of Each Component

|Component|Role|
|---|---|
|**React SPA**|Customer-facing storefront — product browsing, search, cart, checkout|
|**Express API**|Backend orchestration — Rakuten fetch, cache, translate, price, cart, WooCommerce push|
|**PostgreSQL**|Persistent product cache + translation cache + cart state|
|**WooCommerce**|Order processing and payment only — not the storefront|
|**Stripe**|Payment processor (already integrated via WooCommerce)|

### Why a custom React frontend instead of WooCommerce as the storefront

The original plan was to push products into WooCommerce and let customers browse there. This was changed for the following reasons:

1. **WooCommerce can't display products that don't exist in its database yet.** Our search fill-up logic fetches live from Rakuten — those results aren't in WooCommerce until after a push, which takes 30–60 seconds. Customers can't wait for that.
2. **React shows results in ~1 second.** Products from our PostgreSQL cache or a live Rakuten fetch are returned by our Express API instantly and rendered in React — no WooCommerce push required to display them.
3. **WooCommerce's frontend is not customizable enough.** Our bilingual JA/ZH use case, live search, and genre-based browsing don't fit WooCommerce's standard product listing templates without heavy plugin complexity.
4. **We only push to WooCommerce at checkout.** The customer finds the product in React, adds to cart in React, and only at purchase does our backend create the WooCommerce product + order programmatically. This keeps WooCommerce as a payment processor and order record system — what it's actually good at.

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

#### Browse by genre
```
React SPA (user selects genre)
    ↓  (GET /api/products?genre_id=XXX)
Express API → PostgreSQL (return stored products for that genre)
    ↓
React SPA (displays product cards instantly)
```

#### Search (keyword)
```
React SPA (user types keyword)
    ↓  (GET /api/products/search?keyword=XXX)
Express API → PostgreSQL (check how many results we have)
    ├── 10+ results: return from DB immediately
    └── <10 results:
            ↓  live fetch from Rakuten API
        normalizeItems.js → deepl.js → pricing.js
            ↓  store permanently in PostgreSQL
        return combined DB + new results (up to 10)
            ↓
React SPA (displays results in ~1s)
```

#### Add to cart (background WooCommerce push)
```
User clicks "Add to Cart" on React app
    ↓  (POST /api/cart)
Express API:
    1. Save item to cart in PostgreSQL
    2. Immediately trigger background push to WooCommerce
       (create product if not exists — fire and forget, don't await)
    ↓
React SPA responds instantly — user continues browsing
    ↓  (background, ~30-60s)
WooCommerce product created, wc_product_id stored in PostgreSQL
```

**Rationale:** Pushing a product to WooCommerce takes 30–60 seconds due to image sideloading. If we wait until checkout to push, the user is blocked staring at a loading screen. By triggering the push the moment a user adds to cart, we use the natural browse time (typically 2–5 minutes) to complete the push in the background. By the time the user reaches checkout, the products are already in WooCommerce and the order can be created immediately.

#### Checkout
```
User confirms cart in React, enters email + phone
    ↓  (POST /api/checkout)
Express API:
    1. Verify all cart items have wc_product_id (push complete)
       └── if any still pending: wait for push to finish
    2. POST /wp-json/wc/v3/orders — create WooCommerce order
       with customer details, line items, shipping
    3. WooCommerce returns payment_url
    ↓
React redirects user to payment_url (WordPress/Stripe)
    ↓
User completes payment on WordPress
    ↓
WooCommerce order confirmed — operator sees in WooCommerce backend
Email confirmation sent to customer automatically
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

**Currency:** All sale prices are stored and displayed in CNY (Chinese Yuan). Rakuten prices are in JPY — conversion applies at calculation time using a configurable exchange rate.

**Shipping estimate covers two legs:** Japan domestic (Rakuten → company) + international (Japan → China). Rakuten provides no weight data, so estimates are flat per category.

**Default values (placeholder — to be updated via Automation Pipeline Monitoring Dashboard):**

|Category|Shipping Estimate (CNY)|Target Margin|
|---|---|---|
|Nutrition / Supplements|¥65|20%|
|Running Gear|¥120|22%|
|Recovery & Care|¥65|20%|
|Sportswear|¥150|25%|
|Training Equipment|¥150|22%|

These values are stored in `pricing_config.js` and will be editable directly from the Automation Pipeline Monitoring Dashboard without touching code. Actual values to be confirmed by operator before launch.

**Example:**

```
Rakuten price: ¥3,240 JPY → ~¥160 CNY (at ~0.049 rate)
Shipping estimate: ¥65 CNY
Margin: 20%

sale_price = ceil((160 + 65) / (1 - 0.20))
           = ceil(225 / 0.80)
           = ¥282 CNY
```

The pricing formula and per-category shipping/margin config are stored in `pricing_config.js` — adjustable without touching business logic, and updatable via dashboard.

### 4.4 Express API Endpoints

|Method|Endpoint|Description|
|---|---|---|
|`GET`|`/api/products`|Products by genre from PostgreSQL|
|`GET`|`/api/products/search`|Keyword search — DB first, live Rakuten fill to 10|
|`GET`|`/api/products/:itemCode`|Single product detail|
|`GET`|`/api/genres`|Genre tree for filter UI|
|`POST`|`/api/cart`|Save cart state to PostgreSQL|
|`GET`|`/api/cart`|Retrieve cart state|
|`POST`|`/api/checkout`|Push products to WooCommerce + create order + return Stripe URL|
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
|Frontend|React SPA (customer-facing storefront)|WooCommerce storefront|WooCommerce can't display products until they're pushed (30-60s delay); React shows DB + live Rakuten results in ~1s; WooCommerce frontend not customizable for bilingual JA/ZH use case; see Section 2 for full rationale|
|WooCommerce role|Order processing + payment only|Full storefront|Demoted to backend payment processor — products are pushed at checkout time only, not on browse|
|Cart persistence|PostgreSQL|Browser localStorage|Survives page refresh; enables server-side cart validation before checkout|
|Shipping at checkout|Preset per genre with adjustment caveat|Calculated at push time|Rakuten provides no weight data; category-based estimate is shown with clear caveat that actual shipping may differ|
|Customer contact|WeChat (email/phone collected at checkout for order confirmation)|Email only|Chinese customers primarily use WeChat; email collected for WooCommerce order confirmation only|
|Data source|Rakuten Ichiba APIs (Search + Ranking + Genre)|Manual scraping, other marketplaces|Official Rakuten API — reliable, documented, rate-limited in a known way; covers search intent + popularity signal|
|Language|Node.js / JavaScript|Python|Consistent with rest of stack; no context switching|

---

## 9. React SPA Frontend

### 9.1 Overview

A customer-facing React storefront consuming the Express API. Independently hosted, does not depend on WordPress. Customers browse and add to cart here — WooCommerce is only involved at checkout for payment processing.

### 9.2 Feature Spec

**Product listing page (main view):**

- Two entry points:
  - **Browse by genre** — genre selector loads stored products from PostgreSQL instantly
  - **Search bar** — keyword search hits DB first; if <10 results, live scrapes Rakuten to fill up to 10, stores results permanently
- Card grid: translated product name, image, calculated sale price, category badge
- Click card → product detail view

**Product detail view:**

- Translated name, description, images (carousel)
- Calculated sale price with shipping caveat: "Estimated shipping ¥XXX — actual shipping may vary based on item weight and will be confirmed before dispatch"
- Add to cart button

**Cart:**

- Cart state persisted in PostgreSQL (survives page refresh)
- Line items: product name, price, estimated shipping per item
- Shipping caveat shown clearly before checkout
- Total price displayed

**Checkout:**

- Required fields: email address, phone number
- Note: "We will contact you via WeChat for delivery updates — please add [WeChat handle]"
- On submit: backend pushes products to WooCommerce, creates order, redirects to Stripe
- WooCommerce order confirmation email sent automatically after payment

**UI state handling:**

- Loading skeleton on fetch
- "Translation pending" badge on untranslated products
- Error state if API or Rakuten is unreachable

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

## 13. Open Questions & Resolved Decisions

### Resolved
- **Currency:** CNY. Sale prices stored and displayed in Chinese Yuan. JPY → CNY conversion applied at pricing calculation time.
- **WeChat handle:** `Moxi` — shown at checkout with instruction to add for delivery updates.
- **Shipping config:** Placeholder values set in `pricing_config.js`. Final values to be confirmed by operator and updated via Automation Pipeline Monitoring Dashboard.
- **WooCommerce role:** Order processing and payment only. React app is the customer-facing storefront.
- **Checkout push timing:** WooCommerce push triggered on "Add to Cart" in background, not at checkout — eliminates 60s blocking wait at payment time.

### Still Open
- **DeepL API key:** Waiting on this to unblock translation implementation.
- **Missing genre IDs in genres.js:** Need to call Rakuten Genre Search API to populate incomplete entries before launch.
- **WooCommerce REST API credentials:** Consumer Key + Secret not yet generated on running.moximoxi.net.
- **Image sideloading:** WooCommerce's automatic image sideloading on import needs testing — some CDN images may block hotlink requests.
- **Categories in scope for v1:** All 5 top-level categories (Running Gear, Training, Nutrition & Supplements, Recovery & Care, Sportswear). Initial pre-load target: ~500 products total, spread roughly evenly (~100 per top-level category). Catalogue grows organically via on-demand search after that.
- **Exchange rate source:** JPY → CNY rate — hardcoded in config or fetched from an exchange rate API? Needs decision.

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
