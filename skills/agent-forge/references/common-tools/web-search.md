# Web Search Tool — Provider Snippets

Web search is intentionally NOT in the default bespoke kit. Reasons:

1. **Every reliable option needs an API key.** Unlike `web_fetch` (which works with any public URL), search APIs gate access. Bundling one provider would make a choice for the user.
2. **DuckDuckGo HTML scraping is fragile.** It works for a few weeks at a time, then breaks when DDG changes their page structure, and is borderline-TOS.
3. **Providers churn pricing and surface.** A web_search tool that hardcoded one provider would rot faster than the rest of the kit.

The skill asks about web search as a separate Stage 4 question. The user picks a provider; the skill drops the matching snippet into `tools/custom/web_search.{ts,py}`.

---

## Provider matrix

| Provider | Free tier | API key env var | Latency | Notes |
|----------|-----------|-----------------|---------|-------|
| **Brave Search** | 2k req/mo free, then $5/1M | `BRAVE_SEARCH_API_KEY` | ~200-400ms | Best ratio of quality to cost. No CC required for free tier. |
| **Exa** | 1k req/mo free, then $5/1k | `EXA_API_KEY` | ~300-600ms | Neural search — good for "find me articles about X." Has content extraction. |
| **Tavily** | 1k req/mo free, then $0.005/req | `TAVILY_API_KEY` | ~400-800ms | AI-shaped responses (summarization included). Built for agents. |
| **Google CSE** | 100 req/day free, then $5/1k | `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX` | ~200-500ms | Most familiar UX. Limited free tier. Requires custom search engine setup. |

If the user has no preference, default-recommend **Brave** for quality-per-dollar.

---

## TypeScript — Brave Search

`tools/custom/web-search.ts`:

```typescript
import { tool } from "ai";
import { z } from "zod";

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

export const webSearch = tool({
  description: "Search the web via Brave Search. Returns title, URL, and snippet for the top results.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    count: z.number().int().min(1).max(20).default(5).describe("Number of results (1-20)"),
  }),
  execute: async ({ query, count }) => {
    if (!BRAVE_API_KEY) {
      return { error: "BRAVE_SEARCH_API_KEY not set. Get one at https://api.search.brave.com/" };
    }
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));
    const res = await fetch(url, {
      headers: { "X-Subscription-Token": BRAVE_API_KEY, Accept: "application/json" },
    });
    if (!res.ok) return { error: `Brave Search ${res.status}: ${await res.text()}` };
    const data = (await res.json()) as any;
    const results = (data?.web?.results ?? []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
    return { results };
  },
});
```

## TypeScript — Exa

```typescript
import { tool } from "ai";
import { z } from "zod";

const EXA_API_KEY = process.env.EXA_API_KEY;

export const webSearch = tool({
  description: "Neural web search via Exa. Best for 'find articles/sources about X.' Optionally extracts content.",
  inputSchema: z.object({
    query: z.string().describe("The search query (natural language works well)"),
    numResults: z.number().int().min(1).max(10).default(5),
    includeContent: z.boolean().default(false).describe("If true, includes extracted content from each result"),
  }),
  execute: async ({ query, numResults, includeContent }) => {
    if (!EXA_API_KEY) return { error: "EXA_API_KEY not set. Sign up at https://exa.ai" };
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${EXA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, numResults, contents: includeContent ? { text: true } : undefined }),
    });
    if (!res.ok) return { error: `Exa ${res.status}: ${await res.text()}` };
    const data = (await res.json()) as any;
    return {
      results: (data.results ?? []).map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.text?.slice(0, 300) ?? "",
      })),
    };
  },
});
```

## TypeScript — Tavily

```typescript
import { tool } from "ai";
import { z } from "zod";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export const webSearch = tool({
  description: "Agent-shaped search via Tavily — includes AI-generated answer plus raw results.",
  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().int().min(1).max(10).default(5),
    searchDepth: z.enum(["basic", "advanced"]).default("basic"),
  }),
  execute: async ({ query, maxResults, searchDepth }) => {
    if (!TAVILY_API_KEY) return { error: "TAVILY_API_KEY not set. Get one at https://tavily.com" };
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: searchDepth,
        include_answer: true,
      }),
    });
    if (!res.ok) return { error: `Tavily ${res.status}: ${await res.text()}` };
    const data = (await res.json()) as any;
    return {
      answer: data.answer,
      results: (data.results ?? []).map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
      })),
    };
  },
});
```

---

## A note on DuckDuckGo

The skill doesn't ship a DuckDuckGo scraping option in the default snippets. If a user explicitly wants no-API-key web search, point them at the `duck-duck-scrape` npm package — community-maintained, breaks periodically. The user should treat such tools as temporary scaffolding, not production infra.
