# IRMP — Integrated Restaurant Management Platform

A demonstration-ready restaurant ordering and operations application built with React, Vite, Express, MongoDB, Mongoose, JWT, and Socket.IO. The sample menu, demo accounts, and every monetary amount use Indian Rupees (INR).

## Prerequisites

- Node.js 20 or later and npm.
- MongoDB Community Server running locally, or an accessible MongoDB connection string.

## Start on Windows

Open PowerShell in this project directory:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
npm run install:all
npm run seed
npm run dev
```

Open `http://localhost:5173`. The API health check is at `http://localhost:5000/api/health`.

Configure `server\.env` before seeding or starting the API:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/irmp_platform
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
DEMO_PASSWORD=Restaurant123!
```

Change `JWT_SECRET` and `DEMO_PASSWORD` before using a shared or production environment. Never publish `.env` files. For a hosted API, set `VITE_API_URL` in `client\.env` to its `/api` URL.

## Development demo accounts

The seed script creates these seven role accounts. The default development password is `Restaurant123!`; set `DEMO_PASSWORD` before `npm run seed` to choose a different password. These accounts/passwords are for local demonstrations only.

| Role | Email |
| --- | --- |
| Administrator | `admin@irmp.demo` |
| Customer | `customer@irmp.demo` |
| Kitchen Staff | `kitchen@irmp.demo` |
| Inventory Manager | `inventory@irmp.demo` |
| Cashier | `cashier@irmp.demo` |
| Delivery Staff | `delivery@irmp.demo` |
| Food Rescue Partner | `rescue@irmp.demo` |

The seed is additive and safe to rerun: it upserts demo users, 32 menu items, pantry ingredients, and 12 restaurant tables without deleting unrelated records. Existing demo account passwords are not reset by rerunning it. Public signup always creates a Customer; only an authenticated Administrator can create staff accounts.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run install:all` | Install root, API, and web dependencies |
| `npm run dev` | Start the API and Vite development server together |
| `npm run seed` | Seed local demo accounts, menu, ingredients, and tables |
| `npm run build` | Build the React app for production |
| `npm test` | Run backend unit tests |
| `npm start --prefix server` | Start the API without nodemon |
| `npm run preview --prefix client` | Preview a built client |

## Demonstration workflows

- Sign in through `/login` using one of the seven actor-specific login pages. Protected routes and APIs enforce the database role, not a role supplied by the browser.
- As Administrator, add/edit/disable a dish in Menu Management. Dishes persist in MongoDB and available dishes appear immediately in the customer menu. Historical order lines keep a name/price snapshot; deleting a referenced dish archives it.
- As Customer, add dishes to the cart, choose dine-in, takeaway, or delivery, and place a clearly labelled DEMO order. The API looks up live menu prices and computes tax (5%) and delivery (₹40) itself.
- As Kitchen Staff, confirm tickets, begin preparation, and mark orders ready. Recipe ingredients are deducted once on confirmation, using conditional stock updates; cancellation of an eligible order restores mapped stock.
- As Cashier, create walk-in orders, apply an authorized 0–20% discount (tax is calculated on the discounted subtotal), print an INR receipt, mark payments as paid in DEMO mode, and advance permitted order statuses.
- As Inventory Manager, add ingredients, adjust quantities, inspect low-stock status, view the moving-average demand estimate, and record actual waste.
- As Administrator, manage surplus listings, team accounts, reservations, reporting, menu, and stock.
- Customers can request table reservations and reserve available surplus. Food Rescue Partners can claim donation listings and confirm pickup. Delivery Staff can advance only their assigned delivery tickets.
- Orders emit a Socket.IO `orders:changed` event; the current browser refreshes order lists periodically as a fallback.

## Implementation notes and scope

This is a runnable college-project MVP, not a payment or food-safety certification system. Payment is simulated and marked `DEMO`; no card or UPI payment is taken. Forecasts are a transparent 28-day moving-average baseline and are labelled preliminary when history is limited. Food-waste costs are actual recorded entries; projected savings, forecast accuracy, and validated gross margin are not fabricated. Uploaded menu images are saved in `server/uploads` and are not tracked by Git.

MongoDB is the persistence layer; local browser storage is used only for the active session token and an unsubmitted customer cart. API functionality is organized in `server/src/app.js`, schemas in `server/src/models.js`, and the forecast calculation in `server/src/services/forecast.js`. `server/test/forecast.test.js` tests the baseline forecast. Automated database/API integration tests require a running MongoDB and are not included.

Additional production hardening required before deployment includes HTTPS and secure operational secret management, backup/restore procedures, logging and audit history, stricter per-route request schemas, account recovery, payment-provider integration, and a MongoDB replica set plus transactions if workflows require multi-document atomicity. Do not use demo credentials or sample data in production.

### Not included in this MVP

Supplier directories and purchase-order workflows, reviews, a persistent notification center, real payment processing, PDF invoices, delivery-issue reporting, advanced date-filtered charts, and forecast-accuracy tracking are not implemented. Forecasting is limited to the next-day and next-seven-day 28-day moving-average estimate. Reservation conflicts and table assignment are handled, but there is no full dining-room table-status/turnover console. These are explicit scope limits rather than simulated success screens.
