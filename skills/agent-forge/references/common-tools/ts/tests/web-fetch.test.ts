import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { AddressInfo } from "node:net";
import { webFetchImpl } from "../web-fetch.js";

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/ok") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body><h1>Hello</h1><p>world</p></body></html>");
    } else if (req.url === "/json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ x: 1 }));
    } else if (req.url === "/redirect") {
      res.writeHead(302, { location: "/ok" });
      res.end();
    } else if (req.url === "/slow") {
      // never respond — let the timeout fire
      // (do nothing)
    } else if (req.url === "/big") {
      res.writeHead(200, { "content-type": "text/plain" });
      // stream 11 MB
      const chunk = Buffer.alloc(64 * 1024, 65);
      let sent = 0;
      const total = 11 * 1024 * 1024;
      const writeMore = () => {
        while (sent < total) {
          if (!res.write(chunk)) {
            res.once("drain", writeMore);
            return;
          }
          sent += chunk.length;
        }
        res.end();
      };
      writeMore();
    } else {
      res.writeHead(404);
      res.end("nope");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
});

describe("web-fetch", () => {
  it("happy: 200 + HTML -> markdown", async () => {
    const r = await webFetchImpl({ url: `${baseUrl}/ok` }, { allow_localhost: true });
    expect(r.status).toBe(200);
    expect(r.markdown).toContain("# Hello");
    expect(r.markdown).toContain("world");
  });

  it("404 -> status surfaced, no throw", async () => {
    const r = await webFetchImpl({ url: `${baseUrl}/missing` }, { allow_localhost: true });
    expect(r.status).toBe(404);
  });

  it("redirect followed", async () => {
    const r = await webFetchImpl({ url: `${baseUrl}/redirect` }, { allow_localhost: true });
    expect(r.status).toBe(200);
    expect(r.markdown).toContain("Hello");
  });

  it("timeout rejects", async () => {
    await expect(
      webFetchImpl({ url: `${baseUrl}/slow`, timeout: 200 }, { allow_localhost: true }),
    ).rejects.toThrow(/timed out/);
  }, 5000);

  it("oversized body -> truncated flag", async () => {
    const r = await webFetchImpl({ url: `${baseUrl}/big` }, { allow_localhost: true });
    expect(r.truncated).toBe(true);
  }, 20000);

  it("non-HTML content returned as-is", async () => {
    const r = await webFetchImpl({ url: `${baseUrl}/json` }, { allow_localhost: true });
    expect(r.markdown).toBe('{"x":1}');
  });

  it("localhost blocked by default", async () => {
    await expect(webFetchImpl({ url: `${baseUrl}/ok` })).rejects.toThrow(/localhost|private/);
  });

  it("non-http protocol rejected", async () => {
    await expect(webFetchImpl({ url: "file:///etc/passwd" })).rejects.toThrow(/http\/https/);
  });

  it("malformed URL rejected", async () => {
    await expect(webFetchImpl({ url: "not a url" })).rejects.toThrow(/invalid URL/);
  });
});
