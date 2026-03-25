# train

Multi-faceted training coach with five modes — quiz, flashcard, teach-back, scenario, and practice — plus adaptive difficulty, optional cross-session progression tracking, and an interactive browser UI.

## Usage

```
train me on React hooks
quiz me on SQL — I have an interview Thursday
I want to practice Python async patterns, something hands-on
flashcards for Kubernetes concepts
help me learn epistemology — let me try explaining things
I need to get better at system design
prepare me for my algorithms interview
```

You can also invoke directly: `/train`

## What it does

The skill guides your agent through a structured training session:

1. **Source** — gathers material from model knowledge, URLs, files, or MCP servers, then previews extracted concepts for you to adjust
2. **Orient** — checks for an existing learning profile, calibrates your level (A–D), and suggests the best training mode
3. **Train** — runs the selected mode with adaptive difficulty
4. **Debrief** — scores performance, identifies specific strengths and growth areas, recommends next steps
5. **Persist** — optionally updates a `.train-profile.json` with mastery data for spaced repetition across sessions

## Features

### Five training modes

| Mode | What it tests | Best for |
|------|--------------|----------|
| **Quiz** | Recall & understanding | Baselines, breadth coverage, structured review |
| **Flashcard** | Memorization & speed | Terms, definitions, syntax, facts |
| **Teach-back** | Articulation & depth | Deep understanding, interview prep, revealing gaps |
| **Scenario** | Reasoning & judgment | Applied knowledge, debugging, decision-making |
| **Practice** | Application & creation | Hands-on skill building, coding, design |

### Interactive browser mode

For Quiz and Flashcard, the skill can launch a local browser UI with:
- Timed questions with countdown bars
- Click-to-answer for multiple choice
- Card flip animations for flashcards
- Live score tracking and progress indicators
- Keyboard-first interaction (number keys, Space, Enter)

Falls back gracefully to terminal mode if browser isn't available.

### Adaptive difficulty

Tracks performance within a session and adjusts: harder after streaks, easier after misses, targeting ~70% accuracy (the learning sweet spot).

### Cross-session progression

Optional Leitner-style spaced repetition system. Concepts move through 5 mastery boxes based on performance. The profile tracks what you've mastered, what's due for review, and suggests learning paths.

### Source review

Before training starts, the agent previews extracted concepts so you can add, remove, or refocus. Flags issues with sources (fetch failures, thin content, parse problems) transparently.

## Test scenarios

| Scenario | Prompt | What it tests |
|----------|--------|---------------|
| React hooks beginner | "I'm learning React hooks, nothing sticks" | Calibration, mode suggestion, foundational questions |
| SQL interview prep | "SQL interview Thursday, quiz me hard on window functions" | Advanced difficulty, targeted content, interview focus |
| Philosophy teach-back | "Test my epistemology understanding, let me explain" | Mode matching (teach-back), Socratic evaluation, non-code topic |
| Python async practice | "Python practice problems, hands-on concurrency" | Practice mode, advanced exercises, code review quality |

## Eval results

**Skill win rate: 88% (21/24 criteria comparisons). Baseline wins: 0/24.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| react-beginner | 7/8 | 1/8 | 0/8 |
| sql-interview | 7/8 | 1/8 | 0/8 |
| philosophy-teachback | 7/8 | 1/8 | 0/8 |

Rubric criteria: mode selection, source review, calibration, adaptive difficulty, structured debrief, actionable next steps, content quality, reference utilization.

### Where the skill dominates

- **Process and structure** (18/18 across 6 process criteria) — mode selection, source preview, calibration, structured debriefs, mode-aware next steps, and reference utilization. The baseline never does any of these.
- **Adaptive difficulty** (2/3 wins, 1 tie) — explicit performance tracking and adjustment. Baseline sometimes adapts naturally but doesn't track.
- **Reference utilization** (3/3 wins) — reads the correct mode reference (quiz.md, teach-back.md) and follows its specific rules for question type ratios and evaluation patterns.

### Where the baseline holds up

- **Content quality** (3/3 ties) — the baseline produces good questions and exercises on its own. The skill's edge is format variety and structure, not raw content quality.

### Evolution from prior eval

Prior eval: 84% (27/32). Current eval: 88% (21/24). The 7-reference structure is confirmed working — agents read the right reference at the right time and follow its mode-specific rules.
