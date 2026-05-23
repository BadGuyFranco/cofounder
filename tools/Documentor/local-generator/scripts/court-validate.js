#!/usr/bin/env node
/**
 * Court-filing PDF validator (pre-filing gate).
 *
 * Asserts the mechanical requirements of a court filing against the rendered
 * PDF, driven by the same caption.json used to render it. Pass/fail per check.
 *
 *   node court-validate.js --pdf motion.pdf --caption caption.json [--max-pages N]
 *
 * Checks: PDF parses; page count (and optional limit); the exact case number,
 * document title, each service email, signer name, the COURT USE ONLY caption
 * marker, and a CERTIFICATE OF SERVICE block all appear in the rendered text.
 *
 * Known limit: text-token + page-count level. It does not yet verify embedded
 * fonts or exact margin geometry (needs pdf-lib); flagged for a later pass.
 */

import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { readFileSync } from 'fs';
import { resolve as pathResolve } from 'path';

const pdfParse = await import('pdf-parse').then(m => m.default || m);

const args = process.argv.slice(2);
function opt(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }

const pdfPath = opt('--pdf');
const captionPath = opt('--caption');
const maxPages = opt('--max-pages') ? parseInt(opt('--max-pages'), 10) : null;

if (!pdfPath || !captionPath) {
  console.error('Usage: node court-validate.js --pdf motion.pdf --caption caption.json [--max-pages N]');
  process.exit(1);
}

const caption = JSON.parse(readFileSync(pathResolve(captionPath), 'utf-8'));
const data = await pdfParse(readFileSync(pathResolve(pdfPath)));
const text = data.text.replace(/\s+/g, ' ');

const checks = [];
function check(label, pass, detail = '') { checks.push({ label, pass, detail }); }

check('PDF parses', !!data.text, `${data.numpages} page(s)`);
if (maxPages !== null) check(`Within page limit (${maxPages})`, data.numpages <= maxPages, `${data.numpages} pages`);
check('Case number present', text.includes(caption.case_number), caption.case_number);
check('Document title present', text.includes(caption.title.replace(/\s+/g, ' ')), caption.title);
check('COURT USE ONLY caption marker', /COURT USE ONLY/i.test(text));
check('Certificate of service present', /CERTIFICATE OF SERVICE/i.test(text));
if (caption.signer) check('Signer name present', text.includes(caption.signer.name), caption.signer.name);
for (const r of (caption.service?.recipients || [])) {
  for (const email of (r.emails || [])) {
    check(`Service email present: ${email}`, text.includes(email));
  }
}

let allPass = true;
for (const c of checks) {
  if (!c.pass) allPass = false;
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.label}${c.detail ? `  (${c.detail})` : ''}`);
}
console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'VALIDATION FAILED'}`);
process.exit(allPass ? 0 : 1);
