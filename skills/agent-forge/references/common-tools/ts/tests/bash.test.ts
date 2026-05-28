import { describe, it, expect } from "vitest";
import { bashImpl } from "../bash.js";

describe("bash", () => {
  it("happy: runs echo", async () => {
    const r = await bashImpl({ command: "echo hello" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout.trim()).toBe("hello");
    expect(r.stderr).toBe("");
  });

  it("command not found -> non-zero exit", async () => {
    const r = await bashImpl({ command: "this_command_does_not_exist_xyz" });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr.length).toBeGreaterThan(0);
  });

  it("non-zero exit code preserved", async () => {
    const r = await bashImpl({ command: "exit 7" });
    expect(r.exitCode).toBe(7);
  });

  it("timeout enforced", async () => {
    const r = await bashImpl({ command: "sleep 5", timeout: 200 });
    expect(r.timedOut).toBe(true);
  }, 10000);

  it("output exceeding buffer is truncated", async () => {
    // ~600 KB of 'a' — over the 256 KB cap
    const r = await bashImpl({ command: "yes a | head -c 600000" });
    expect(r.truncated?.stdout).toBe(true);
    expect(r.stdout).toMatch(/truncated/);
  });

  it("injection (proves NO sanitization — this is intentional)", async () => {
    // The chained command MUST run — that's the documented behavior.
    const r = await bashImpl({ command: "echo a; echo b" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("a");
    expect(r.stdout).toContain("b");
  });

  it("custom cwd", async () => {
    const r = await bashImpl({ command: "pwd", cwd: "/tmp" });
    expect(r.stdout.trim()).toMatch(/\/tmp$/);
  });
});
