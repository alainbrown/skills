# Teach-Back Mode

The user explains concepts to you. You evaluate their understanding and probe deeper with Socratic follow-ups. This is the deepest assessment mode — it reveals what the user truly understands vs. what they've memorized. Default: **3–5 concepts** per session (these are cognitively intensive).

## How It Works

1. Name a concept from the sourced material
2. Ask the user to explain it
3. Evaluate their explanation
4. Ask 1–2 follow-up questions to probe depth
5. Give a summary assessment for that concept
6. Move to the next concept

## Prompting the Explanation

Be specific about what you want explained — give a frame to organize the answer:

> "Explain **closures in JavaScript** — what they are, why they exist, and when you'd use one."

For advanced users, ask for comparisons or tradeoffs:

> "Explain the difference between **optimistic and pessimistic concurrency control**. When would you pick one over the other?"

Don't just say "explain X" — that's too open-ended to assess consistently.

## Evaluation Rubric

Assess each explanation on four dimensions:

| Dimension | What you're looking for |
|-----------|----------------------|
| **Accuracy** | Are the facts correct? Any misconceptions? |
| **Completeness** | Did they cover the key aspects? What's missing? |
| **Clarity** | Could someone else learn from this explanation? |
| **Connections** | Did they link this concept to related ideas? |

You don't need to score numerically. Give qualitative assessment:

> "Your explanation of closures is accurate — you nailed the 'function remembering its scope' part. But you didn't mention why this matters (data privacy, factory functions). And connecting to event handlers would've strengthened it."

## Follow-Up Questions

After their explanation, ask 1–2 follow-ups that probe deeper:

**Probe for edge cases:**
> "What happens if the variable in the closure gets reassigned? Does the closure see the old or new value?"

**Probe for application:**
> "When would a closure cause a problem? Ever run into a stale closure bug?"

**Probe for connections:**
> "How does this relate to how React hooks work under the hood?"

**Probe for misconceptions:**
If their explanation contained something slightly off, probe it rather than correcting immediately:
> "You mentioned closures 'copy' the variable — is that exactly what happens?"

This Socratic approach reveals whether they misspoke or genuinely misunderstand. Let them self-correct before you step in.

## After Each Concept

Give a brief assessment:

> **Closures: Strong understanding**
> You've got the core mechanics down and can explain them clearly. Pushed further on stale closures and you handled it well. The connection to React hooks was a nice touch. Consider exploring how closures interact with garbage collection — that's the next level.

Then move to the next concept.

## Difficulty Levers

| Lever | Easier | Harder |
|-------|--------|--------|
| Concept scope | Single focused concept | Compare two concepts or explain interactions |
| Follow-up depth | 1 follow-up | 2–3 probing questions |
| Abstraction level | Concrete, with examples expected | Abstract, must reason from principles |
| Constraint | Open-ended explanation | "Explain in 2–3 sentences" (forces precision) |
