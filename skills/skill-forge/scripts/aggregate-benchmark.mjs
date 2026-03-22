#!/usr/bin/env node

/**
 * Aggregate grading and timing data from an iteration directory into benchmark.json.
 *
 * Usage:
 *   node aggregate-benchmark.mjs <iteration-dir> --skill-name <name>
 *
 * Scans for grading.json and timing.json files within eval directories,
 * groups by configuration (with_skill / without_skill), and produces
 * benchmark.json with pass rates, timing, and token stats.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const iterDir = args[0];
  let skillName = 'unknown';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--skill-name' && args[i + 1]) {
      skillName = args[i + 1];
      i++;
    }
  }

  if (!iterDir) {
    console.error('Usage: node aggregate-benchmark.mjs <iteration-dir> --skill-name <name>');
    process.exit(1);
  }

  return { iterDir: resolve(iterDir), skillName };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function findRuns(iterDir) {
  const runs = [];

  for (const evalName of readdirSync(iterDir).sort()) {
    const evalDir = join(iterDir, evalName);
    if (!statSync(evalDir).isDirectory()) continue;
    if (evalName === 'node_modules' || evalName.startsWith('.')) continue;

    for (const variant of ['with_skill', 'without_skill', 'old_skill']) {
      const variantDir = join(evalDir, variant);
      if (!existsSync(variantDir) || !statSync(variantDir).isDirectory()) continue;

      const grading = readJson(join(variantDir, 'grading.json'))
        || readJson(join(evalDir, variant, 'grading.json'));
      const timing = readJson(join(variantDir, 'timing.json'));
      const metadata = readJson(join(evalDir, 'eval_metadata.json'));

      if (!grading && !timing) continue;

      const expectations = grading?.expectations || [];
      const passed = expectations.filter(e => e.passed).length;
      const total = expectations.length;

      runs.push({
        eval_name: metadata?.eval_name || evalName,
        configuration: variant,
        result: {
          pass_rate: total > 0 ? passed / total : 0,
          passed,
          total,
          time_seconds: timing?.total_duration_seconds || 0,
          tokens: timing?.total_tokens || 0,
        },
        expectations,
      });
    }
  }

  return runs;
}

function aggregate(runs) {
  const groups = {};

  for (const run of runs) {
    const config = run.configuration;
    if (!groups[config]) groups[config] = [];
    groups[config].push(run);
  }

  const summary = {};

  for (const [config, configRuns] of Object.entries(groups)) {
    const passRates = configRuns.map(r => r.result.pass_rate);
    const times = configRuns.map(r => r.result.time_seconds);
    const tokens = configRuns.map(r => r.result.tokens);

    const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const stddev = arr => {
      const m = mean(arr);
      return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
    };

    summary[config] = {
      pass_rate: { mean: +mean(passRates).toFixed(3), stddev: +stddev(passRates).toFixed(3) },
      time_seconds: { mean: +mean(times).toFixed(1), stddev: +stddev(times).toFixed(1) },
      tokens: { mean: Math.round(mean(tokens)), stddev: Math.round(stddev(tokens)) },
    };
  }

  // Compute delta between with_skill and without_skill
  const delta = {};
  if (summary.with_skill && summary.without_skill) {
    delta.pass_rate = `${(summary.with_skill.pass_rate.mean * 100).toFixed(1)}% vs ${(summary.without_skill.pass_rate.mean * 100).toFixed(1)}%`;
    delta.time_seconds = `${summary.with_skill.time_seconds.mean}s vs ${summary.without_skill.time_seconds.mean}s`;
    delta.tokens = `${summary.with_skill.tokens.mean} vs ${summary.without_skill.tokens.mean}`;
  }

  return { summary, delta };
}

function main() {
  const { iterDir, skillName } = parseArgs();
  const runs = findRuns(iterDir);

  if (runs.length === 0) {
    console.error(`No runs found in ${iterDir}`);
    process.exit(1);
  }

  const { summary, delta } = aggregate(runs);

  const benchmark = {
    metadata: {
      skill_name: skillName,
      timestamp: new Date().toISOString(),
    },
    runs,
    run_summary: summary,
    delta,
  };

  const outPath = join(iterDir, 'benchmark.json');
  writeFileSync(outPath, JSON.stringify(benchmark, null, 2) + '\n');
  console.log(`Benchmark written to: ${outPath}`);
}

main();
