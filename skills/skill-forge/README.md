# skill-forge

Creates publishable agent skills with proper plugin structure, eval-backed quality, and documentation.

## Usage

```bash
/skill-forge create a skill for X
```

Or naturally:

```
I want to make a skill that reviews pull requests
turn this workflow into a skill
create a skill for managing database migrations
```

## What it does

Handles the full skill lifecycle:

1. **Scaffolds** the plugin structure (`.claude-plugin/`, repo README) if your repo isn't set up yet
2. **Interviews** you to understand what the skill should do
3. **Drafts** the SKILL.md with structured phases and clear instructions
4. **Tests** with parallel eval runs against a no-skill baseline
5. **Documents** findings into a skill README (eval results included only if quantitative tests were run)
6. **Cleans up** the eval workspace when you're done

## Design decisions

- **Never overwrites** — if README or `.claude-plugin/` already exists, asks before modifying
- **Eval results are optional** — subjective skills (writing, creative work) skip the quantitative section entirely rather than forcing meaningless numbers
- **Workspace cleanup is prompted** — eval workspaces can be large; asks rather than assuming
