# Ya Sabes — *You already know this.*

**Live:** https://ya-sabes-282837028733.us-west1.run.app
**Excelsior District, San Francisco.**

---

## What it is

A website where you type the job you do, and it shows you the AI skills you already have.

That's the whole product. One input, one page back.

## The problem

People are being told AI is coming for their job. Nobody is telling them the useful part: **the hard skill in working with AI is one they already have**, and they've been doing it for years under a different name.

A bookkeeper who reconciles to the bank statement has spent a career refusing to trust a number until it's checked against reality. That instinct is the single most valuable thing you can bring to an AI tool — and nobody has ever told her that.

## What you get

Type your work. The page returns four things:

**1. Skills you already have.** Not skills to go get — ones you use every shift, under their industry names.

> *Coding a charge to the right account* → **Classification**
> *Catching the duplicate charge* → **Anomaly detection**

**2. How the systems actually work.** The four words everyone throws around — prompt, context window, hallucination, agent — explained using only the nouns of your job. No jargon on the right-hand side.

> **A hallucination**, for a dental hygienist:
> *"It's a temp who charts a 3 on a tooth she never probed, because the note looked empty."*

> **A hallucination**, for an auto body technician:
> *"It's a parts guy who'd rather quote you a number than say he doesn't have the book."*

Same concept. Different world. That translation is the product.

**3. Two things you could learn by Friday.** Free, under 30 minutes, doable on a phone, with the exact text to paste in. Real tasks for that job — not "try ChatGPT."

**4. The part that stays yours.** An honest read on what doesn't automate in this line of work, and why. If a job really is being automated, it says so.

Then: **teach one person.** A sentence to say out loud to a cousin or a coworker. AI literacy in a neighborhood doesn't spread from a website.

## How it works

One Node service. `POST /api/analyze` sends the job title to the **Claude API** (`claude-opus-5`) with **structured outputs** — a JSON schema the response must satisfy — so any job produces a correctly-shaped page with no parsing or repair loop. The system prompt carries the translation rules and one worked example as the quality bar.

Every page is written on the spot. Typing "auto body technician" generates that page fresh; nothing is pre-written for it.

Three things keep a live demo safe: an in-memory cache so a repeated search is instant, and eleven hand-written profiles that render if the model call fails, so the page can never dead-end. A green badge marks a response that came from a live call.

**A request takes about 30 seconds.** That's real generation, and the loading state says so.

## Run it

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
PORT=8787 npm start
```

## Deploy

```bash
export ANTHROPIC_API_KEY=sk-ant-...
./deploy.sh          # Cloud Run, us-west1
```

The key is only ever passed through the environment — locally via `export`, on Cloud Run as a service env var. It is never committed; `.gitignore` blocks `.env`, `*.pem`, `service-account*.json`, and the rest.

## Where to keep going, in the neighborhood

The page points at real places that run free classes, computer access, and job help: the **Excelsior Branch Library (SFPL)**, **Mission Neighborhood Centers**, the **Excelsior Action Group**, and **SF OEWD**. Names only — check hours and eligibility with each organization directly.

## Honest notes

- **Not an agent.** One API call. No tools, no loop, no autonomy.
- The neighborhood organizations are listed by name with no invented hours, addresses, or class times.
- Nothing here is legal, medical, or financial advice.

---

Built at a hackathon. The translation layer is the product; everything else is chrome.
