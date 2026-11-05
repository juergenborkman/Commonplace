# Setting up your Claude helper

The helper is a tiny free server on Cloudflare. It holds your Claude API key (so it never
appears in your public website), asks Claude to write lessons and facts, saves everything it
writes, and keeps your progress in sync across devices. Plan on about 20–30 minutes.

## 1. Claude API account (platform.claude.com)

1. Go to **platform.claude.com** and sign up. This is separate from your Claude chat subscription.
2. Open **Billing**, add a card, and buy a small amount of credit ($5–10 is plenty to start).
3. Set a **monthly spend limit** (for example $10) so the bill can never surprise you.
4. Open **API Keys** → **Create Key**, name it `commonplace`, and copy it.
   Keep it private: don't paste it into chats, emails, or the website. You'll paste it into Cloudflare in step 4.

## 2. Create the helper on Cloudflare (dash.cloudflare.com)

1. Sign up for a free account at **dash.cloudflare.com**.
2. In the left menu open **Workers & Pages** (under Compute) → **Create** → **Create Worker**
   (choose "Start with Hello World" if asked).
3. Name it `commonplace-helper` and click **Deploy**.
4. Click **Edit code**. Delete everything in the editor, paste the entire contents of
   `helper/worker.js` from this project, and click **Deploy**.

## 3. Give the helper storage

1. In the left menu open **Storage & databases** → **Workers KV** → **Create** (or "Create instance"),
   and name it `commonplace-store`.
2. Go back to your `commonplace-helper` Worker → **Settings** → **Bindings** → **Add binding** →
   **KV namespace**.
3. Set **Variable name** to `STORE` (exactly, in capitals) and pick `commonplace-store`. Save/Deploy.

## 4. Add your key and passphrase (secrets)

In the Worker → **Settings** → **Variables and Secrets** → **Add**:

| Type   | Name                | Value |
|--------|---------------------|-------|
| Secret | `ANTHROPIC_API_KEY` | the key from step 1 |
| Secret | `APP_PASSPHRASE`    | a long phrase only you know, e.g. four random words. Write it down. |

Optional (Type: Text):

| Name          | Value | What it does |
|---------------|-------|--------------|
| `MODEL`       | `claude-haiku-5-5` | Use the cheaper, faster model (default is `claude-sonnet-5-5`) |
| `DAILY_LIMIT` | e.g. `100` | Max Claude calls per day (default 60; each lesson uses 2: write + fact-check) |

Click **Deploy** after adding them.

## 5. Check it's running

Copy your Worker's address from its overview page; it looks like
`https://commonplace-helper.YOURNAME.workers.dev`. Open that address followed by `/ping` in a browser.
Seeing `{"error":"Wrong passphrase."}` means it's working (your browser didn't send the passphrase).

## 6. Connect the app

1. Upload the updated project files to GitHub (see the main README) and wait a minute for the site to refresh.
2. Open your site, go to the **Today** tab, and scroll to the bottom: **Claude helper**.
3. Paste the Worker address and your passphrase, then tap **Save and test**.
4. Do step 6.3 once on each device you use. Your progress and every saved lesson then sync between them.

## Costs (at current API prices)

- One branch lesson = a written draft plus a fact-check pass, about 2–3 cents with Sonnet, well under 1 cent with Haiku.
- Five Discover facts with fact-check: about the same as one lesson.
- Each lesson is written once and saved, so reopening it costs nothing.
- The daily limit and your Console spend limit cap the worst case.

## If something goes wrong

- "The passphrase didn't match": retype it on the device exactly as set in `APP_PASSPHRASE`.
- "Helper is not fully set up": a secret or the `STORE` binding is missing or misnamed.
- An error mentioning credit or billing: add credit at platform.claude.com.
- To change models later, edit `MODEL` in the Worker settings; no app update needed.
