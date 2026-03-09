import { toast } from "sonner";

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = 'piccaload.myshopify.com';
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = '058e9ec2c0cbbfe183a10b575f6631ee';

// Shopify product variant IDs (GraphQL format)
export const SHOPIFY_VARIANTS = {
  COLORING_BOOK: 'gid://shopify/ProductVariant/55768994742645',
  DIGITAL_DOWNLOAD: 'gid://shopify/ProductVariant/56284852781429',
  UNIQUE_PHOTOS: 'gid://shopify/ProductVariant/56357325111669',
  PERSONALIZE_COVER: 'gid://shopify/ProductVariant/56849946214773',
} as const;

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description: "Your Shopify store needs an active billing plan to process checkouts.",
    });
    return null;
  }

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Shopify: ${data.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }
  return data;
}

// ── Cart mutations ──

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        lines(first: 100) { edges { node { id attributes { key value } merchandise { ... on ProductVariant { id } } } } }
      }
      userErrors { field message }
    }
  }
`;

function formatCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

export interface CartLineAttribute {
  key: string;
  value: string;
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: CartLineAttribute[];
}

export async function createShopifyCheckout(lines: CartLineInput[]): Promise<string | null> {
  const data = await storefrontApiRequest(CART_CREATE_MUTATION, {
    input: { lines },
  });

  if (!data) return null;

  const errors = data.data?.cartCreate?.userErrors;
  if (errors?.length > 0) {
    console.error('Cart creation failed:', errors);
    toast.error("Checkout failed", { description: errors[0].message });
    return null;
  }

  const checkoutUrl = data.data?.cartCreate?.cart?.checkoutUrl;
  if (!checkoutUrl) {
    toast.error("Checkout failed", { description: "Could not create checkout session." });
    return null;
  }

  return formatCheckoutUrl(checkoutUrl);
}
