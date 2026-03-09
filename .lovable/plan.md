

## Plan: Store Shopify Webhook Signing Secret

Store the provided signing secret `2618decf7274795de6f56bee868276bea3e05855453bcdad8c52c9443626301f` as a backend secret named `SHOPIFY_WEBHOOK_SECRET`, which the `shopify-webhook` edge function already references via `Deno.env.get("SHOPIFY_WEBHOOK_SECRET")`.

### Changes
1. Use the `add_secret` tool to store the secret value
2. No code changes needed — the webhook function already uses this env var for HMAC verification

