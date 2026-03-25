# Progression System

Tracks learning across sessions using a profile stored in `.train-profile.json` in the working directory. The system is entirely optional — users can train without tracking.

## Profile Schema

```json
{
  "version": 1,
  "created": "2025-01-15T10:00:00Z",
  "lastSession": "2025-01-20T14:30:00Z",
  "topics": {
    "react-hooks": {
      "concepts": {
        "useState": { "box": 3, "lastSeen": "2025-01-20", "history": [1, 1, 1, 0, 1] },
        "useEffect": { "box": 2, "lastSeen": "2025-01-20", "history": [1, 0, 1, 1] },
        "useRef": { "box": 0, "lastSeen": "2025-01-15", "history": [0, 0] },
        "useMemo": { "box": 1, "lastSeen": "2025-01-18", "history": [0, 1] },
        "custom-hooks": { "box": 0, "lastSeen": null, "history": [] }
      },
      "sessionsCompleted": 3,
      "lastMode": "quiz"
    }
  }
}
```

### Field Definitions

- **box** (0–4): Spaced repetition box. Higher = more mastered.
- **lastSeen**: ISO date string (date only) of last practice. `null` if never seen.
- **history**: Array of recent results — `1` = correct, `0` = incorrect. Keep the last 10 entries.

## Mastery Boxes (Simplified Leitner System)

Concepts move between 5 boxes based on performance:

| Box | Status | Review interval | Meaning |
|-----|--------|----------------|---------|
| 0 | New / Struggling | Every session | Never seen, or recently failed |
| 1 | Seen | 3 days | Got it at least once, needs reinforcement |
| 2 | Learning | 7 days | Getting it consistently |
| 3 | Familiar | 14 days | Solid understanding |
| 4 | Mastered | 30 days | Deep understanding, maintenance only |

### Movement Rules

**Promotion (correct answer):** Move up one box. Max is box 4.

**Demotion (incorrect answer):** Move down to box 1 — not box 0, because they've at least seen the concept before. Exception: if already in box 1, stay in box 1.

This is gentler than strict Leitner (which drops to box 0) because our sessions are less frequent than traditional flashcard apps.

### Review Scheduling

A concept is **due for review** when:

```
daysSinceLastSeen >= reviewInterval[box]
```

Where `daysSinceLastSeen = today - lastSeen`.

When building a session, prioritize concepts in this order:
1. **Overdue items** — due for review, sorted by how overdue they are (most overdue first)
2. **In-progress items** — box 1–2, not yet due but could use reinforcement
3. **New items** — box 0 with no history (never practiced)
4. **Maintenance items** — box 3–4, not due (include sparingly to confirm mastery)

## Updating the Profile

After each session:

1. **Read** the existing profile (or create a new one if this is the first tracked session)
2. **Update** each concept practiced:
   - Append result to history (1 or 0). Trim to last 10 entries.
   - Adjust box based on the result (promote or demote)
   - Set `lastSeen` to today's date
3. **Add** new concepts encountered but not yet in the profile — set to box 0, empty history
4. **Increment** `sessionsCompleted` for the topic
5. **Set** `lastSession` to current timestamp and `lastMode` to the mode used
6. **Write** the updated profile

## Concept Naming

Be consistent with concept names across sessions. Use lowercase kebab-case: `use-effect-cleanup`, `stale-closures`, `dependency-arrays`. If the user practices "useEffect cleanup" in one session and "useEffect" broadly in another, use the more specific name when specific, the broader name when broad. Don't create overlapping concept keys for the same thing.

## Creating the Profile

On the first tracked session:

1. Create `.train-profile.json` with the schema above
2. If `.gitignore` exists, check whether `.train-profile.json` is already covered. If not, append it — the profile is personal learning state, not project code.
3. Populate initial concepts from the session's results

## When to Suggest Tracking

Suggest tracking when:
- The user seems interested in ongoing learning, not a one-off
- They ask "what should I study next" or "how am I doing overall"
- They return to a topic they've done before

Skip tracking when:
- Quick casual quiz
- User explicitly wants a single session
- The topic is extremely narrow (not enough concepts to track meaningfully)
