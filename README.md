# skills

Specialized workflows for AI coding agents. Skills give your agent structured expertise for tasks that benefit from a repeatable, opinionated process — rather than relying on general knowledge each time.

## What are skills?

Skills are markdown instruction files (SKILL.md) that AI coding agents load when they recognize a relevant task. Think of them as playbooks: when you ask your agent to "clean up my commits," a git-squash skill gives it a tested 6-phase workflow instead of improvising from scratch.

Skills work with AI coding agents that support them, including [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Gemini CLI](https://github.com/google-gemini/gemini-cli), [OpenAI Codex](https://github.com/openai/codex), and other agents with skill/plugin support.

## Install

**Claude Code:**
```bash
/plugin marketplace add alainbrown/skills # install the marketplace
/plugin install git-squash@alainbrown-skills # install a specific skill from a marketplace
```

**Skills CLI:**
```bash
npx skills add alainbrown/skills --list # list available
npx skills add alainbrown/skills --skill scaffold # install a specific skill
npx skills add alainbrown/skills --all # install all
```

## Usage

After installing, just talk to your agent naturally. Skills trigger automatically when your request matches what they do:

```
train me on React hooks
build me a Slack bot that reviews PRs
clean up my commits before I open a PR
write E2E tests for my checkout flow
set up a new Next.js project with auth and payments
```

You can also invoke a skill directly by name: `/train`, `/agent-forge`, `/git-squash`, etc.

## How skills work

1. Each skill's name and description are loaded into your agent's context
2. When you send a message, your agent checks if any skill matches
3. If matched, the full SKILL.md is loaded and the agent follows it
4. Skills guide the agent through a structured workflow — they don't replace the agent's judgment, they focus it
