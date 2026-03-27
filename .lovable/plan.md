

## Plan: Update Webhook Secret

The `SHOPIFY_WEBHOOK_SECRET` already exists but may have a different value. I'll update it to match the signing secret from your Shopify webhooks page:

`2618decf7274795de6f56bee868276bea3e05855453bcdad8c52c9443626301f`

### Steps
1. Use the `add_secret` tool to set `SHOPIFY_WEBHOOK_SECRET` to the value you provided
2. Test by sending a test notification from Shopify's webhook settings page, then check the backend function logs to confirm the signature passes

