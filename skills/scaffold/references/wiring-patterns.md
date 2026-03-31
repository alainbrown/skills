# Wiring Patterns

How to produce connected boilerplate that goes beyond what an LLM does by default.

The baseline behavior is "import db, write a route." The goal is cross-integration connectivity —
every integration should touch every other relevant integration, not just coexist.

## The Rule

After wiring, pick any two confirmed integrations and ask: "Does integration A know about
integration B where it should?" If the answer is no, add the connection.

## Cross-Integration Patterns

### Auth + Database

Don't just protect routes — sync auth state into the database so the rest of the app can query it.

**Webhook sync pattern:**
- Auth provider fires events (user.created, user.deleted)
- Webhook handler inserts/deletes the user row in your DB
- All other routes query the DB user, not the auth provider directly

**Why it matters:** Without DB sync, API routes that need the user's ID, role, or subscription
status must call the auth provider on every request. With sync, it's a local DB lookup.

```
Auth webhook → DB insert → other routes read DB user
```

### Auth + Payments

The checkout flow should be auth-gated AND link the payment customer to the DB user.

**Pattern:**
1. Checkout route: `auth() → find DB user → create Stripe customer with user.id in metadata`
2. Stripe webhook: reads `metadata.userId` to link subscription back to the correct DB user
3. Protected routes: check `user.subscriptionStatus` before allowing premium actions

```
Auth → DB user → Stripe customer (metadata: userId) → webhook → DB subscription update
```

### Database Schema: Model Relationships Between Integrations

The schema should explicitly model how integrations relate:

| If you have... | The schema should have... |
|----------------|--------------------------|
| Auth + DB | `users` table with auth provider ID (e.g., `clerkId`, `authId`) |
| Auth + DB + Payments | `subscriptions` table with `userId` FK, not subscription fields on the user model |
| Auth + DB + Teams | `teams` table with auth org ID, `team_members` join table |
| Any webhook | Webhook event fields on the relevant table (e.g., `stripeCustomerId` on users or subscriptions) |

Separate tables for separate concerns. A `subscriptions` table is better than `subscriptionId`
and `subscriptionStatus` columns on the `users` table — it models the actual relationship and
supports multiple subscriptions, plan history, etc.

### Middleware + Database

Auth middleware should NOT just check "is the user logged in." It should:
1. Verify the auth token (handled by the auth provider's middleware)
2. For protected API routes, look up the DB user and attach it to the request context

This way, route handlers get a fully-hydrated user object, not just a token.

### Deployment + Everything

The deploy script and production env var table should:
- List EVERY env var from EVERY integration
- Group by integration (Auth, Database, Payments, etc.)
- Include "where to get it" and "where to set it" columns
- Cover webhook endpoint URLs that need registering post-deploy

## Completeness Checklist

After wiring, verify:

- [ ] Every webhook handler imports `db` and writes to a table
- [ ] The checkout/billing route reads the authenticated user from the DB (not just the auth token)
- [ ] The DB schema has explicit foreign keys between integration-related tables
- [ ] Protected routes that gate on subscription status read it from the DB
- [ ] The README's production env var table covers every integration
- [ ] Docker Compose's environment block has every env var the app needs locally
