import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

export function writeArtifacts(bundle, status, outputDirectory, options = {}) {
  const dir = resolve(process.cwd(), outputDirectory);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const writeJson = options.json !== false;
  const writeMarkdown = options.markdown !== false;

  if (writeJson) {
    writeFileSync(join(dir, 'harvest-candidates.json'), JSON.stringify(bundle, null, 2));
    writeFileSync(join(dir, 'harvest-run-status.json'), JSON.stringify(status, null, 2));
  }

  if (writeMarkdown) {
    writeFileSync(join(dir, 'harvest-summary.md'), renderMarkdown(bundle, status));
  }

  return dir;
}

export function renderMarkdown(bundle, status) {
  const lines = [];
  lines.push(`# Harvest Summary: ${bundle.run.name}`);
  lines.push('');
  lines.push(`Consumer: ${bundle.run.consumer}`);
  lines.push(`Timebox: ${bundle.run.timebox.from} to ${bundle.run.timebox.to}`);
  lines.push(`Topics: ${bundle.run.topics.join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Run Status');
  lines.push('');
  lines.push(`- OK: ${status.ok}`);
  lines.push(`- Sources requested: ${status.sources_requested}`);
  lines.push(`- Sources completed: ${status.sources_completed}`);
  lines.push(`- Sources failed: ${status.sources_failed}`);
  lines.push(`- Candidates: ${status.candidate_count}`);
  lines.push(`- Rejected: ${status.rejected_count}`);
  lines.push(`- Errors: ${status.error_count}`);
  lines.push('');
  lines.push('## Top Candidates');
  lines.push('');

  if (bundle.candidates.length === 0) {
    lines.push('No candidates accepted.');
  } else {
    for (const item of bundle.candidates.slice(0, 30)) {
      lines.push(`### ${item.title}`);
      lines.push('');
      lines.push(`- Source: ${item.source} (${item.source_type}, ${item.source_role})`);
      lines.push(`- URL: ${item.url || item.canonical_url}`);
      lines.push(`- Published: ${item.published_at || 'unknown'}`);
      lines.push(`- Score: ${item.score} (${item.score_reasons.join(', ')})`);
      if (item.matched_topics.length > 0) {
        lines.push(`- Matched topics: ${item.matched_topics.join(', ')}`);
      }
      if (item.summary) {
        lines.push(`- Summary: ${truncate(item.summary, 500)}`);
      }
      lines.push('');
    }
  }

  lines.push('## Clusters');
  lines.push('');
  for (const cluster of bundle.clusters.slice(0, 20)) {
    lines.push(`- ${cluster.title} (${cluster.item_ids.length} item, top score ${cluster.top_score})`);
  }
  if (bundle.clusters.length === 0) lines.push('No clusters.');
  lines.push('');

  lines.push('## Rejections');
  lines.push('');
  const rejectionCounts = countBy(bundle.rejected, 'reason');
  for (const [reason, count] of Object.entries(rejectionCounts)) {
    lines.push(`- ${reason}: ${count}`);
  }
  if (bundle.rejected.length === 0) lines.push('No rejected items.');
  lines.push('');

  lines.push('## Errors');
  lines.push('');
  if (bundle.errors.length === 0) {
    lines.push('No source errors.');
  } else {
    for (const error of bundle.errors) {
      lines.push(`- ${error.source || 'Unknown'} (${error.source_type || 'unknown'}): ${error.message}`);
    }
  }
  lines.push('');

  lines.push('## Handoff Notes');
  lines.push('');
  lines.push('These are source candidates, not verified claims. Send selected candidates to Researcher before using them as factual support.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}
