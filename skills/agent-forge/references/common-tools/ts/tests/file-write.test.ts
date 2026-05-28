import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileWriteImpl } from "../file-write.js";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "file-write-"));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("file-write", () => {
  it("happy: creates new file", async () => {
    const p = path.join(tmp, "out.txt");
    const r = await fileWriteImpl({ path: p, content: "hi" }, { allow_outside_cwd: true });
    expect(r.created).toBe(true);
    expect(r.bytesWritten).toBe(2);
    expect(await fs.readFile(p, "utf8")).toBe("hi");
  });

  it("overwrite: created=false", async () => {
    const p = path.join(tmp, "out.txt");
    await fs.writeFile(p, "old");
    const r = await fileWriteImpl({ path: p, content: "new" }, { allow_outside_cwd: true });
    expect(r.created).toBe(false);
    expect(await fs.readFile(p, "utf8")).toBe("new");
  });

  it("creates parent directories", async () => {
    const p = path.join(tmp, "a/b/c/deep.txt");
    const r = await fileWriteImpl({ path: p, content: "z" }, { allow_outside_cwd: true });
    expect(r.created).toBe(true);
    expect(await fs.readFile(p, "utf8")).toBe("z");
  });

  it("path traversal blocked", async () => {
    await expect(
      fileWriteImpl({ path: "../escape.txt", content: "x" }, { cwd: tmp }),
    ).rejects.toThrow(/path traversal/);
  });

  it("permission denied surfaced", async () => {
    // Skip when running as root (uid 0 ignores write perms)
    if (process.getuid && process.getuid() === 0) return;
    const dir = path.join(tmp, "ro");
    await fs.mkdir(dir);
    await fs.chmod(dir, 0o500);
    try {
      await expect(
        fileWriteImpl({ path: path.join(dir, "x"), content: "y" }, { allow_outside_cwd: true }),
      ).rejects.toThrow(/EACCES|permission/i);
    } finally {
      await fs.chmod(dir, 0o700);
    }
  });

  it("atomic: no .tmp leftover after success", async () => {
    const p = path.join(tmp, "atomic.txt");
    await fileWriteImpl({ path: p, content: "ok" }, { allow_outside_cwd: true });
    const entries = await fs.readdir(tmp);
    expect(entries.some((e) => e.includes(".tmp"))).toBe(false);
  });
});
