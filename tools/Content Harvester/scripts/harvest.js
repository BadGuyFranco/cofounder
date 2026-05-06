#!/usr/bin/env node

// Dependency check must run before imports that use npm packages.
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  hasHelpFlag,
  output,
  outputError,
  parseCliArgs,
  requireFlag
} from '../../../system/shared/cli-utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL_DIR = join(__dirname, '..');

const { loadRequest, validateRequest } = await import('./lib/request.js');
const { collectFeed } = await import('./adapters/rss.js');
const { collectUrl, collectManualUrls } = await import('./adapters/urls.js');
const { collectConnector, plannedSearchSource } = await import('./adapters/connector.js');
const { dedupeCandidates, clusterCandidates } = await import('./lib/dedupe.js');
const { filterCandidates } = await import('./lib/filter.js');
const { rankCandidates } = await import('./lib/rank.js');
const { writeArtifacts } = await import('./lib/render.js');

function printHelp() {
  console.log(`
Content Harvester

Usage:
  node scripts/harvest.js <command> [options]

Commands:
  run                       Execute a harvest request
  validate                  Validate a harvest request without fetching
  sample                    Print a starter request JSON
  help                      Show this help

Options:
  --request <path>          Path to harvest request JSON
  --output <dir>            Override output directory
  --json                    Print machine-readable command result
  --dry-run                 Validate and plan without fetching

Examples:
  node scripts/harvest.js validate --request examples/basic-rss.harvest.json
  node scripts/harvest.js run --request examples/basic-rss.harvest.json
  node scripts/harvest.js sample --json
`);
}

function sampleRequest() {
  return {
    name: 'example-harvest',
    consumer: 'Example Consumer',
    timebox: {
      from: '2026-05-01T00:00:00Z',
      to: '2026-05-06T23:59:59Z'
    },
    topics: ['topic one', 'topic two'],
    sources: [
      {
        type: 'rss',
        url: 'https://example.com/feed.xml',
        source: 'Example Feed',
        role: 'independent_reporting'
      },
      {
        type: 'manual_urls',
        source: 'Curated URLs',
        role: 'curated',
        urls: ['https://example.com/article']
      },
      {
        type: 'connector',
        connector: 'xcom',
        command: 'node scripts/search.js recent --query "topic one" --limit 25 --json',
        source: 'X.com',
        role: 'social_signal',
        enabled: false
      }
    ],
    filters: {
      exclude_terms: ['webinar', 'sponsored'],
      max_items_per_source: 20,
      min_score: 0
    },
    output: {
      directory: 'generated_output/example-harvest',
      markdown: true,
      json: true
    }
  };
}

async function validateCommand(flags) {
  requireFlag(flags, 'request', 'validate');
  const { request } = loadRequest(flags.request);
  const errors = validateRequest(request);
  if (errors.length > 0) {
    throw new Error(`Request invalid:\n- ${errors.join('\n- ')}`);
  }

  return { ok: true, name: request.name };
}

async function runCommand(flags) {
  requireFlag(flags, 'request', 'run');
  const { request, requestPath } = loadRequest(flags.request);
  const errors = validateRequest(request);
  if (errors.length > 0) {
    throw new Error(`Request invalid:\n- ${errors.join('\n- ')}`);
  }

  const startedAt = new Date();
  const runId = startedAt.toISOString().replace(/[:.]/g, '-');
  const requestDir = dirname(requestPath);
  const outputBase = flags.output
    ? flags.output
    : resolveRequestRelative(request.output?.directory || join('generated_output', request.name), requestDir);
  const outputDirectory = join(outputBase, runId);

  if (flags['dry-run']) {
    return {
      ok: true,
      dry_run: true,
      request: request.name,
      sources_requested: activeSources(request).length,
      output_directory: outputDirectory
    };
  }

  const context = {
    requestTopics: request.topics || [],
    discoveredAt: startedAt.toISOString(),
    userAgent: process.env.CONTENT_HARVESTER_USER_AGENT || 'CoFounder Content Harvester/1.0',
    timeoutMs: Number(process.env.CONTENT_HARVESTER_TIMEOUT_MS || 15000),
    toolDir: TOOL_DIR
  };

  const sourceResults = await collectSources(request, context);
  const ranked = rankCandidates(sourceResults.candidates, request);
  const filtered = filterCandidates(ranked, request);
  const clusters = clusterCandidates(filtered.accepted);
  const deduped = dedupeCandidates(filtered.accepted);
  const candidates = deduped.accepted;
  const rejected = [
    ...sourceResults.rejected,
    ...filtered.rejected,
    ...deduped.rejected
  ];
  const finishedAt = new Date();

  const bundle = {
    schema_version: 1,
    run: {
      id: runId,
      name: request.name,
      consumer: request.consumer,
      request_path: requestPath,
      timebox: request.timebox,
      topics: request.topics || []
    },
    candidates,
    clusters,
    rejected,
    errors: sourceResults.errors
  };

  const status = {
    ok: true,
    reason: 'completed',
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    sources_requested: activeSources(request).length,
    sources_completed: sourceResults.sourcesCompleted,
    sources_failed: sourceResults.sourcesFailed,
    candidate_count: candidates.length,
    rejected_count: rejected.length,
    error_count: sourceResults.errors.length,
    output_directory: outputDirectory
  };

  const writtenDir = writeArtifacts(bundle, status, outputDirectory, request.output || {});

  return {
    ok: true,
    candidate_count: candidates.length,
    rejected_count: rejected.length,
    error_count: sourceResults.errors.length,
    output_directory: writtenDir
  };
}

async function collectSources(request, context) {
  const candidates = [];
  const rejected = [];
  const errors = [];
  let sourcesCompleted = 0;
  let sourcesFailed = 0;

  for (const source of activeSources(request)) {
    try {
      if (['rss', 'substack_rss', 'reddit_rss'].includes(source.type)) {
        candidates.push(...await collectFeed(source, context));
      } else if (source.type === 'url') {
        candidates.push(...await collectUrl(source, context));
      } else if (source.type === 'manual_urls') {
        const result = await collectManualUrls(source, context);
        candidates.push(...result.candidates);
        errors.push(...result.errors);
      } else if (source.type === 'connector') {
        candidates.push(...await collectConnector(source, context));
      } else if (source.type === 'search') {
        errors.push(plannedSearchSource(source));
      } else {
        rejected.push({
          reason: 'unsupported_source_type',
          source: source.source || source.name || 'Unknown Source',
          source_type: source.type
        });
      }
      sourcesCompleted++;
    } catch (error) {
      sourcesFailed++;
      errors.push({
        source: source.source || source.name || source.url || source.connector || 'Unknown Source',
        source_type: source.type,
        message: error.message,
        retryable: isRetryable(error)
      });
    }
  }

  return { candidates, rejected, errors, sourcesCompleted, sourcesFailed };
}

function activeSources(request) {
  return (request.sources || []).filter((source) => source.enabled !== false);
}

function resolveRequestRelative(value, requestDir) {
  if (!value) return requestDir;
  if (value.startsWith('/')) return value;
  return join(requestDir, value);
}

function isRetryable(error) {
  return /timeout|timed out|429|rate|network|fetch/i.test(error.message || '');
}

function printRunResult(result) {
  console.log(`Harvest complete: ${result.candidate_count} candidates, ${result.rejected_count} rejected, ${result.error_count} errors`);
  console.log(`Output: ${result.output_directory}`);
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  const command = positional[0] || 'help';
  const json = Boolean(flags.json);

  try {
    if (hasHelpFlag(flags) || command === 'help') {
      printHelp();
      return;
    }

    if (command === 'sample') {
      output(sampleRequest(), {
        json: json || true,
        formatter: (data) => console.log(JSON.stringify(data, null, 2))
      });
      return;
    }

    if (command === 'validate') {
      const result = await validateCommand(flags);
      output(result, {
        json,
        formatter: (data) => console.log(`Request valid: ${data.name}`)
      });
      return;
    }

    if (command === 'run') {
      const result = await runCommand(flags);
      output(result, {
        json,
        formatter: flags['dry-run']
          ? (data) => console.log(`Dry run valid: ${data.request} (${data.sources_requested} sources)`)
          : printRunResult
      });
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    outputError(error);
  }
}

main();
