# send-email

Outbound email worker. Reads `public.email_queue` rows (`status='pending'`),
sends via Resend, marks each row `sent` or `error`.

## Setup

1. `resend.com` → new API key. Verify a sending domain and pick a `from` address.
2. Supabase → Edge Functions → Secrets:
   - `RESEND_API_KEY` — the key from step 1
   - `EMAIL_FROM` — e.g. `WorkHub <alerts@yourdomain.com>`
3. Deploy: `supabase functions deploy send-email --no-verify-jwt`
4. Schedule: Supabase → cron (or `pg_cron`):
   ```sql
   select cron.schedule(
     'send-email',
     '* * * * *',
     $$ select net.http_post(
       url  := 'https://<PROJECT>.functions.supabase.co/send-email',
       body := '{"limit": 50}'::jsonb
     ) $$
   );
   ```

## Trigger source

The `public.notifications` insert trigger `trg_enqueue_notification_email`
consults `notification_preferences` and drops matching rows into
`email_queue`. Any other code path can enqueue directly:

```sql
insert into public.email_queue (user_id, to_email, subject, body, link)
values (auth.uid(), 'me@example.com', 'Hey', 'Body', 'https://…');
```
