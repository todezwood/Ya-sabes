# Ya Sabes — *You already know this.*

**Excelsior District, San Francisco.**

People here are being told AI will take their job. Nobody is telling them the useful thing: the hard part of working with AI is a skill they already have, and they've been doing it for years under a different name.

Ya Sabes takes the work someone has actually done and shows it back to them in AI's terms — then explains how the systems work using nothing but the vocabulary of their own job.

For a bookkeeper:

> **A hallucination** — *It's a temp who invents a vendor name rather than admit they can't read the receipt.* It isn't lying. It's filling a blank. Which is exactly why you reconcile everything — you've been defending against this your whole career.

## What it does

Type the work you've done. You get four things:

1. **Skills you already have** — not skills to acquire. Coding a charge to the right account *is* classification. Reconciling to the bank statement *is* the verification instinct most AI users are missing.
2. **How the systems actually work** — prompt, context window, hallucination, agent — explained with zero unglossed jargon, in the nouns of that specific job.
3. **Two things you could learn by Friday** — free, under 30 minutes, phone-doable, with the literal text to paste in.
4. **The part that stays yours** — the honest read on what doesn't automate, and why.

Then: **teach one person.** A script to say out loud to a cousin or a coworker. AI literacy in a neighborhood doesn't spread from a website.

## How it works

A single Node service. `POST /api/analyze` calls the **Claude API** (`claude-opus-5`) with **structured outputs** — a JSON schema the model must satisfy — so any job title produces a correctly-shaped page with no parsing or repair loop. The system prompt carries the translation rules and one worked example as the quality bar.

Three layers keep a live demo safe: an in-memory cache, an automatic retry if a parameter combination is rejected, and ten hand-written profiles as a fallback if the model call fails. A green badge marks responses that came from a live call.

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

## Where to keep going, in the neighborhood

The app points people at real places that run free classes and computer access: the **Excelsior Branch Library (SFPL)**, **Mission Neighborhood Centers**, the **Excelsior Action Group**, and **SF OEWD**. Names only — check hours and eligibility with each organization directly.

---

Built at a hackathon. The translation layer is the product; everything else is chrome.
