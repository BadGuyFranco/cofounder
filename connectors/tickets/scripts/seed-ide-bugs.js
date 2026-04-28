/**
 * Seed script: file initial CoBuilder HQ tickets from the IDE bugs session (2026-03-26).
 *
 * Skipped:
 * - Bug #8: re-homed to [IDE-POLISH] (not a bug, investigation item)
 * - Bug #12: re-homed to [BROWSER] priority (separate initiative)
 *
 * Status overrides from session 230 [IDE-CHAT-FIX]:
 * - Bug #4: closed (not a bug — expected Clerk behavior)
 * - Bug #5: resolved (fixed in session 230, commit f423e2a)
 * - Bug #6: resolved (fixed in session 230, commit f423e2a)
 * - Bug #9: resolved (fixed in session 230, commit f423e2a)
 * - Bug #15: resolved (fixed in [TICKETING] Phase 1)
 *
 * Usage: node scripts/seed-ide-bugs.js [--target local|staging]
 */

import { loadConfig, apiRequest, parseArgs } from './utils.js';

const TICKETS = [
  {
    title: 'Workspace files take several seconds to load on cold start with no loading state',
    description: 'On cold start, the file explorer is visible but completely empty for a noticeable period (multiple seconds). No spinner, skeleton, or "Loading workspace..." message. The app looks broken until files eventually populate. Two-part issue: (a) no loading indicator in the explorer during initial fetch, (b) the cold-start fetch itself may be slower than necessary.',
    component: 'ide',
    severity: 'high',
    type: 'bug',
    tags: ['ide-bugs-session', 'explorer'],
    context: { packages: ['cobuilder-ide'], files: ['cobuilder-ide/src/renderer/src/components/FileExplorer.tsx'] },
  },
  {
    title: 'System tray icon renders as empty/blank box instead of CB Mark',
    description: 'The system tray icon is a blank or empty square. Should display the CB Mark directly (not the reversed-out version — just the CB Mark).',
    component: 'ide',
    severity: 'medium',
    type: 'bug',
    tags: ['ide-bugs-session', 'shell'],
    context: { packages: ['cobuilder-ide'], files: ['cobuilder-ide/src/main/index.ts'], dependencies: ['design-system/logos/'] },
  },
  {
    title: 'Dock/taskbar icon is Electron default and window title reads "Electron"',
    description: 'The app icon in the dock/taskbar is the default Electron icon, and the window title shows "Electron" not "CoBuilder." Likely: missing or misconfigured icon in electron-builder config and/or BrowserWindow options, plus the app name field still defaulting.',
    component: 'ide',
    severity: 'high',
    type: 'bug',
    tags: ['ide-bugs-session', 'shell'],
    context: { packages: ['cobuilder-ide'], files: ['cobuilder-ide/electron-builder.yml', 'cobuilder-ide/src/main/index.ts', 'cobuilder-ide/package.json'], dependencies: ['design-system/logos/'] },
  },
  {
    title: 'Clerk token refresh every ~20 seconds — confirmed expected Clerk behavior',
    description: 'The Clerk token refresh endpoint is called approximately every 20 seconds. JWT has 60-second lifetime. Investigated: this is expected Clerk SDK proactive refresh behavior, not a flood regression. Closed as not a bug.',
    component: 'ide',
    severity: 'medium',
    type: 'bug',
    status: 'closed',
    tags: ['ide-bugs-session', 'auth', 'not-a-bug'],
    context: { packages: ['cobuilder-ide'], files: ['cobuilder-ide/src/renderer/src/providers/'], adrs: ['CLERK-POLL archive'] },
  },
  {
    title: 'Chat response renders correct answer then replaced by "Edit applied"',
    description: 'When asking a simple question (e.g., "Return 2+2"), the chat shows a thinking indicator, then briefly displays the correct answer ("4"), then the answer disappears and is replaced with "Edit applied" text. Root cause: JSON.parse("4") succeeds on bare literals, normaliseParsed defaults explanation to "Edit applied.", IDE onResult clobbers streamed content. Fixed in session 230 (commit f423e2a): guard typeof === "object" && !Array.isArray after every JSON.parse in parseResponse + extractJson. IDE: hasFileEdit flag preserves streamed content.',
    component: 'ide',
    severity: 'critical',
    type: 'bug',
    status: 'resolved',
    tags: ['ide-bugs-session', 'chat', 'ide-chat-fix'],
    context: { packages: ['cobuilder-ide', 'smart-layer', 'server'], files: ['cobuilder-ide/src/renderer/src/components/chat/', 'cobuilder-services/smart-layer/'], adrs: ['ADR-0044'] },
  },
  {
    title: 'Plan dialog with 1 item shown for simple requests that don\'t need planning',
    description: 'When asked a simple question, the system shows a plan dialog with only 1 item. A plan with one step is not a plan — it\'s unnecessary overhead. Fixed in session 230 (commit f423e2a): planner now classifies single-step tasks as direct-response, IDE suppresses plan dialog for single items.',
    component: 'smart-layer',
    severity: 'medium',
    type: 'bug',
    status: 'resolved',
    tags: ['ide-bugs-session', 'orchestrator', 'ide-chat-fix'],
    context: { packages: ['smart-layer', 'cobuilder-ide'], files: ['cobuilder-services/smart-layer/src/orchestrator/', 'cobuilder-ide/src/renderer/src/components/chat/'] },
  },
  {
    title: 'Organization-level folder structure does not render in explorer for test account',
    description: 'The test account\'s organization folder structure is not appearing in the file explorer. The explorer loads (after the cold-start delay in Bug #1) but the org-level folder tree is missing. Could be a data issue (org folders not provisioned), a fetch failure (API returns empty), or a render failure (data arrives but isn\'t displayed).',
    component: 'ide',
    severity: 'high',
    type: 'bug',
    tags: ['ide-bugs-session', 'explorer', 'provisioning'],
    context: { packages: ['cobuilder-ide', 'server'], files: ['cobuilder-ide/src/renderer/src/components/FileExplorer.tsx', 'cobuilder-services/server/src/routes/files.ts'] },
  },
  // Bug #8 skipped: re-homed to [IDE-POLISH] (investigation item, not a bug)
  {
    title: 'Replace "thinking" dialog with stacking, collapsible routing trace',
    description: 'Two distinct UX concepts conflated. Thing 1 (Plan Dialog): should ONLY appear for genuine multi-step orchestration. Thing 2 (Routing Trace): a live, stacking log of what the backend is doing. Lines STACK (append), not replace. When generation completes, trace collapses into single-line summary, expandable. Fixed in session 230 (commit f423e2a): thinking indicator now stacks routing trace entries.',
    component: 'ide',
    severity: 'high',
    type: 'bug',
    status: 'resolved',
    tags: ['ide-bugs-session', 'chat', 'orchestrator', 'ide-chat-fix'],
    context: { packages: ['cobuilder-ide', 'smart-layer', 'server'], files: ['cobuilder-ide/src/renderer/src/components/chat/', 'cobuilder-services/smart-layer/src/orchestrator/'], adrs: ['ADR-0044'] },
  },
  {
    title: 'Primitive settings (tools, connectors) should be removed from Settings panel',
    description: 'The Settings panel still shows configuration sections for tools and connectors. The primitive settings model was rethought in earlier sessions — primitive settings are no longer managed through the Settings UI. These panels are stale and should be removed cleanly.',
    component: 'ide',
    severity: 'medium',
    type: 'bug',
    tags: ['ide-bugs-session', 'settings'],
    context: { packages: ['cobuilder-ide'], files: ['cobuilder-ide/src/renderer/src/components/settings/'] },
  },
  {
    title: 'Soak-test files polluting workspace root in file explorer',
    description: 'The file explorer shows hundreds of soak-test artifact files in the CoBuilder root directory. Two-part fix: (a) CLEANUP: delete all soak-test files currently in root. (b) PREVENTION: audit soak/smoke test scripts to write to dedicated test output directory excluded from workspace view, or clean up after themselves.',
    component: 'cobuilder-build',
    severity: 'high',
    type: 'bug',
    tags: ['ide-bugs-session', 'testing', 'workspace'],
    context: { packages: ['cobuilder-build'], files: ['cobuilder-build/quality/testing/'] },
  },
  // Bug #12 skipped: re-homed to [BROWSER] priority
  {
    title: 'Toggle to collapse explorer and canvas, showing only chat in a narrow window',
    description: 'A layout mode toggle in the top header bar (far right) that collapses the file explorer and canvas panels, reducing the window to just the chat panel. Same toggle expands back to full layout. Useful for browser control sessions, quick Q&A, and smaller screens.',
    component: 'ide',
    severity: 'medium',
    type: 'feature',
    tags: ['ide-bugs-session', 'layout'],
    context: { packages: ['cobuilder-ide'], files: ['cobuilder-ide/src/renderer/src/components/layout/', 'cobuilder-ide/src/renderer/src/App.tsx'] },
  },
  {
    title: 'Header displays raw text "COBUILDER" instead of the logo wordmark with icon',
    description: 'The app header shows plain text "COBUILDER" instead of the CoBuilder logo/wordmark (icon + styled text). Logo assets should be available in design-system/logos/.',
    component: 'ide',
    severity: 'medium',
    type: 'bug',
    tags: ['ide-bugs-session', 'header'],
    context: { packages: ['cobuilder-ide'], files: ['cobuilder-ide/src/renderer/src/components/layout/Header.tsx'], dependencies: ['design-system/logos/'] },
  },
  {
    title: 'Ticket CLI scripts return 404 on staging, 500 on local — all personas blocked',
    description: 'The ticketing connector scripts (list.js, create.js, etc.) were unusable. Staging returned 404 "User not found" for v0-anonymous dev-bypass user. Local returned 500 (server not running). Root cause: v0-anonymous is not a valid UUID, RLS cast fails. Fixed in [TICKETING] Phase 1: seeded well-known dev system user UUID, CoBuilder HQ org, and org membership row.',
    component: 'server',
    severity: 'high',
    type: 'bug',
    status: 'resolved',
    tags: ['ide-bugs-session', 'ticketing', 'dev-bypass'],
    context: { packages: ['server', 'connectors/tickets'], files: ['cobuilder-services/server/src/routes/tickets.ts', 'connectors/tickets/scripts/utils.js'] },
  },
];

async function main() {
  const args = parseArgs();
  const cfg = loadConfig(args);

  console.log(`Seeding ${TICKETS.length} tickets to ${cfg.target} (${cfg.baseUrl})...\n`);

  const results = [];

  for (let i = 0; i < TICKETS.length; i++) {
    const t = TICKETS[i];
    const body = {
      title: t.title,
      description: t.description,
      component: t.component,
      reporterType: 'developer',
      type: t.type,
      severity: t.severity,
      visibility: 'internal',
      orgId: cfg.orgId,
    };
    if (t.tags) body.tags = t.tags;
    if (t.context) body.context = t.context;

    try {
      const result = await apiRequest('/api/v1/tickets', { method: 'POST', body }, cfg);
      const label = `#${i + 1}`;
      console.log(`  ${label.padEnd(4)} ${result.id.slice(0, 8)}  ${t.severity.padEnd(8)}  ${t.title.slice(0, 60)}`);

      // If the ticket needs a non-open status, update it
      if (t.status && t.status !== 'open') {
        await apiRequest(`/api/v1/tickets/${result.id}`, {
          method: 'PATCH',
          body: { status: t.status },
        }, cfg);
        console.log(`       → status set to ${t.status}`);
      }

      results.push({ index: i + 1, id: result.id, status: t.status || 'open' });
    } catch (error) {
      console.error(`  FAIL #${i + 1}: ${error.message}`);
    }
  }

  console.log(`\nSeeded ${results.length}/${TICKETS.length} tickets.`);
  console.log('\nSummary:');
  for (const r of results) {
    console.log(`  #${String(r.index).padEnd(3)} ${r.id}  ${r.status}`);
  }
}

main();
