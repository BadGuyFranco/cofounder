import { execFile } from 'child_process';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { normalizeExternalItems } from '../lib/normalize.js';

const execFileAsync = promisify(execFile);

export async function collectConnector(source, context) {
  const connectorDir = resolve(context.toolDir, '..', '..', 'connectors', source.connector);
  const parts = splitCommand(source.command);
  if (parts.length === 0) {
    throw new Error('Connector command is empty');
  }

  const { stdout } = await execFileAsync(parts[0], parts.slice(1), {
    cwd: connectorDir,
    timeout: context.timeoutMs,
    maxBuffer: 1024 * 1024 * 10
  });

  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Connector command did not return JSON: ${error.message}`);
  }

  return normalizeExternalItems(payload, {
    ...context,
    source,
    sourceTopics: source.topics || []
  });
}

export function plannedSearchSource(source) {
  return {
    source: source.source || 'Search',
    source_type: source.type,
    message: `Native search adapter not implemented yet. Query recorded: ${source.query}`,
    retryable: false,
    planned: true
  };
}

function splitCommand(command) {
  const parts = [];
  const pattern = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
  let match;

  while ((match = pattern.exec(command)) !== null) {
    parts.push(match[1] ?? match[2] ?? match[3]);
  }

  return parts;
}

export function connectorExists(context, connector) {
  return join(context.toolDir, '..', '..', 'connectors', connector);
}
