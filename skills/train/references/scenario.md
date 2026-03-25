# Scenario Mode

Present realistic situations that require reasoning, judgment, and applied knowledge. The user thinks through problems — not just recalls facts. Default: **2–4 scenarios** per session (these take time and thought).

## Scenario Types

### Case Study
A realistic situation with constraints. Ask for a decision or analysis.

> **Scenario 1/3**
>
> You're building an e-commerce app. The product catalog is 50,000 items, updated hourly by the warehouse team. Product pages get ~10M views/month. Your current approach uses SSR for every request.
>
> The site is slow and your hosting bill is climbing. **What rendering strategy would you switch to, and why?** Consider tradeoffs.

### Debugging
Something is broken — code, a system, log output. The user finds the issue.

> **Scenario 2/3** (debug)
>
> ```javascript
> function useDebounce(value, delay) {
>   const [debounced, setDebounced] = useState(value);
>   useEffect(() => {
>     const timer = setTimeout(() => setDebounced(value), delay);
>     return () => clearTimeout(timer);
>   }, [value]);
>   return debounced;
> }
> ```
>
> A developer reports that changing `delay` at runtime doesn't take effect. **Why?**

### Spot the Error
An explanation, diagram, or code that contains a subtle mistake.

> **Scenario 3/3** (spot the error)
>
> "In a microservices architecture, you should always use synchronous HTTP calls between services because they're simpler and you get immediate error feedback. Async messaging is only needed for very high throughput."
>
> **What's wrong with this advice?**

### What-If
A working system, then a change. What happens?

> "Your app uses ISR with a 60-second revalidation. A critical product price changes and a customer sees the stale price for up to a minute. **What are three ways to solve this, and which would you pick?**"

### Design Challenge
Requirements that need a solution — schema, architecture, API, algorithm.

> "Design a rate limiting system for an API that serves both free and paid users. Free: 100 req/min, paid: 1000 req/min. Handle bursts gracefully. **Describe your approach.**"

## Constructing Good Scenarios

- Ground them in reality — use realistic numbers, constraints, and context
- Include enough detail to reason about, but don't over-specify
- The "right" answer should require weighing tradeoffs, not just knowing a fact
- Multiple valid approaches should exist — don't design around one "gotcha" answer
- Match complexity to the user's calibration level
- Draw from the sourced material's concepts, but wrap them in practical context

## Evaluating Responses

Scenarios don't have a single right answer. Evaluate on:

| Dimension | What to look for |
|-----------|-----------------|
| **Reasoning quality** | Did they think through it or jump to a conclusion? |
| **Tradeoff awareness** | Did they consider downsides of their approach? |
| **Completeness** | Did they address the key aspects of the problem? |
| **Practicality** | Would their solution actually work in practice? |

Give nuanced feedback:

> "Good instinct reaching for ISR, and you correctly identified the revalidation window issue. Your on-demand revalidation webhook would work. One thing you missed: the customer could still see stale CDN-cached content even after revalidation — you'd want cache-tag purging too. Strong answer overall."

Give partial credit generously. Penalize reasoning gaps more than knowledge gaps — a well-reasoned answer that misses a detail is better than a correct answer the user can't explain.

## Difficulty Levers

| Lever | Easier | Harder |
|-------|--------|--------|
| Constraints | Fewer, well-defined | Many, ambiguous, conflicting |
| Scope | Single system | Cross-system, distributed |
| Ambiguity | One clear best answer | Multiple valid approaches, subtle tradeoffs |
| Required knowledge | Core concepts | Edge cases, real-world gotchas, system interactions |
