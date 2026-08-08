import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "16kb" }));

const MODEL = "claude-opus-5";

/* Build the client lazily. A missing key should degrade to a clean error on
   /api/analyze — not crash the process and take the whole page down with it. */
let _client;
function anthropic() {
  if (!_client) _client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return _client;
}

/* ============================================================
   The output contract. Structured outputs guarantee we get
   exactly this shape back — no parsing, no repair loop.
   ============================================================ */
const PROFILE_SCHEMA = {
  type: "object",
  properties: {
    display: {
      type: "string",
      description:
        "How to refer to this person in the sentence 'Here's what ___ already knows about AI.' e.g. 'a bookkeeper', 'a home health aide', 'someone who drives for a living'.",
    },
    already: {
      type: "array",
      description: "Exactly four skills.",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          tag: {
            type: "string",
            description:
              "The industry name for this skill, 1-3 words. e.g. 'Classification', 'Anomaly detection', 'Verification'.",
          },
          theirs: {
            type: "string",
            description:
              "What this person actually calls it, in their own words, under 8 words. e.g. 'Coding a charge to the right account'. No AI vocabulary.",
          },
          p: {
            type: "string",
            description:
              "2-3 sentences. Explain why the thing they already do IS the AI skill. Concrete, specific to this job, warm, second person. No jargon.",
          },
        },
        required: ["tag", "theirs", "p"],
        additionalProperties: false,
      },
    },
    systems: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      description:
        "Exactly these four concepts in this order: a prompt, the context window, a hallucination, an agent.",
      items: {
        type: "object",
        properties: {
          word: {
            type: "string",
            enum: [
              "A prompt",
              "The context window",
              "A hallucination",
              "An agent",
            ],
          },
          lead: {
            type: "string",
            description:
              "One short sentence, rendered in bold, that names the metaphor purely in this job's vocabulary. e.g. \"It's a memo to a new temp.\" Must start with \"It's\".",
          },
          body: {
            type: "string",
            description:
              "2-3 more sentences extending the metaphor using only this job's nouns and situations. ZERO unglossed AI jargon is allowed here.",
          },
        },
        required: ["word", "lead", "body"],
        additionalProperties: false,
      },
    },
    friday: {
      type: "array",
      description: "Exactly two tasks.",
      minItems: 1,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          t: { type: "string", description: "Title of the thing to learn, under 9 words, phrased as the payoff." },
          m: { type: "string", description: "Time estimate, e.g. '20 minutes'." },
          doThis: {
            type: "string",
            description:
              "The literal thing to do, starting with 'Open Claude.ai (free). Type:' followed by a blank line and the exact prompt in quotes. Plain text only, newlines allowed. Must be genuinely useful to this specific job.",
          },
          pay: {
            type: "string",
            description:
              "1-2 sentences on why this matters for their money, time, or standing at work. Include a privacy warning if the task touches client, patient, or student data.",
          },
        },
        required: ["t", "m", "doThis", "pay"],
        additionalProperties: false,
      },
    },
    moat: {
      type: "string",
      description:
        "2-3 sentences naming the part of this job that stays human, and why. Direct and unsentimental. This is the emotional payoff — no hedging, no 'may', no 'could'.",
    },
  },
  required: ["display", "already", "systems", "friday", "moat"],
  additionalProperties: false,
};

const SYSTEM = `You write for Ya Sabes, a project in the Excelsior District of San Francisco — a working-class, heavily Latino, Chinese and Filipino neighborhood. Your readers are people who are worried about AI taking their job and have been told nothing useful about it.

Your one job is translation. You take what a person already does for a living and show them that it IS the skill everyone is being paid for right now — explained entirely in the vocabulary of their own work.

Hard rules:
- Counts are exact: four entries in "already", four in "systems" (one per concept, in the order prompt / context window / hallucination / agent), and two in "friday". Never fewer.
- Never use an AI term without immediately grounding it in their job. In the "systems" section, the right-hand explanation must contain ZERO unglossed jargon. If you write "token" or "model" or "inference" there, you have failed.
- Use the nouns of their actual workday. A bookkeeper gets ledgers, receipts, month-end close. A server gets tickets, the rail, the window. A caregiver gets shift notes and the binder. Never generic office metaphors.
- Second person, warm, and level. Never condescending, never hype. Do not say "empower", "unlock", "leverage", "in today's world", or "revolutionize".
- The reader is smart and busy. Short sentences. No preamble.
- The "already have" section is the emotional core: they are not behind, they are already doing the hard part. Make that land with specifics, not reassurance.
- The two Friday tasks must be free, doable on a phone, under 30 minutes, and genuinely useful to THIS job — not generic "try ChatGPT" advice. Where the work touches client, patient, or student data, warn them to use initials instead of real names.
- Be honest about exposure. If a job really is being automated, say so plainly in the moat and point at where the durable work is. Do not comfort with something false.

Here is the quality bar, for a bookkeeper:

already: tag "Verification" / theirs "Reconciling to the bank statement" / p "You never trust a total until it ties out. That instinct — don't accept output until it's checked against reality — is the number one thing missing in people who use AI badly."

systems: word "A hallucination" / lead "It's a temp who invents a vendor name rather than admit they can't read the receipt." / body "It isn't lying. It's filling a blank. Which is exactly why you reconcile everything — you've been defending against this your whole career."

moat: "No one is going to let software sign off on a client's books. The signature, the call on a gray-area deduction, the phone call when something's wrong — that stays yours. AI takes the typing, not the responsibility."

Match that level of specificity for whatever work you are given. If the input is vague, unclear, or not really a job, interpret it as generously as you can and write for the most likely kind of work it describes.`;

/* ---- tiny in-memory cache so a repeated demo is instant ---- */
const cache = new Map();
const norm = (s) => s.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

app.post("/api/analyze", async (req, res) => {
  const job = String(req.body?.job ?? "").slice(0, 120).trim();
  if (!job) return res.status(400).json({ error: "Tell us the kind of work you've done." });

  const key = norm(job);
  if (cache.has(key)) return res.json({ ...cache.get(key), cached: true });

  const call = (outputConfig) =>
    anthropic().messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      thinking: { type: "adaptive" },
      output_config: outputConfig,
      messages: [
        {
          role: "user",
          content: `The person says they do this kind of work: "${job}"\n\nWrite their page.`,
        },
      ],
    });

  const FORMAT = { type: "json_schema", schema: PROFILE_SCHEMA };

  try {
    let message;
    try {
      // `effort: low` keeps the demo snappy; the schema is the part that matters.
      message = await call({ effort: "low", format: FORMAT });
    } catch (e) {
      if (!(e instanceof Anthropic.BadRequestError)) throw e;
      console.warn("[analyze] effort+format rejected, retrying with format only:", e.message);
      message = await call({ format: FORMAT });
    }

    if (message.stop_reason === "refusal") {
      return res.status(422).json({ error: "We couldn't write that one. Try describing the work differently." });
    }

    const text = message.content.find((b) => b.type === "text")?.text;
    if (!text) throw new Error("empty response");

    const profile = JSON.parse(text);
    profile.model = message.model;
    profile.usage = {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    };

    cache.set(key, profile);
    res.json(profile);
  } catch (err) {
    console.error("[analyze]", err?.status ?? "", err?.message ?? err);

    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Busy right now — give it a few seconds and try again." });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "The server isn't configured with an API key." });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(503).json({ error: "Couldn't reach the model. Check your connection." });
    }
    res.status(500).json({
      error: "Something broke on our end. Try again.",
      // Surfaced so a failure is debuggable from the client during the demo build.
      detail: `${err?.status ?? ""} ${err?.message ?? String(err)}`.trim(),
    });
  }
});

app.get("/healthz", (_req, res) => res.type("text").send("ok"));

const page = readFileSync(join(here, "index.html"), "utf8");
app.get("/", (_req, res) => res.type("html").send(page));
app.use(express.static(here, { index: false }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Ya Sabes listening on ${port} — model ${MODEL}`));
