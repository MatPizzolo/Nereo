---
description: Set up ngrok tunnel and test Mercado Pago webhooks locally
---

# Mercado Pago Webhook Testing with ngrok

## Prerequisites
- Backend server running on port 8080
- ngrok installed (`ngrok version`)
- `MP_ACCESS_TOKEN` set in `nereo-backend/.env`

## Steps

// turbo
1. Start the backend server if not running:
```bash
cd /home/matpizzolo/code/nereo/nereo-backend && go run ./cmd/api
```

// turbo
2. Start ngrok tunnel:
```bash
ngrok http 8080 --log=stdout --log-format=json
```

3. Copy the ngrok HTTPS URL from the output (e.g., `https://xxxx.ngrok-free.app`)

4. Configure the MP webhook using the MCP tool `save_webhook`:
   - `application_id`: `5623634909355141`
   - `callback_sandbox`: `https://<ngrok-url>/api/v1/webhooks/mercadopago`
   - `topics`: `["payment"]`

5. Test with the MCP tool `simulate_webhook`:
   - `resource_id`: any payment ID (e.g., `123456789`)
   - `topic`: `payment`

6. Check server logs for webhook processing output.

## Test User Credentials

- **Seller (collector):** User ID `3187189444`, email `test_user_6416981034929495413@testuser.com`
- **Buyer (payer):** User ID `3187189446`, email `test_user_2152568504793202333@testuser.com`
- **Buyer password:** `YKr2nT693j`

## Testing Checkout Pro in Browser

1. Create a preference via the API (use seller's JWT token)
2. Open the `sandbox_init_point` URL in an incognito browser
3. Log in with the **buyer** test user credentials
4. Complete the payment with test card: `5031 7557 3453 0604`, CVV `123`, any future expiry, name `APRO`

## Testing Preapproval (Recurring)

- The `payer_email` MUST be a test user email in sandbox: `test_user_<nickname_numbers>@testuser.com`
- The preapproval `init_point` URL opens the subscription flow for the buyer

## Notes

- ngrok URL changes every restart (free tier). Re-configure the webhook after restarting ngrok.
- The webhook secret is shown in the MP developer dashboard under your app's webhook config.
- Webhook signature verification is skipped if `MP_WEBHOOK_SECRET` is empty in `.env` (dev mode).
