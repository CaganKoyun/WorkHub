# Sign-in providers

Google, LinkedIn, and Microsoft (Azure) sign-in buttons on `/auth`. Each
provider needs a one-time setup in the Supabase Dashboard **and** on the
provider's own developer console. Callback URL is always:

```
https://<PROJECT>.supabase.co/auth/v1/callback
```

## LinkedIn (`linkedin_oidc`)

1. https://www.linkedin.com/developers/apps → create a new app.
2. Products → request access to **Sign In with LinkedIn using OpenID Connect**.
3. Auth tab → add the callback URL above under "Authorized redirect URLs".
4. Copy Client ID + Client Secret.
5. Supabase Dashboard → Authentication → Providers → **LinkedIn (OIDC)** →
   toggle on, paste Client ID + Client Secret, save.

## Microsoft (`azure`)

1. https://portal.azure.com → Microsoft Entra ID → **App registrations** →
   **New registration**.
2. Supported account types: **Accounts in any organizational directory
   and personal Microsoft accounts**.
3. Redirect URI: **Web** + the callback URL above.
4. Copy the **Application (client) ID**.
5. Certificates & secrets → **New client secret** → copy the *value*
   (shown only once).
6. Supabase Dashboard → Authentication → Providers → **Azure** → toggle on,
   paste Client ID + Secret, save. Leave "Azure Tenant" blank for a
   multi-tenant app (or set it if you want a single tenant).

## After setup

- No app redeploy needed — the buttons just start working.
- Redirect back lands on `window.location.origin`; make sure your Site URL
  in Supabase Auth matches the environment (dev vs prod).
- Multiple sign-in methods for the same email address auto-link when
  `Enable email confirmations` is on and the email addresses match.
