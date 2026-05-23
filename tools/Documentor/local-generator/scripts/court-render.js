#!/usr/bin/env node
/**
 * Court-filing PDF renderer (deterministic, Chromium engine).
 *
 * Renders a court-compliant PDF by combining:
 *   --caption  caption.json   structured case data (court, parties, case no,
 *                             division, title, signer, service block)
 *   --body     body.md        the substantive motion text (markdown)
 *   --out      motion.pdf     output path
 *
 * Layout (caption table, margins, fonts, page numbers) is owned by this
 * renderer, never by the model. Same inputs produce the same PDF. This is
 * the Production layer for Pro Se Lawyer; the body holds content, the
 * caption JSON holds the fixed structural elements.
 *
 * Jurisdiction profile is Colorado district court (C.R.C.P. 10 caption form).
 */

import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve as pathResolve } from 'path';

const { marked } = await import('marked');
const { chromium } = await import('playwright');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lines(arr) {
  return (arr || []).map(l => `<div>${escapeHtml(l)}</div>`).join('');
}

/**
 * Build the Colorado two-column caption table from structured data.
 * Left column: court + parties. Right column: COURT USE ONLY box, then
 * case number and division.
 */
function captionTable(c) {
  const parties = (c.parties || []).map((p, i, all) => {
    const sep = (p.role === 'Defendant' && i > 0) ? '<div class="vs">v.</div>' : '';
    return `${sep}<div class="party"><span class="role">${escapeHtml(p.role)}:</span> ${escapeHtml(p.name)}</div>`;
  }).join('');
  return `
  <table class="caption">
    <tr>
      <td class="cap-left">
        <div class="court-name">${escapeHtml(c.court)}</div>
        <div class="court-addr">${escapeHtml(c.court_address || '')}</div>
        <div class="parties">${parties}</div>
      </td>
      <td class="cap-right">
        <div class="court-use">&#9650; COURT USE ONLY &#9650;</div>
        <div class="case-meta">
          <div><strong>Case Number:</strong> ${escapeHtml(c.case_number)}</div>
          <div><strong>Division:</strong> ${escapeHtml(c.division)}</div>
        </div>
      </td>
    </tr>
  </table>`;
}

function signatureBlock(s) {
  if (!s) return '';
  return `
  <div class="closing">
    <p>Respectfully submitted,</p>
    <p>Date: ____________________</p>
    <div class="sig-line">_____________________________</div>
    <div class="sig-name">${escapeHtml(s.name)}, ${escapeHtml(s.role || '')}</div>
    ${lines(s.lines)}
  </div>`;
}

function certificateOfService(svc, title) {
  if (!svc) return '';
  const recips = (svc.recipients || []).map(r =>
    `<div class="recipient">${escapeHtml(r.name)} (${(r.emails || []).map(escapeHtml).join('; ')})</div>`
  ).join('');
  const firm = svc.firm ? `<div>${escapeHtml(svc.firm)}</div>` : '';
  const firmLines = lines(svc.firm_lines);
  const firmNote = svc.firm_note ? `<div class="firm-note"><em>${escapeHtml(svc.firm_note)}</em></div>` : '';
  return `
  <div class="cert">
    <h2 class="cert-title">CERTIFICATE OF SERVICE</h2>
    <p>I certify that on this ____ day of __________, 2026, a true and correct copy of the foregoing
    ${escapeHtml(title)} was served by ${escapeHtml(svc.method || 'email')} to:</p>
    <div class="service-list">
      ${recips}
      ${firm}${firmLines}${firmNote}
    </div>
    <div class="sig-line">_____________________________</div>
    <div class="sig-name">${escapeHtml((svc.served_by) || '')}</div>
  </div>`;
}

const COURT_CSS = `
  @page { size: Letter; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; }

  table.caption { width: 100%; border-collapse: collapse; border: 1.5pt solid #000; margin-bottom: 18pt; }
  table.caption td { vertical-align: top; padding: 8pt 10pt; }
  td.cap-left { width: 62%; border-right: 1.5pt solid #000; }
  td.cap-right { width: 38%; }
  .court-name { font-weight: bold; text-transform: uppercase; }
  .court-addr { margin-bottom: 12pt; }
  .party { margin: 2pt 0; }
  .party .role { font-weight: bold; }
  .vs { margin: 6pt 0; }
  .court-use { border: 1.25pt solid #000; text-align: center; font-weight: bold; padding: 10pt 4pt; margin-bottom: 10pt; }
  .case-meta div { margin: 2pt 0; }

  .doc-title { text-align: center; font-weight: bold; text-transform: uppercase; line-height: 1.3; margin: 6pt 0 18pt 0; }

  .body p { line-height: 2; margin: 0 0 6pt 0; text-align: left; }
  .body h2 { font-size: 12pt; font-weight: bold; line-height: 1.4; margin: 14pt 0 6pt 0; }
  .body h3 { font-size: 12pt; font-weight: bold; font-style: italic; margin: 10pt 0 4pt 0; }
  .body ol, .body ul { line-height: 2; margin: 0 0 6pt 0; padding-left: 36pt; }
  .body em { font-style: italic; }
  .body strong { font-weight: bold; }

  .closing { margin-top: 18pt; line-height: 1.4; }
  .closing p { margin: 12pt 0; }
  .sig-line { margin-top: 18pt; }
  .sig-name { font-weight: bold; }

  .cert { margin-top: 24pt; line-height: 1.4; }
  .cert-title { text-align: center; font-weight: bold; font-size: 12pt; margin: 12pt 0; }
  .cert p { line-height: 1.5; }
  .service-list { margin: 8pt 0 18pt 24pt; }
  .recipient { margin: 2pt 0; }
  .firm-note { margin-top: 2pt; }
`;

function buildHtml(caption, bodyMd) {
  const bodyHtml = marked.parse(bodyMd);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${COURT_CSS}</style></head>
<body>
  ${captionTable(caption)}
  <div class="doc-title">${escapeHtml(caption.title)}</div>
  <div class="body">${bodyHtml}</div>
  ${signatureBlock(caption.signer)}
  ${certificateOfService(caption.service, caption.title)}
</body></html>`;
}

async function renderPdf(html, outputPath) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: true,
      // 1-inch margins all around; bottom leaves room for the page-number footer.
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="width:100%; font-size:10pt; font-family:'Times New Roman',serif; text-align:center; margin: 0 1in;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    });
  } finally {
    await browser.close();
  }
}

// CLI
const args = process.argv.slice(2);
function opt(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }

const captionPath = opt('--caption');
const bodyPath = opt('--body');
const outPath = opt('--out');

if (!captionPath || !bodyPath || !outPath) {
  console.error('Usage: node court-render.js --caption caption.json --body body.md --out motion.pdf');
  process.exit(1);
}

const caption = JSON.parse(readFileSync(pathResolve(captionPath), 'utf-8'));
const bodyMd = readFileSync(pathResolve(bodyPath), 'utf-8');

const outDir = dirname(pathResolve(outPath));
if (outDir && !existsSync(outDir)) mkdirSync(outDir, { recursive: true });

await renderPdf(buildHtml(caption, bodyMd), pathResolve(outPath));
console.log(`Created: ${outPath}`);
