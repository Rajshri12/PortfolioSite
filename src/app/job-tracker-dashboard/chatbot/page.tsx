"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, SendHorizonal, Zap, Sparkles, X, User } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; sources?: string[] };

const QUICK_PROMPTS = [
  { label: "Today's focus", prompt: "What should I focus on today based on my current stage?" },
  { label: "Explain RAG", prompt: "Explain the RAG pattern and when to use it" },
  { label: "DSA problem", prompt: "Give me a DSA problem to solve right now" },
  { label: "Agents vs RAG", prompt: "What's the difference between AI agents and RAG?" },
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm ClarityBot — your RAG-powered AI mentor. Ask me anything about the roadmap, DSA patterns, deployment, or your current stage. I'll give you a straight answer with sources.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || streaming) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setStreaming(true);

    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chatbot/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });

      if (!res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = "";
      let sources: string[] = [];
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "))) {
          const chunk = line.slice(6);
          if (chunk === "[DONE]") continue;
          if (chunk.startsWith("__SOURCES__:")) {
            sources = chunk.replace("__SOURCES__:", "").trim().split(",").map((s) => s.trim()).filter(Boolean);
            continue;
          }
          content += chunk;
          setMessages((prev) => {
            const u = [...prev];
            u[u.length - 1] = { role: "assistant", content };
            return u;
          });
        }
      }
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content, sources };
        return u;
      });
    } catch {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: "Sorry, I couldn't connect to the backend. Make sure the API server is running." };
        return u;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-3xl mx-auto flex flex-col" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            ClarityBot <Sparkles className="w-4 h-4 text-blue-500" />
          </h1>
          <p className="text-sm text-slate-500 font-medium">RAG-powered mentor · roadmap, DSA, docs, FAQs</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-4 mb-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "assistant" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"}`}>
              {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[82%] space-y-2 ${msg.role === "user" ? "items-end flex flex-col" : ""}`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm"
              }`}>
                <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                  <span className="inline-block w-1.5 h-3.5 bg-blue-500 animate-pulse ml-0.5 align-middle rounded-sm" />
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {msg.sources.map((s, j) => (
                    <span key={j} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                      📄 {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 flex-wrap mb-3 shrink-0">
        {QUICK_PROMPTS.map(({ label, prompt }) => (
          <button
            key={label}
            onClick={() => send(prompt)}
            disabled={streaming}
            className="flex items-center gap-1.5 text-xs border border-slate-200 rounded-full px-3 py-1.5 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-40 text-slate-500 font-bold"
          >
            <Zap className="h-3 w-3 text-blue-500" />
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about the roadmap, DSA, deployment, AI patterns…"
          className="flex-1 resize-none bg-white border border-slate-200 text-slate-800 rounded-2xl px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium min-h-[50px] max-h-32"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={streaming || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-3 font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 shrink-0 flex items-center justify-center"
        >
          <SendHorizonal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
