# send-push (Web Push worker)

Reads `public.push_queue` and delivers each notification via the Web Push
protocol to the corresponding rows in `public.push_subscriptions`.

## Deploy

```
supabase functions deploy send-push --project-ref vpbijxgebwoshvulmeds
```

## Required secrets

```
supabase secrets set VAPID_PUBLIC_KEY=…
supabase secrets set VAPID_PRIVATE_KEY=…
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
```

Generate a key pair once with `npx web-push generate-vapid-keys` and use
the public key as both this secret and the Vercel `VITE_VAPID_PUBLIC_KEY`
env var (same value).

## Invoke

```
curl -X POST -H "Authorization: Bearer $ANON_KEY" \
     "https://vpbijxgebwoshvulmeds.functions.supabase.co/send-push?limit=100"
```

Best paired with a cron trigger every minute (Supabase Scheduled Functions
or an external cron). At low volume, hourly is fine.

## Notes

- Uses the service role internally to read subscriptions across users.
- Marks 404 / 410 endpoints as dead and deletes them from
  `push_subscriptions`.
- After 5 failed attempts an item flips to `status='failed'`; investigate
  via `select * from push_queue where status='failed'`.
- Client subscribe/unsubscribe flow lives in
  `src/pages/NotificationSettings.tsx` and `src/lib/push-hooks.ts`.
