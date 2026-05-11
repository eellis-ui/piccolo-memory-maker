# Piccoload

Personalised colouring books from your favourite photos. Customers upload pictures, the app converts each one into a line-art coloring page, and the finished book is printed and shipped (or sent as a digital PDF).

Live site: <https://piccoload.com>

## Stack

- **Vite + React + TypeScript** frontend (Tailwind CSS + shadcn/ui)
- **Supabase** for auth, Postgres, storage, and edge functions
- **Shopify Storefront API** (headless) for cart + checkout
- **OpenAI `gpt-image-1`** for photo → line-art conversion (edge function)
- **Resend** for transactional emails

## Local development

Requires Node.js 18+ and npm. Install [nvm](https://github.com/nvm-sh/nvm) if you need to manage Node versions.

```sh
# Install dependencies
npm install

# Start the dev server (http://localhost:8080)
npm run dev

# Build for production
npm run build
```

## Project structure

```
src/
  pages/              top-level routes (Builder, Admin, MyOrders, ...)
  components/
    builder/          upload/approve/cover/checkout flow
    landing/          marketing pages
    layout/           Navbar, Footer
  contexts/           BasketContext, AuthContext
  lib/                Shopify client, cover renderer, analytics helpers
  integrations/
    supabase/         generated types + auto-init client
supabase/
  functions/          edge functions (convert-to-lineart, generate-customer-pdf,
                       guest-order, etc.)
public/
  uploads/            static marketing images
```

## Deployment

The frontend deploys automatically when commits land on `main`. Edge functions deploy independently via the Supabase CLI / dashboard.
