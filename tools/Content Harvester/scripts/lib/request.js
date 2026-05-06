import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export function loadRequest(requestPath) {
  if (!requestPath) {
    throw new Error('--request is required');
  }

  const resolvedPath = resolve(process.cwd(), requestPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Request file not found: ${requestPath}`);
  }

  try {
    return {
      request: JSON.parse(readFileSync(resolvedPath, 'utf8')),
      requestPath: resolvedPath
    };
  } catch (error) {
    throw new Error(`Invalid request JSON: ${error.message}`);
  }
}

export function validateRequest(request) {
  const errors = [];

  if (!request || typeof request !== 'object') {
    errors.push('Request must be a JSON object');
    return errors;
  }

  if (!request.name || typeof request.name !== 'string') {
    errors.push('name is required');
  }

  if (!request.consumer || typeof request.consumer !== 'string') {
    errors.push('consumer is required');
  }

  if (!request.timebox || typeof request.timebox !== 'object') {
    errors.push('timebox is required');
  } else {
    if (!isValidDate(request.timebox.from)) {
      errors.push('timebox.from must be a valid date string');
    }
    if (!isValidDate(request.timebox.to)) {
      errors.push('timebox.to must be a valid date string');
    }
    if (isValidDate(request.timebox.from) && isValidDate(request.timebox.to)) {
      if (new Date(request.timebox.from) > new Date(request.timebox.to)) {
        errors.push('timebox.from must be before timebox.to');
      }
    }
  }

  if (!Array.isArray(request.topics)) {
    errors.push('topics must be an array');
  }

  if (!Array.isArray(request.sources)) {
    errors.push('sources must be an array');
  } else {
    request.sources.forEach((source, index) => {
      errors.push(...validateSource(source, index));
    });
  }

  return errors;
}

function validateSource(source, index) {
  const errors = [];
  const label = `sources[${index}]`;

  if (!source || typeof source !== 'object') {
    return [`${label} must be an object`];
  }

  if (source.enabled === false) {
    return errors;
  }

  if (!source.type) {
    errors.push(`${label}.type is required`);
    return errors;
  }

  if (['rss', 'substack_rss', 'reddit_rss', 'url'].includes(source.type) && !source.url) {
    errors.push(`${label}.url is required for ${source.type}`);
  }

  if (source.type === 'manual_urls' && !Array.isArray(source.urls)) {
    errors.push(`${label}.urls must be an array for manual_urls`);
  }

  if (source.type === 'connector') {
    if (!source.connector) errors.push(`${label}.connector is required for connector sources`);
    if (!source.command) errors.push(`${label}.command is required for connector sources`);
  }

  if (source.type === 'search' && !source.query) {
    errors.push(`${label}.query is required for search sources`);
  }

  return errors;
}

function isValidDate(value) {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

export function getTimebox(request) {
  return {
    from: new Date(request.timebox.from),
    to: new Date(request.timebox.to)
  };
}
