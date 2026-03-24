# Cascading Invalidation

When the user revises a decision in a completed section, downstream decisions may no longer hold. The cascade system identifies affected sections and guides re-evaluation.

## Default Dependency Graph

```
Section 1 (Problem Definition) ← everything depends on this
  ├── Section 2 (Data Audit) ← [1]
  ├── Section 3 (Data Sourcing) ← [1, 2]
  ├── Section 4 (Preprocessing) ← [1, 2]
  ├── Section 5 (Model Selection) ← [1, 2]
  ├── Section 6 (Model Adaptation) ← [1, 5]
  ├── Section 7 (Training Strategy) ← [1, 5, 6]
  ├── Section 8 (Optimization) ← [1, 5]
  ├── Section 9 (Evaluation Plan) ← [1, 5, 6, 7]
  ├── Section 10 (Pipeline Architecture) ← [1, 7]
  ├── Section 11 (Deployment) ← [1, 5, 8]
  └── Section 12 (Iteration Protocol) ← [1, 9]
```

This graph is initialized when the section plan is generated, then updated if the user adds or reorders sections. **The graph must be acyclic** (a DAG). Skipped sections retain their dependency entries so they can be correctly wired if activated later.

## Invalidation Algorithm

When the user revises a decision in section N:

1. **Read the dependency graph** from state.
2. **Transitive walk** — find all sections that depend on N (direct), plus all sections that depend on *those* (transitive), and so on. This produces the full set of potentially affected sections.
3. **Filter to completed sections** — only sections with status `completed` need re-evaluation. `pending` and `skipped` sections aren't affected yet.
4. **Evaluate each** (in dependency order) — for each affected section, check whether the *reason* for the current decision still holds given the upstream change. Use the `rationale` and `rejectedAlternatives` in the state to assess this.
5. **Classify** each affected section:
   - **Needs revision** — the reasoning no longer holds. Set status to `invalidated`.
   - **Still valid** — the reasoning still holds despite the upstream change. Keep `completed`.
6. **Check skipped sections** — if the change makes a skipped section necessary (e.g., Optimization becomes mandatory when deployment target changes to edge), set it to `pending` and add to the active plan.
7. **Present the cascade** to the user.

## Presenting the Cascade

Format the cascade clearly:

> "Changing [what changed] affects N sections (M others were checked and still hold). Here's what I'd recommend changing and why:
>
> - **Section X (Name):** [Current decision]. [Why it no longer holds]. [New recommendation].
> - **Section Y (Name):** [Current decision]. [Why it no longer holds]. [New recommendation].
> - ...
>
> These sections were checked and still hold:
> - **Section A (Name):** [Brief explanation of why it's unaffected]
>
> Want to walk through these changes, or accept my recommendations?"

The user can:
- **Accept all** — fast path, apply all recommended changes
- **Walk through** — review each change individually, accepting or overriding
- **Keep original** — override the cascade for specific sections (with a note that this may create inconsistencies)

## After Cascade Resolution

1. Update all affected sections in state with new decisions, rationale, rejected alternatives.
2. If the cascade introduced new active sections (previously skipped), schedule them in the walkthrough order.
3. If the cascade is interrupted mid-resolution (session ends), the state will show `invalidated` sections. On resume, complete the cascade before continuing.
4. Re-offer relevant probes if the changes affect assumptions that probes validated.

## Example: Deployment Target Change

**Situation:** User is at section 9 (Evaluation Plan) and says "Actually, we need this to run on a Jetson Nano, not a cloud GPU."

**Transitive walk from section 1:** The deployment constraint lives in Problem Definition. The full closure covers all active sections.

**Evaluation of each:**

| Section | Verdict | Reasoning |
|---------|---------|-----------|
| 2 (Data Audit) | Still valid | Dataset profiling doesn't depend on deployment target |
| 4 (Preprocessing) | Still valid | Tokenization is model-dependent (will re-check after Model Selection revises), not directly deployment-dependent |
| 5 (Model Selection) | Needs revision | Current 7B model won't fit on Jetson Nano |
| 6 (Model Adaptation) | Needs revision | LoRA may change with a smaller model |
| 7 (Training Strategy) | Needs revision | Hardware assumptions change (smaller model = cheaper training) |
| 8 (Optimization) | Activate from skipped | Quantization is now mandatory for edge deployment |
| 9 (Evaluation Plan) | Needs revision | Need latency and memory benchmarks |
| 10 (Pipeline Arch) | Still valid | Orchestration approach doesn't change |
| 11 (Deployment) | Needs revision | Entirely different inference stack |
| 12 (Iteration Protocol) | Still valid | Experiment prioritization logic still holds |

**Result:** 5 sections need revision, 1 section activated from skipped, 4 sections checked and still valid.

## Example: Model Selection Change

**Situation:** User overrides Model Selection from DistilBERT to a larger BERT model.

**Transitive walk from section 5:**
- Direct dependents: 6, 7, 8, 9, 11
- Transitive: 10 (via 7), 12 (via 9)

**Evaluation:** Check each — Training Strategy may need more VRAM, Optimization may change, Evaluation metrics stay the same, Deployment latency needs re-checking. Present only the ones that actually change.

## Handling Dependencies on Skipped Sections

When an active section depends on a skipped section, the dependency is treated as satisfied. The active section may address those concerns inline (e.g., if Preprocessing is active but Data Sourcing is skipped, Preprocessing may note "assuming data is clean as-is").

If the inline scope grows, recommend activating the depended-on section: "This is getting complex enough that I'd recommend activating Data Sourcing as its own section. Want to add it?"
