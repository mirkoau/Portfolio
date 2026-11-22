# Signs of AI writing

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) (read November 2026). Condensed for writing portfolio copy. Wikipedia-only signs (citations, wikitext, edit summaries) are listed briefly at the end.

## How to use this

- The page describes patterns. It does not set rules. A sign is a symptom: it points at generic, unsupported or padded writing.
- Don't just swap words to hide a sign. Fix the cause: replace the generic claim with a specific fact, or cut it.
- One sign means little. Several together are a strong tell.
- Root cause: LLMs drift toward the most common, generic statement. They replace specific facts with general positive ones.

## Checklist for portfolio copy

Before shipping any text in `content/*.json` or `index.html`:

1. **Lists for rhythm.** Is every item in a list of three needed and true? If not, keep two, or one.
2. **Negative contrast.** Remove "not X but Y", "isn't X, it's Y", "rather than", "instead of", "without X". Say what it is.
3. **Slogan headings.** Prefer plain nouns ("Photo mode", "Rebrand") over figurative lines ("A HUD that holds back").
4. **Vague praise.** "award-winning", "clear", "polished", "core", "contemporary", "approachable". Name the award, give a number, or cut.
5. **Restating closers.** Remove a last sentence that repeats the heading or the section's point.
6. **Repeated motif.** Say a key idea once, where it matters most.
7. **Unsupported outcomes.** "sped up", "improved", "nearly every". Back it with a metric or drop it.
8. **"Awards and recognition"-style headings.** Use "Awards".
9. **Mechanics.** Sentence-case headings, straight quotes, no emoji, light bold, few em dashes.

## Content

### Undue significance, legacy, broader trends
Ties small details to a big theme to puff up the subject.
Watch: "stands/serves as", "is a testament/reminder", "a crucial/pivotal/vital/significant/key role/moment", "underscores/highlights its importance", "reflects broader", "symbolizing its ongoing/enduring/lasting", "contributing to the", "setting the stage for", "marking/shaping the", "represents/marks a shift", "key turning point", "evolving landscape", "focal point", "indelible mark", "deeply rooted", "has shaped conversations/discussions about".

### Undue notability and media coverage
Proves importance by listing kinds of outlets instead of what they said.
Watch: "independent coverage", "national/regional media outlets", "tech/business outlets", "trade publications", "cited/featured/profiled in", "maintains an active/strong digital presence", "databases/records identify X as", "is listed in".

### Superficial analysis (-ing tails)
A sentence ends in an -ing clause that claims meaning or impact.
Watch: "highlighting/underscoring/emphasizing …", "ensuring …", "reflecting/symbolizing …", "contributing to …", "cultivating/fostering …", "encompassing …", "enhancing …", "valuable insights", "align/resonate with".

### Vague connection
Hints at a loose link instead of stating the relationship.
Watch: "in connection with", "connected to", "in association with", "associated with".

### Vague attribution
Opinions credited to unnamed people, or one source made to sound like many.
Watch: "industry reports", "observers have cited", "experts argue", "some critics argue", "several sources".

### Formula conclusions about challenges and the future
A "challenges" paragraph that ends on a vague hopeful note.
Watch: "Despite its … faces several challenges", "Despite these challenges", "Future outlook".

### "X and Y" headings
"Awards and recognition", "Challenges and legacy". The awards section is close to universal in AI-written articles.

## Language and grammar

### AI vocabulary
One word means little. Many in one text is a strong tell. The list changes with each model generation.
- Core: "additionally" (sentence start), "align with", "boasts" (= has), "bolstered", "crucial", "deep dive", "delve", "emphasizing", "enduring", "enhance", "fostering", "garner", "highlight" (verb), "interplay", "intricate/intricacies", "landscape" (abstract), "meticulous(ly)", "pivotal", "robust", "showcase", "tapestry" (abstract), "testament", "underscore" (verb), "valuable", "vibrant".
- Newer (mid-2026 on): "challenge", "clearer", "dependable", "echoed", "foster", "leverage", "matters", "multifaceted", "practical", "prioritize", "quietly", "steady", "universally". Also: many short sentences of 8–20 words, heavy use of periods and commas.

### Avoiding plain "is/has"
Marketing verbs replace simple copulas.
Watch: "serves as", "stands as", "marks", "functions as", "represents", "boasts", "features", "offers", "maintains", "refers to". Write "is" and "has".

### Negative parallelism
Corrects a misconception nobody had, or adds a contrast nobody needed.
- "Not only … but also", "It's not just …, it's …"
- "It's not …, it's …", "no …, no …, just …"
- "Y rather than X" (common in recent output)

### Rule of three
Triplets of adjectives or short phrases that make thin analysis look thorough.

## Style

- Title case in headings instead of sentence case.
- Too much bold in prose.
- Vertical lists with a bold inline label on each item.
- Emoji at the start of headings or list items.
- Curly quotes and apostrophes instead of straight ones.

## Chatbot leftovers

- **Talking to the user:** "I hope this helps", "Of course!", "Certainly!", "Would you like…", "let me know", "here is a … check before publishing".
- **Hedging disclaimers:** "while specific details are limited", "not widely documented", "based on available information", "it's important to note", "should be treated as X rather than Y", "does not by itself establish".
- **Placeholders:** "[Your Email Address]", "[Article Title 1]", "2025-XX-XX", "INSERT_SOURCE_URL_HERE".
- **Markdown in the wrong place:** `**bold**`, `#` headings, `---` dividers, triple backticks.

## Older signs (still worth avoiding)

- **Promotional language** (2023–2025): "boasts a", "vibrant", "rich", "profound", "showcasing", "exemplifies", "commitment to", "nestled", "in the heart of", "groundbreaking", "renowned", "diverse array".
- **Section summaries:** "In summary", "In conclusion", "Overall", or a last sentence that restates the point.
- **Em dash overuse:** spaced em dashes where a comma, colon or brackets would do. Newer models avoid dashes and overuse commas and periods instead.
- **Elegant variation:** a new synonym for the same thing in every sentence. Repeat the plain word.
- **Knowledge-cutoff lines and refusals:** "as of my last update", "as an AI language model".

## Signs of human writing

These make text read as human. Their absence is weak evidence of AI.
- Plain "is/has" phrases: "there is a", "it has a".
- Direct verbs: "wrote", "moved", "used", "tried".
- Definite claims: "the first", "the only", "one of the best".
- Qualifiers: "very", "perhaps", "tends to".
- Some wordiness: "in order to", "the fact that".

## Not reliable signs

Perfect grammar. Mixed formal and casual tone. "Bland" or "robotic" prose. Formal or academic prose. Single transition words ("Additionally", "Notably"). Unsourced content. AI detector scores (GPTZero, Pangram).

## Wikipedia-only signs (for reference)

- **Citations:** dead links, invalid ISBNs/DOIs, DOIs pointing to unrelated papers, book citations with no page numbers, `utm_source=chatgpt.com` / `openai` / `copilot.com`, named references defined but never used.
- **Markup:** `contentReference[oaicite:…]`, non-existent categories or templates.
- **Edit summaries:** canned claims of policy compliance ("ensured neutrality", "improved clarity and flow"), "preserved/retained", "added verified content".
- **Other:** sudden style shift in an editor's writing, AfC "submission statements", pre-placed decline templates, canned user pages ("About Me", "Let's Connect!").
