# Sambhal WhatsApp property flow: setup

You have four files:

- `schema.sql`: the database (accounts, listings, conversations, visits, run log, usage) plus a Demo Dealer account
- `sambhal-whatsapp-property-enquiry.n8n.json`: answers every buyer message
- `sambhal-visit-reminders.n8n.json`: sends the reminder one hour before a visit
- this checklist

The conversation logic was tested locally with a scripted buyer journey, and the database ran against a real Postgres. The WhatsApp and Claude calls have **not** been tested, because they need your Meta account and keys. Do the steps below in order, and use Meta's free test number first.

## 1. Database (10 minutes)

1. Create a free Supabase project, or any Postgres 14+ database.
2. Open `schema.sql`. In the last block, replace the four `CHANGE_ME` values (you will get them in step 3), or run the file as it is and use the update at the end of step 3.
3. Run the whole file in the SQL editor.

## 2. n8n (15 minutes)

You need n8n with a public HTTPS address, because Meta must reach it. n8n Cloud is the quickest.

1. Import both workflow files (Workflows, then Import from file).
2. Create two credentials and attach them in the red nodes:
   - **Postgres**: your Supabase connection details. Used by "Get context", "Save turn", "Visits due" and "Mark sent".
   - **Header Auth** for Claude: name `x-api-key`, value is your Anthropic API key. Used by the "Claude" node.
3. In the workflow "WhatsApp property enquiry", open the **Check token** node and change `CHANGE_ME_VERIFY_TOKEN` to a long random string. Keep a copy.
4. Activate both workflows. Your webhook address is `https://YOUR-N8N-ADDRESS/webhook/sambhal-wa`.

If "Get context" or "Save turn" complains about query parameters, replace `$1`, `$2` in the query with the expressions inline. Some n8n versions differ on this.

## 3. Meta (you must do this yourself, about 30 minutes)

1. At developers.facebook.com, create an app of type Business and add the **WhatsApp** product.
2. On the WhatsApp "API Setup" page Meta gives you a **test number**, its **Phone number ID** and a temporary access token (valid 24 hours). Add your own phone as a recipient.
3. Webhooks: set the callback URL to your webhook address and the verify token to the string from step 2.3. Subscribe to the **messages** field.
4. Put the real values into the database:

```sql
update account_wa set
  phone_number_id = 'YOUR_PHONE_NUMBER_ID',
  display_number  = 'TEST NUMBER AS SHOWN',
  access_token    = 'YOUR_TOKEN',
  dealer_phone    = '919XXXXXXXXX'      -- your own number, digits only
where account_id = (select id from accounts where is_demo);
```

5. Create two message templates (Utility category, English) and wait for approval:
   - `visit_reminder`: "Namaste! Yaad dilana tha: aapka site visit {{1}} ke liye {{2}} par hai. Kuch badalna ho to is message ka reply kijiye."
   - `dealer_alert` (optional): body is just `{{1}}`. Then set `{"dealer_template":"dealer_alert"}` in `account_config.config`. Without it, dealer alerts are plain text and only arrive if the dealer wrote to that number in the last 24 hours.

Meta may reclassify reminder wording as Marketing, which costs more. Keep it transactional.

## 4. Test

From your phone, message the test number "Hi". You should get the three buttons, then budget, area, two listings, slots and a confirmation. Then check:

```sql
select at, event, msgs, ai_calls, est_cost from events order by at desc limit 10;
select * from visits;
select * from v_account_month;
```

Try a free-text question mid-flow, such as "parking milti hai?". The AI answers in Hinglish and repeats the question. For the reminder, book a slot about an hour ahead (add a slot in `account_config`) and wait up to five minutes.

## What it does not do yet

- **Slots are fixed day offsets.** There is no calendar check, so two buyers can book the same slot.
- **Listings come from a table.** Syncing from the dealer's Google Sheet is the next build.
- **Voice notes and images** get the options repeated. Transcribing voice notes is worth adding for property buyers.
- **Costs are estimates.** `est_cost` uses rates in `account_config` (defaults are placeholders). Check Meta's current India rate card and reconcile with their invoice each month.
- **Usage cap:** when a client passes their cap, the AI stops answering free text. There is no alert to the client or to you yet.
- **Failed sends** stop that run and the buyer is asked the same question next time. Add an n8n Error Workflow that writes a `failed` row to `events` so the portal shows it.
- **Tokens sit in plain text** in `account_wa`. Fine for your own test number. Move them to Supabase Vault or encrypt them before any client's token goes in.
- **Graph API version** is `v21.0`. Check Meta's docs and use the current version.

## Before the first paying client

- The client creates and owns their own Meta Business account and WhatsApp number. You get a token through Meta's onboarding.
- Display name approval and Meta business verification can take days. Start early.
- Buyers must have opted in by messaging first. Never import and message a purchased list.
- Write a one-line data notice (what is stored, for how long, who sees it) for the dealer to share. India's DPDP Act applies to the buyers' phone numbers and names.
