#!/usr/bin/env node

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { builtinModules } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const toolsRoot = join(repoRoot, 'tools');
const connectorsRoot = join(repoRoot, 'connectors');
const policyPath = join(toolsRoot, 'shared-tools-deps.json');

function parseArgs(argv) {
  const args = { format: 'text', output: null, failOnViolation: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--format' && argv[i + 1]) {
      args.format = argv[++i];
    } else if (argv[i] === '--output' && argv[i + 1]) {
      args.output = argv[++i];
    } else if (argv[i] === '--fail-on-violation') {
      args.failOnViolation = true;
    }
  }
  return args;
}

function safeReadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function listFilesRecursive(dir, predicate) {
  const results = [];
  if (!existsSync(dir)) {
    return results;
  }
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'zArchive') {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath, predicate));
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function inferToolName(packagePath) {
  const rel = relative(toolsRoot, dirname(packagePath));
  return rel || '.';
}

function gatherPackages(baseDir) {
  const packageFiles = listFilesRecursive(baseDir, (p) => p.endsWith('package.json'));
  return packageFiles
    .map((path) => ({ path, data: safeReadJson(path) }))
    .filter((pkg) => pkg.data);
}

function gatherDependencies(packages) {
  const map = new Map();
  for (const pkg of packages) {
    const deps = {
      ...(pkg.data.dependencies || {}),
      ...(pkg.data.devDependencies || {})
    };
    for (const [name, version] of Object.entries(deps)) {
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name).push({ packagePath: pkg.path, version });
    }
  }
  return map;
}

function detectVersionDrift(depMap, targetDeps) {
  const drifts = [];
  for (const dep of targetDeps) {
    const usage = depMap.get(dep) || [];
    const versions = [...new Set(usage.map((u) => u.version))];
    if (versions.length > 1) {
      drifts.push({ dep, versions, usage });
    }
  }
  return drifts;
}

function detectMixedSets(depMap, mixedSets) {
  const findings = [];
  for (const set of mixedSets) {
    const present = set.filter((dep) => (depMap.get(dep) || []).length > 0);
    if (present.length > 1) {
      findings.push({ set, present });
    }
  }
  return findings;
}

function detectMissingEnsureDeps() {
  const jsFiles = listFilesRecursive(toolsRoot, (p) => p.endsWith('.js'));
  const findings = [];
  const importRegex = /await\s+import\(\s*['"]([^'"]+)['"]\s*\)/g;
  const builtinSet = new Set([
    ...builtinModules,
    ...builtinModules.map((m) => (m.startsWith('node:') ? m.slice(5) : `node:${m}`))
  ]);

  const isBuiltinImport = (mod) => {
    if (builtinSet.has(mod)) {
      return true;
    }
    if (mod.startsWith('node:')) {
      return true;
    }
    return false;
  };

  for (const file of jsFiles) {
    const content = readFileSync(file, 'utf8');
    const hasEnsureDeps = content.includes('ensureDeps(import.meta.url');
    const imports = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const mod = match[1];
      if (!mod.startsWith('.') && !mod.startsWith('/') && !isBuiltinImport(mod)) {
        imports.push(mod);
      }
    }
    if (imports.length > 0 && !hasEnsureDeps) {
      findings.push({ file, imports: [...new Set(imports)] });
    }
  }
  return findings;
}

function buildReport() {
  const policy = safeReadJson(policyPath) || {
    mode: 'report-only',
    shared_dependency_candidates: [],
    disallowed_mixed_sets: []
  };

  const toolPackages = gatherPackages(toolsRoot);
  const connectorPackages = gatherPackages(connectorsRoot);
  const toolDepMap = gatherDependencies(toolPackages);
  const connectorDepMap = gatherDependencies(connectorPackages);

  const toolSharedUsage = {};
  for (const dep of policy.shared_dependency_candidates || []) {
    toolSharedUsage[dep] = (toolDepMap.get(dep) || []).map((u) => ({
      packagePath: relative(repoRoot, u.packagePath),
      version: u.version
    }));
  }

  const toolVersionDrift = detectVersionDrift(
    toolDepMap,
    policy.shared_dependency_candidates || []
  ).map((d) => ({
    dep: d.dep,
    versions: d.versions,
    usage: d.usage.map((u) => ({
      packagePath: relative(repoRoot, u.packagePath),
      version: u.version
    }))
  }));

  const mixedSetFindings = detectMixedSets(
    toolDepMap,
    policy.disallowed_mixed_sets || []
  );

  const missingEnsureDeps = detectMissingEnsureDeps().map((f) => ({
    file: relative(repoRoot, f.file),
    imports: f.imports
  }));

  const violations = [];
  for (const mixed of mixedSetFindings) {
    violations.push({
      severity: 'medium',
      type: 'disallowed-mixed-set',
      detail: `Mixed dependency set found: ${mixed.present.join(', ')}`
    });
  }
  for (const drift of toolVersionDrift) {
    violations.push({
      severity: 'medium',
      type: 'version-drift',
      detail: `Version drift for ${drift.dep}: ${drift.versions.join(', ')}`
    });
  }
  for (const missing of missingEnsureDeps) {
    violations.push({
      severity: 'high',
      type: 'missing-ensure-deps',
      detail: `${missing.file} imports npm modules without ensureDeps`
    });
  }

  return {
    generated_at: new Date().toISOString(),
    mode: policy.mode || 'report-only',
    summary: {
      tool_packages: toolPackages.length,
      connector_packages: connectorPackages.length,
      tool_dependency_names: toolDepMap.size,
      connector_dependency_names: connectorDepMap.size,
      violations_found: violations.length
    },
    tools_shared_dependency_usage: toolSharedUsage,
    tools_version_drift: toolVersionDrift,
    disallowed_mixed_sets: mixedSetFindings,
    missing_ensure_deps: missingEnsureDeps,
    violations
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Dependency Architecture Baseline Report');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Tool packages: ${report.summary.tool_packages}`);
  lines.push(`- Connector packages: ${report.summary.connector_packages}`);
  lines.push(`- Tool dependency names: ${report.summary.tool_dependency_names}`);
  lines.push(`- Connector dependency names: ${report.summary.connector_dependency_names}`);
  lines.push(`- Violations found: ${report.summary.violations_found}`);
  lines.push('');

  lines.push('## Shared Dependency Usage (Tools)');
  lines.push('');
  for (const [dep, usage] of Object.entries(report.tools_shared_dependency_usage)) {
    lines.push(`- ${dep}: ${usage.length} package(s)`);
    for (const item of usage) {
      lines.push(`  - ${item.packagePath} -> ${item.version}`);
    }
  }
  lines.push('');

  lines.push('## Version Drift');
  lines.push('');
  if (report.tools_version_drift.length === 0) {
    lines.push('- none');
  } else {
    for (const drift of report.tools_version_drift) {
      lines.push(`- ${drift.dep}: ${drift.versions.join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## Disallowed Mixed Sets');
  lines.push('');
  if (report.disallowed_mixed_sets.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.disallowed_mixed_sets) {
      lines.push(`- mixed set: ${item.present.join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## Missing ensureDeps');
  lines.push('');
  if (report.missing_ensure_deps.length === 0) {
    lines.push('- none');
  } else {
    for (const item of report.missing_ensure_deps) {
      lines.push(`- ${item.file}: ${item.imports.join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## Violations');
  lines.push('');
  if (report.violations.length === 0) {
    lines.push('- none');
  } else {
    for (const v of report.violations) {
      lines.push(`- [${v.severity}] ${v.type}: ${v.detail}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

const args = parseArgs(process.argv.slice(2));
const report = buildReport();
const isReportOnly = report.mode === 'report-only' && !args.failOnViolation;

if (args.format === 'json') {
  const json = JSON.stringify(report, null, 2);
  if (args.output) {
    writeFileSync(args.output, json);
  } else {
    console.log(json);
  }
} else {
  const md = toMarkdown(report);
  if (args.output) {
    writeFileSync(args.output, md);
  } else {
    console.log(md);
  }
}

if (!isReportOnly && report.violations.length > 0) {
  process.exit(1);
}
