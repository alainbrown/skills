# CLI mock — starter

`transcripts.md` is the mock for your agent's CLI interface. It is plain
markdown showing example terminal sessions — not runnable code. The goal
is to let you see what your agent will feel like to chat with BEFORE the
project is generated.

## How to view

```
# Option A — open in your editor (recommended for review + comments)
$EDITOR transcripts.md

# Option B — serve as a webpage for nicer rendering
npx serve .
# open http://localhost:3000/transcripts.md and view in a markdown viewer
```

Box-drawing characters and the `▌` caret require a monospace font to align
correctly. Any reasonable editor or markdown viewer will render them.

## How to iterate

Tell the skill what to change in natural language. Examples:

- *"Make the approval prompt more terse — drop the summary line."*
- *"Add a scenario for a multi-step refactor across three files."*
- *"The agent's voice is too chatty. Tone it down by a notch."*
- *"Show what happens when the user hits Ctrl-C during streaming."*
- *"In the persistence scenario, the agent should mention which files
  changed since last session."*

The skill rewrites `transcripts.md` and you re-open the file to see the
next pass. Repeat until you approve.

## After approval

The approved `transcripts.md` is copied into the produced project at
`mocks/transcripts.md` as both a design artifact and a seed for the
Stage 6 generator's test scenarios. Future smoke tests can derive
expected agent behavior from these transcripts.
