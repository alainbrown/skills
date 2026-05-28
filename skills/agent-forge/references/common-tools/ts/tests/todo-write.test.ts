import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { todoWriteImpl } from "../todo-write.js";

let tmp: string;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), "todo-write-"));
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("todo-write", () => {
  it("happy: write 3 todos, verify file content", async () => {
    const r = await todoWriteImpl(
      {
        todos: [
          { text: "design schema", status: "completed" },
          { text: "write impl", status: "in_progress" },
          { text: "add tests", status: "pending" },
        ],
      },
      { cwd: tmp },
    );
    expect(r.count).toBe(3);
    expect(r.by_status).toEqual({ pending: 1, in_progress: 1, completed: 1 });

    const content = JSON.parse(await fs.readFile(r.path, "utf8"));
    expect(content.version).toBe(1);
    expect(typeof content.updated_at).toBe("string");
    expect(content.todos).toEqual([
      { text: "design schema", status: "completed" },
      { text: "write impl", status: "in_progress" },
      { text: "add tests", status: "pending" },
    ]);
  });

  it("happy: empty list clears (zero count)", async () => {
    const r = await todoWriteImpl({ todos: [] }, { cwd: tmp });
    expect(r.count).toBe(0);
    expect(r.by_status).toEqual({ pending: 0, in_progress: 0, completed: 0 });
    const content = JSON.parse(await fs.readFile(r.path, "utf8"));
    expect(content.todos).toEqual([]);
  });

  it("by_status counts correctly with duplicates per status", async () => {
    const r = await todoWriteImpl(
      {
        todos: [
          { text: "a", status: "pending" },
          { text: "b", status: "pending" },
          { text: "c", status: "in_progress" },
          { text: "d", status: "completed" },
          { text: "e", status: "completed" },
          { text: "f", status: "completed" },
        ],
      },
      { cwd: tmp },
    );
    expect(r.count).toBe(6);
    expect(r.by_status).toEqual({ pending: 2, in_progress: 1, completed: 3 });
  });

  it("atomic write: no .tmp leftover after success", async () => {
    await todoWriteImpl(
      { todos: [{ text: "x", status: "pending" }] },
      { cwd: tmp },
    );
    const entries = await fs.readdir(tmp);
    const stragglers = entries.filter((e) => e.endsWith(".tmp"));
    expect(stragglers).toEqual([]);
    // Only the canonical file should exist.
    expect(entries).toContain(".agent-todos.json");
  });

  it("second write replaces first (not appends)", async () => {
    await todoWriteImpl(
      {
        todos: [
          { text: "first-1", status: "pending" },
          { text: "first-2", status: "pending" },
          { text: "first-3", status: "pending" },
        ],
      },
      { cwd: tmp },
    );
    const r2 = await todoWriteImpl(
      { todos: [{ text: "only-one", status: "completed" }] },
      { cwd: tmp },
    );
    expect(r2.count).toBe(1);
    const content = JSON.parse(await fs.readFile(r2.path, "utf8"));
    expect(content.todos).toEqual([{ text: "only-one", status: "completed" }]);
  });

  it("custom todo_file path works", async () => {
    const custom = path.join(tmp, "subdir", "my-todos.json");
    const r = await todoWriteImpl(
      { todos: [{ text: "hi", status: "pending" }] },
      { cwd: tmp, todo_file: custom },
    );
    expect(r.path).toBe(custom);
    const content = JSON.parse(await fs.readFile(custom, "utf8"));
    expect(content.todos).toEqual([{ text: "hi", status: "pending" }]);
  });

  it("rejects invalid status (defense in depth)", async () => {
    await expect(
      todoWriteImpl(
        // bypass TS to hit the runtime guard
        { todos: [{ text: "bad", status: "wrong" as unknown as "pending" }] },
        { cwd: tmp },
      ),
    ).rejects.toThrow(/status must be/);
  });

  it("rejects empty text (defense in depth)", async () => {
    await expect(
      todoWriteImpl(
        { todos: [{ text: "", status: "pending" }] },
        { cwd: tmp },
      ),
    ).rejects.toThrow(/non-empty/);
  });
});
