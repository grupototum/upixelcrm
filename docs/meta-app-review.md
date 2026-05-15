# Meta App Review — uPixel CRM

App ID: **911162198384188**
Business: **Totum marketing** (`882191119505136`)
Primary domain: **upixel.app**

This document contains the English texts and screencast scripts for every permission required to take the app to Live Mode. Copy each block into the corresponding field on the Meta for Developers Dashboard.

---

## 0. App description (Settings → Basic → App Description / Use Case description)

```
uPixel CRM is a B2B multi-tenant SaaS platform that helps small and medium-sized businesses manage sales, customer support, advertising, and lead generation across Meta channels in a single workspace.

Each customer (a business) signs up at https://upixel.app, creates an isolated workspace identified by a subdomain (e.g., acme.upixel.app), and connects their own Meta assets (WhatsApp Business Account, Facebook Pages, Instagram professional accounts, Ad Accounts) through Embedded Signup. From that point, uPixel acts on behalf of that business to:
- Send and receive WhatsApp Business messages with their customers
- Reply to Instagram direct messages and comments
- Read engagement metrics on their Facebook Pages
- Create, manage and report on Meta ad campaigns
- Receive Lead Ads form submissions in real time and route them into the CRM

Data from each customer is strictly isolated using Postgres Row-Level Security on tenant_id. uPixel does not aggregate, resell, or share Meta data across customers.
```

---

## 1. WhatsApp Business Platform

### `whatsapp_business_messaging`

**How will your app use this permission?**
```
uPixel uses whatsapp_business_messaging to allow each business customer of uPixel CRM to send and receive WhatsApp messages with their own end-users from inside the uPixel inbox. After the business owner connects their WhatsApp Business Account (WABA) via Embedded Signup, uPixel:
1. Receives incoming text, media and interactive messages from the customer's end-users through the /whatsapp-cloud-webhook endpoint and stores them in the tenant's inbox.
2. Sends outgoing replies (free-form within the 24h window and approved templates outside it) requested by the business's authorized agents from the uPixel chat UI.
3. Marks messages as read and reports delivery status back to the business.

The permission is strictly used to operate the connected WABA on behalf of the business that authorized the connection. uPixel never sends messages on its own initiative.
```

### `whatsapp_business_management`

**How will your app use this permission?**
```
uPixel uses whatsapp_business_management so the business owner can manage their WABA assets without leaving uPixel:
1. List and refresh the phone numbers attached to their WABA.
2. Create, submit for review, edit and delete message templates (utility, marketing, authentication) used by their team.
3. Read template status updates received via webhook (account_update, message_template_status_update).
4. Subscribe and unsubscribe their own webhooks during the Embedded Signup completion step.

The permission is only used to administer assets owned by the business that authorized the connection.
```

### Test instructions (both permissions)
```
1. Open https://upixel.app and click "Criar conta".
   Use credentials provided in the Test User section.
2. After login you will be redirected to {subdomain}.upixel.app/dashboard.
3. From the left sidebar, click "WhatsApp" → "Conectar WhatsApp Cloud API".
4. Complete Embedded Signup with a WhatsApp Business test number.
5. After signup, open "Inbox" → "WhatsApp" — incoming messages will appear here.
6. Send a reply from the inbox to confirm whatsapp_business_messaging.
7. Open "WhatsApp" → "Templates" — create a template to confirm whatsapp_business_management.
```

---

## 2. Instagram API with Instagram Login

### `instagram_basic`

**How will your app use this permission?**
```
uPixel uses instagram_basic to identify the Instagram Professional account the business owner connects to their workspace. We read the account id, username and profile picture to display the connected account in the uPixel UI ("Connected as @account") and to associate incoming messages and comments with the correct connected account in multi-account scenarios.
```

### `instagram_manage_messages`

**How will your app use this permission?**
```
uPixel uses instagram_manage_messages to give the business customer a unified inbox that includes Instagram direct messages alongside WhatsApp and other channels:
1. Receive new IG DMs via webhook (messages field) into the tenant's inbox.
2. Allow authorized agents to reply to those DMs from the uPixel inbox UI within Instagram's 24-hour messaging window.
3. Mark conversations as read.

The permission is used only to operate the Instagram account the business explicitly connected. uPixel does not auto-message end-users.
```

### `instagram_manage_comments`

**How will your app use this permission?**
```
uPixel uses instagram_manage_comments so business customers can monitor and respond to public comments on their Instagram posts and Reels from inside uPixel:
1. Receive comment events via webhook (comments field).
2. Display comments grouped by post in the uPixel social inbox.
3. Allow agents to reply, hide or delete comments on posts owned by the connected account.
```

### Test instructions (Instagram)
```
1. Log in to https://upixel.app with the provided test credentials.
2. Navigate to "Instagram" in the sidebar.
3. Click "Conectar Instagram" and complete Embedded Signup with the test Instagram Business account.
4. After connection, the connected username is visible in the page header (instagram_basic).
5. Send a DM from the test consumer account to the connected business account.
   The message appears in "Inbox → Instagram". Reply from uPixel (instagram_manage_messages).
6. Post a comment from the consumer account on a post by the business account.
   It appears in "Instagram → Comments". Reply, hide and delete it from uPixel (instagram_manage_comments).
```

---

## 3. Facebook Pages

### `pages_show_list`

**How will your app use this permission?**
```
uPixel uses pages_show_list to display the list of Facebook Pages the business owner administers, so they can pick which Page(s) to connect to their uPixel workspace during onboarding. The list is shown once at connection time and is not stored beyond the user's selection.
```

### `pages_read_engagement`

**How will your app use this permission?**
```
uPixel uses pages_read_engagement to surface engagement metrics on the connected Page (posts, reach, reactions, comments count) in the uPixel "Páginas" dashboard, so the business owner can monitor their Page performance alongside the other channels they manage in uPixel.
```

### `pages_manage_metadata`

**How will your app use this permission?**
```
uPixel uses pages_manage_metadata to subscribe the connected Page to the webhooks the app needs to operate the business's messaging and lead capture flows (leadgen, messages, feed when applicable). The subscription is performed once at connection time and revoked when the business disconnects the Page.
```

### `pages_messaging`

**How will your app use this permission?**
```
uPixel uses pages_messaging to let business customers reply to incoming Facebook Messenger conversations from inside the unified uPixel inbox, alongside WhatsApp and Instagram. The permission is used only to operate the Messenger conversations on the Pages the business explicitly connected, within Facebook's 24-hour messaging window and using approved message tags otherwise.
```

### Test instructions (Pages + Messenger)
```
1. Log in at https://upixel.app with the test credentials.
2. Go to "Páginas" in the sidebar and click "Conectar Facebook".
3. In the Facebook permission dialog, grant access to the test Facebook Page.
4. The Page appears in the list with engagement metrics (pages_show_list, pages_read_engagement).
5. uPixel subscribes the Page to webhooks automatically (pages_manage_metadata).
6. Send a Messenger message from the test consumer account to the Page.
   It appears in "Inbox → Messenger". Reply from uPixel (pages_messaging).
```

---

## 4. Meta Ads / Marketing API

### `ads_management`

**How will your app use this permission?**
```
uPixel uses ads_management so business customers can plan and operate their Meta ad campaigns from the uPixel "Meta Ads" module:
1. Read the list of ad accounts the user owns or has been granted access to, after they pick which to connect.
2. Create campaigns, ad sets and ads (objective, budget, schedule, audience, creative).
3. Pause, resume, update and delete campaigns and ad sets they own.
4. Adjust budgets and bidding.

The permission is only used to operate ad accounts the business explicitly connected to their uPixel workspace.
```

### `ads_read`

**How will your app use this permission?**
```
uPixel uses ads_read to fetch insights (impressions, reach, clicks, conversions, spend, CTR, CPM, CPC, ROAS) from the ad accounts connected by the business, and display them in the uPixel reporting dashboards. We also use it to power the Conversions API server-side event submissions configured by the business for their Pixel.
```

### `business_management`

**How will your app use this permission?**
```
uPixel uses business_management to read the Business Portfolios the user administers, so that during connection the business owner can pick the correct Business Portfolio and we can verify that the WABA, Pages, Instagram accounts and Ad Accounts they wish to connect belong to the same Portfolio. We never modify the Business Portfolio itself.
```

### `leads_retrieval`

**How will your app use this permission?**
```
uPixel uses leads_retrieval to capture form submissions from Lead Ads campaigns running on the business's connected Pages:
1. Subscribe the Page to the leadgen webhook field.
2. On each leadgen event received at /meta-leads-webhook, fetch the lead's form fields using the lead id.
3. Create a contact and a deal in the uPixel CRM pipeline of the corresponding tenant, so the business can follow up immediately.
```

### Test instructions (Ads + Leads)
```
1. Log in at https://upixel.app with the test credentials.
2. Go to "Meta Ads" in the sidebar and click "Conectar Meta Ads".
3. Pick the test Business Portfolio and the test Ad Account.
4. Navigate to "Meta Ads → Campanhas" — existing campaigns are listed (ads_read, business_management).
5. Click "Nova Campanha", fill the form and create a paused campaign (ads_management).
6. Open the campaign and toggle pause/resume (ads_management).
7. Open "Meta Ads → Relatórios" — daily insights chart loads (ads_read).
8. From a connected Page, run a Lead Ads test submission (Meta Lead Ads Testing Tool).
   The lead appears in uPixel "CRM → Leads" within seconds (leads_retrieval).
```

---

## 5. Screencast scripts

Record one MP4 (1080p, max 5 min) per Use Case. Each video must show: login → connection → exercising the permission(s). Narration in English or with English subtitles. Keep mouse cursor visible.

### Video 1 — WhatsApp Business Platform (~3 min)
```
0:00 Open https://upixel.app. Show landing page briefly.
0:10 Click "Entrar", log in with the test user.
0:25 Show the tenant subdomain in the address bar (e.g., demo.upixel.app/dashboard).
0:35 Open WhatsApp section. Click "Conectar WhatsApp Cloud API".
0:45 Walk through Embedded Signup with the test WABA. Highlight scope screen.
1:30 Back in uPixel, show the connected number card with WABA id.
1:40 Open "Inbox → WhatsApp". Receive a test message from another phone.
2:00 Reply to the message from uPixel (whatsapp_business_messaging).
2:20 Open "WhatsApp → Templates". Create a new utility template "appointment_reminder".
   Submit it. Show the pending status.
2:50 Show webhooks tab where account_update events are listed
   (whatsapp_business_management).
3:00 End.
```

### Video 2 — Instagram (~3 min)
```
0:00 Logged in to uPixel. Open "Instagram → Conectar Instagram".
0:20 Embedded Signup with the test IG Business account and linked Page.
1:00 Back in uPixel, show "Conectado como @testaccount" (instagram_basic).
1:15 From a second device, send a DM to @testaccount.
1:30 Show the DM appearing in "Inbox → Instagram". Reply
   (instagram_manage_messages).
2:00 From the second device, comment on a post by @testaccount.
2:15 Show the comment appearing in "Instagram → Comentários". Reply, then
   hide, then delete it (instagram_manage_comments).
3:00 End.
```

### Video 3 — Facebook Pages + Messenger (~3 min)
```
0:00 Logged in to uPixel. Open "Páginas → Conectar Facebook".
0:30 In the FB dialog, show the Pages picker (pages_show_list).
0:45 Grant access to the test Page.
1:00 Show the Page card with engagement metrics
   (pages_read_engagement).
1:20 Show the toast/log saying "Webhooks subscribed" (pages_manage_metadata).
1:35 From a second account, send a Messenger message to the Page.
1:50 In uPixel "Inbox → Messenger", reply (pages_messaging).
3:00 End.
```

### Video 4 — Meta Ads + Lead Ads (~4 min)
```
0:00 Logged in to uPixel. Open "Meta Ads → Conectar Meta Ads".
0:30 Pick the Business Portfolio (business_management) and the test Ad Account.
1:00 Show the campaigns list with insights (ads_read).
1:30 Click "Nova Campanha". Create a paused campaign with sample creative
   (ads_management).
2:15 Open the campaign and toggle status pause/active (ads_management).
2:40 Open "Meta Ads → Relatórios" — daily insights chart loads (ads_read).
3:10 Open Meta Lead Ads Testing Tool, submit a test lead on the connected Page.
3:30 Switch to uPixel "CRM → Leads" — the lead is visible within seconds
   (leads_retrieval). Open the lead to show form fields captured.
4:00 End.
```

---

## 6. Test User credentials (you provide in App Review)

Create a uPixel test tenant before submitting:

```
Tenant: reviewer.upixel.app
Email: meta-reviewer@upixel.app
Password: <strong random — generate and paste here>
Role: tenant admin (all integrations pre-enabled)
```

Pre-connect a WABA, an IG Business account, a Facebook Page and an Ad Account in this tenant so the reviewer can immediately reproduce the flows above.

---

## 7. Submission checklist

- [ ] Privacy Policy URL set (https://upixel.app/privacy-policy)
- [ ] Terms of Service URL set (https://upixel.app/terms-of-service)
- [ ] Data Deletion Callback URL set
- [ ] Deauthorize Callback URL set
- [ ] App Domains: upixel.app
- [ ] App Icon 1024×1024 uploaded
- [ ] Business Verification: APPROVED ✅
- [ ] WhatsApp webhook URL points to /whatsapp-cloud-webhook with messages subscribed
- [ ] Instagram Use Case added, webhook URL set, messages+comments subscribed
- [ ] Meta Ads Use Case added, leadgen field subscribed on the test Page
- [ ] Payment method added on the test WABA
- [ ] Test user created and pre-connected
- [ ] 4 screencasts recorded (WhatsApp, Instagram, Pages, Ads)
- [ ] 13 permissions submitted with texts from §1–4 above
- [ ] App toggled to Live Mode after approval
