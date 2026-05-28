import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileEditImpl } from "../file-edit.js";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "file-edit-"));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("file-edit", () => {
  it("happy: single unique replacement", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "alpha beta gamma");
    const r = await fileEditImpl(
      { path: p, oldString: "beta", newString: "BETA" },
      { allow_outside_cwd: true },
    );
    expect(r.replacements).toBe(1);
    expect(await fs.readFile(p, "utf8")).toBe("alpha BETA gamma");
  });

  it("replaceAll: replaces every occurrence", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "a a a");
    const r = await fileEditImpl(
      { path: p, oldString: "a", newString: "b", replaceAll: true },
      { allow_outside_cwd: true },
    );
    expect(r.replacements).toBe(3);
    expect(await fs.readFile(p, "utf8")).toBe("b b b");
  });

  it("oldString not found -> error", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "abc");
    await expect(
      fileEditImpl({ path: p, oldString: "zzz", newString: "y" }, { allow_outside_cwd: true }),
    ).rejects.toThrow(/not found/);
  });

  it("non-unique oldString without replaceAll -> error", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "x x x");
    await expect(
      fileEditImpl({ path: p, oldString: "x", newString: "y" }, { allow_outside_cwd: true }),
    ).rejects.toThrow(/3 times/);
  });

  it("identical old/new -> error", async () => {
    const p = path.join(tmp, "f.txt");
    await fs.writeFile(p, "x");
    await expect(
      fileEditImpl({ path: p, oldString: "x", newString: "x" }, { allow_outside_cwd: true }),
    ).rejects.toThrow(/identical/);
  });

  it("path traversal blocked", async () => {
    await expect(
      fileEditImpl({ path: "../x.txt", oldString: "a", newString: "b" }, { cwd: tmp }),
    ).rejects.toThrow(/path traversal/);
  });

  it("missing file -> ENOENT", async () => {
    await expect(
      fileEditImpl(
        { path: path.join(tmp, "nope.txt"), oldString: "a", newString: "b" },
        { allow_outside_cwd: true },
      ),
    ).rejects.toThrow(/ENOENT/i);
  });
});
