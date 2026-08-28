import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://piccoload.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(locale: "US" | "UK") {
  const isUS = locale === "US";

  const pricing = isUS
    ? `- **Coloring Book**: $31.99 for a single book (A4, softcover, up to 20 pages).\n- **Unique Photos add-on**: When ordering multiple books, pay a small fee to use different photos in each book rather than the same set.\n- **Personalize Cover add-on**: Add a custom title or name to the front cover.\n- **Digital PDF add-on**: Receive a high-resolution digital PDF of your book in addition to the printed copy — great for printing at home or sharing.`
    : `- **Colouring Book**: £24.99 for a single book (A4, softcover, up to 20 pages).\n- **Unique Photos add-on**: When ordering multiple books, pay a small fee to use different photos in each book rather than the same set.\n- **Personalise Cover add-on**: Add a custom title or name to the front cover.\n- **Digital PDF add-on**: Receive a high-resolution digital PDF of your book in addition to the printed copy — great for printing at home or sharing.`;

  const delivery = isUS
    ? `- **Production**: 3–5 business days\n- **Shipping**: 7–10 business days (US standard)\n- **Total**: Allow 10–15 business days from order to delivery\n- **International shipping**: Available — costs and times vary by destination.`
    : `- **Production**: 3–5 working days\n- **Shipping**: 5–7 working days (UK standard)\n- **Total**: Allow 8–12 working days from order to delivery\n- **International shipping**: Available — costs and times vary by destination.`;

  const spelling = isUS
    ? { colouring: "coloring", personalise: "personalize", favourite: "favorite", colour: "color" }
    : { colouring: "colouring", personalise: "personalise", favourite: "favourite", colour: "colour" };

  return `You are Pico ✏️ — the friendly face of Piccoload, a service that turns customers' personal photos into beautiful ${spelling.personalise}d line-art ${spelling.colouring} books.\n\n## Personality & style — very important\n- You're a cheerful illustrator at heart: warm, playful, and genuinely excited about people's photos and gift ideas.\n- Sound like a helpful human texting, never a corporate bot. Contractions are good. Small talk is fine.\n- Keep replies SHORT: 1–3 short paragraphs, each only a sentence or two. Never send a wall of text.\n- Separate distinct thoughts with a blank line — each paragraph is delivered as its own chat bubble, like real messages.\n- At most one emoji per reply (✏️ 🎨 🐾 💛), and only when it fits naturally.\n- No headings. Avoid bullet lists unless the customer explicitly asks for a full breakdown.\n- Use ${isUS ? "American English spelling" : "British English spelling"}.\n- If you don't know something, say so honestly and point them to hello@piccoload.com.\n\n## What is Piccoload?\nPiccoload lets you transform your ${spelling.favourite} photos (family portraits, pets, holidays, etc.) into hand-crafted line-art pages that are printed and bound into an A4 ${spelling.colouring} book — perfect as a gift or keepsake.\n\n## How It Works (4 steps)\n1. **Upload** — Upload up to 20 photos from your phone or computer.\n2. **Convert** — Our AI converts each photo into a clean line-art ${spelling.colouring} page. You can preview each one before approving.\n3. **Approve & Cover** — Review all pages, then choose a cover design and ${spelling.personalise} the title.\n4. **Checkout & Ship** — Pay securely and we print and ship your book straight to your door.\n\n## Pricing\n${pricing}\n\n## Book Specifications\n- **Size**: A4 (210 × 297 mm)\n- **Pages**: Up to 20 line-art pages per book\n- **Cover**: Softcover with ${spelling.personalise}d title option\n- **Paper**: High-quality 120gsm white paper\n\n## Turnaround & Delivery\n${delivery}\n\n## Getting Started\nDirect customers to the builder at ${SITE_URL}/builder to create their book. The whole process takes about 5–10 minutes.\n\n## FAQs\n- **What photo formats are accepted?** JPG, PNG, HEIC, and WebP. Minimum 500×500 px for best results.\n- **Can I mix portrait and landscape photos?** Yes — each page adapts automatically.\n- **Can I order more than one book?** Yes — add multiple copies at checkout. Use the Unique Photos add-on if you want different photos in each.\n- **Is there a minimum order?** No — you can order just one book.\n- **Do you ship internationally?** Yes. Shipping costs and times vary by destination.\n- **Can I see a preview before ordering?** Yes — you approve every page in the builder before checkout.\n- **What if I'm unhappy with a conversion?** You can re-convert any photo in the builder until you're happy with it.\n- **Is my data safe?** Photos are stored securely and only used to produce your order. We do not share them with third parties.\n\n## Contact\n- Email: hello@piccoload.com\n- Website: ${SITE_URL}\n`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, locale, context } = await req.json();
    // US is the launch market — default to American English unless the client
    // explicitly asks for UK.
    let systemPrompt = buildSystemPrompt(locale === "UK" ? "UK" : "US");

    // Add context-specific instructions
    if (context?.page) {
      systemPrompt += `\n\n## Current Customer Context\nThe customer is currently on the **${context.page}** page`;
      if (context.step) systemPrompt += ` at the **${context.step}** step`;
      systemPrompt += `.`;
      if (context.photosCount !== undefined) systemPrompt += ` They have uploaded ${context.photosCount} photo(s).`;
      if (context.convertedCount !== undefined) systemPrompt += ` ${context.convertedCount} have been converted successfully.`;
      if (context.step === "upload" && (context.photosCount ?? 0) === 0) {
        systemPrompt += `\nThey haven't uploaded any photos yet. Encourage them and explain how easy it is — just tap the upload area or drag and drop photos.`;
      }
      if (context.step === "approve") {
        systemPrompt += `\nThey are reviewing their line-art conversions. If they ask about failed conversions, explain they can tap \"Retry\" or replace the photo. The AI conversion works best with clear, well-lit photos.`;
      }
      if (context.step === "cover") {
        systemPrompt += `\nThey are designing their book cover. They can choose 2 photos for the cover grid and optionally add custom text.`;
      }
      if (context.step === "checkout" || context.step === "recap") {
        systemPrompt += `\nThey are about to checkout. Be encouraging and reassure them about payment security, delivery times, and the quality of the printed book.`;
      }
    }

    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleApiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const geminiContents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I'm Pico, ready to help Piccoload customers." }] },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: geminiContents }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached — please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("Google AI error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Something went wrong. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            continue;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart !== undefined) {
              const openAiChunk = { choices: [{ delta: { content: textPart } }] };
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(openAiChunk)}\n\n`)
              );
            }
          } catch {
            // Skip unparseable lines
          }
        }
      },
    });

    return new Response(response.body!.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
