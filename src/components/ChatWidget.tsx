import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const STARTER_PROMPTS = [
  "How does it work?",
  "What's the price?",
  "How long does delivery take?",
  "What photo formats can I use?",
];

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
    body: JSON.stringify({ messages }),
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

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    abortRef.current = new AbortController();
    let assistantSoFar = "";

    try {
      await streamChat({
        messages: next,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
              );
            }
            return [...prev, { role: "assistant", content: assistantSoFar }];
          });
        },
        onDone: () => setLoading(false),
        signal: abortRef.current.signal,
      });
    } catch (e: unknown) {
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

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-soft-lg transition-transform hover:scale-105 active:scale-95",
          "bg-primary text-primary-foreground"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 flex w-80 flex-col rounded-2xl border border-border bg-card shadow-soft-lg",
            "overflow-hidden"
          )}
          style={{ maxHeight: "min(520px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-primary px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <MessageCircle className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground font-sans">Piccoload Help</p>
              <p className="text-xs text-primary-foreground/70 font-sans">Ask me anything</p>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-3 py-3"
            style={{ minHeight: 0 }}
          >
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-center text-xs text-muted-foreground font-sans pt-2">
                  Hi! I'm here to help with your Piccoload book. 👋
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
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
              </div>
            )}

            <div className="space-y-3 mt-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
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

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-center text-xs text-destructive font-sans px-2">{error}</p>
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
              placeholder="Type a message…"
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
