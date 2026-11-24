# Sambhal wiring: listing sync, alerts, error log

Run these after the first setup is working.

## 1. Database
Run `002_sync_and_alerts.sql` in the same SQL editor, after `schema.sql`. It adds the sheet table, the sync function, the alert view and the error table. It was tested against a real Postgres.

## 2. Listing sync (dealer keeps stock in a Google Sheet)
1. Import `sambhal-listing-sync.n8n.json` and connect a Google Sheets credential. The Google account must be able to open the dealer's sheet.
2. Make a sheet from `listings-template.csv`. Columns: `id` (unique per row, never reused), `kind` (flat or plot), `area`, `price_lakh` (number), `title`, `details`, `active` (yes or no).
3. Connect the sheet to the account:

```sql
insert into account_sheets (account_id, sheet_id)
select id, 'GOOGLE_SHEET_ID_FROM_ITS_URL' from accounts where is_demo;
```

4. Run the workflow once with "Run now". It then repeats every 30 minutes.

Rules to tell the dealer: a listing removed from the sheet is switched off in the bot within 30 minutes. A blank or fully invalid sheet changes nothing. Rows with a missing id, an unknown kind or no price are skipped.
The areas the bot offers as buttons are set in `account_config`, so a new area in the sheet needs adding there too.

## 3. Usage and hours alerts
1. Import `sambhal-usage-alerts.n8n.json`. Connect Gmail and set your email in "Email me".
2. Every hour it checks all paying accounts and sends you one email when an account reaches 80% of its usage cap, reaches the cap, or uses 80% of its expert hours. Each alert fires once per account per month.
3. Dealers also get a WhatsApp notice at 80% and 100% of the usage cap. This needs a Utility template named `usage_notice` with one variable:
   "Namaste! Sambhal update: aapke WhatsApp aur AI usage ka is mahine ka limit {{1}} tak pahunch gaya hai. Hum aapse jald baat karenge."
   Until it is approved, that branch fails quietly and the email still works.
4. At 100% the property flow already stops AI answers to free text. The buttons keep working.

Hours come from the `hours_log` table. Add a row each time you finish work for an account:

```sql
insert into hours_log (account_id, task, hours)
select id, 'Tuned budget questions', 1.5 from accounts where name = 'Verma Realty';
```

## 4. Error logger
Import `sambhal-error-logger.n8n.json`. In each other workflow, open Settings and choose it as the Error Workflow. Failures then land in `system_errors`:

```sql
select at, workflow, node, message from system_errors order by at desc limit 20;
```

## Not tested
The n8n nodes for Google Sheets, Gmail and the WhatsApp templates need your accounts. The database parts and the data-cleaning code were tested locally. Node settings can differ slightly between n8n versions, so open each node after import and check for a red warning.
