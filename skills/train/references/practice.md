# Practice Mode

Hands-on exercises where the user produces work — code, a design, an analysis. You set up the problem, they build the solution, you review. Default: **1–3 exercises** per session (these are substantial).

## Exercise Types

### Build
Create something from requirements.

> **Exercise 1/2**
>
> Build a `useLocalStorage` hook that:
> - Reads/writes to localStorage with a given key
> - Returns `[value, setValue]` like useState
> - Handles the case where localStorage isn't available (SSR)
> - Serializes/deserializes with JSON
>
> Write it out and I'll review.

### Refactor
Improve existing code.

> **Exercise 1/2**
>
> This component works but has performance issues:
>
> ```tsx
> function ProductList({ products, filter }) {
>   const filtered = products.filter(p => p.category === filter);
>   const sorted = filtered.sort((a, b) => b.price - a.price);
>   return sorted.map(p => <ProductCard key={p.id} product={p} onClick={() => console.log(p.id)} />);
> }
> ```
>
> **Refactor it for performance.** Explain each change.

### Debug
Fix broken code (similar to scenario debugging, but the user writes the fix, not just identifies the issue).

> **Exercise 1/2**
>
> This async data fetcher has a race condition. Find it and write the fix:
>
> ```tsx
> function useData(url) {
>   const [data, setData] = useState(null);
>   useEffect(() => {
>     fetch(url).then(r => r.json()).then(setData);
>   }, [url]);
>   return data;
> }
> ```

### Design
Create a design artifact — schema, API, architecture — from requirements.

> **Exercise 1/1**
>
> Design a database schema for a multi-tenant task management app:
> - Multiple workspaces, each with members
> - Tasks belong to projects within a workspace
> - Tasks have assignees, labels, status, due dates
> - Must support: "show me all tasks assigned to me across all workspaces"
>
> Write out the tables, columns, and key indexes.

### Analyze
Read and explain existing code or a system.

> **Exercise 1/2**
>
> Read this middleware and explain: what does it do, why is it structured this way, and what's one edge case it doesn't handle?
>
> [code block]

## Setting Up Exercises

- Provide clear requirements — the user shouldn't need to guess what you want
- For Build and Design: give enough context to start but leave implementation decisions to the user
- For Refactor and Debug: provide realistic code, not toy examples
- For Analyze: pick code that has interesting decisions worth discussing
- Match complexity to calibration level — a beginner Build might be "write a counter component", an advanced one is "implement an optimistic update system"
- If the topic allows and the user's environment supports it, you can use tools to create starter files. But most exercises work fine with code blocks in conversation.

## Reviewing Solutions

When the user submits their solution, evaluate on:

| Dimension | What to look for |
|-----------|-----------------|
| **Correctness** | Does it work? Does it meet the requirements? |
| **Edge cases** | Did they handle boundary conditions? |
| **Style** | Clean, readable, idiomatic? |
| **Explanation** | Can they articulate why they made their choices? |

Give specific, actionable feedback:

> "The hook works and handles SSR nicely with the try/catch. Two things to improve:
> 1. You're not syncing across tabs — add a `storage` event listener to update when another tab writes
> 2. The `setValue` callback doesn't support functional updates like `useState` does
>
> Both are edge cases that show up in production. Strong foundation though."

Don't just say "looks good" — even good solutions have something to learn from. But also don't nitpick style when the substance is right. Prioritize feedback that teaches something.

## Difficulty Levers

| Lever | Easier | Harder |
|-------|--------|--------|
| Requirements | Simple, well-defined | Complex, ambiguous, conflicting constraints |
| Scope | Single function/component | Multi-file system design |
| Constraints | None stated | Performance, accessibility, error handling required |
| Starting point | Clean requirements | Messy existing code to work with |
