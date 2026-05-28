import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { multiEditImpl } from "../multi-edit.js";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "multi-edit-"));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("multi-edit", () => {
  it("happy: 3 sequential edits all apply", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "alpha beta gamma");
    const r = await multiEditImpl(
      {
        path: p,
        edits: [
          { oldString: "alpha", newString: "ALPHA" },
          { oldString: "beta", newString: "BETA" },
          { oldString: "gamma", newString: "GAMMA" },
        ],
      },
      { allow_outside_cwd: true },
    );
    expect(r.replacements_per_edit).toEqual([1, 1, 1]);
    expect(r.total_replacements).toBe(3);
    expect(await fs.readFile(p, "utf8")).toBe("ALPHA BETA GAMMA");
  });

  it("sequential semantics: edit 2 operates on result of edit 1", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "hello world");
    const r = await multiEditImpl(
      {
        path: p,
        edits: [
          { oldString: "hello", newString: "HELLO" },
          // This would fail if edits ran in parallel against the original;
          // it only succeeds because edit 1 already produced "HELLO".
          { oldString: "HELLO world", newString: "HELLO WORLD" },
        ],
      },
      { allow_outside_cwd: true },
    );
    expect(r.total_replacements).toBe(2);
    expect(await fs.readFile(p, "utf8")).toBe("HELLO WORLD");
  });

  it("replaceAll on one edit replaces multiple occurrences", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "a a a b");
    const r = await multiEditImpl(
      {
        path: p,
        edits: [
          { oldString: "a", newString: "X", replaceAll: true },
          { oldString: "b", newString: "Y" },
        ],
      },
      { allow_outside_cwd: true },
    );
    expect(r.replacements_per_edit).toEqual([3, 1]);
    expect(r.total_replacements).toBe(4);
    expect(await fs.readFile(p, "utf8")).toBe("X X X Y");
  });

  it("error: oldString not found in edit 2 -> revert edit 1", async () => {
    const p = path.join(tmp, "f.txt");
    const original = "alpha beta gamma";
    await fs.writeFile(p, original);
    await expect(
      multiEditImpl(
        {
          path: p,
          edits: [
            { oldString: "alpha", newString: "ALPHA" },
            { oldString: "zzz", newString: "ZZZ" },
          ],
        },
        { allow_outside_cwd: true },
      ),
    ).rejects.toThrow(/edit 1.*not found/);
    // File must remain identical to original.
    expect(await fs.readFile(p, "utf8")).toBe(original);
  });

  it("error: non-unique without replaceAll -> revert", async () => {
    const p = path.join(tmp, "f.txt");
    const original = "x x x";
    await fs.writeFile(p, original);
    await expect(
      multiEditImpl(
        {
          path: p,
          edits: [{ oldString: "x", newString: "y" }],
        },
        { allow_outside_cwd: true },
      ),
    ).rejects.toThrow(/3 times/);
    expect(await fs.readFile(p, "utf8")).toBe(original);
  });

  it("error: old === new -> revert", async () => {
    const p = path.join(tmp, "f.txt");
    const original = "alpha beta";
    await fs.writeFile(p, original);
    await expect(
      multiEditImpl(
        {
          path: p,
          edits: [
            { oldString: "alpha", newString: "ALPHA" },
            { oldString: "beta", newString: "beta" },
          ],
        },
        { allow_outside_cwd: true },
      ),
    ).rejects.toThrow(/identical/);
    expect(await fs.readFile(p, "utf8")).toBe(original);
  });

  it("path traversal blocked", async () => {
    await expect(
      multiEditImpl(
        {
          path: "../x.txt",
          edits: [{ oldString: "a", newString: "b" }],
        },
        { cwd: tmp },
      ),
    ).rejects.toThrow(/path traversal/);
  });

  it("file unchanged when later edit fails (verify after error)", async () => {
    const p = path.join(tmp, "f.txt");
    const original = "one two three four";
    await fs.writeFile(p, original);
    await expect(
      multiEditImpl(
        {
          path: p,
          edits: [
            { oldString: "one", newString: "ONE" },
            { oldString: "two", newString: "TWO" },
            { oldString: "missing-target", newString: "X" },
          ],
        },
        { allow_outside_cwd: true },
      ),
    ).rejects.toThrow();
    expect(await fs.readFile(p, "utf8")).toBe(original);
  });

  it("preserves trailing newline", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "hello world\n");
    const r = await multiEditImpl(
      {
        path: p,
        edits: [{ oldString: "world", newString: "earth" }],
      },
      { allow_outside_cwd: true },
    );
    expect(r.total_replacements).toBe(1);
    expect(await fs.readFile(p, "utf8")).toBe("hello earth\n");
  });

  it("missing file -> ENOENT (no write, no tmp leftover)", async () => {
    await expect(
      multiEditImpl(
        {
          path: path.join(tmp, "nope.txt"),
          edits: [{ oldString: "a", newString: "b" }],
        },
        { allow_outside_cwd: true },
      ),
    ).rejects.toThrow(/ENOENT/i);
    const entries = await fs.readdir(tmp);
    expect(entries).toEqual([]);
  });

  it("empty edits array -> error", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "hi");
    await expect(
      multiEditImpl({ path: p, edits: [] }, { allow_outside_cwd: true }),
    ).rejects.toThrow(/non-empty/);
  });
});
