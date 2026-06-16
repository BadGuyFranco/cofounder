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
    payload = parseEmbeddedJson(stdout);
    if (!payload) {
      throw new Error(`Connector command did not return JSON: ${error.message}`);
    }
  }

  return normalizeExternalItems(normalizeConnectorPayload(source.connector, payload), {
    ...context,
    source,
    sourceTopics: source.topics || []
  });
}

function normalizeConnectorPayload(connector, payload) {
  if (connector !== 'xcom' || !Array.isArray(payload?.data)) {
    return payload;
  }

  const usersById = new Map((payload.includes?.users || []).map((user) => [user.id, user]));

  return {
    ...payload,
    items: payload.data.map((tweet) => {
      const user = usersById.get(tweet.author_id);
      const username = user?.username || tweet.author_id || 'unknown';

      return {
        id: tweet.id,
        title: tweet.text,
        summary: tweet.text,
        content: tweet.text,
        url: `https://x.com/${username}/status/${tweet.id}`,
        external_urls: extractExpandedUrls(tweet),
        author: user ? `${user.name} (@${user.username})` : username,
        published_at: tweet.created_at,
        metrics: tweet.public_metrics || {},
        is_reply: Boolean(tweet.in_reply_to_user_id) || String(tweet.text || '').trim().startsWith('@'),
        source_type: 'connector',
        raw: tweet
      };
    })
  };
}

function extractExpandedUrls(tweet) {
  return (tweet.entities?.urls || [])
    .map((url) => url.expanded_url || url.unwound_url || url.url)
    .filter(Boolean);
}

function parseEmbeddedJson(stdout) {
  const text = String(stdout || '').trim();
  const starts = ['{', '[']
    .map((char) => text.indexOf(char))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);

  for (const start of starts) {
    const candidate = text.slice(start);
    try {
      return JSON.parse(candidate);
    } catch {
      // Some connector scripts print trailing notes after JSON.
    }

    for (let end = candidate.length; end > 0; end--) {
      const trimmed = candidate.slice(0, end).trim();
      if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) continue;
      try {
        return JSON.parse(trimmed);
      } catch {
        // Keep searching for a valid JSON boundary.
      }
    }
  }

  return null;
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
