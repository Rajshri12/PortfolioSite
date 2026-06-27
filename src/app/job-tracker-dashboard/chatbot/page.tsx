"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, SendHorizonal, Zap, Sparkles, User, Flame, AlertTriangle, X, CheckCircle2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; sources?: string[] };

interface UserState {
  coins: number;
  streak: number;
  level: number;
  currentMood: "hard" | "okay" | "easy" | null;
}

const QUICK_PROMPTS = [
  { label: "Today's focus", prompt: "What should I focus on today based on my current stage?" },
  { label: "Explain RAG", prompt: "Explain the RAG pattern and when to use it" },
  { label: "DSA problem", prompt: "Give me a DSA problem to solve right now" },
  { label: "Agents vs RAG", prompt: "What's the difference between AI agents and RAG?" },
  { label: "Review my plan", prompt: "Review my learning strategy and tell me if I'm on the right track" },
];

const MOOD_EMOJI: Record<string, string> = { hard: "😤", okay: "😐", easy: "😎" };

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm ClarityBot — your AI mentor. Ask me anything about the roadmap, DSA, deployment, or your learning strategy. If you're feeling stuck on something, hit the **Stuck?** button and I'll escalate it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [user, setUser] = useState<UserState | null>(null);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [stuckText, setStuckText] = useState("");
  const [stuckSending, setStuckSending] = useState(false);
  const [stuckSent, setStuckSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) setUser(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || streaming) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setStreaming(true);

    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    const userContext = user
      ? { streak: user.streak, coins: user.coins, level: user.level, mood: user.currentMood }
      : undefined;

    try {
      const res = await fetch("/api/chatbot/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, userContext }),
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
        u[u.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't connect. Make sure the API server is running.",
        };
        return u;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function sendStuck() {
    if (!stuckText.trim() || stuckSending) return;
    setStuckSending(true);
    try {
      await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "manual",
          message: `ClarityBot escalation — User is stuck: "${stuckText.trim()}"`,
        }),
      });
      setStuckSent(true);
      // Also inject it as a ClarityBot message to continue the conversation
      send(`I'm stuck on: ${stuckText.trim()}`);
      setStuckText("");
      setTimeout(() => {
        setStuckOpen(false);
        setStuckSent(false);
      }, 2000);
    } catch {}
    finally { setStuckSending(false); }
  }

  return (
    <div className="flex flex-col p-6 md:p-10 max-w-3xl mx-auto" style={{ height: "calc(100vh - 48px)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            ClarityBot <Sparkles className="w-4 h-4 text-blue-500" />
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">RAG-powered mentor · roadmap, DSA, deployment</p>
        </div>

        {/* User stats strip */}
        {user && (
          <div className="flex items-center gap-3 shrink-0 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1">
              <Flame className={`w-4 h-4 ${user.streak > 0 ? "text-orange-500" : "text-slate-300"}`} />
              <span className={`text-sm font-black ${user.streak > 0 ? "text-orange-600" : "text-slate-400"}`}>
                {user.streak}
              </span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-black text-slate-800">{user.coins.toLocaleString()}</span>
            </div>
            {user.currentMood && (
              <>
                <div className="w-px h-4 bg-slate-200" />
                <span className="text-lg">{MOOD_EMOJI[user.currentMood]}</span>
              </>
            )}
          </div>
        )}

        {/* Stuck button */}
        <button
          onClick={() => setStuckOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shrink-0"
        >
          <AlertTriangle className="w-4 h-4" />
          Stuck?
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-[2rem] border border-slate-100 bg-white shadow-sm px-4 py-4 mb-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === "assistant"
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-100 text-slate-600"
            }`}>
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
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-3 font-bold transition-all shadow-lg shadow-blue-200 disabled:opacity-50 shrink-0 flex items-center justify-center"
        >
          <SendHorizonal className="w-5 h-5" />
        </button>
      </div>

      {/* Stuck modal */}
      <AnimatePresence>
        {stuckOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStuckOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">You're Stuck?</h3>
                    <p className="text-xs text-slate-400 font-medium">I'll flag this for a check-in and help you right now</p>
                  </div>
                </div>
                <button onClick={() => setStuckOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {stuckSent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-6"
                  >
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="font-black text-slate-900">Escalated!</p>
                    <p className="text-xs text-slate-400 font-medium text-center">
                      Admin has been notified. ClarityBot is on it too.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <textarea
                      autoFocus
                      value={stuckText}
                      onChange={(e) => setStuckText(e.target.value)}
                      placeholder="What exactly are you stuck on? Be specific — e.g. 'ChromaDB query keeps returning empty results when I add metadata filters'"
                      className="w-full resize-none bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-rose-300 transition-all text-sm font-medium text-slate-800 min-h-[100px]"
                      rows={4}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setStuckOpen(false)}
                        className="flex-1 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendStuck}
                        disabled={stuckSending || !stuckText.trim()}
                        className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg transition-all disabled:opacity-50"
                      >
                        {stuckSending ? "Sending…" : "Escalate + Ask ClarityBot"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
