import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileReadImpl } from "../file-read.js";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "file-read-"));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("file-read", () => {
  it("happy path: reads + numbers lines", async () => {
    const p = path.join(tmp, "hi.txt");
    await fs.writeFile(p, "alpha\nbeta\ngamma\n");
    const r = await fileReadImpl({ path: p }, { allow_outside_cwd: true });
    expect(r.totalLines).toBe(4); // trailing newline => 4
    expect(r.content).toContain("     1\talpha");
    expect(r.content).toContain("     2\tbeta");
    expect(r.binary).toBeUndefined();
  });

  it("offset + limit slice", async () => {
    const p = path.join(tmp, "many.txt");
    await fs.writeFile(p, Array.from({ length: 50 }, (_, i) => `L${i + 1}`).join("\n"));
    const r = await fileReadImpl({ path: p, offset: 10, limit: 5 }, { allow_outside_cwd: true });
    expect(r.startLine).toBe(11);
    expect(r.endLine).toBe(15);
    expect(r.content).toContain("    11\tL11");
    expect(r.content).toContain("    15\tL15");
    expect(r.truncated).toBe(true);
  });

  it("missing file -> ENOENT", async () => {
    await expect(
      fileReadImpl({ path: path.join(tmp, "nope") }, { allow_outside_cwd: true }),
    ).rejects.toThrow(/ENOENT|no such file/i);
  });

  it("oversized file -> rejects", async () => {
    const p = path.join(tmp, "big.bin");
    // 11 MB sparse-ish via Buffer.alloc
    await fs.writeFile(p, Buffer.alloc(11 * 1024 * 1024, 65));
    await expect(
      fileReadImpl({ path: p }, { allow_outside_cwd: true }),
    ).rejects.toThrow(/too large/);
  });

  it("binary file -> stub result", async () => {
    const p = path.join(tmp, "bin.dat");
    await fs.writeFile(p, Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]));
    const r = await fileReadImpl({ path: p }, { allow_outside_cwd: true });
    expect(r.binary).toBe(true);
    expect(r.content).toMatch(/binary file/);
  });

  it("path traversal blocked", async () => {
    await expect(
      fileReadImpl({ path: "../../etc/passwd" }, { cwd: tmp }),
    ).rejects.toThrow(/path traversal/);
  });
});
