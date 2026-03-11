# Rakuten Running Store — Product Aggregator

A full-stack web application that fetches, stores, and displays running products from the Rakuten Ichiba marketplace with search, filtering, and user authentication. Built as a standalone portfolio piece demonstrating full-stack JavaScript development with external API integration.

---

## Features
- Fetches running products from Rakuten Ichiba API by keyword and genre
- Stores and caches products in PostgreSQL database
- Search products by keyword
- Filter by category (shoes, nutrition, apparel, accessories)
- Filter by price range
- Sort by price, rating, popularity
- Pagination for large product sets
- User authentication (sign up, log in, log out)
- Saved/favourited products per user
- Responsive mobile-first UI
- Scheduled sync to keep product data fresh
- Full test coverage on routes and database operations

---

## Tech Stack
**Frontend:** React, CSS  
**Backend:** Node.js, Express  
**Database:** PostgreSQL  
**Authentication:** Passport.js, bcrypt  
**Testing:** Jest, Supertest  
**External API:** Rakuten Ichiba Item Search API, Rakuten Ichiba Genre Search API  
**Deployment:** Render  

---

## Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL
- Rakuten API credentials (free — register at developers.rakuten.com)

### Installation
```bash
git clone https://github.com/jason-deng-dev/rakuten-product-aggregator.git
cd rakuten-product-aggregator
npm install
```

### Environment Variables
Create a `.env` file in the root:
```
DATABASE_URL=postgresql://username:password@localhost:5432/rakuten_store
RAKUTEN_APP_ID=your_rakuten_app_id
SESSION_SECRET=your_session_secret
```

### Database Setup
```bash
node db/populatedb.js "your-database-url"
```

### Running the App
```bash
npm run dev
```

---

## Database Schema

```sql
CREATE TABLE users (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE products (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    rakuten_item_code VARCHAR(255) UNIQUE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2),
    image_url TEXT,
    item_url TEXT,
    category VARCHAR(255),
    rating NUMERIC(3, 2),
    shop_name VARCHAR(255),
    fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE saved_products (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
);
```

---

## API Endpoints

### Products
- `GET /api/products` — get all cached products
- `GET /api/products?search=shoes` — search products by keyword
- `GET /api/products?category=nutrition` — filter by category
- `GET /api/products?minPrice=1000&maxPrice=5000` — filter by price range
- `GET /api/products/:id` — get single product

### Sync
- `POST /api/sync` — fetch fresh data from Rakuten API and update database

### Auth
- `POST /api/auth/signup` — create new user
- `POST /api/auth/login` — log in
- `GET /api/auth/logout` — log out

### Saved Products
- `GET /api/saved` — get current user's saved products
- `POST /api/saved/:productId` — save a product
- `DELETE /api/saved/:productId` — unsave a product

---

## Project Structure
```
├── controllers/
│   ├── authController.js
│   ├── productController.js
│   └── savedController.js
├── db/
│   ├── pool.js
│   ├── populatedb.js
│   └── queries.js
├── routes/
│   ├── authRouter.js
│   ├── productRouter.js
│   └── savedRouter.js
├── services/
│   └── rakutenService.js
├── tests/
│   ├── products.test.js
│   └── auth.test.js
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── App.jsx
├── .env
├── app.js
└── package.json
```

---

## Testing
```bash
npm test
```
Tests cover:
- Product API routes
- Authentication routes
- Database query functions

---

## Future Improvements
- Price history tracking over time
- Email notifications for price drops
- WooCommerce integration for affiliate store
- Scheduled automatic syncing via cron job
- TypeScript migration

---

## Acknowledgements
- [Rakuten Developers](https://webservice.rakuten.co.jp/)
- [The Odin Project](https://www.theodinproject.com/)