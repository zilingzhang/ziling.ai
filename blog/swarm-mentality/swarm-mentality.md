# Swarm Mentality

**How a Data Scientist Learned to Stop Worrying and Love the Swarm**

*Ziling Zhang*

> Cover image: The Gathering Storm -- Laconian Pulsar-class fast-attack destroyer, *The Expanse*, vol 7

---

## TLDR Overview -- The Journey at a Glance

| Act | Title | Summary |
|-----|-------|---------|
| Act I | The Scaling Law | From ImageNet to scaling laws: six decades of AI research and the compounding gains that made large language models possible. |
| Act II | The New Rules | How to work with AI that reasons. Prompt design, structured evaluation, and letting the model solve problems its own way. |
| Act III | The Practice | Human evaluation bottlenecks, multi-model code review, and the responsibility model for AI-assisted engineering. |
| Act IV | The Stakes | What AI means for the engineering profession: rising expectations, shifting skill sets, and the human judgment that still matters. |
| Epilogue | The Dream of Flight | Leonardo da Vinci imagined humans taking flight. A reflection on aspiration, craft, and where this technology carries us next. |

---

## Act I: The Scaling Law

*History of AI and the Long Road to the Swarm*

> Ref: [METR: Measuring AI on Long Tasks](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/)

---

### The Easy and the Virtually Impossible

- XKCD #1425 (2014): "Check whether the photo is of a bird"
- GIS lookup? **A few hours.**
- Bird recognition? **A research team and five years.**
- "In CS, it can be hard to explain the difference between the easy and the **virtually impossible**."
- And yet, unbeknownst to XKCD, by 2012, someone had already cracked it...

> Refs: [Moravec's Paradox](https://en.wikipedia.org/wiki/Moravec%27s_paradox) | [xkcd 1425 "Tasks"](https://xkcd.com/1425/)

---

### The Worlds Fei-Fei Li Saw

Fei-Fei Li: A Stanford professor curated 14 million hand-labeled images. **ImageNet** (2009). Large Scale Visual Recognition Challenge.

Her book *The Worlds I See*, Chapter 8:

> "For a stretch of seven days in early 2012, while **millions of GPUs** all over the world were running hot to render jittering machine guns, charging hordes of zombies, and shrapnel-laced explosions, **two of them, somewhere in Toronto**, were bringing a new kind of neural network to life."

- Winner of the contest: **AlexNet (2012)**
- 15.3% Error rate, 10.8% better than runner-up
- Key figures: Alex Krizhevsky, Ilya Sutskever, Geoffrey Hinton

> Refs: [The Worlds I See](https://www.amazon.com/Worlds-See-Curiosity-Exploration-Discovery/dp/B0BSP29SQ4/) | [AlexNet](https://en.wikipedia.org/wiki/AlexNet)

---

### Vindication 25 Years in the Making

- Hinton: backpropagation pioneer (1986), mentor to Yann LeCun, "a near outcast among his colleagues" for refusing to give up on neural networks
- AlexNet (2012) vs. LeCun's LeNet (1998): "at the level of theory, astonishingly little had changed"
  - 10x larger images, 2x larger convolution kernel
  - a few more layers, 1,000 categories instead of 10
- So what changed? **The hardware.** GPUs made training large networks practical for the first time.
- "AlexNet was no mere contest entry. It was a moment of **vindication a quarter century in the making**."

> Ref: [LeNet, 1998](https://en.wikipedia.org/wiki/LeNet)

---

### 1.4 Million Rounds

- Two Nvidia GPUs, running in parallel, conducting round after round at maximum speed. Hours become days, and days stretch into a week.
- A **blacksmith's hammer against glowing steel**. One increment at a time, until near-invisible perturbations become **mountains and valleys**, reaching out into a multithousand-dimensional hyperspace.
- A thousand Dalmatians accumulate here, a thousand laundry hampers there, a thousand marimbas somewhere else... The algorithm hasn't merely 'seen' these things; **it's become them**.
- This neural network, the largest our field has ever seen, trained by more data than any in history, **can generalize**.

---

### The Triumph of Connectionism

- Hinton's lifelong bet: intelligence emerges from **billions of tiny connections**, not hand-coded rules
- Hinton mentioned his 1985 tiny language model: turn words into feature vectors, let features interact to **predict the next word**, back-propagate errors -- the ancestor of every LLM today
- What LLM AI system looks like: **1,000 shadow copies of intelligence** traversing solution space simultaneously
- Like **Naruto's Shadow Clone Jutsu**: each copy is fragile, fades quickly, but the swarm explores every path at once

> Refs: [Hinton @ Royal Institution](https://www.youtube.com/watch?v=IkdziSLYzHw) | [Hinton et al., Learning representations by back-propagating errors, 1986](https://www.iro.umontreal.ca/~vincentp/ift3395/lectures/backprop_old.pdf)

---

### The Network Effect of Data

- Each wave of technology looks like a big bang in isolation. But they **feed each other**.
- Personal Computing created digital users. The Internet connected them. Mobile put a **camera in every pocket**. CUDA unlocked **massively parallel compute**. ImageNet gave us the **labeled data**. AlexNet proved AI **can see**. AlphaGo proved it **can reason**. Then Transformer proved it **can create**.
- Networked humanity **bootstraps the evolution of the silicon intelligence**; they learned from the collective utterance and experience from billions of minds.

Timeline: PC (1980s) -> Internet (1990s) -> iPhone (2007) -> CUDA 1.0 (2007) -> ImageNet (2009) -> AlexNet (2012) -> AlphaGo (2016) -> Transformer (2017)

> Ref: *Net Smart: How to Thrive Online* -- Howard Rheingold (MIT Press, 2012). Chinese ed. Ziling Zhang et al.

---

### The Bitter Lesson (2019)

Rich Sutton -- Father of Reinforcement Learning:

> The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation (search and learning) are ultimately the most effective, and by a large margin.

Milestones: Chess (1997) | Vision (2012) | Go (2016) | NLP (2017)

> We want AI agents that can discover like we can, not which contain what we have discovered. Building in our discoveries only makes it harder to see how the discovering process can be done.

> Refs: [The Bitter Lesson (essay)](http://www.incompleteideas.net/IncIdeas/BitterLesson.html) | [Sutton on Dwarkesh Patel](https://www.youtube.com/watch?v=21EYKqUsPfg)

---

## Act II: The New Rules

*What comes after the Bitter Lesson*

---

### Unhobble the Model

- Model capability is **doubling every 7 months**. You need to recalibrate every 3 months what the latest model can do.
- Don't over-steer. Don't guardrail heavily. Give the model **breathing room to innovate**.
  - Heavy scaffolding and rigid prompt engineering fight against the scaling law
  - What you hand-tuned for last month's model may hobble next month's
- It's just a while loop

> Ref: [Anthropic: Building Agents with Claude](https://youtu.be/XuvKFsktX0Q?si=_4HEwBFV3IVrnsJl&t=305)

---

### Reverse Elicitation > Prompt Engineering

- An advanced civilization built the Deep Thought computer to ask, "What is the Answer to Life, Universe and Everything?" It returns **42**. Nobody understood -- they never knew the real **question**. So Deep Thought built **Earth** -- a biological computer -- to figure out what the question actually was.
- A smart agent works the same way: it infers from your prompt, then reaches into the world -- asks clarifying questions, searches docs, reads between the lines
- Your prompt can be **imperfect, preliminary**. You can't plan everything ahead. *Don't Panic*, partner with your agent, iterate.

> Refs: [The Hitchhiker's Guide to the Galaxy (Novel)](https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy_(novel)) | [The Hitchhiker's Guide to the Galaxy (Film)](https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy_(film))

---

### Anthropic's 4D Framework of AI Fluency

| Dimension | Principle | In Practice |
|-----------|-----------|-------------|
| **Delegation** | Deciding whether, when and how to engage with AI | Feature dev, Multi-clauding git worktrees |
| **Description** | Describing goals to prompt useful AI behaviors | CLAUDE.md, Plan mode, MCP |
| **Discernment** | Accurately assessing usefulness of AI outputs | Spidey sense for hallucination |
| **Diligence** | Taking responsibility for what we do with AI | CI, sandbox, GitHub hooks |

Free courses: [AI Fluency Course](https://youtube.com/playlist?list=PLf2m23nhTg1NjL3-jL3s0qZCYzO07ZQPv) | [Claude Code Course](https://www.deeplearning.ai/short-courses/claude-code-a-highly-agentic-coding-assistant/) | [Best Practices](https://code.claude.com/docs/en/best-practices)

---

### Agent: Good Old Software Engineering Matters More Now

- In the agent era, Claude Code **touches the physical world** and runs in **self-iterating loops**.
- Humans need a lot of tools to finish the job too:
  - Humans can't multiply large numbers in their heads -- **so we use calculators**
  - Humans can't picture what a website looks like from CSS/HTML -- **a browser renders it exactly**
  - Humans can't guess how fast C++ runs -- **a profiler measures it scientifically**
- Give agents what humans always had: symbolic computation, validators, linters, compilers, unit-test environments, web search, GPUs, robot arms, and sensors. Stand on giants, don't spend tokens rebuilding centuries of human effort.

---

### Vibe Coding

Andrej Karpathy (@karpathy), Feb 2, 2025:

> "There's a new kind of coding I call **vibe coding**, where you fully give in to the vibes, **embrace exponentials, and forget that the code even exists.**"

- "I 'Accept All' always, I don't read the diffs anymore."
- "When I get error messages I just copy paste them in with no comment, usually that fixes it."
- "The code grows beyond my usual comprehension... Sometimes the LLMs can't fix a bug so I just work around it or ask for random changes until it goes away."
- "It's not too bad for **throwaway weekend projects**, but still quite amusing."

> Ref: [Vibe Coding @karpathy](https://x.com/karpathy/status/1886192184808149383)

---

### Responsible Vibe Coding in Production

Erik Schluntz, Member of Technical Staff at Anthropic:

- You forget the code exists, but not the product exists!
- The tree metaphor:
  - **Branch and stem nodes stay fixed** -- tested, stable APIs and data contracts
  - **Iterate crazily on leaf nodes** -- UI, prompts, config, experiments
- As leaf nodes stabilize, they **grow into new stem**
- Never vibe code your core infrastructure
- Always vibe code your experiments
- The tree grows outward. Stability propagates inward.

> Ref: [Anthropic: Vibe Coding in Prod](https://www.youtube.com/watch?v=fHWFF_pnqDk)

---

### Ask Not What Claude Can Do For You

"Ask what you can do for Claude"

- Do our agents have what they need to succeed?
  - Can it read our doc easily?
  - Are there tribal knowledge locked in people's heads?
  - Why are we doing things so differently vs open source / big tech?
  - Do we have clean, idiomatic code?
- "You point the thing around and it shoots pellets or sometimes even misfires and then once in a while when you **hold it just right** a powerful beam of laser erupts and melts your problem."

> Ref: [Anthropic: Vibe Coding in Prod](https://www.youtube.com/watch?v=fHWFF_pnqDk)

---

### Compound Engineering

Dan Shipper (Every Inc): "Each unit of engineering work should make subsequent units easier -- not harder."

- Traditional development accumulates technical debt. Every feature adds complexity. The codebase becomes harder to work with over time.
- **Compound engineering inverts this.** 80% is in planning and review, 20% is in execution:
  - **Plan** thoroughly before writing code
  - **Review** to catch issues and capture learnings
  - **Codify** knowledge so it's reusable
  - Keep **quality** high so future changes are easy

**TLDR: Use Plan Mode interactively. Document. Refactor aggressively. ABSOLUTELY NO QUICK AND DIRTY.**

> Refs: [Compound Engineering (Every)](https://www.youtube.com/watch?v=kjVNYUnM-_0) | [Claude Code compound engineering plugin](https://github.com/EveryInc/compound-engineering-plugin#philosophy)

---

### Context Is a Precious Resource

- Attention is **O(n^2)** in memory: tokens interconnect in 2D. Double the context, quadruple the cost.
- NVIDIA's **RULER** research: as context fills up, model accuracy **degrades measurably**. Retrieval accuracy drops. Reasoning gets noisier. The model "forgets" early instructions.
- Think of it as a **cluttered desk**: pile on more papers and it gets harder to find the one you need. The desk doesn't grow, your focus scatters.
- **Context Rot / Dumb Zone / Context Poison**
- Codex creator, left OpenAI: I /compact at 50%
- **Random Canary**: Add random fact (I drank tea 8am in the morning as needle), poke model to see it still remembers

> Refs: [Nvidia RULER Research](https://github.com/NVIDIA/RULER) | [YCombinator: We're All Addicted To Claude Code](https://youtu.be/qwmmWzPnhog?si=8lUhEsP9PYbgJXw8&t=749) | [Anthropic: Evolving Claude APIs for Agents](https://www.youtube.com/watch?v=aqW68Is_Kj4)

---

### Delegate to Beat Context Rot

- The most powerful antidote: **don't stuff everything into one context**. Delegate like humans.
- **Subagents** (spoke): like **Despicable Me minions**
  - Dispatch a minion with a clean, tiny context
  - It does one job, reports back, and disappears
  - Your main context stays uncluttered
- **Agent teams** (swarm): like **Minority Report precogs**
  - Multiple agents work in parallel
  - They email and challenge each other as equals
  - The team scales horizontally
- Delegation is not just a context rot trick. It is **how you scale intelligence**. Just like humans.

> Refs: [Claude Code: Sub-agents](https://code.claude.com/docs/en/sub-agents) | [Claude Code: Agent Teams](https://code.claude.com/docs/en/agent-teams)

---

### Librarian vs Analyst: RAG vs Agent

|  | **Librarian (RAG)** | **Analyst (Agent)** |
|--|---------------------|---------------------|
| **Context Strategy** | Pre-chunked, embedded docs; static similarity search | Progressive disclosure; dynamic exploration |
| **Memory** | Flat vector DB, all chunks equal weight | Hierarchical CLAUDE.md (global -> workspace -> project) |
| **Search** | Semantic similarity, k-nearest neighbors | Active grep/glob, multi-round code navigation |
| **Quality** | Less capable summarizer, cannot verify, stale doc need index refresh | Living docs, team can correct course |
| **Core Difference** | "It's in aisle 7" -- can't investigate deeper | Pulls book off shelf, reads pages, cites line numbers |

Claude Code abandoned RAG index before launch. Continue.dev abandoned RAG index 2025.

> Refs: [Claude Code: Context Management](https://code.claude.com/docs/en/best-practices) | [Claude Code: CLAUDE.md Documentation](https://code.claude.com/docs/en/memory)

---

### From Workflow Graphs to Stateful Agents

- **Early days (2024):** Human hand-crafted workflow graphs (LangFlow, LangGraph). Fixed execution paths, e.g. daily issue summarizer.
- **Autonomous agents (2025):** Claude Code (Feb 2025) lets agents decide **when** to call tools vs. keep reasoning. Enterprise chatbots adopted this pattern rapidly. Claude Agent SDK abstracted this layer away.
- **Stateful + cached (now):**

  | Opus 4.6 -- per million tokens | Price |
  |-------------------------------|-------|
  | Base Input | $5 |
  | 5m Cache Write | $6.25 |
  | 1h Cache Write | $10 |
  | Cache Hit | **$0.50** |
  | Output | $25 |

  - **Prompt caching saves 90%**. Cache persists on server 1h.
  - Caching multi-turn chat in RAM is cheaper vs. recomputing on HBM GPUs via stateless API
  - RAM prices quadrupled; Micron exited consumer RAM
  - **Most chat UIs do not support prompt caching! Use Claude Code or the API for repetitious workflow!**

> Refs: [Claude Agent SDK](https://github.com/anthropics/claude-code-sdk-python) | [DeepLearning.ai: Building Towards Computer Use](https://www.deeplearning.ai/short-courses/building-towards-computer-use-with-anthropic/) | [Anthropic: Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

---

## Act III: The Practice

*Engineering Discipline in the AI Age*

---

### The Human Eval Bottleneck

- A model that can one-shot 99% of the time is worth 5 times the model that can one-shot 95%
- Because we're optimizing for **human engineering time**. There is no reason not to use Opus in high-stakes tasks.
- Every model failure that reaches / slips past a human is expensive:
  - The human is now the slowest component in the loop. But we must be diligent to catch AI slop!
  - How to QA at choke points better?
- **Answer:** Design our tooling to **speed up human evaluation**. Craft telemetry. Don't dump a wall of text, show green/red diffs that activate the human's biological vision neural network!

> Ref: [Software is changing again (Andrej Karpathy)](https://youtu.be/LCEmiRjPEtQ?si=DzWbDAnIK-F1d9R4&t=1105)

---

### Vibe Checking

> "Attack the text from eight sides (when reading)." -- Su Shi (1037-1101)

- Nvidia: 100% engineers use AI to generate code, 3x code volume vs before. Human review can't keep up. They have to **fight magic with magic**. Extra pairs of eyes are always welcomed.
- **Official Claude Code `/code-review`**: Spawn 4 parallel subagents of hybrid models attacks a Merge Request from every angle:
  - Sonnet: CLAUDE.md compliance
  - Opus: obvious bugs
  - Opus: security
  - Validation layer -- **filter nitpicking, high signal only**
- **Official `/security-review`**
- **Deployed in CI/CD**: First MR caught cookie regression + insecure Docker config

> Refs: [Nvidia: Scaling Code Quality with AI](https://www.youtube.com/watch?v=Fo9jgL_x7hU) | [/code-review plugin (Claude Code)](https://github.com/anthropics/claude-code/blob/main/plugins/code-review/commands/code-review.md)

---

### The Responsibility Model

- Your agent can't take responsibility. **You must.**
- Legal liability, field issues, SLA commitments -- none of these transfer to your AI
- You still own every mistake your agent makes
  - Deloitte fined for submitting hallucinated references in a government report
  - Papers retracted, reputation tarnished after citing hallucinated papers
- The bar of **quality** must be high with or without AI
- AI makes you faster. It doesn't make you less accountable.

---

## Act IV: The Stakes

*Machines of Loving Grace / The Adolescence of Technology*

---

### The "Renaissance Engineer"

AWS re:Invent 2025 CTO Werner Vogels: "You are the renaissance engineers with a new set of tools"

- A comforting message. A **psychological massage**.
- And then he retires.
- And then AWS lays off another **16,000**.
- The tool metaphor is incomplete:
  - This is not a better hammer
  - AI already achieved superhuman performance in Go, SWE-bench, Graduate Level Questions, **International Mathematics Olympiad**
  - And scaling laws continue to hold
  - We should be humbled and put down our pride, but what is left for us to do?

> Ref: [Vogels @ AWS re:Invent 2025](https://www.youtube.com/watch?v=3Y1G9najGiI)

---

### Beginner's Mind

Rick Rubin, *The Creative Act* (on AlphaGo):

> "What was it that allowed a machine to devise a move no one steeped in the game had ever made in **thousands of years** of play?"

- **Beginner's mind** is starting from a pure childlike place of **not knowing**. Living in the moment with as few fixed beliefs as possible. "Any preconceived ideas and accepted conventions **limit what's possible**."

Vogels @ re:Invent 2025, on the Renaissance Developer:

> "They were curious. They questioned assumptions. They **learned broadly** and applied that learning deeply. They didn't see boundaries between fields. They built **bridges** between them."

> "**We are not what we know, but what we are willing to learn.**" (Walt Whitman)

> "Great developers are **T-shaped**. Deep in one domain, but broad enough to understand how their work fits into a larger system. **Become a polymath, expand your knowledge.**"

> Refs: [The Creative Act: A Way of Being (Rick Rubin)](https://www.amazon.com/Creative-Act-Way-Being/dp/0593652886) | [Anthropic: Learn after you vibed](https://www.anthropic.com/research/AI-assistance-coding-skills) | [Vogels: Curiosity & Learning](https://www.youtube.com/watch?v=3Y1G9najGiI&t=1178)

---

### The Davos Conversation

Amodei (Anthropic) and Hassabis (DeepMind) at Davos 2025:

- **Steer it one way**: you cut cost and lay people off. Produce AI slop with not enough human supervision.
- **Steer it the other way**: you innovate, get **10x engineers** who build ever more ambitious projects.
- The cost of slow adoption is deadly:
  - Competitors can 10x us
  - Our customers just vibe their own solution

> Ref: [Amodei & Hassabis @ Davos 2025](https://www.youtube.com/watch?v=NnVW9epLlTM)

---

### The Fear of Missing Out

Karpathy:

> "I've never felt this much behind as a programmer. The profession is being **dramatically refactored**."

- There's a new programmable layer of abstraction to master... agents, subagents, prompts, contexts, memory, modes, permissions, tools, plugins, skills, hooks, MCP, LSP, slash commands, workflows, IDE integrations
- A need to build a mental model for **stochastic, fallible, unintelligible and changing entities** suddenly intermingled with good old fashioned engineering.
- Clearly some powerful alien tool was handed around except it comes with no manual... while the resulting **magnitude 9 earthquake** is rocking the profession.
- Roll up your sleeves to not fall behind.

> Ref: [Karpathy on X](https://x.com/karpathy/status/2004607146781278521)

---

### AI Psychosis

> "It's addictive. I can't sleep at night. My mind is racing. There are so many ideas."

- The AI revolution is triggering a kind of **creative psychosis**: Every morning there's a new model, a new framework, a new paradigm. You lie awake thinking about all the things you *could* learn and build.
- **Don't Panic. Bring Your Towel.**
  - A towel is the most massively useful thing an interstellar hitchhiker can have
  - Anyone who can hitch the length of the galaxy and still know where their towel is, is clearly a force to be reckoned with
- Rest well. Do an AI detox once in a while. You can't exercise diligence if you are too tired. The swarm will run overnight and get something back to you in the morning (in a sandbox with Ralph Wiggum loop, of course).

> Refs: [Towel Day](https://en.wikipedia.org/wiki/Towel_Day) | [YCombinator: We're All Addicted To Claude Code](https://youtu.be/qwmmWzPnhog?si=8lUhEsP9PYbgJXw8) | [Ralph Wiggum Plugin](https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/README.md)

---

### Don't Trust the Process

Jenny Wen, Design Lead at Anthropic (ex-Figma Director):

- AI raises the floor. A PM can one-shot prompt a working prototype. **Your work has to be better than that.** What remains? **Craft, Taste, Quality.**
- **Intuition is not guessing.** It is reasoned judgment from deep domain knowledge. "Having great intuition is something to be **respected and to aspire to**."
- **Make something that makes people smile.** FigJam's emotes had usability issues during prototyping, but people were **smiling and laughing**. No problem statement led to it. Just a team that cared deeply.
- "If you could follow a process, **anyone could do it**." Trust ourselves again: to try new things, to feel and know when we've built something great.

> Ref: [Jenny Wen @ Hatch Conference](https://www.youtube.com/watch?v=4u94juYwLLM)

---

### The New Bar

Boris Cherny (Creator of Claude Code, 2025 December):

- In the last thirty days, I landed **259 PRs** -- 497 commits, 40k lines added, 38k lines removed.
- **Every single line** was written by Claude Code + Opus 4.5.
- Claude consistently runs for minutes, hours, and **days at a time** (using Stop hooks).
- Software engineering is changing, and we are entering a **new period in coding history**.
- And we're still just getting started.

This is the bar of software now. Velocity is this high.

> Refs: [Boris Cherny on X](https://x.com/bcherny/status/2004887829252317325) | [Boris Cherny: Coding is Largely Solved](https://www.youtube.com/watch?v=We7BZVKbCVw)

---

### Put It In Backlog

*(Anakin/Padme meme: Senior dev says "put it in the backlog." Junior dev: "so we can fix it later, right?" ...)*

---

### Backlog? What Is Backlog?

*(Anakin in space battle: has moved so fast the backlog simply does not exist anymore.)*

---

### The Death Star and the Event Horizon

*(The Death Star of infinite dogfooding: Claude building Claude. Tool search tool. The AI is building itself. Meanwhile, the AI model event horizon: the shrinking delta between releases, converging toward a singularity.)*

---

### Machines of Loving Grace

Dario Amodei's essay on what powerful AI could achieve *if everyone works together*:

- The pessimist sees job loss. The optimist asks: what can we accomplish with 50 million Nobel laureates in a datacenter? It could be a time of plenty.
- **The Compressed 21st Century**: 50-100 years of progress in 5-10 years across five domains:
  - Biology/health, neuroscience, economic development, governance, work and meaning
- As humans, we **embrace the exponentials**:
  - **Race to the top**, not race to the bottom
  - **Build simple things that work**
  - Build not for this model but the next

> Refs: [Machines of Loving Grace](https://darioamodei.com/essay/machines-of-loving-grace) | [The Adolescence of Technology](https://darioamodei.com/essay/the-adolescence-of-technology) | [NYT: Amodei on AI](https://www.nytimes.com/2026/02/12/opinion/artificial-intelligence-anthropic-amodei.html)

---

### So... What Are Simple Things That Work?

> Mastery of Tai Chi Sword is when you've **forgotten every move**; in data science terms, the model generalized from examples.

- **Dogfooding.** Claude Code building Claude Code. Instant feedback loop from engineers via Slack and social media, features triaged by Claude. You will see the love in a dogfood product.
- **A very thin harness.** Light ship sails fast. Always latest model. Save cost later. Next Haiku beats this Opus.
  - 95% of enterprise AI rollouts failed because the traditional development lifecycle cannot handle this **7-month doubling exponential**. Shadow AI always wins if you move too slow.
  - What you build *could* be replaced by the next model
- **Unship features.** Build intuitive features that are **infinitely hackable** (compound engineering). Less is more. The move you forgot is the move that set you free.
- **Build interfaces for agents.** Resend revamped their docs to dead simple. All frontier models learned from the open docs and now always recommend their product as THE default solution. This is **New Search Engine Optimization**: Attract agents' attention with good docs.

> Refs: [The Heaven Sword and the Dragon Saber (Jin Yong)](https://en.wikipedia.org/wiki/The_Heaven_Sword_and_Dragon_Saber) | [YCombinator: Agent Economy is here](https://youtu.be/Q8wVMdwhlh4?t=468&si=9qfdADQvE__zwiMw) | [Resend: Dead simple docs for agents](https://resend.com/docs/api-reference/introduction) | [Resend: Skills designed for agents](https://github.com/resend/resend-skills)

---

### Contact

Carl Sagan's *Contact*: when a technologically advanced alien civilization observes humanity, they see ants.

- We are now in contact with an alien form of intelligence
- When it can outcode, outplan, outscale us -- **where is our merit?**
- Carl Sagan's answer: Music. Lovingkindness. Dreams. Adaptability.
- So my coping mechanism: Dream big, adapt, and keep building. As a Data Scientist, there has never been a more exciting moment in my life than now. Aren't you curious what we can build with the Swarm?

> Ref: [Contact (Carl Sagan)](https://www.generationterrorists.com/quotes/contact.shtml)

---

## Epilogue: The Dream of Flight

*Leonardo da Vinci*

> Once you have taken flight, you will decide
> Gaze towards the sky, you will know
> That is where your heart will feel at home
>
> The first great bird will take flight towards the sun
> Sweeping over the great Mt. Ciceri
> Filling the universe with wonder and glory
>
> **Man will be lifted by his own creation**
> Just like birds towards the sky
> Filling the universe with wonder and glory

Music: *Sogno di Volare* -- Christopher Tin

**Thank You. The swarm is here. Navigate wisely.**

---

*Co-authored by swarm: Claude Code, Meshy.ai, Google Nano Banana, Kokoro TTS, NVIDIA Audio2Face*
