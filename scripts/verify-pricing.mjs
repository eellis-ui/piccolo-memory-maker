#!/usr/bin/env node
/**
 * Exhaustive charge check: does every combination a customer can select
 * charge the amount the site displays?
 *
 *   npm run verify:pricing
 *
 * For each combination it computes what the app DISPLAYS and creates a REAL
 * Shopify cart from the lines the app would send, then compares. Exits 1 on
 * any mismatch.
 *
 * Carts are not orders — nothing is charged and nothing is fulfilled. Note it
 * does create one cart per combination (80 of them) against the live store.
 *
 * Both sides are transcribed from source. Keep them in step with:
 *   display : src/components/builder/CheckoutStep.tsx  (totals block)
 *   lines   : src/components/builder/CheckoutStep.tsx  (handleCheckout)
 *   prices  : src/contexts/BasketContext.tsx
 */
const URL_ = "https://piccaload.myshopify.com/api/2025-07/graphql.json";
const TOKEN = "058e9ec2c0cbbfe183a10b575f6631ee";

const V = {
  BOOK_1: "gid://shopify/ProductVariant/57146362364277",
  BOOK_2: "gid://shopify/ProductVariant/57146362397045",
  BOOK_3: "gid://shopify/ProductVariant/57146362429813",
  DIGITAL: "gid://shopify/ProductVariant/56284852781429",
  UNIQUE: "gid://shopify/ProductVariant/56357325111669",
  COVER: "gid://shopify/ProductVariant/56849946214773",
};
// src/contexts/BasketContext.tsx
const BUNDLE = { 1: 35.00, 2: 59.50, 3: 69.30 };
const UNIQUE_PHOTOS_PRICE = 5.99;
const DIGITAL_DOWNLOAD_PRICE = 6.99;
const ADD_ON_PRICE = 1.99;         // title / dedication page
const PERSONALIZE_COVER_PRICE = 1.99;

/** CheckoutStep.tsx:196-208 */
function displayedTotal(c) {
  const bundleTotal = BUNDLE[c.bookCount];
  const digitalPrice = c.digitalCount * DIGITAL_DOWNLOAD_PRICE;
  const uniquePhotosPrice = c.uniquePhotos ? UNIQUE_PHOTOS_PRICE : 0;
  const coverPersonalizeCount =
    c.dedicationPageCount > 0 && !c.uniquePhotos ? 1 : c.dedicationPageCount;
  const perBookAddOnsTotal = (c.titlePageCount + coverPersonalizeCount) * ADD_ON_PRICE;
  const personalizeCoverBooksCount = c.personalizeCoverFromBasket
    ? (c.uniquePhotos ? c.bookCount : 1) : 0;
  const basketPersonalizeCoverCost = personalizeCoverBooksCount * PERSONALIZE_COVER_PRICE;
  return +(bundleTotal + uniquePhotosPrice + digitalPrice
    + perBookAddOnsTotal + basketPersonalizeCoverCost).toFixed(2);
}

/** CheckoutStep.tsx:245-300 */
function cartLines(c) {
  const lines = [];
  lines.push({
    merchandiseId: c.bookCount === 2 ? V.BOOK_2 : c.bookCount === 3 ? V.BOOK_3 : V.BOOK_1,
    quantity: 1,
  });
  if (c.uniquePhotos && c.bookCount > 1) lines.push({ merchandiseId: V.UNIQUE, quantity: 1 });

  const rawPersonalizeCount = c.titlePageCount;
  const personalizeCount =
    rawPersonalizeCount > 0 && !c.uniquePhotos ? 1 : rawPersonalizeCount;
  const basketPersonalizeCount = c.personalizeCoverFromBasket
    ? (c.uniquePhotos ? c.bookCount : 1) : 0;
  const totalPersonalizeCount = Math.max(personalizeCount, basketPersonalizeCount);
  if (totalPersonalizeCount > 0) lines.push({ merchandiseId: V.COVER, quantity: totalPersonalizeCount });

  if (c.digitalCount > 0) lines.push({ merchandiseId: V.DIGITAL, quantity: c.digitalCount });
  return lines;
}

const MUT = `mutation cartCreate($input: CartInput!) {
  cartCreate(input: $input) { cart { cost { subtotalAmount { amount currencyCode } } } userErrors { message } } }`;
async function shopifyCharge(lines) {
  const r = await fetch(URL_, { method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": TOKEN },
    body: JSON.stringify({ query: MUT, variables: { input: { lines, buyerIdentity: { countryCode: "US" } } } }) });
  const j = await r.json();
  const e = j.data?.cartCreate?.userErrors;
  if (e?.length) throw new Error(e.map(x => x.message).join("; "));
  const c = j.data.cartCreate.cart.cost.subtotalAmount;
  if (c.currencyCode !== "USD") throw new Error(`cart in ${c.currencyCode}`);
  return +Number(c.amount).toFixed(2);
}

// Every combination a customer can reach.
const combos = [];
for (const bookCount of [1, 2, 3]) {
  for (const uniquePhotos of bookCount > 1 ? [false, true] : [false]) {
    for (const personalizeCoverFromBasket of [false, true]) {
      for (const digitalCount of [0, 1]) {
        for (const titlePageCount of [0, 1]) {
          for (const dedicationPageCount of [0, 1]) {
            combos.push({ bookCount, uniquePhotos, personalizeCoverFromBasket,
              digitalCount, titlePageCount, dedicationPageCount });
          }
        }
      }
    }
  }
}

const label = (c) => [
  `${c.bookCount}bk`,
  c.uniquePhotos ? "photos" : "     ",
  c.personalizeCoverFromBasket ? "cover" : "     ",
  c.digitalCount ? "digi" : "    ",
  c.titlePageCount ? "title" : "     ",
  c.dedicationPageCount ? "dedic" : "     ",
].join(" ");

console.log(`Testing ${combos.length} combinations against live Shopify\n`);
console.log("combination                              shown    charged      diff");
console.log("─".repeat(74));
const bad = [];
for (const c of combos) {
  const shown = displayedTotal(c);
  const charged = await shopifyCharge(cartLines(c));
  const diff = +(charged - shown).toFixed(2);
  if (diff !== 0) bad.push({ c, shown, charged, diff });
  console.log(
    `${label(c)}  $${shown.toFixed(2).padStart(7)}  $${charged.toFixed(2).padStart(8)}  ${
      diff === 0 ? "     ok" : (diff > 0 ? "+" : "") + diff.toFixed(2).padStart(6)}`,
  );
}
console.log("─".repeat(74));
console.log(`${combos.length - bad.length}/${combos.length} match`);
if (bad.length) {
  console.log(`\n${bad.length} MISMATCHED:`);
  for (const b of bad) {
    console.log(`  ${label(b.c)}  shown $${b.shown.toFixed(2)}  charged $${b.charged.toFixed(2)}  ${b.diff > 0 ? "OVER" : "UNDER"}charged $${Math.abs(b.diff).toFixed(2)}`);
  }
}
process.exit(bad.length ? 1 : 0);
