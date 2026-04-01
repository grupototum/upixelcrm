

## Fix: Build error and WhatsApp Official API integration

### Problem
1. **Build error**: `useInbox.ts` queries a `category` column that doesn't exist on the `leads` table. This breaks the entire app.
2. **WhatsApp Official API**: The backend (`whatsapp-proxy`) already supports the official type, but the send/receive flow in the Inbox needs to work with both `whatsapp` and `whatsapp_official` channels.

### Plan

**Step 1: Fix the build error in `useInbox.ts`**
- Remove `category` from the `.select()` query on the `leads` table (line 68)
- Remove `category` from the `LeadConversation` interface or default it from another field (e.g., derive from `origin` or hardcode `"lead"`)
- Replace `lead?.category || "lead"` with just `"lead"` since the column doesn't exist

**Step 2: Verify WhatsApp Official API flow**
- The `whatsapp-proxy` edge function already handles `type=official` for save-config, connect, status, disconnect, send-message, and send-media
- The `whatsapp-webhook` edge function needs to handle incoming messages from the official API (different payload format from Meta vs Evolution API Baileys)
- Ensure the Inbox correctly displays conversations from both `whatsapp` and `whatsapp_official` channels

**Step 3: Update `whatsapp-webhook` for Official API payloads**
- Meta's webhook payload structure differs from Evolution API's Baileys format
- Add parsing logic for Meta's `entry[].changes[].value.messages[]` structure
- Extract sender phone, message text, and media from the official format
- Store with `channel: "whatsapp_official"` in conversations/messages

**Step 4: Ensure Inbox handles both channels**
- Verify `useInbox.ts` send functions pass the correct `type` parameter based on the conversation's channel
- Ensure reply from Inbox routes through the correct provider (`whatsapp` vs `whatsapp_official`)

### Technical Details

**`useInbox.ts` changes:**
- Line 11: Change `category: string` to `category?: string` or remove entirely
- Line 68: Change select to `"id, name, phone, email, company, origin"`
- Line 93: Use `origin` field or default `"lead"`

**`whatsapp-webhook` changes:**
- Add a code path that detects Meta's official webhook format (presence of `entry` array with `changes`)
- Parse message content, sender info, and media URLs from Meta's structure
- Media from official API uses different download endpoints (Graph API with access token)

