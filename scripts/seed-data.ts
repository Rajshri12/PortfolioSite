// ─── Seed Data ────────────────────────────────────────────────────────────────
// Single source of truth. Edit here, re-run npm run seed to update the DB.

export const STAGES = [
  {
    stageId: "ai-s1",
    track: "ai" as const,
    orderIndex: 1,
    title: "Python & ML Foundations",
    description: "Solidify Python skills and understand ML fundamentals before touching LLMs.",
    doList: [
      "Complete Python refresher on data structures, comprehensions, and generators",
      "Build at least one end-to-end ML project with scikit-learn",
      "Understand train/test split, overfitting, evaluation metrics",
    ],
    dontList: [
      "Skip NumPy/Pandas — they underpin everything",
      "Jump to neural nets before understanding linear models",
    ],
    projectSpec:
      "Build a salary predictor using a real dataset (Kaggle). Deploy a simple FastAPI endpoint that serves predictions.",
  },
  {
    stageId: "ai-s2",
    track: "ai" as const,
    orderIndex: 2,
    title: "FastAPI & Backend Engineering",
    description: "Master async Python APIs — the backbone of every AI product.",
    doList: [
      "Build async endpoints with Pydantic v2 validation",
      "Implement dependency injection and middleware",
      "Write integration tests with pytest + httpx",
    ],
    dontList: [
      "Use Flask — FastAPI is the industry standard for AI backends",
      "Skip async/await — blocking DB calls will tank performance",
    ],
    projectSpec:
      "Build a REST API for a personal task manager with SQLAlchemy + Alembic migrations, JWT auth, and full test coverage.",
  },
  {
    stageId: "ai-s3",
    track: "ai" as const,
    orderIndex: 3,
    title: "LLMs & Prompt Engineering",
    description: "Learn to talk to language models effectively before wiring them into systems.",
    doList: [
      "Understand token limits, temperature, and system prompts",
      "Practice few-shot, chain-of-thought, and structured output prompting",
      "Experiment with GPT-4o-mini for cost-efficient builds",
    ],
    dontList: [
      "Treat prompts as magic — they are code, version-control them",
      "Ignore token cost — it compounds fast in production",
    ],
    projectSpec:
      "Build a code review bot: takes a GitHub diff, returns structured feedback (bugs, improvements, security issues) as JSON.",
  },
  {
    stageId: "ai-s4",
    track: "ai" as const,
    orderIndex: 4,
    title: "RAG & Vector Databases",
    description: "Build retrieval-augmented generation systems that stay grounded in real data.",
    doList: [
      "Chunk documents intelligently (size + overlap matter)",
      "Choose embedding model based on your retrieval task",
      "Evaluate retrieval quality, not just generation quality",
    ],
    dontList: [
      "Stuff the whole document into context — chunk it",
      "Skip re-ranking for production systems",
    ],
    projectSpec:
      "Build a document Q&A chatbot: ingest a PDF, embed with text-embedding-3-small, store in ChromaDB, answer questions with GPT-4o-mini + citations.",
  },
  {
    stageId: "ai-s5",
    track: "ai" as const,
    orderIndex: 5,
    title: "Agents & Tool Use",
    description: "Build autonomous AI agents that can plan, use tools, and self-correct.",
    doList: [
      "Start with ReAct pattern before frameworks",
      "Define clear tool contracts with JSON schemas",
      "Add guardrails — agents will do unexpected things",
    ],
    dontList: [
      "Give agents too many tools — narrow scope = reliable behavior",
      "Skip logging — debugging agent loops without traces is a nightmare",
    ],
    projectSpec:
      "Build a research agent: given a topic, it searches the web, reads URLs, synthesizes a 500-word report, and saves to a file.",
  },
  {
    stageId: "ai-s6",
    track: "ai" as const,
    orderIndex: 6,
    title: "Ship & Interview Prep",
    description: "Polish your portfolio, ace system design rounds, and land the offer.",
    doList: [
      "Deploy at least 2 AI projects on Vercel/Render with public URLs",
      "Write a 1-page case study per project (problem → solution → metrics)",
      "Practice ML system design: recommendations, search, fraud detection",
    ],
    dontList: [
      "Ghost companies after applying — follow up exactly once after 1 week",
      "Undersell yourself — backend + AI = rare, valuable combo",
    ],
    projectSpec:
      "Your Undeniable Engine dashboard IS the capstone project. Ship it, add it to your resume, and walk through it in interviews.",
  },
  // ─── DSA ──────────────────────────────────────────────────────────────────
  {
    stageId: "dsa-s1",
    track: "dsa" as const,
    orderIndex: 1,
    title: "Arrays & Hashing",
    description: "Foundation of every coding interview. Master these patterns cold.",
    doList: [
      "Solve every problem with O(n) time in mind first",
      "Use defaultdict and Counter — they exist for a reason",
      "Practice explaining your approach out loud",
    ],
    dontList: [
      "Jump to hard problems before mediums are automatic",
      "Memorize solutions — understand the pattern",
    ],
    projectSpec:
      "Complete NeetCode 150 Arrays & Hashing section. Time yourself: target under 20 min per medium.",
  },
  {
    stageId: "dsa-s2",
    track: "dsa" as const,
    orderIndex: 2,
    title: "Two Pointers & Stack",
    description: "Elegant O(n) solutions that look hard but have simple templates.",
    doList: [
      "Draw the pointer positions for each step on paper first",
      "Stack problems often disguise themselves as other problems",
    ],
    dontList: ["Use nested loops when two pointers can do it in one pass"],
    projectSpec:
      "Complete NeetCode 150 Two Pointers + Stack sections. No solutions tab until 20 minutes of genuine effort.",
  },
  {
    stageId: "dsa-s3",
    track: "dsa" as const,
    orderIndex: 3,
    title: "Trees & Graphs",
    description: "Most AI system design involves graph-like reasoning. Learn to code it.",
    doList: [
      "Understand BFS vs DFS tradeoffs before memorizing code",
      "Always handle the null/base case first in tree recursion",
    ],
    dontList: ["Skip graph traversal — it appears in 30% of interviews"],
    projectSpec:
      "Complete NeetCode 150 Trees + Graphs. Implement BFS and DFS from memory in under 5 minutes each.",
  },
  {
    stageId: "dsa-s4",
    track: "dsa" as const,
    orderIndex: 4,
    title: "Dynamic Programming",
    description:
      "The interview differentiator. Hard to learn, impossible to forget once it clicks.",
    doList: [
      "Always define the subproblem before writing code",
      "Start with top-down memoization, then optimize to bottom-up",
      "Draw the DP table on paper for every new pattern",
    ],
    dontList: ["Try to pattern-match DP problems — understand the state definition"],
    projectSpec:
      "Complete NeetCode 150 DP section. Write a one-line comment above each solution explaining the state definition.",
  },
  {
    stageId: "dsa-s5",
    track: "dsa" as const,
    orderIndex: 5,
    title: "Advanced Patterns",
    description:
      "Binary search on answer space, heaps, tries — the last 20% that separates good from great.",
    doList: [
      "Binary search on the answer is a mindset shift — practice it",
      "Heap: always ask 'what's the invariant I need to maintain?'",
    ],
    dontList: [
      "Skip tries if you're targeting NLP/AI roles — they appear in design rounds",
    ],
    projectSpec:
      "Solve 10 problems using each pattern. Time-box to 25 minutes. Track your solve rate.",
  },
];

export const TOPICS = [
  // AI Stage 1
  { topicId: "ai-s1-t1", stageId: "ai-s1", orderIndex: 1, title: "Python deep dive (generators, decorators, async)", resources: [{ label: "Real Python", url: "https://realpython.com" }] },
  { topicId: "ai-s1-t2", stageId: "ai-s1", orderIndex: 2, title: "NumPy & Pandas essentials", resources: [{ label: "Pandas docs", url: "https://pandas.pydata.org/docs/" }] },
  { topicId: "ai-s1-t3", stageId: "ai-s1", orderIndex: 3, title: "Scikit-learn: regression, classification, pipelines", resources: [{ label: "Sklearn User Guide", url: "https://scikit-learn.org/stable/user_guide.html" }] },
  { topicId: "ai-s1-t4", stageId: "ai-s1", orderIndex: 4, title: "Model evaluation & cross-validation", resources: [{ label: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course" }] },
  // AI Stage 2
  { topicId: "ai-s2-t1", stageId: "ai-s2", orderIndex: 1, title: "FastAPI routing, Pydantic v2, async handlers", resources: [{ label: "FastAPI docs", url: "https://fastapi.tiangolo.com" }] },
  { topicId: "ai-s2-t2", stageId: "ai-s2", orderIndex: 2, title: "SQLAlchemy 2.x ORM + Alembic migrations", resources: [{ label: "SQLAlchemy docs", url: "https://docs.sqlalchemy.org" }] },
  { topicId: "ai-s2-t3", stageId: "ai-s2", orderIndex: 3, title: "JWT auth & middleware", resources: [{ label: "python-jose", url: "https://github.com/mpdavis/python-jose" }] },
  { topicId: "ai-s2-t4", stageId: "ai-s2", orderIndex: 4, title: "Testing with pytest + httpx TestClient", resources: [{ label: "pytest docs", url: "https://docs.pytest.org" }] },
  // AI Stage 3
  { topicId: "ai-s3-t1", stageId: "ai-s3", orderIndex: 1, title: "OpenAI API: chat completions, functions, JSON mode", resources: [{ label: "OpenAI Cookbook", url: "https://cookbook.openai.com" }] },
  { topicId: "ai-s3-t2", stageId: "ai-s3", orderIndex: 2, title: "Prompt engineering patterns: CoT, few-shot, structured output", resources: [{ label: "Prompt Engineering Guide", url: "https://promptingguide.ai" }] },
  { topicId: "ai-s3-t3", stageId: "ai-s3", orderIndex: 3, title: "Streaming responses & SSE", resources: [{ label: "OpenAI streaming", url: "https://platform.openai.com/docs/api-reference/streaming" }] },
  { topicId: "ai-s3-t4", stageId: "ai-s3", orderIndex: 4, title: "Cost management & token optimization", resources: [{ label: "OpenAI pricing", url: "https://openai.com/pricing" }] },
  // AI Stage 4
  { topicId: "ai-s4-t1", stageId: "ai-s4", orderIndex: 1, title: "Embeddings: text-embedding-3-small, cosine similarity", resources: [{ label: "OpenAI embeddings guide", url: "https://platform.openai.com/docs/guides/embeddings" }] },
  { topicId: "ai-s4-t2", stageId: "ai-s4", orderIndex: 2, title: "ChromaDB: ingest, query, persist", resources: [{ label: "ChromaDB docs", url: "https://docs.trychroma.com" }] },
  { topicId: "ai-s4-t3", stageId: "ai-s4", orderIndex: 3, title: "LangChain: chains, retrievers, memory", resources: [{ label: "LangChain docs", url: "https://python.langchain.com/docs" }] },
  { topicId: "ai-s4-t4", stageId: "ai-s4", orderIndex: 4, title: "Evaluation: RAGAS, hit rate, faithfulness", resources: [{ label: "RAGAS", url: "https://docs.ragas.io" }] },
  // AI Stage 5
  { topicId: "ai-s5-t1", stageId: "ai-s5", orderIndex: 1, title: "Function calling & tool schemas", resources: [{ label: "OpenAI function calling", url: "https://platform.openai.com/docs/guides/function-calling" }] },
  { topicId: "ai-s5-t2", stageId: "ai-s5", orderIndex: 2, title: "ReAct pattern: reason + act loop", resources: [{ label: "ReAct paper", url: "https://arxiv.org/abs/2210.03629" }] },
  { topicId: "ai-s5-t3", stageId: "ai-s5", orderIndex: 3, title: "LangGraph: stateful multi-agent workflows", resources: [{ label: "LangGraph docs", url: "https://langchain-ai.github.io/langgraph/" }] },
  { topicId: "ai-s5-t4", stageId: "ai-s5", orderIndex: 4, title: "Guardrails, human-in-the-loop, observability", resources: [{ label: "LangSmith", url: "https://smith.langchain.com" }] },
  // AI Stage 6
  { topicId: "ai-s6-t1", stageId: "ai-s6", orderIndex: 1, title: "Portfolio projects: deployed + case studies written", resources: [{ label: "GitHub Pages", url: "https://docs.github.com/en/pages" }] },
  { topicId: "ai-s6-t2", stageId: "ai-s6", orderIndex: 2, title: "ML system design patterns", resources: [{ label: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer" }] },
  { topicId: "ai-s6-t3", stageId: "ai-s6", orderIndex: 3, title: "LLM interview questions & Q&A clinic", resources: [{ label: "InterviewBit AI", url: "https://www.interviewbit.com/machine-learning-interview-questions/" }] },
  { topicId: "ai-s6-t4", stageId: "ai-s6", orderIndex: 4, title: "Negotiation & offer evaluation", resources: [{ label: "Levels.fyi", url: "https://www.levels.fyi" }] },
  // DSA Stage 1
  { topicId: "dsa-s1-t1", stageId: "dsa-s1", orderIndex: 1, title: "Two Sum variants & hash maps", resources: [{ label: "NeetCode Arrays", url: "https://neetcode.io/roadmap" }] },
  { topicId: "dsa-s1-t2", stageId: "dsa-s1", orderIndex: 2, title: "Sliding window", resources: [{ label: "LeetCode patterns", url: "https://leetcode.com/explore/" }] },
  { topicId: "dsa-s1-t3", stageId: "dsa-s1", orderIndex: 3, title: "Prefix sums & running totals", resources: [{ label: "LeetCode", url: "https://leetcode.com" }] },
  { topicId: "dsa-s1-t4", stageId: "dsa-s1", orderIndex: 4, title: "Sorting algorithms from scratch", resources: [{ label: "Visualgo", url: "https://visualgo.net/en/sorting" }] },
  // DSA Stage 2
  { topicId: "dsa-s2-t1", stageId: "dsa-s2", orderIndex: 1, title: "Two pointer: palindrome, container with most water", resources: [{ label: "NeetCode", url: "https://neetcode.io" }] },
  { topicId: "dsa-s2-t2", stageId: "dsa-s2", orderIndex: 2, title: "Monotonic stack", resources: [{ label: "LeetCode stack tag", url: "https://leetcode.com/tag/stack/" }] },
  { topicId: "dsa-s2-t3", stageId: "dsa-s2", orderIndex: 3, title: "Valid parentheses family", resources: [{ label: "LeetCode", url: "https://leetcode.com" }] },
  // DSA Stage 3
  { topicId: "dsa-s3-t1", stageId: "dsa-s3", orderIndex: 1, title: "Binary trees: traversal, height, diameter", resources: [{ label: "NeetCode trees", url: "https://neetcode.io/roadmap" }] },
  { topicId: "dsa-s3-t2", stageId: "dsa-s3", orderIndex: 2, title: "BST: insert, search, validate", resources: [{ label: "LeetCode BST", url: "https://leetcode.com/tag/binary-search-tree/" }] },
  { topicId: "dsa-s3-t3", stageId: "dsa-s3", orderIndex: 3, title: "Graph BFS/DFS: islands, shortest path", resources: [{ label: "LeetCode graphs", url: "https://leetcode.com/tag/graph/" }] },
  { topicId: "dsa-s3-t4", stageId: "dsa-s3", orderIndex: 4, title: "Union-Find (Disjoint Set)", resources: [{ label: "CP-Algorithms", url: "https://cp-algorithms.com/data_structures/disjoint_set_union.html" }] },
  // DSA Stage 4
  { topicId: "dsa-s4-t1", stageId: "dsa-s4", orderIndex: 1, title: "1D DP: climbing stairs, house robber, coin change", resources: [{ label: "NeetCode DP", url: "https://neetcode.io/roadmap" }] },
  { topicId: "dsa-s4-t2", stageId: "dsa-s4", orderIndex: 2, title: "2D DP: unique paths, longest common subsequence", resources: [{ label: "LeetCode DP", url: "https://leetcode.com/tag/dynamic-programming/" }] },
  { topicId: "dsa-s4-t3", stageId: "dsa-s4", orderIndex: 3, title: "Knapsack variants", resources: [{ label: "LeetCode", url: "https://leetcode.com" }] },
  // DSA Stage 5
  { topicId: "dsa-s5-t1", stageId: "dsa-s5", orderIndex: 1, title: "Binary search: classic + on answer space", resources: [{ label: "NeetCode binary search", url: "https://neetcode.io/roadmap" }] },
  { topicId: "dsa-s5-t2", stageId: "dsa-s5", orderIndex: 2, title: "Heap / priority queue", resources: [{ label: "LeetCode heap", url: "https://leetcode.com/tag/heap-priority-queue/" }] },
  { topicId: "dsa-s5-t3", stageId: "dsa-s5", orderIndex: 3, title: "Trie: insert, search, prefix", resources: [{ label: "LeetCode trie", url: "https://leetcode.com/tag/trie/" }] },
  { topicId: "dsa-s5-t4", stageId: "dsa-s5", orderIndex: 4, title: "Backtracking: permutations, combinations, N-Queens", resources: [{ label: "LeetCode backtracking", url: "https://leetcode.com/tag/backtracking/" }] },
];

export const SETTINGS = [
  {
    key: "northstar_text",
    value: `Dear Rajshri,

You started this because you believed you could become more. That belief was correct.

Every morning you open this dashboard, you are choosing the harder, righter path. You are not just learning to code — you are learning to build things that matter, to think in systems, to stay calm when problems resist solutions.

The AI engineer you are becoming is not someone who got lucky. She is someone who showed up when it was hard, solved problems when they were boring, and trusted the path when it felt invisible.

The universe does not reward talent. It rewards consistent devotion. You have chosen devotion.

The right job is already waiting. It belongs to the version of you that keeps going.

Keep going.`,
  },
  {
    key: "daily_quotes",
    value: [
      { text: "The universe conspires in favor of those who show up every single day.", author: "The Path" },
      { text: "You don't find your path. You build it — one commit, one problem, one day at a time.", author: "Rajshri's Rule #1" },
      { text: "Consistency is the rarest form of genius. You already have it.", author: "The Path" },
      { text: "Every line of code you write today is a brick in the career you are building.", author: "The Path" },
      { text: "Trust the process completely. The right job is not waiting — it is being earned.", author: "The Path" },
      { text: "Hard days are not setbacks. They are proof that you are climbing.", author: "The Path" },
      { text: "The engineer you want to become is already inside you. Show up and let her out.", author: "The Path" },
      { text: "Devotion beats talent every single time. You chose devotion.", author: "The Path" },
      { text: "Small daily wins compound into a life that surprises even you.", author: "The Path" },
      { text: "Do not wish it were easier. Wish you were better. Then go and get better.", author: "The Path" },
      { text: "Somewhere, a hiring manager is looking for exactly what you are becoming.", author: "The Path" },
      { text: "The roadmap is the guarantee. Walk it without doubt.", author: "The Path" },
      { text: "You are not preparing for a job. You are becoming the kind of engineer who attracts the right ones.", author: "The Path" },
      { text: "Magic does not happen overnight, but it does happen to those who are still working at midnight.", author: "The Path" },
      { text: "Every DSA problem you solve is a door you unlock that others never will.", author: "The Path" },
      { text: "The gap between where you are and where you want to be is called work.", author: "The Path" },
      { text: "Effort is the only variable entirely in your control. Control it completely.", author: "The Path" },
      { text: "Clarity comes to those who keep moving, not to those who wait for it.", author: "The Path" },
      { text: "AI is not magic — it is math, patience, and people who refused to quit.", author: "The Path" },
      { text: "The recruiter has not met you yet. Keep building until they have no choice but to.", author: "The Path" },
      { text: "Some days the only progress is not quitting. That counts.", author: "The Path" },
      { text: "Put in the reps. The universe keeps count.", author: "The Path" },
      { text: "One roadmap. One person. Infinite potential. Go.", author: "The Path" },
      { text: "You are not behind. You are exactly where your effort has placed you. Adjust the effort.", author: "The Path" },
      { text: "The streak is not about numbers. It is about the person you are becoming.", author: "The Path" },
      { text: "Future Rajshri is watching present Rajshri. Make her proud.", author: "The Path" },
      { text: "Systems beat motivation. Build the system. Show up anyway.", author: "The Path" },
      { text: "Every expert was once exactly where you are now.", author: "The Path" },
      { text: "The right job will feel like recognition, not luck — because it was earned.", author: "The Path" },
      { text: "Begin. The universe rewards motion.", author: "The Path" },
    ],
  },
  {
    key: "journal_prompts",
    value: [
      "What was the hardest thing you worked on today — and what did you actually learn from it?",
      "What are you proud of today, even if it feels small?",
      "What concept finally clicked? Explain it like you're teaching a friend.",
      "Where did you feel most stuck? What's your plan to unblock tomorrow?",
      "Rate your focus today 1–10. What would make tomorrow a 10?",
      "What job application or outreach did you do today? How did it feel?",
      "What's one thing you'd tell past-you from three months ago?",
      "Did you do something outside your comfort zone today?",
      "What are you most anxious about right now? Write it out and look at it clearly.",
      "What made today different from yesterday? Anything surprising?",
      "Which skill grew the most today?",
      "Who or what inspired you today, and why?",
    ],
  },
  {
    key: "journal_tags",
    value: ["Learning", "Win 🎉", "Setback", "DSA", "Job Hunt", "Reflection", "Breakthrough", "Stuck"],
  },
  {
    key: "badges",
    value: [
      { slug: "first_task", label: "First Step", description: "Complete your first task", icon: "🎯" },
      { slug: "streak_3", label: "3-Day Streak", description: "Maintain a 3-day streak", icon: "🔥" },
      { slug: "streak_7", label: "Week Warrior", description: "Maintain a 7-day streak", icon: "⚡" },
      { slug: "streak_30", label: "Monthly Master", description: "Maintain a 30-day streak", icon: "🏆" },
      { slug: "ai_stage_1", label: "Foundation Built", description: "Complete AI Stage 1", icon: "🧱" },
      { slug: "ai_stage_3", label: "Prompt Engineer", description: "Complete AI Stage 3", icon: "🤖" },
      { slug: "ai_complete", label: "AI Engineer", description: "Complete all AI stages", icon: "🚀" },
      { slug: "dsa_50", label: "Half Century", description: "Solve 50 DSA problems", icon: "💪" },
      { slug: "dsa_complete", label: "Algorithm Master", description: "Complete all DSA stages", icon: "🧠" },
      { slug: "journal_7", label: "Reflector", description: "Write 7 journal entries", icon: "📖" },
      { slug: "vault_10", label: "Curator", description: "Save 10 resources to vault", icon: "📚" },
    ],
  },
];

// ─── Default Tasks ────────────────────────────────────────────────────────────
// Edit this list to change what gets seeded into the tasks collection.
// recurrence.type: 'none' = one-time, 'daily' = every day, 'weekly' = selected days
// recurrence.days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

export const TASKS = [
  // ── Learning – Daily ──────────────────────────────────────────────────────
  {
    text: "Study AI/ML roadmap topic (1 topic per day)",
    category: "learning",
    type: "daily",
    url: "https://neetcode.io/roadmap",
    recurrence: { type: "daily", days: [] },
    completedDates: [],
    excludedDates: [],
  },
  {
    text: "Solve 1 LeetCode problem (NeetCode 150)",
    category: "learning",
    type: "daily",
    url: "https://neetcode.io",
    recurrence: { type: "daily", days: [] },
    completedDates: [],
    excludedDates: [],
  },
  {
    text: "Read / watch 1 technical resource from Vault",
    category: "learning",
    type: "daily",
    recurrence: { type: "daily", days: [] },
    completedDates: [],
    excludedDates: [],
  },
  {
    text: "Write journal entry — reflect on today's learning",
    category: "learning",
    type: "daily",
    recurrence: { type: "daily", days: [] },
    completedDates: [],
    excludedDates: [],
  },
  // ── Learning – Weekdays only ───────────────────────────────────────────────
  {
    text: "Work on current project / build something",
    category: "learning",
    type: "daily",
    recurrence: { type: "weekly", days: [1, 2, 3, 4, 5] },
    completedDates: [],
    excludedDates: [],
  },
  {
    text: "Review yesterday's notes / spaced repetition",
    category: "learning",
    type: "daily",
    recurrence: { type: "weekly", days: [1, 2, 3, 4, 5] },
    completedDates: [],
    excludedDates: [],
  },
  // ── Job Search – Daily ────────────────────────────────────────────────────
  {
    text: "Apply to 2 jobs (LinkedIn / Naukri / company site)",
    category: "job-search",
    type: "daily",
    url: "https://www.linkedin.com/jobs/",
    recurrence: { type: "daily", days: [] },
    completedDates: [],
    excludedDates: [],
  },
  {
    text: "Send 1 cold email / LinkedIn connection request",
    category: "job-search",
    type: "daily",
    recurrence: { type: "daily", days: [] },
    completedDates: [],
    excludedDates: [],
  },
  // ── Job Search – Weekdays only ────────────────────────────────────────────
  {
    text: "Research 3 target companies",
    category: "job-search",
    type: "daily",
    recurrence: { type: "weekly", days: [1, 2, 3, 4, 5] },
    completedDates: [],
    excludedDates: [],
  },
  {
    text: "Follow up on pending applications (if any)",
    category: "job-search",
    type: "daily",
    recurrence: { type: "weekly", days: [1, 2, 3, 4, 5] },
    completedDates: [],
    excludedDates: [],
  },
  // ── Job Search – Weekly (Saturday) ───────────────────────────────────────
  {
    text: "Weekly review: update job tracker, assess progress",
    category: "job-search",
    type: "daily",
    recurrence: { type: "weekly", days: [6] },
    completedDates: [],
    excludedDates: [],
  },
];
