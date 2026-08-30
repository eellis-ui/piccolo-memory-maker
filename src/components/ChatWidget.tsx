import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// US-only launch: every visitor gets American English and USD pricing,
// matching the storefront (the store sells in USD regardless of location).
const userLocale: "US" | "UK" = "US";

const STARTER_PROMPTS = [
  "How does it work?",
  "What's the price?",
  "How long does delivery take?",
  "What photo formats can I use?",
];

const GREETING = "Hey! I'm Pico ✏️ Ask me anything about your coloring book — prices, shipping, photos, you name it.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function streamChat({
  messages,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, locale: userLocale }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const data = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error || "Failed to connect");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // flush remainder
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw || raw.startsWith(":")) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

// Very simple inline markdown renderer (bold, italic, links, line breaks)
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        // Bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        return <p key={i} className="leading-relaxed">{parts}</p>;
      })}
    </div>
  );
}

/** Messenger-style three-dot typing indicator */
function TypingIndicator() {
  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Split a reply into at most 3 chat bubbles on paragraph breaks so long
 * answers arrive like real messages instead of one wall of text.
 */
function splitIntoBubbles(text: string): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length === 0) return [];
  if (paras.length <= 3) return paras;
  return [paras[0], paras.slice(1, paras.length - 1).join("\n\n"), paras[paras.length - 1]];
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const greetedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Greet with a typing pause the first time the panel opens
  useEffect(() => {
    if (!open || greetedRef.current) return;
    greetedRef.current = true;
    (async () => {
      setTyping(true);
      await sleep(900);
      setTyping(false);
      setMessages([{ role: "assistant", content: GREETING }]);
    })();
  }, [open]);

  /** Deliver a full reply as sequential bubbles with typing pauses */
  const deliverReply = async (fullText: string) => {
    const bubbles = splitIntoBubbles(fullText);
    for (const bubble of bubbles) {
      setTyping(true);
      // Pause roughly like someone typing — longer messages take longer
      await sleep(Math.min(500 + bubble.length * 10, 2000));
      setTyping(false);
      setMessages((prev) => [...prev, { role: "assistant", content: bubble }]);
      await sleep(300);
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setTyping(true);

    abortRef.current = new AbortController();
    let assistantSoFar = "";

    try {
      // Buffer the whole reply, then deliver it as messages with typing pauses
      await streamChat({
        messages: next,
        onDelta: (chunk) => { assistantSoFar += chunk; },
        onDone: () => {},
        signal: abortRef.current.signal,
      });
      await deliverReply(assistantSoFar);
      setLoading(false);
    } catch (e: unknown) {
      setTyping(false);
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message || "Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const showStarters = !messages.some((m) => m.role === "user");

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className={cn(
          "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-soft-lg transition-transform hover:scale-105 active:scale-95",
          "bg-primary text-primary-foreground"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-36 md:bottom-24 right-4 md:right-6 z-40 flex w-[min(20rem,calc(100vw-2rem))] flex-col rounded-2xl border border-border bg-card shadow-soft-lg",
            "overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          )}
          style={{ maxHeight: "min(520px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-primary px-4 py-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 text-base">
              <span aria-hidden>✏️</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground font-sans">Pico</p>
              <p className="text-xs text-primary-foreground/70 font-sans">Piccoload · replies in seconds</p>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-3 py-3"
            style={{ minHeight: 0 }}
          >
            <div className="space-y-3 mt-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex animate-in fade-in slide-in-from-bottom-1 duration-200",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-xs font-sans",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <SimpleMarkdown text={msg.content} />
                    ) : (
                      <p className="leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {typing && <TypingIndicator />}

              {error && (
                <p className="text-center text-xs text-destructive font-sans px-2">{error}</p>
              )}

              {showStarters && messages.length > 0 && !typing && (
                <div className="flex flex-wrap gap-2 justify-center pt-1 animate-in fade-in duration-300">
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-foreground hover:bg-primary hover:text-primary-foreground transition-colors font-sans"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message Pico…"
              rows={1}
              className={cn(
                "flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-xs font-sans",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
                "max-h-24 overflow-y-auto"
              )}
              style={{ lineHeight: "1.5" }}
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="h-8 w-8 shrink-0 rounded-xl"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
