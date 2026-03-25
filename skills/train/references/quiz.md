# Quiz Mode

Present a series of questions, one at a time, with immediate feedback after each. Default: **10 questions**. Adjust if the user asks ("give me 5", "keep going") or the topic is too narrow for 10 good ones.

## Question Types

Alternate between **multiple choice**, **fill-in-the-blank**, and **explain-it** across the session. The mix depends on calibration:

| Calibration | MC : Fill-in : Explain |
|------------|------------------------|
| A (new) | 70 : 30 : 0 |
| B (some) | 50 : 40 : 10 |
| C (comfortable) | 30 : 40 : 30 |
| D (advanced) | 20 : 30 : 50 |

### Multiple Choice

```
**Question 3/10**

What does the `useEffect` cleanup function run?

A) Before the component mounts
B) After every render
C) Before the effect re-runs and on unmount
D) Only when the component unmounts
```

Rules:
- Exactly 4 options (A–D)
- All plausible — distractors reflect real misconceptions, not filler
- No "all of the above" or "none of the above"
- Vary the correct answer's position across questions
- At higher difficulty: use "which is NOT" style, subtle distinctions between similar options

### Fill-in-the-blank

```
**Question 7/10** (fill in)

In CSS Grid, the property `________` defines the number and size of columns.
```

Rules:
- One clear correct answer (or a small set of equivalents)
- Enough surrounding context to be unambiguous
- Accept reasonable variations (e.g., `grid-template-columns` with or without colon)
- For code-related blanks: specify whether you want the property name, the value, or a full expression

### Explain-it (C/D calibration only)

```
**Question 6/10** (explain)

Why does the Bradley-Terry pairwise loss work better than cross-entropy for RLHF reward models? What would go wrong with cross-entropy?
```

Rules:
- Ask "why" or "what would happen if" — not just "describe X"
- One concept per question, focused
- Grade on the key insight, not exact wording. Give partial credit for answers that show understanding but miss nuance
- 1–2 explain-it questions per session at C level, 2–3 at D level — they're cognitively expensive

## Question Quality

Go beyond surface-level. For any topic, there are "Wikipedia intro" questions and questions that reveal real understanding. Include both — start foundational, then push deeper:

- A drill on epistemology should get past JTB into internalism/externalism
- A drill on React should get past useState into closure stale-state bugs
- A drill on SQL should get past SELECT INTO window functions and CTEs

The user came to learn, not to confirm what they already half-know.

## Handling Answers

**Correct:**
> "Correct! [One sentence reinforcing why, or adding a useful detail.]"

Then immediately present the next question.

**Incorrect:**
> "Not quite — the answer is **[correct]**. [Two sentences max: address the misconception their answer reveals, not just restate the right answer.]"

Then immediately present the next question.

**Ambiguous / partially correct:**
Give credit where due, clarify what's missing, move on. Don't be pedantic about wording.

**"I don't know" or "skip":**
Treat as wrong — show the answer with explanation, move on. No judgment.

**Hint requested:**
Give one small nudge without revealing the answer. Max one hint per question. Example: "Think about what happens during the cleanup phase of the component lifecycle."

**User argues an answer:**
If they make a valid point, acknowledge it. If the source material supports their position, don't count it against them. If they're wrong, explain once more and move on.

## Difficulty Levers

| Lever | Easier | Harder |
|-------|--------|--------|
| Question type | More MC | More explain-it |
| Distractors | Obviously wrong | Subtly wrong |
| Concept depth | Foundational definitions | Edge cases, gotchas, interactions |
| Wording | Direct, literal | Requires inference or synthesis |
