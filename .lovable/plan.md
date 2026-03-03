
## Plan: Customer Support Chatbot

### Overview
Add a floating chat widget (bottom-right corner, visible on all pages) powered by Lovable AI that helps customers understand the Piccoload process. The system prompt lives in a dedicated edge function — so when you update your process, you update one file and every future conversation reflects the change.

### Architecture

```text
Browser (ChatWidget.tsx)
       │  POST messages[]
       ▼
Edge Function: supabase/functions/chat/index.ts
       │  LOVABLE_API_KEY (already configured)
       ▼
Lovable AI Gateway  →  google/gemini-3-flash-preview
```

### Files to create / edit

1. **`supabase/functions/chat/index.ts`** (new)  
   - Streaming SSE edge function  
   - Inlined system prompt describes the full Piccoload process (pricing, steps, book specs, FAQs)  
   - To update: edit the `systemPrompt` string — no UI needed

2. **`src/components/ChatWidget.tsx`** (new)  
   - Floating button (bottom-right, `MessageCircle` icon) toggles an open panel  
   - Conversation history held in component state (no persistence needed)  
   - Streams tokens from the edge function and renders markdown  
   - Suggested starter prompts: "How does it work?", "What's the price?", "How long does delivery take?"

3. **`src/App.tsx`** (edit)  
   - Import and render `<ChatWidget />` once, outside `<Routes>` so it persists on every page

### System prompt (editable in the edge function)
Covers:
- What Piccoload is (personalised photo-to-line-art colouring books)
- The 4-step process: Upload → Convert → Approve → Cover design → Checkout → Print & Ship
- Pricing: base book price, unique photos add-on, personalize cover, digital PDF
- Book specs: A4, up to 20 photos per book
- Turnaround: 3–5 days production + 5–7 days shipping
- How to start: direct to the builder

### Visual design
- Floating button: primary colour circle, bottom-right  
- Panel: `w-80`, rounded card, white background, subtle shadow  
- Messages: user (right-aligned, primary bg), assistant (left-aligned, muted bg, markdown rendered)  
- Starter prompts shown when chat is empty  

### What won't change
- No database tables needed — conversations are ephemeral  
- `LOVABLE_API_KEY` is already provisioned — no extra secrets required  
- Works on all pages without any route changes
