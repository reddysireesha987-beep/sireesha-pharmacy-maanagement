# Sireesha's Online Pharmacy Management System

A working full-stack mini project built with HTML, CSS, JavaScript, Bootstrap 5, Node.js, Express.js and MySQL.

## Features
- Live search across medicines and everyday pharmacy-shop products from MySQL.
- Customer registration and login (passwords hashed with bcrypt).
- Shopping cart and order placement.
- Transaction-safe checkout: verifies stock, creates an order and order items, and decreases stock.
- Admin product/medicine create, read, update and delete.
- Admin customer listing and order-status management.
- Order history for customers and all orders for admins.
- Workbench-to-website synchronization: pages query MySQL on every refresh/request; no hardcoded medicine catalogue.
- Foreign keys, checks and indexes in the four requested core tables.

## Requirements
Install Node.js (LTS) and MySQL Server. MySQL Workbench is optional and can be used to run SQL and inspect/edit the same database.

## Setup
1. Extract the ZIP.
2. Open this folder in VS Code.
3. In MySQL Workbench, open `database.sql` and execute the complete script.
4. Copy `.env.example` to a new file named `.env`.
5. Set `DB_USER`, `DB_PASSWORD`, `DB_HOST` and `SESSION_SECRET` in `.env`.
6. In VS Code terminal run:
   ```bash
   npm install
   npm start
   ```
7. Open `http://localhost:3000`.

## Create the administrator account
For safety, public registration always creates a Customer. First register a normal account from the website. Then run this SQL in Workbench, replacing the email with the account you registered:

```sql
USE sireesha_pharmacy_db;
UPDATE users SET role = 'Admin' WHERE email = 'your_registered_email@example.com';
```
Log out and log back in. The Administrator dashboard will appear. Do not expose admin registration publicly.

## Demonstration workflow
- Register a customer and sign in.
- Search for medicines or shop essentials (oral care, personal care, baby care, hygiene, first aid, medical devices and wellness accessories), add them to the cart and place an order.
- Check `orders`, `order_items` and the reduced `medicines.stock` in Workbench.
- Promote a test account to Admin using the SQL above.
- As Admin, add/edit/delete products and medicines and update order statuses.
- To test Workbench-to-website synchronization, insert/update a product directly in Workbench, then refresh the website or search again. The website reads the current database records.

## Four core tables
- `users`
- `medicines`
- `orders`
- `order_items`

The schema adds `created_at` to users and medicines for useful audit information; it does not create extra tables.

## Important notes
- `manufacture_price` is used as the customer-facing unit price because it is the price field specified in the project brief. In a production pharmacy, add a separately governed selling-price field and pharmacist approval workflows.
- Medicine deletion is restricted when an order references it, preserving order history.
- The project is an educational demonstration, not a live licensed pharmacy. Do not use it to dispense prescription medicines or store real customer health data.
- For local development, the session cookie is configured for HTTP. Configure HTTPS, secure cookies, persistent session storage, rate limiting, CSRF protection, and production secrets before deployment.
- Bootstrap and Google Fonts load from CDNs, so internet access is needed for those visual assets.

### Product catalogue note
The existing four-table schema is preserved. Everyday non-medicine items are stored in the existing `medicines` table and displayed as products on the website; the `category` field distinguishes product groups. The existing schema requires an `expiry_date`, so non-perishable accessories use `2099-12-31` as a placeholder. Update this date when adding expiry-controlled stock.
