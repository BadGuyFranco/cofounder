#!/usr/bin/env node
// sitemap-diff.js
// Deterministically diff two sitemap snapshots (same domain) produced by sitemap-fetch.js.
// This is the authoritative source of change for the Monthly Competitor Tracker (Workflow 2).
// The model interprets the diff; it must never compute the diff by reading XML by hand.
//
// Usage:
//   node sitemap-diff.js <previous.json> <current.json> [--out path] [--pretty]
//
// Output object:
//   { domain, previousDate, currentDate,
//     addedUrls[], removedUrls[], changedLastmod[{loc, from, to}],
//     newPathSegments[], counts{...} }

import { readFileSync, writeFileSync } from 'node:fs';

function parseArgs(argv) {
  const positional = [];
  const args = { out: null, pretty: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--pretty') args.pretty = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else positional.push(a);
  }
  args.positional = positional;
  return args;
}

function load(path) {
  const snap = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(snap.urls)) throw new Error(`${path} is not a valid snapshot (missing urls[])`);
  return snap;
}

function indexByLoc(snap) {
  const m = new Map();
  for (const u of snap.urls) m.set(u.loc, u);
  return m;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.positional.length !== 2) {
    console.error('Usage: node sitemap-diff.js <previous.json> <current.json> [--out path] [--pretty]');
    process.exit(args.help ? 0 : 1);
  }

  const prev = load(args.positional[0]);
  const curr = load(args.positional[1]);

  if (prev.domain && curr.domain && prev.domain !== curr.domain) {
    console.error(`Warning: comparing different domains (${prev.domain} vs ${curr.domain}).`);
  }

  const prevIdx = indexByLoc(prev);
  const currIdx = indexByLoc(curr);

  const addedUrls = [];
  const changedLastmod = [];
  const prevSegments = new Set(prev.urls.map((u) => u.segment).filter(Boolean));
  const newSegmentSet = new Set();

  for (const u of curr.urls) {
    const before = prevIdx.get(u.loc);
    if (!before) {
      addedUrls.push(u.loc);
      if (u.segment && !prevSegments.has(u.segment)) newSegmentSet.add(u.segment);
    } else if (before.lastmod && u.lastmod && before.lastmod !== u.lastmod) {
      changedLastmod.push({ loc: u.loc, from: before.lastmod, to: u.lastmod });
    }
  }

  const removedUrls = [];
  for (const u of prev.urls) if (!currIdx.has(u.loc)) removedUrls.push(u.loc);

  addedUrls.sort();
  removedUrls.sort();
  changedLastmod.sort((a, b) => (a.loc < b.loc ? -1 : 1));
  const newPathSegments = [...newSegmentSet].sort();

  const diff = {
    domain: curr.domain || prev.domain || null,
    previousDate: prev.fetchedAt || null,
    currentDate: curr.fetchedAt || null,
    addedUrls,
    removedUrls,
    changedLastmod,
    newPathSegments,
    counts: {
      previousTotal: prev.urls.length,
      currentTotal: curr.urls.length,
      added: addedUrls.length,
      removed: removedUrls.length,
      lastmodChanged: changedLastmod.length,
      newSegments: newPathSegments.length,
    },
  };

  const json = JSON.stringify(diff, null, args.pretty ? 2 : 0);
  if (args.out) {
    writeFileSync(args.out, json);
    console.error(`Wrote diff to ${args.out}: +${addedUrls.length} / -${removedUrls.length} / ~${changedLastmod.length} lastmod`);
  } else {
    process.stdout.write(json + '\n');
  }
}

main();
