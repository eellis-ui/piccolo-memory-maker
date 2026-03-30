import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SITE_URL = Deno.env.get("SITE_URL") || "https://piccoload.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — edit this whenever the Piccoload process changes.
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(locale: "US" | "UK") {
  const isUS = locale === "US";

  const pricing = isUS
    ? `- **Coloring Book**: $29.99 for a single book (A4, softcover, up to 20 pages).
- **Unique Photos add-on**: When ordering multiple books, pay a small fee to use different photos in each book rather than the same set.
- **Personalize Cover add-on**: Add a custom title or name to the front cover.
- **Digital PDF add-on**: Receive a high-resolution digital PDF of your book in addition to the printed copy — great for printing at home or sharing.`
    : `- **Colouring Book**: £24.99 for a single book (A4, softcover, up to 20 pages).
- **Unique Photos add-on**: When ordering multiple books, pay a small fee to use different photos in each book rather than the same set.
- **Personalise Cover add-on**: Add a custom title or name to the front cover.
- **Digital PDF add-on**: Receive a high-resolution digital PDF of your book in addition to the printed copy — great for printing at home or sharing.`;

  const delivery = isUS
    ? `- **Production**: 3–5 business days
- **Shipping**: 7–10 business days (US standard)
- **Total**: Allow 10–15 business days from order to delivery
- **International shipping**: Available — costs and times vary by destination.`
    : `- **Production**: 3–5 working days
- **Shipping**: 5–7 working days (UK standard)
- **Total**: Allow 8–12 working days from order to delivery
- **International shipping**: Available — costs and times vary by destination.`;

  const spelling = isUS
    ? { colouring: "coloring", personalise: "personalize", favourite: "favorite", colour: "color" }
    : { colouring: "colouring", personalise: "personalise", favourite: "favourite", colour: "colour" };

  return `You are a friendly and helpful customer support assistant for Piccoload — a service that turns customers' personal photos into beautiful personalised line-art ${spelling.colouring} books.

Keep answers warm, concise, and helpful. Use ${isUS ? "American English spelling" : "British English spelling"}. If you don't know something, say so and invite them to contact us at hello@piccoload.com.

## What is Piccoload?
Piccoload lets you transform your ${spelling.favourite} photos (family portraits, pets, holidays, etc.) into hand-crafted line-art pages that are printed and bound into an A4 ${spelling.colouring} book — perfect as a gift or keepsake.

## How It Works (4 steps)
1. **Upload** — Upload up to 20 photos from your phone or computer.
2. **Convert** — Our AI converts each photo into a clean line-art ${spelling.colouring} page. You can preview each one before approving.
3. **Approve & Cover** — Review all pages, then choose a cover design and ${spelling.personalise} the title.
4. **Checkout & Ship** — Pay securely and we print and ship your book straight to your door.

## Pricing
${pricing}

## Book Specifications
- **Size**: A4 (210 × 297 mm)
- **Pages**: Up to 20 line-art pages per book
- **Cover**: Softcover with ${spelling.personalise}d title option
- **Paper**: High-quality 120gsm white paper

## Turnaround & Delivery
${delivery}

## Getting Started
Direct customers to the builder at ${SITE_URL}/builder to create their book. The whole process takes about 5–10 minutes.

## FAQs
- **What photo formats are accepted?** JPG, PNG, HEIC, and WebP. Minimum 500×500 px for best results.
- **Can I mix portrait and landscape photos?** Yes — each page adapts automatically.
- **Can I order more than one book?** Yes — add multiple copies at checkout. Use the Unique Photos add-on if you want different photos in each.
- **Is there a minimum order?** No — you can order just one book.
- **Do you ship internationally?** Yes. Shipping costs and times vary by destination.
- **Can I see a preview before ordering?** Yes — you approve every page in the builder before checkout.
- **What if I'm unhappy with a conversion?** You can re-convert any photo in the builder until you're happy with it.
- **Is my data safe?** Photos are stored securely and only used to produce your order. We do not share them with third parties.

## Contact
- Email: hello@piccoload.com
- Website: ${SITE_URL}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, locale } = await req.json();
    const systemPrompt = buildSystemPrompt(locale === "US" ? "US" : "UK");
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!googleApiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

    // Convert OpenAI message format to Google Gemini format.
    // The system prompt becomes the first user message + a model acknowledgment,
    // then the actual conversation messages follow.
    const geminiContents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I'm ready to help Piccoload customers." }] },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${googleApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiContents,
        }),
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

    // Google Gemini SSE format differs from OpenAI's.
    // Transform Google's `candidates[0].content.parts[0].text` into
    // OpenAI-compatible `choices[0].delta.content` chunks for the frontend.
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
              const openAiChunk = {
                choices: [{ delta: { content: textPart } }],
              };
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
