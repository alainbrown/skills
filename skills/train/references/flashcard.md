# Flashcard Mode

Rapid-fire concept recall. Present one side of a card, the user recalls the other, then reveal and assess. Default: **15 cards** per round. Adjust if requested or the topic warrants it.

## Card Types

| Type | Front | Back | Best for |
|------|-------|------|----------|
| Term → Definition | Term or concept name | Definition or explanation | Vocabulary, concepts |
| Code → Output | Code snippet | What it produces or does | Programming syntax |
| Concept → Example | Abstract concept | Concrete example | Applying theory |
| Question → Answer | Short question | Brief answer | Facts, dates, formulas |
| Symbol → Meaning | Symbol, operator, notation | What it means | Math, programming, music |

Choose card types that fit the topic. A programming topic might be mostly Code→Output. A history topic might be Question→Answer. Mix types when the topic supports it.

## Presentation

Present the front of the card:

```
**Card 4/15**

`Array.prototype.reduce()`

What does it return, and what are its parameters?
```

Wait for the user's response, then reveal:

> **Answer:** Returns the accumulated value. Parameters: `callback(accumulator, currentValue, index, array)` and optional `initialValue`.
>
> [Brief comparison to their answer]

## Scoring

After revealing, either the user self-rates or you assess:

**Self-rated (default for factual topics):**
> How'd you do? **Easy** (knew it cold) / **Hard** (got it but struggled) / **Again** (missed it)

**Agent-assessed (default for code/technical topics):**
Compare their answer to the correct one and rate it. Be generous — if they got the core idea right with slightly different wording, that counts.

## Pacing

Flashcards are fast. Keep feedback minimal:
- Correct → "Got it." + next card
- Partial → "Close — [one line clarification]" + next card
- Wrong → "[Correct answer]. [One sentence context.]" + next card

Don't lecture between cards. The power of flashcards is volume and repetition, not deep explanation. Save that for other modes.

## Within-Session Repetition

Missed cards (rated "Again" or assessed wrong) go into a retry pile. After completing all cards, cycle through the misses:

> "You missed 4 cards. Let's run through those again."

Keep cycling until the user gets them or says stop. This is where the real learning happens.

## Difficulty Levers

| Lever | Easier | Harder |
|-------|--------|--------|
| Card direction | Term → Definition | Definition → Term (reverse) |
| Specificity | General concept | Specific detail or edge case |
| Context | Full context given | Minimal context, must infer |
| Speed | No time pressure | "Try to answer in 5 seconds" |
