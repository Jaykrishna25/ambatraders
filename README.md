# Amba Traders — Website

Single-page business website for **Amba Traders**, manufacturer of kurtis and 3-piece suit sets, Sumel Business Park, Ahmedabad.

Built with **Vite + React 19** (plain JavaScript/JSX). Styling is plain component-level CSS with CSS custom properties. It uses no UI kits, no Tailwind and no animation libraries. All motion comes from CSS transitions, keyframes and transforms, and it respects `prefers-reduced-motion`.

## Run it

```powershell
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # preview the production build
```

## Where things live

```text
public/
  favicon.png, apple-touch-icon.png   from the logo emblem
  logo/                  amba-traders-mark.png (emblem), amba-traders-logo.png (full lock-up)
  shop/                  storefront photo (+ full panorama)
  products/              full catalogue cards (D.No-fabric-colour.webp + -sm thumbnails)
  models/                cropped model shots used in the hero, category cards and About collage
src/
  data/business.js       ALL business details (contact, address, map, hours, about, reasons)
  data/products.js       categories + all 26 products (D.No, fabric, bottom, dupatta, sizes, price)
  lib/contact.js         WhatsApp / phone enquiry links
  lib/motion.js          scroll-reveal + 3D tilt hooks
  components/            Navbar, Hero, ProductCategories, Products, WhyChooseUs, About, Location, Contact, Footer
```

## Editing details

Everything lives in `src/data/business.js`: contacts, address, GSTIN, listing link, shop photos and reasons. Any empty field shows on the site as a dashed `[Add …]` placeholder.

- **Enquire Now** opens WhatsApp to the first person in `contacts` (currently Aryan), with the design's D.No already in the message. Reorder `contacts` to change who receives enquiries.
- **Map:** "Get Directions" and the embedded map are built from `mapQuery`, which is the address on the business card. "View on Google" opens `listingUrl`.
- **Prices:** set a product's `price` in `src/data/products.js` (e.g. `'₹1,299'`). Prices appear only when set.

## Information still needed

- [ ] Business hours
- [ ] Email address (optional)
- [ ] Prices (optional, per design)
- [ ] A short "About" paragraph in your own words (optional — a factual default is shown)
- [ ] Check the Google Maps pin. The Maps link supplied is listed as "Aryan Trades" and its pin is not at Sumel Business Park, so directions use the card address instead.
- [ ] Sizes for D.No 1120–1123 (their cards don't show "M to XXL")
- [ ] Confirm the colour names in `products.js` (read from photos)
