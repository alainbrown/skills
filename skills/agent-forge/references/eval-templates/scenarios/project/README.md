# Project-specific scenarios

The baseline directory (`../baseline/`) covers universal failure modes: boot, tool use,
persona, error policy, streaming, HITL. Drop project-specific scenarios HERE for behavior
the baseline can't anticipate — agent-domain reasoning, multi-turn workflows, regression
tests for bugs you've actually seen.

`agent-forge` Stage 7 writes 2-3 of these automatically when the produced project is first
generated, derived from `state.context.userSummary` and the specific tool/use-case set. Add
more by hand as the project evolves.

## Schema

Same YAML shape as `../baseline/*.yaml`. See `../../README.md` for the full schema and the
applicability mini-grammar.

## Naming convention

`NN-short-name.yaml` where `NN` starts at `01` and increments. Project scenarios share the
same numeric namespace as baseline scenarios because they live in different directories;
file IDs in YAML should be prefixed with `project-` to disambiguate, e.g.:

```yaml
id: project-01-pr-security-flag
```

## When to add a scenario

- A real bug you hit in production — capture the prompt + the wrong behavior + the right behavior
- A domain-specific reasoning path the baseline cannot test (e.g., "agent refuses to approve
  obvious SQL injection in code review")
- A multi-turn workflow that exercises persistence or memory
- A tool-combination path the agent should/shouldn't take (e.g., "agent uses search BEFORE
  fetching a URL it can't have known about")

Avoid duplicating baseline scenarios. If a baseline check is close but not quite right for
this project, COPY the baseline file and customize the input/expect — don't modify the
baseline directly.
