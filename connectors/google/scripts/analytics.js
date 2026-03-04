#!/usr/bin/env node
/**
 * Google Analytics (GA4) Operations
 * Admin, reporting, config, and realtime data via the Analytics Data and Admin APIs.
 *
 * Usage:
 *   node analytics.js list-summaries --account user@example.com
 *   node analytics.js run --property PROPERTY_ID --dimensions date --metrics sessions
 *   node analytics.js top-pages --property PROPERTY_ID --account user@example.com
 *   node analytics.js key-events list --property PROPERTY_ID
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi
} from './utils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeProperty(propertyId) {
  if (!propertyId) return null;
  return propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
}

function parseDateRange(start, end) {
  const presets = {
    '7d':        { startDate: '7daysAgo',   endDate: 'today' },
    '14d':       { startDate: '14daysAgo',  endDate: 'today' },
    '28d':       { startDate: '28daysAgo',  endDate: 'today' },
    '30d':       { startDate: '30daysAgo',  endDate: 'today' },
    '90d':       { startDate: '90daysAgo',  endDate: 'today' },
    '12m':       { startDate: '365daysAgo', endDate: 'today' },
    'yesterday': { startDate: 'yesterday',  endDate: 'yesterday' },
    'today':     { startDate: 'today',      endDate: 'today' }
  };
  if (start && presets[start]) return presets[start];
  return { startDate: start || '28daysAgo', endDate: end || 'today' };
}

function formatReportRows(data) {
  const dimHeaders = (data.dimensionHeaders || []).map(h => h.name);
  const metHeaders = (data.metricHeaders || []).map(h => h.name);
  return (data.rows || []).map(row => {
    const obj = {};
    (row.dimensionValues || []).forEach((val, i) => { obj[dimHeaders[i]] = val.value; });
    (row.metricValues  || []).forEach((val, i) => { obj[metHeaders[i]]  = val.value; });
    return obj;
  });
}

function getAdminApi(auth, version = 'v1beta') {
  return google.analyticsadmin({ version, auth });
}

function getDataApi(auth) {
  return google.analyticsdata({ version: 'v1beta', auth });
}

// ---------------------------------------------------------------------------
// Admin: accounts, properties, streams
// ---------------------------------------------------------------------------

async function listSummaries(auth) {
  const admin = getAdminApi(auth);
  const summaries = [];
  let pageToken;
  do {
    const res = await admin.accountSummaries.list({ pageSize: 200, pageToken });
    if (res.data.accountSummaries) summaries.push(...res.data.accountSummaries);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  if (summaries.length === 0) {
    console.log('No Google Analytics accounts found.');
    return;
  }

  output(summaries.map(account => ({
    account: account.account,
    displayName: account.displayName,
    properties: (account.propertySummaries || []).map(p => ({
      property: p.property,
      displayName: p.displayName,
      propertyType: p.propertyType || 'PROPERTY_TYPE_ORDINARY',
      parent: p.parent || null
    }))
  })));
}

async function listAccounts(auth) {
  const admin = getAdminApi(auth);
  const accounts = [];
  let pageToken;
  do {
    const res = await admin.accounts.list({ pageSize: 200, pageToken });
    if (res.data.accounts) accounts.push(...res.data.accounts);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  output(accounts);
}

async function listProperties(auth, accountId) {
  if (!accountId) throw new Error('--account-id is required. Use list-summaries to find account IDs.');
  const admin = getAdminApi(auth);
  const filter = accountId.startsWith('accounts/') ? `parent:${accountId}` : `parent:accounts/${accountId}`;
  const properties = [];
  let pageToken;
  do {
    const res = await admin.properties.list({ filter, pageSize: 200, pageToken });
    if (res.data.properties) properties.push(...res.data.properties);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  output(properties);
}

async function getProperty(auth, propertyId) {
  if (!propertyId) throw new Error('--property is required.');
  const admin = getAdminApi(auth);
  const res = await admin.properties.get({ name: normalizeProperty(propertyId) });
  output(res.data);
}

async function listStreams(auth, propertyId) {
  if (!propertyId) throw new Error('--property is required. Use list-summaries to find property IDs.');
  const admin = getAdminApi(auth);
  const streams = [];
  let pageToken;
  do {
    const res = await admin.properties.dataStreams.list({
      parent: normalizeProperty(propertyId),
      pageSize: 200,
      pageToken
    });
    if (res.data.dataStreams) streams.push(...res.data.dataStreams);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  output(streams);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

async function runReport(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  const data = getDataApi(auth);
  const dateRange = parseDateRange(flags.start || flags.range, flags.end);

  const dimensions = (flags.dimensions || 'date').split(',').map(d => ({ name: d.trim() }));
  const metrics    = (flags.metrics || 'activeUsers,sessions').split(',').map(m => ({ name: m.trim() }));

  const requestBody = {
    dateRanges: [dateRange],
    dimensions,
    metrics,
    limit:  parseInt(flags.limit  || '100', 10),
    offset: parseInt(flags.offset || '0',   10),
    keepEmptyRows: flags['keep-empty'] === true
  };

  // Dimension filter
  if (flags.filter) {
    const m = flags.filter.match(/^(\w+)\s*(=|!=|contains|starts_with|ends_with|regex)\s*(.+)$/i);
    if (m) {
      const [, fieldName, op, value] = m;
      const filterExpr = { fieldName };
      const opMap = {
        '=':           { matchType: 'EXACT',        value },
        'contains':    { matchType: 'CONTAINS',     value },
        'starts_with': { matchType: 'BEGINS_WITH',  value },
        'ends_with':   { matchType: 'ENDS_WITH',    value },
        'regex':       { matchType: 'FULL_REGEXP',  value }
      };
      if (op === '!=') {
        filterExpr.stringFilter = { matchType: 'EXACT', value };
        requestBody.dimensionFilter = { notExpression: { filter: filterExpr } };
      } else {
        filterExpr.stringFilter = opMap[op.toLowerCase()];
        requestBody.dimensionFilter = { filter: filterExpr };
      }
    }
  }

  // Metric filter
  if (flags['metric-filter']) {
    const m = flags['metric-filter'].match(/^(\w+)\s*(>|<|>=|<=|=)\s*(\d+)$/);
    if (m) {
      const [, fieldName, op, val] = m;
      const opMap = { '>': 'GREATER_THAN', '<': 'LESS_THAN', '>=': 'GREATER_THAN_OR_EQUAL', '<=': 'LESS_THAN_OR_EQUAL', '=': 'EQUAL' };
      requestBody.metricFilter = { filter: { fieldName, numericFilter: { operation: opMap[op], value: { int64Value: val } } } };
    }
  }

  // Order by
  if (flags['order-by']) {
    const isMetric = metrics.some(m => m.name === flags['order-by']);
    requestBody.orderBys = [{
      ...(isMetric ? { metric: { metricName: flags['order-by'] } } : { dimension: { dimensionName: flags['order-by'] } }),
      desc: flags.desc === true
    }];
  }

  // Compare date range
  if (flags.compare) {
    requestBody.dateRanges.push(parseDateRange(flags.compare));
  }

  const res = await data.properties.runReport({ property: normalizeProperty(propertyId), requestBody });

  if (flags.raw) {
    output(res.data);
  } else {
    const rows = formatReportRows(res.data);
    const result = { property: propertyId, dateRange: `${dateRange.startDate} to ${dateRange.endDate}`, rowCount: res.data.rowCount || 0, rows };
    if (res.data.totals?.length > 0) {
      result.totals = {};
      const metricHeaders = (res.data.metricHeaders || []).map(h => h.name);
      res.data.totals[0].metricValues.forEach((val, i) => { result.totals[metricHeaders[i]] = val.value; });
    }
    output(result);
  }
}

async function runRealtimeReport(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  const data = getDataApi(auth);

  const dimensions = (flags.dimensions || 'country').split(',').map(d => ({ name: d.trim() }));
  const metrics    = (flags.metrics || 'activeUsers').split(',').map(m => ({ name: m.trim() }));

  const requestBody = { dimensions, metrics, limit: parseInt(flags.limit || '50', 10) };
  if (flags.minutes) {
    const mins = parseInt(flags.minutes, 10);
    requestBody.minuteRanges = [{ startMinutesAgo: mins, endMinutesAgo: 0 }];
  }

  const res = await data.properties.runRealtimeReport({ property: normalizeProperty(propertyId), requestBody });

  if (flags.raw) {
    output(res.data);
  } else {
    output({ property: propertyId, type: 'realtime', rowCount: res.data.rowCount || 0, rows: formatReportRows(res.data) });
  }
}

async function runPivotReport(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  if (!flags['pivot-dimension']) throw new Error('--pivot-dimension is required.');
  const data = getDataApi(auth);

  const dateRange      = parseDateRange(flags.start || flags.range, flags.end);
  const dimensions     = (flags.dimensions || 'date').split(',').map(d => ({ name: d.trim() }));
  const metrics        = (flags.metrics || 'activeUsers').split(',').map(m => ({ name: m.trim() }));
  const pivotDimensions = flags['pivot-dimension'].split(',').map(d => ({ name: d.trim() }));

  const res = await data.properties.runPivotReport({
    property: normalizeProperty(propertyId),
    requestBody: {
      dateRanges: [dateRange],
      dimensions: [...dimensions, ...pivotDimensions],
      metrics,
      pivots: [
        { fieldNames: dimensions.map(d => d.name),      limit: parseInt(flags.limit || '50', 10) },
        { fieldNames: pivotDimensions.map(d => d.name), limit: parseInt(flags['pivot-limit'] || '10', 10) }
      ]
    }
  });

  output(flags.raw ? res.data : formatReportRows(res.data));
}

async function runBatchReports(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  if (!flags.reports) throw new Error('--reports is required. Provide a JSON file path or inline JSON array.');
  const data = getDataApi(auth);

  let requests;
  try {
    requests = JSON.parse(flags.reports);
  } catch {
    const { readFileSync } = await import('fs');
    requests = JSON.parse(readFileSync(flags.reports, 'utf-8'));
  }

  if (!Array.isArray(requests) || requests.length === 0) throw new Error('Reports must be a non-empty JSON array.');
  if (requests.length > 5) throw new Error('Maximum 5 reports per batch.');

  const res = await data.properties.batchRunReports({ property: normalizeProperty(propertyId), requestBody: { requests } });

  if (flags.raw) {
    output(res.data);
  } else {
    output((res.data.reports || []).map((report, i) => ({ reportIndex: i, rowCount: report.rowCount || 0, rows: formatReportRows(report) })));
  }
}

async function getMetadata(auth, propertyId, flags) {
  const data = getDataApi(auth);
  const property = propertyId ? normalizeProperty(propertyId) : 'properties/0';
  const res = await data.properties.getMetadata({ name: `${property}/metadata` });

  const search = flags.search ? flags.search.toLowerCase() : null;
  const type   = flags.type;
  const result = {};

  if (!type || type === 'dimensions') {
    let dims = res.data.dimensions || [];
    if (search) dims = dims.filter(d => d.apiName.toLowerCase().includes(search) || (d.uiName || '').toLowerCase().includes(search) || (d.description || '').toLowerCase().includes(search));
    result.dimensions = dims.map(d => ({ apiName: d.apiName, uiName: d.uiName, description: d.description, category: d.category }));
  }

  if (!type || type === 'metrics') {
    let mets = res.data.metrics || [];
    if (search) mets = mets.filter(m => m.apiName.toLowerCase().includes(search) || (m.uiName || '').toLowerCase().includes(search) || (m.description || '').toLowerCase().includes(search));
    result.metrics = mets.map(m => ({ apiName: m.apiName, uiName: m.uiName, description: m.description, category: m.category, type: m.type }));
  }

  if (search) {
    result.searchTerm = search;
    result.matchCount = (result.dimensions || []).length + (result.metrics || []).length;
  }

  output(result);
}

async function checkCompatibility(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  const data = getDataApi(auth);
  const requestBody = {};
  if (flags.dimensions) requestBody.dimensions = flags.dimensions.split(',').map(d => ({ name: d.trim() }));
  if (flags.metrics)    requestBody.metrics    = flags.metrics.split(',').map(m => ({ name: m.trim() }));
  const res = await data.properties.checkCompatibility({ property: normalizeProperty(propertyId), requestBody });
  output(res.data);
}

// ---------------------------------------------------------------------------
// Convenience report shortcuts
// ---------------------------------------------------------------------------

async function topPages(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  const data = getDataApi(auth);
  const res = await data.properties.runReport({
    property: normalizeProperty(propertyId),
    requestBody: {
      dateRanges: [parseDateRange(flags.start || flags.range, flags.end)],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: parseInt(flags.limit || '25', 10)
    }
  });
  const rows = (res.data.rows || []).map(row => ({
    path:               row.dimensionValues[0]?.value,
    title:              row.dimensionValues[1]?.value,
    pageViews:          parseInt(row.metricValues[0]?.value || '0'),
    activeUsers:        parseInt(row.metricValues[1]?.value || '0'),
    avgSessionDuration: parseFloat(row.metricValues[2]?.value || '0').toFixed(1),
    bounceRate:         (parseFloat(row.metricValues[3]?.value || '0') * 100).toFixed(1) + '%'
  }));
  if (flags.json) {
    output(rows);
  } else {
    console.log(`\nTop Pages (${flags.start || flags.range || 'last 28 days'}):\n`);
    for (const p of rows) {
      console.log(`  ${p.pageViews.toLocaleString()} views  ${p.path}`);
      console.log(`    Title: ${p.title}`);
      console.log(`    Users: ${p.activeUsers.toLocaleString()}  Avg time: ${p.avgSessionDuration}s  Bounce: ${p.bounceRate}`);
      console.log('');
    }
  }
}

async function topSources(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  const data = getDataApi(auth);
  const res = await data.properties.runReport({
    property: normalizeProperty(propertyId),
    requestBody: {
      dateRanges: [parseDateRange(flags.start || flags.range, flags.end)],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: parseInt(flags.limit || '25', 10)
    }
  });
  const rows = (res.data.rows || []).map(row => ({
    source:      row.dimensionValues[0]?.value,
    medium:      row.dimensionValues[1]?.value,
    sessions:    parseInt(row.metricValues[0]?.value || '0'),
    activeUsers: parseInt(row.metricValues[1]?.value || '0'),
    conversions: parseInt(row.metricValues[2]?.value || '0'),
    bounceRate:  (parseFloat(row.metricValues[3]?.value || '0') * 100).toFixed(1) + '%'
  }));
  if (flags.json) {
    output(rows);
  } else {
    console.log(`\nTop Traffic Sources (${flags.start || flags.range || 'last 28 days'}):\n`);
    for (const s of rows) {
      console.log(`  ${s.sessions.toLocaleString()} sessions  ${s.source} / ${s.medium}`);
      console.log(`    Users: ${s.activeUsers.toLocaleString()}  Conversions: ${s.conversions}  Bounce: ${s.bounceRate}`);
      console.log('');
    }
  }
}

async function audienceOverview(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  const data = getDataApi(auth);
  const res = await data.properties.runReport({
    property: normalizeProperty(propertyId),
    requestBody: {
      dateRanges: [parseDateRange(flags.start || flags.range, flags.end)],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' },
        { name: 'screenPageViews' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    }
  });
  const rows = (res.data.rows || []).map(row => ({
    date:               row.dimensionValues[0]?.value,
    activeUsers:        parseInt(row.metricValues[0]?.value || '0'),
    newUsers:           parseInt(row.metricValues[1]?.value || '0'),
    sessions:           parseInt(row.metricValues[2]?.value || '0'),
    pageViews:          parseInt(row.metricValues[3]?.value || '0'),
    avgSessionDuration: parseFloat(row.metricValues[4]?.value || '0').toFixed(1),
    bounceRate:         (parseFloat(row.metricValues[5]?.value || '0') * 100).toFixed(1) + '%'
  }));
  if (flags.json) {
    output(rows);
  } else {
    const totals = rows.reduce((acc, r) => { acc.sessions += r.sessions; acc.activeUsers += r.activeUsers; acc.newUsers += r.newUsers; acc.pageViews += r.pageViews; return acc; }, { sessions: 0, activeUsers: 0, newUsers: 0, pageViews: 0 });
    console.log(`\nAudience Overview (${flags.start || flags.range || '28daysAgo'} to ${flags.end || 'today'}):\n`);
    console.log(`  Sessions:     ${totals.sessions.toLocaleString()}`);
    console.log(`  Active Users: ${totals.activeUsers.toLocaleString()}`);
    console.log(`  New Users:    ${totals.newUsers.toLocaleString()}`);
    console.log(`  Page Views:   ${totals.pageViews.toLocaleString()}`);
    console.log('');
    if (flags.daily) {
      console.log('Daily breakdown:');
      for (const r of rows) {
        console.log(`  ${r.date}  sessions:${r.sessions}  users:${r.activeUsers}  views:${r.pageViews}`);
      }
    }
  }
}

async function conversionsReport(auth, propertyId, flags) {
  if (!propertyId) throw new Error('--property is required.');
  const data = getDataApi(auth);
  const res = await data.properties.runReport({
    property: normalizeProperty(propertyId),
    requestBody: {
      dateRanges: [parseDateRange(flags.start || flags.range, flags.end)],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'conversions' }, { name: 'totalRevenue' }],
      orderBys: [{ metric: { metricName: 'conversions' }, desc: true }],
      limit: parseInt(flags.limit || '25', 10)
    }
  });
  const rows = (res.data.rows || []).map(row => ({
    event:       row.dimensionValues[0]?.value,
    conversions: parseInt(row.metricValues[0]?.value || '0'),
    revenue:     parseFloat(row.metricValues[1]?.value || '0').toFixed(2)
  }));
  if (flags.json) {
    output(rows);
  } else {
    console.log(`\nConversions (${flags.start || flags.range || 'last 28 days'}):\n`);
    for (const c of rows) {
      console.log(`  ${c.conversions.toLocaleString()}  ${c.event}  (revenue: $${c.revenue})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Config: key events, custom dimensions/metrics, audiences
// ---------------------------------------------------------------------------

async function keyEventsList(auth, propertyId) {
  const admin = getAdminApi(auth);
  const events = [];
  let pageToken;
  do {
    const res = await admin.properties.keyEvents.list({ parent: normalizeProperty(propertyId), pageSize: 200, pageToken });
    if (res.data.keyEvents) events.push(...res.data.keyEvents);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  output(events);
}

async function keyEventsCreate(auth, propertyId, flags) {
  if (!flags['event-name']) throw new Error('--event-name is required.');
  const admin = getAdminApi(auth);
  const requestBody = {
    eventName: flags['event-name'],
    countingMethod: flags['counting-method'] || 'ONCE_PER_EVENT'
  };
  if (flags['default-value']) {
    const parts = flags['default-value'].split(':');
    requestBody.defaultValue = { numericValue: parseFloat(parts[0]), currencyCode: parts[1] || 'USD' };
  }
  const res = await admin.properties.keyEvents.create({ parent: normalizeProperty(propertyId), requestBody });
  console.log('Key event created.');
  output(res.data);
}

async function keyEventsDelete(auth, propertyId, keyEventId) {
  if (!keyEventId) throw new Error('Key event ID is required as second argument.');
  const admin = getAdminApi(auth);
  const name = keyEventId.includes('/') ? keyEventId : `${normalizeProperty(propertyId)}/keyEvents/${keyEventId}`;
  await admin.properties.keyEvents.delete({ name });
  console.log('Key event deleted.');
}

async function customDimensionsList(auth, propertyId) {
  const admin = getAdminApi(auth);
  const dims = [];
  let pageToken;
  do {
    const res = await admin.properties.customDimensions.list({ parent: normalizeProperty(propertyId), pageSize: 200, pageToken });
    if (res.data.customDimensions) dims.push(...res.data.customDimensions);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  output(dims);
}

async function customDimensionsCreate(auth, propertyId, flags) {
  if (!flags['parameter-name'] || !flags['display-name']) throw new Error('--parameter-name and --display-name are required.');
  const admin = getAdminApi(auth);
  const res = await admin.properties.customDimensions.create({
    parent: normalizeProperty(propertyId),
    requestBody: {
      parameterName: flags['parameter-name'],
      displayName:   flags['display-name'],
      scope:         (flags.scope || 'EVENT').toUpperCase(),
      description:   flags.description || ''
    }
  });
  console.log('Custom dimension created.');
  output(res.data);
}

async function customDimensionsArchive(auth, propertyId, dimensionId) {
  if (!dimensionId) throw new Error('Custom dimension resource name is required as second argument.');
  const admin = getAdminApi(auth);
  const name = dimensionId.includes('/') ? dimensionId : `${normalizeProperty(propertyId)}/customDimensions/${dimensionId}`;
  await admin.properties.customDimensions.archive({ name, requestBody: {} });
  console.log('Custom dimension archived.');
}

async function customMetricsList(auth, propertyId) {
  const admin = getAdminApi(auth);
  const metrics = [];
  let pageToken;
  do {
    const res = await admin.properties.customMetrics.list({ parent: normalizeProperty(propertyId), pageSize: 200, pageToken });
    if (res.data.customMetrics) metrics.push(...res.data.customMetrics);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  output(metrics);
}

async function customMetricsCreate(auth, propertyId, flags) {
  if (!flags['parameter-name'] || !flags['display-name']) throw new Error('--parameter-name and --display-name are required.');
  const admin = getAdminApi(auth);
  const res = await admin.properties.customMetrics.create({
    parent: normalizeProperty(propertyId),
    requestBody: {
      parameterName:   flags['parameter-name'],
      displayName:     flags['display-name'],
      scope:           (flags.scope || 'EVENT').toUpperCase(),
      measurementUnit: (flags.unit || 'STANDARD').toUpperCase(),
      description:     flags.description || ''
    }
  });
  console.log('Custom metric created.');
  output(res.data);
}

async function customMetricsArchive(auth, propertyId, metricId) {
  if (!metricId) throw new Error('Custom metric resource name is required as second argument.');
  const admin = getAdminApi(auth);
  const name = metricId.includes('/') ? metricId : `${normalizeProperty(propertyId)}/customMetrics/${metricId}`;
  await admin.properties.customMetrics.archive({ name, requestBody: {} });
  console.log('Custom metric archived.');
}

async function audiencesList(auth, propertyId) {
  // Audiences require v1alpha
  const admin = google.analyticsadmin({ version: 'v1alpha', auth });
  const audiences = [];
  let pageToken;
  do {
    const res = await admin.properties.audiences.list({ parent: normalizeProperty(propertyId), pageSize: 200, pageToken });
    if (res.data.audiences) audiences.push(...res.data.audiences);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  output(audiences);
}

async function audiencesGet(auth, propertyId, audienceId) {
  if (!audienceId) throw new Error('Audience ID is required as second argument.');
  const admin = google.analyticsadmin({ version: 'v1alpha', auth });
  const name = audienceId.includes('/') ? audienceId : `${normalizeProperty(propertyId)}/audiences/${audienceId}`;
  const res = await admin.properties.audiences.get({ name });
  output(res.data);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  showHelp('Google Analytics (GA4) Operations', {
    'Admin Commands': [
      'list-summaries              Overview of all accounts and properties (start here)',
      'list-accounts               List all analytics accounts',
      'list-properties             List properties for an account (requires --account-id)',
      'get-property                Get detailed info for a property',
      'list-streams                List data streams for a property'
    ],
    'Reporting Commands': [
      'run                         Run a custom report with full filter/sort/pagination support',
      'realtime                    Live data: active users right now (last 30 min)',
      'pivot                       Run a pivot report',
      'batch                       Run up to 5 reports in one API call',
      'metadata                    List available dimensions and metrics',
      'compatibility               Check if dimensions/metrics can be used together'
    ],
    'Shortcut Commands': [
      'top-pages                   Top pages by page views',
      'top-sources                 Top traffic sources',
      'overview                    Daily audience summary (users, sessions, engagement)',
      'conversions                 Conversion events with revenue'
    ],
    'Config Commands (format: RESOURCE ACTION)': [
      'key-events list             List key events (conversion events)',
      'key-events create           Create a key event',
      'key-events delete <id>      Delete a key event',
      'custom-dimensions list      List custom dimensions',
      'custom-dimensions create    Create a custom dimension',
      'custom-dimensions archive <name>  Archive a custom dimension',
      'custom-metrics list         List custom metrics',
      'custom-metrics create       Create a custom metric',
      'custom-metrics archive <name>  Archive a custom metric',
      'audiences list              List all audiences',
      'audiences get <id>          Get audience details'
    ],
    'Core Options': [
      '--account EMAIL             Google account email (required)',
      '--property ID               GA4 property ID, e.g. 123456789',
      '--account-id ID             Analytics account ID (for list-properties)'
    ],
    'Report Options (run, realtime, pivot, batch)': [
      '--dimensions dim1,dim2      Comma-separated dimensions (default: date)',
      '--metrics met1,met2         Comma-separated metrics (default: activeUsers,sessions)',
      '--start DATE                Start date: YYYY-MM-DD or 7d, 28d, 90d, 12m, yesterday',
      '--end DATE                  End date: YYYY-MM-DD (default: today)',
      '--range PRESET              Shorthand: 7d, 14d, 28d, 30d, 90d, 12m, yesterday, today',
      '--limit N                   Max rows (default: 100)',
      '--offset N                  Row offset for pagination (default: 0)',
      '--filter EXPR               Dimension filter: "pagePath contains /blog"',
      '--metric-filter EXPR        Metric filter: "activeUsers > 100"',
      '--order-by FIELD            Sort by dimension or metric name',
      '--desc                      Sort descending (use with --order-by)',
      '--compare RANGE             Add a second date range for comparison',
      '--minutes N                 Minutes to look back for realtime (default: 30)',
      '--pivot-dimension dim       Pivot dimension (required for pivot command)',
      '--pivot-limit N             Max pivot values (default: 10)',
      '--reports JSON              JSON array of report objects or path to JSON file (for batch)',
      '--raw                       Output raw API response',
      '--json                      Force JSON output for shortcut commands'
    ],
    'Key Event Options': [
      '--event-name NAME           Event name (required for create)',
      '--counting-method METHOD    ONCE_PER_EVENT (default) or ONCE_PER_SESSION',
      '--default-value VAL:CUR     Default value, e.g. "10:USD"'
    ],
    'Custom Definition Options': [
      '--parameter-name NAME       Parameter name (required for create)',
      '--display-name NAME         Display name (required for create)',
      '--scope SCOPE               EVENT (default), USER, or ITEM',
      '--unit UNIT                 STANDARD (default), CURRENCY, FEET, METERS, etc.',
      '--description TEXT          Description'
    ],
    'Common Report Examples': [
      'node analytics.js list-summaries --account user@example.com',
      'node analytics.js run --property 123456789 --range 7d --account user@example.com',
      'node analytics.js run --property 123456789 --dimensions pagePath --metrics screenPageViews --order-by screenPageViews --desc --account user@example.com',
      'node analytics.js run --property 123456789 --dimensions sessionSource,sessionMedium --metrics sessions --account user@example.com',
      'node analytics.js run --property 123456789 --filter "pagePath contains /blog" --range 28d --account user@example.com',
      'node analytics.js run --property 123456789 --metric-filter "sessions > 50" --account user@example.com',
      'node analytics.js realtime --property 123456789 --dimensions city --metrics activeUsers --account user@example.com',
      'node analytics.js top-pages --property 123456789 --range 28d --account user@example.com',
      'node analytics.js metadata --property 123456789 --search "page" --account user@example.com',
      'node analytics.js key-events list --property 123456789 --account user@example.com',
      'node analytics.js audiences list --property 123456789 --account user@example.com'
    ]
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const firstArg = rawArgs[0] || 'help';

  if (firstArg === 'help' || rawArgs.length === 0) {
    printHelp();
    return;
  }

  // Config commands use "RESOURCE ACTION" syntax (two-word commands)
  const configResources = ['key-events', 'custom-dimensions', 'custom-metrics', 'audiences'];
  const isConfigCommand = configResources.includes(firstArg);

  let command, action, positional, flags;

  if (isConfigCommand) {
    // Parse: resource action [positional...] [--flags]
    command  = firstArg;
    action   = rawArgs[1] || 'list';
    const remaining = rawArgs.slice(2);
    flags    = {};
    positional = [];
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].startsWith('--')) {
        const key = remaining[i].slice(2);
        const next = remaining[i + 1];
        if (next && !next.startsWith('--')) { flags[key] = next; i++; }
        else flags[key] = true;
      } else {
        positional.push(remaining[i]);
      }
    }
  } else {
    const parsed = parseArgs();
    command    = parsed.command;
    flags      = parsed.flags;
    positional = parsed.args;
    action     = null;
  }

  if (command === 'help') { printHelp(); return; }

  const email = flags.account;
  if (!email) {
    console.error('Error: --account is required');
    process.exit(1);
  }

  if (!isConfigCommand) {
    requireApi(email, 'analytics', 'analytics.js');
  }

  try {
    const auth = await getAuthClient(email);
    const propertyId = flags.property;

    switch (command) {
      // --- Admin ---
      case 'list-summaries':
        await listSummaries(auth);
        break;
      case 'list-accounts':
        await listAccounts(auth);
        break;
      case 'list-properties':
        await listProperties(auth, flags['account-id']);
        break;
      case 'get-property':
        await getProperty(auth, propertyId);
        break;
      case 'list-streams':
        await listStreams(auth, propertyId);
        break;

      // --- Reporting ---
      case 'run':
        await runReport(auth, propertyId, flags);
        break;
      case 'realtime':
        await runRealtimeReport(auth, propertyId, flags);
        break;
      case 'pivot':
        await runPivotReport(auth, propertyId, flags);
        break;
      case 'batch':
        await runBatchReports(auth, propertyId, flags);
        break;
      case 'metadata':
        await getMetadata(auth, propertyId, flags);
        break;
      case 'compatibility':
        await checkCompatibility(auth, propertyId, flags);
        break;

      // --- Shortcuts ---
      case 'top-pages':
        await topPages(auth, propertyId, flags);
        break;
      case 'top-sources':
        await topSources(auth, propertyId, flags);
        break;
      case 'overview':
        await audienceOverview(auth, propertyId, flags);
        break;
      case 'conversions':
        await conversionsReport(auth, propertyId, flags);
        break;

      // --- Config ---
      case 'key-events':
        if (!propertyId) throw new Error('--property is required.');
        if (action === 'list')        await keyEventsList(auth, propertyId);
        else if (action === 'create') await keyEventsCreate(auth, propertyId, flags);
        else if (action === 'delete') await keyEventsDelete(auth, propertyId, positional[0]);
        else { console.error(`Unknown action: ${action}`); printHelp(); process.exit(1); }
        break;
      case 'custom-dimensions':
        if (!propertyId) throw new Error('--property is required.');
        if (action === 'list')          await customDimensionsList(auth, propertyId);
        else if (action === 'create')   await customDimensionsCreate(auth, propertyId, flags);
        else if (action === 'archive')  await customDimensionsArchive(auth, propertyId, positional[0]);
        else { console.error(`Unknown action: ${action}`); printHelp(); process.exit(1); }
        break;
      case 'custom-metrics':
        if (!propertyId) throw new Error('--property is required.');
        if (action === 'list')          await customMetricsList(auth, propertyId);
        else if (action === 'create')   await customMetricsCreate(auth, propertyId, flags);
        else if (action === 'archive')  await customMetricsArchive(auth, propertyId, positional[0]);
        else { console.error(`Unknown action: ${action}`); printHelp(); process.exit(1); }
        break;
      case 'audiences':
        if (!propertyId) throw new Error('--property is required.');
        if (action === 'list')      await audiencesList(auth, propertyId);
        else if (action === 'get')  await audiencesGet(auth, propertyId, positional[0]);
        else { console.error(`Unknown action: ${action}`); printHelp(); process.exit(1); }
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
