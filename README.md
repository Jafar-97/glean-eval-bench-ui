# glean-eval-bench-ui

Live frontend for [glean-eval-bench](https://github.com/Jafar-97/glean-eval-bench) — a real-time LLM jury evaluation tool built to address the documented bias gap in Glean's AI Evaluator system.

**Live demo:** [glean-eval-bench-ui.vercel.app](https://glean-eval-bench-ui.vercel.app)

---

## What this is

Glean's engineers published this in their official engineering blog:

> "In the future, we will explore techniques like utilizing an ensemble of models, effectively an 'LLM jury,' to mitigate biases such as self-enhancement."
>
> — Megha Jhunjhunwala & Riddhima Narravula, [glean.com/blog/glean-ai-evaluator](https://www.glean.com/blog/glean-ai-evaluator)

This tool builds exactly that. It runs Glean's own 5-metric RAG evaluation framework using both a single balanced judge and a 4-persona LLM jury, then streams the bias delta per metric in real time.

---

## Three sections

**Live Tool** — Select a benchmark case or paste your own query, context, and answer. Hit evaluate and watch scores stream in as 4 judge personas run independently. The bias delta shows exactly where the single judge diverges from the jury.

**The Problem** — The three documented failure modes in Glean's single-judge system: self-enhancement bias (+0.275 on context_recall), verbosity bias (+0.250 on groundedness), and position bias (+0.200 on answer_relevance). All documented by Glean's own engineers.

**The Solution** — How the LLM jury works. 4 personas (Balanced, Strict, Lenient, Adversarial) evaluate independently. Jury mean is computed. Bias delta is surfaced per metric.

---

## Tech stack

- React 18 + Vite
- Server-Sent Events for streaming results
- Deployed on Vercel

## Backend

The API is at [github.com/Jafar-97/glean-eval-bench-api](https://github.com/Jafar-97/glean-eval-bench-api) — FastAPI with SSE streaming, deployed on Render.

## Benchmark scripts

The full Python benchmark with 8 curated test cases is at [github.com/Jafar-97/glean-eval-bench](https://github.com/Jafar-97/glean-eval-bench).

---

## Run locally

```bash
git clone https://github.com/Jafar-97/glean-eval-bench-ui
cd glean-eval-bench-ui
npm install

# Create .env file
echo "VITE_API_URL=https://glean-eval-bench-api.onrender.com" > .env

npm run dev
# Opens at http://localhost:3000
```

---

Built by [Jafar Mohammad](https://github.com/Jafar-97) — not affiliated with Glean.
