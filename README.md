# Amba Traders — Website + Admin Panel

Business website and order system for **Amba Traders**, manufacturer of kurtis and 3-piece suit sets, Sumel Business Park, Ahmedabad.

- **Website** (`/`): wholesale buyers browse designs, see ready stock per size, build an order by size (M / L / XL / XXL) and send it. They can also send the order on WhatsApp.
- **Admin panel** (`/admin`): the owners review orders, log WhatsApp and shop orders, manage per-size stock, record payments and track each customer's dues.

Built with **Vite + React 19** (plain JavaScript/JSX) and plain CSS, with **Supabase** (Postgres, Auth, Storage) as the backend.

---

## How it works

| What | How |
|---|---|
| Website order | Arrives in the admin panel as **New**. No stock is taken yet. |
| Confirm order | Stock for every size in the order is **deducted**. If any size is short, confirming is blocked and the message says exactly which design and size. |
| Cancel / back to New | The deducted stock is **added back**. |
| Edit a confirmed order | Stock is rebalanced automatically. |
| Payments | Recorded against an order (UPI / cash / bank / cheque), so order and customer balances update immediately. |
| Stock history | Every change is logged, whether made by hand or by an order. |
| Rates | Each design has an optional wholesale rate per piece. If none is set, the site shows "rate confirmed on order", and you add the rate when you confirm. |

All of these rules run **inside the database** (`supabase/schema.sql`), so they can't be bypassed from the browser.

---

## Run on your computer

```powershell
cd C:\amba-traders\amba-traders\amba-traders
npm install
npm run dev
```

- Website: http://localhost:5173
- Admin: http://localhost:5173/admin

Without Supabase configured, the project runs in **demo mode**. Data is saved only in your browser, and the demo admin login is `admin@demo` / `demo`. Use it to try everything before going live.

---

## Go live with Supabase (one-time setup, about 15 minutes)

### 1. Create the project
1. Go to **supabase.com** and sign in with GitHub.
2. Click **New project**. Name it `amba-traders`, set a strong database password, and choose the **Mumbai** region.

### 2. Create the database
1. Open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this project, copy all of it, paste it in, and click **Run**.
3. Start a new query, paste all of `supabase/seed.sql`, and click **Run**. This loads the 26 current designs and their categories.

### 3. Create the admin logins
1. Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up". Only people you add can log in.
2. Go to **Authentication → Users → Add user → Create new user**. Enter an email and password for each owner (for example Aryan and Mahendra) and tick **Auto confirm user**.
3. In the **SQL Editor**, run this once per person with their real email:

```sql
insert into public.admins (user_id, name)
select id, 'Aryan' from auth.users where email = 'aryan@example.com';
```

Only users listed in `admins` can open the panel. Anyone else who logs in gets "This account is not an admin".

### 4. Connect the website
1. In Supabase, open **Project Settings → API**. Copy the **Project URL** and the **anon / publishable key**. Never use the `service_role` or secret key here.
2. For your computer, copy `.env.example` to a file named `.env` and fill it in:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   (or sb_publishable_...)
```

3. For Vercel, open **Project → Settings → Environment Variables**, add the same two variables, then go to **Deployments → ⋯ → Redeploy**.

The demo banner disappears once the site is connected.

### 5. First steps in the admin panel
1. Open `https://your-site/admin` and sign in.
2. Go to **Products & Stock** and type the ready stock for each size. Press Enter to save each number.
3. Optionally, open a design and set its **wholesale rate per piece**.
4. Place a test order on the website, then confirm it in the admin panel and check that the stock goes down.

---

## Deploy (Vercel)

```powershell
git add .
git commit -m "Add admin panel"
git push
```

Vercel rebuilds automatically after each push. `vercel.json` makes `/admin` links work and stops search engines from indexing the admin panel.

---

## Project layout

```text
supabase/
  schema.sql             tables, security rules, order/stock functions (run once)
  seed.sql               the current 26 designs (regenerate: node scripts/generate-seed.mjs)
public/
  logo/ shop/ products/ models/   images
src/
  data/business.js       contact details, address, GSTIN, reasons, etc.
  data/products.js       starting catalogue (used for the seed and the first paint)
  lib/api/               data layer: supabaseImpl.js (live), demoImpl.js (demo), shape.js
  lib/catalog.jsx        live catalogue for the website
  lib/cart.jsx           buyer's order (saved in the browser)
  components/            website sections, plus Cart/ (size picker and checkout)
  admin/                 admin panel: AdminApp, pages/, admin.css
```

Once Supabase is connected, **products, stock, prices and categories are managed in the admin panel**. `src/data/products.js` is only the starting point.

---

## Good to know

- **Free plan:** Supabase's free projects pause after about a week with no activity. Regular site visits and admin use keep the project active. If it does pause, click **Restore** in the Supabase dashboard. Upgrade when the business relies on it daily.
- **Backups:** the free plan has no automatic backups. Export important data from **Table Editor → Export to CSV** regularly.
- **Spam orders:** anyone can submit the order form, the same as any contact form. Spam orders arrive as **New** and never touch stock until you confirm them. Just cancel or delete them.
- **Not a GST invoice:** "Print" on an order gives an order summary. Keep issuing tax invoices from your billing software.

## Information still needed

- [ ] Business hours
- [ ] Email address (optional)
- [ ] Wholesale rates per design (optional — can be set any time in the admin panel)
- [ ] Ready stock per size (set in the admin panel)
- [ ] Check the Google Maps pin. The Maps link supplied is listed as "Aryan Trades" and its pin is not at Sumel Business Park, so directions use the card address instead.
- [ ] Sizes for D.No 1120–1123 (their cards don't show "M to XXL")
