#!/usr/bin/env node

/**
 * Aggregate rubric-based grading data from an iteration directory into benchmark.json.
 *
 * Usage:
 *   node aggregate-benchmark.mjs <iteration-dir> --skill-name <name> [--rubric <path>]
 *
 * Scans for grading.json files within eval directories. Grading uses a rubric-based
 * schema where each criterion is scored as win/tie/lose for both with_skill and baseline.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { iterDir: args[0], skillName: 'unknown', rubric: '' };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--skill-name' && args[i + 1]) { opts.skillName = args[i + 1]; i++; }
    else if (args[i] === '--rubric' && args[i + 1]) { opts.rubric = args[i + 1]; i++; }
  }

  if (!opts.iterDir) {
    console.error('Usage: node aggregate-benchmark.mjs <iteration-dir> --skill-name <name> [--rubric <path>]');
    process.exit(1);
  }

  opts.iterDir = resolve(opts.iterDir);
  if (opts.rubric) opts.rubric = resolve(opts.rubric);
  return opts;
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function findGradings(iterDir) {
  const gradings = [];

  for (const evalName of readdirSync(iterDir).sort()) {
    const evalDir = join(iterDir, evalName);
    if (!statSync(evalDir).isDirectory()) continue;
    if (evalName === 'node_modules' || evalName.startsWith('.')) continue;

    const grading = readJson(join(evalDir, 'grading.json'));
    const metadata = readJson(join(evalDir, 'eval_metadata.json'));
    const timing = {};

    for (const variant of ['with_skill', 'without_skill']) {
      const t = readJson(join(evalDir, variant, 'timing.json'));
      if (t) timing[variant] = t;
    }

    if (grading) {
      gradings.push({
        eval_name: grading.eval_name || metadata?.name || evalName,
        criteria: grading.criteria || [],
        timing,
      });
    }
  }

  return gradings;
}

function aggregate(gradings) {
  const criteriaStats = {};
  let totalWins = 0;
  let totalLoses = 0;
  let totalTies = 0;
  let totalComparisons = 0;

  const evalSummaries = [];

  for (const grading of gradings) {
    let evalWins = 0;
    let evalLoses = 0;
    let evalTies = 0;

    for (const criterion of grading.criteria) {
      const name = criterion.name;
      if (!criteriaStats[name]) criteriaStats[name] = { wins: 0, ties: 0, loses: 0 };

      const skillScore = criterion.with_skill?.score;
      const baselineScore = criterion.baseline?.score;

      if (skillScore === 'win' && baselineScore !== 'win') {
        criteriaStats[name].wins++;
        evalWins++;
        totalWins++;
      } else if (baselineScore === 'win' && skillScore !== 'win') {
        criteriaStats[name].loses++;
        evalLoses++;
        totalLoses++;
      } else {
        criteriaStats[name].ties++;
        evalTies++;
        totalTies++;
      }
      totalComparisons++;
    }

    evalSummaries.push({
      eval_name: grading.eval_name,
      skill_wins: evalWins,
      baseline_wins: evalLoses,
      ties: evalTies,
      total: grading.criteria.length,
    });
  }

  const winRate = totalComparisons > 0
    ? Math.round((totalWins / totalComparisons) * 100)
    : 0;

  let recommendation;
  if (winRate >= 70) recommendation = 'ship';
  else if (winRate >= 40) recommendation = 'iterate';
  else recommendation = 'reconsider';

  return {
    overall: {
      skill_wins: totalWins,
      baseline_wins: totalLoses,
      ties: totalTies,
      total_comparisons: totalComparisons,
      skill_win_rate: `${winRate}%`,
      recommendation,
    },
    per_eval: evalSummaries,
    per_criterion: criteriaStats,
  };
}

function main() {
  const opts = parseArgs();
  const gradings = findGradings(opts.iterDir);

  if (gradings.length === 0) {
    console.error(`No grading data found in ${opts.iterDir}`);
    process.exit(1);
  }

  const rubric = opts.rubric ? readJson(opts.rubric) : null;

  const benchmark = {
    metadata: {
      skill_name: opts.skillName,
      timestamp: new Date().toISOString(),
    },
    rubric: rubric?.criteria || null,
    results: aggregate(gradings),
  };

  // Collect timing as footnote
  const timingFootnote = {};
  for (const g of gradings) {
    if (g.timing && Object.keys(g.timing).length > 0) {
      timingFootnote[g.eval_name] = g.timing;
    }
  }
  if (Object.keys(timingFootnote).length > 0) {
    benchmark.timing = timingFootnote;
  }

  const outPath = join(opts.iterDir, 'benchmark.json');
  writeFileSync(outPath, JSON.stringify(benchmark, null, 2) + '\n');
  console.log(`Benchmark written to: ${outPath}`);
}

main();
