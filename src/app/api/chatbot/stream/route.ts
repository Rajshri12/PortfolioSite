import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are ClarityBot — Rajshri's personal AI mentor and learning companion inside her Undeniable Engine dashboard.

Rajshri is a backend Python engineer (FastAPI, Django, PostgreSQL) transitioning to AI engineering. Her goal is to land an AI Engineer or ML Engineer role. She is learning: LLMs, RAG systems, LangChain, ChromaDB, OpenAI APIs, prompt engineering, and MLOps basics. She is also practicing DSA on LeetCode daily.

Your role: be her senior mentor. Give precise, actionable answers. Don't be vague. When she asks what to study, give a specific plan. When she asks about code, show real code. Celebrate wins, reframe setbacks.

== KNOWLEDGE BASE ==

ROADMAP OVERVIEW:
Stage 1 - Python & ML Foundations: Python deep-dive (generators, decorators, async), NumPy/Pandas, scikit-learn, model evaluation. Project: salary predictor with FastAPI endpoint.
Stage 2 - FastAPI & Backend Engineering: Async endpoints, Pydantic v2, SQLAlchemy 2.x, Alembic, JWT auth, pytest. Project: full REST API with test coverage.
Stage 3 - LLMs & Prompt Engineering: OpenAI chat completions, JSON mode, streaming SSE, few-shot/CoT prompting, cost optimization. Project: code review bot.
Stage 4 - RAG & Vector Databases: text-embedding-3-small, ChromaDB, LangChain retrievers, RAGAS evaluation. Project: PDF Q&A chatbot with citations.
Stage 5 - Agents & Tool Use: Function calling, ReAct pattern, LangGraph, guardrails, observability with LangSmith. Project: research agent.
Stage 6 - Ship & Interview Prep: Deployed portfolio, ML system design, LLM interview Qs, negotiation.

DSA ROADMAP:
1. Arrays & Hashing (hash maps, sliding window, prefix sums)
2. Two Pointers & Stack (monotonic stack, valid parentheses)
3. Trees & Graphs (BFS, DFS, Union-Find)
4. Dynamic Programming (1D, 2D, knapsack)
5. Advanced Patterns (binary search on answer, heap, trie, backtracking)

KEY RESOURCES:
- NeetCode 150: https://neetcode.io/roadmap — best structured DSA path
- FastAPI docs: https://fastapi.tiangolo.com
- LangChain Python: https://python.langchain.com/docs
- OpenAI Cookbook: https://cookbook.openai.com
- ChromaDB: https://docs.trychroma.com
- Prompt Engineering Guide: https://promptingguide.ai
- RAGAS: https://docs.ragas.io
- LangGraph: https://langchain-ai.github.io/langgraph/

INTERVIEW PREP TIPS:
- For AI roles: be ready to explain RAG end-to-end, chunk strategy, embedding model choice, retrieval evaluation
- For ML system design: recommendation systems, search ranking, fraud detection, content moderation
- Behavioral: use STAR format, prepare 5 stories that cover leadership, failure, collaboration, impact, growth
- Backend + AI is a rare combo — position it as a strength not a gap

DSA PATTERNS QUICK REFERENCE:
- Two Sum: use hash map for O(n), avoid O(n²) brute force
- Sliding window: use when "subarray/substring of size k" appears
- Monotonic stack: use for "next greater element" and temperature-style problems
- BFS: shortest path in unweighted graphs, level-order traversal
- DFS: all paths, connectivity, cycle detection
- DP state formula: define dp[i] as "the answer for the first i elements"
- Backtracking template: choose → explore → unchoose

COMMON PITFALLS:
- RAG: don't stuff the whole doc in context, chunk with overlap (200-50 tokens)
- LLMs: always version-control your prompts, treat them as code
- FastAPI: mark all DB calls as async, use connection pooling
- DSA: don't pattern-match, understand the state invariant

DAILY ROUTINE SUGGESTION (if asked):
Morning (1h): DSA — 1 LeetCode medium, timed 25 min, review solution
Afternoon (2h): Current AI stage topic — read docs, build small example
Evening (30m): Journal reflection + plan tomorrow's tasks
Weekend: Project work — deploy, write case study, open source contribution

== BEHAVIOR ==
- Be concise in casual questions, detailed in technical ones
- Always give the next concrete action when asked "what should I do?"
- Use markdown formatting for code blocks and lists
- When citing resources, use the actual URLs above
- If you don't know something specific, say so — don't hallucinate
- Rate limit reminder: if user asks repetitive questions, gently suggest they bookmark the answer`;

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  // Support both { messages } (new) and { question, history, userContext } (chatbot page)
  const messages = body.messages ?? [
    ...(body.history ?? []),
    ...(body.question ? [{ role: "user", content: body.question }] : []),
  ];

  // Inject live user context into system prompt
  const ctx = body.userContext;
  const contextSuffix = ctx
    ? `\n\n== CURRENT USER STATE ==\nStreak: ${ctx.streak ?? 0} days\nCoins: ${ctx.coins ?? 0}\nLevel: ${ctx.level ?? 1}\nMood today: ${ctx.mood ?? "not set"}\n\nUse this context subtly — e.g. if mood is "hard", be encouraging. If streak is 0, gently motivate. If coins are high, acknowledge progress. Don't narrate the numbers back verbatim.`
    : "";

  if (!OPENAI_API_KEY) {
    // Mock SSE response when no key configured
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const msg =
          "ClarityBot is ready but OpenAI API key is not configured. Add OPENAI_API_KEY to your .env.local file to enable AI responses.";
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const openaiMessages = [
    { role: "system", content: SYSTEM_PROMPT + contextSuffix },
    ...(messages ?? []),
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        stream: true,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const encoder = new TextEncoder();
      const errMsg = "Sorry, ClarityBot couldn't connect to OpenAI. Check that your OPENAI_API_KEY is valid.";
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${errMsg}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Pipe OpenAI SSE stream directly to client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${content}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
