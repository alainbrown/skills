import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { grepImpl } from "../grep.js";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grep-"));
  await fs.writeFile(path.join(tmp, "a.ts"), "hello world\nfoo bar\nHELLO again\n");
  await fs.writeFile(path.join(tmp, "b.md"), "# title\nworld peace\n");
  await fs.writeFile(path.join(tmp, "bin.dat"), Buffer.from([0, 1, 2, 3, 4]));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("grep", () => {
  it("happy: finds matches across files", async () => {
    const r = await grepImpl({ pattern: "world", path: tmp });
    expect(r.matches.length).toBe(2);
    const files = r.matches.map((m) => m.file).sort();
    expect(files).toEqual(["a.ts", "b.md"]);
  });

  it("case insensitive match", async () => {
    const r = await grepImpl({ pattern: "hello", path: tmp, caseInsensitive: true });
    // both "hello world" and "HELLO again"
    expect(r.matches.length).toBe(2);
  });

  it("glob filter restricts file set", async () => {
    const r = await grepImpl({ pattern: "world", path: tmp, glob: "**/*.ts" });
    expect(r.matches.every((m) => m.file.endsWith(".ts"))).toBe(true);
  });

  it("skips binary files", async () => {
    // null byte 0x00 sits in bin.dat — must not appear in results even when matched as regex
    const r = await grepImpl({ pattern: ".", path: tmp });
    expect(r.matches.some((m) => m.file === "bin.dat")).toBe(false);
  });

  it("no matches -> empty array", async () => {
    const r = await grepImpl({ pattern: "zzzzz_no_match", path: tmp });
    expect(r.matches).toEqual([]);
  });

  it("maxResults caps + flags truncated", async () => {
    const r = await grepImpl({ pattern: ".", path: tmp, maxResults: 2 });
    expect(r.matches.length).toBe(2);
    expect(r.truncated).toBe(true);
  });

  it("returns line numbers (1-indexed) and content", async () => {
    const r = await grepImpl({ pattern: "foo", path: tmp });
    expect(r.matches[0]?.line).toBe(2);
    expect(r.matches[0]?.content).toBe("foo bar");
  });
});
