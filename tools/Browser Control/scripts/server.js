/**
 * Browser Control - Server
 * 
 * HTTP server that manages the browser instance and handles commands.
 * Started by session.js, not called directly.
 * 
 * Endpoints:
 *   GET  /status   - Check if server is running
 *   POST /command  - Execute browser command
 *   POST /shutdown - Gracefully shut down server
 */

import http from 'http';
import { chromium } from 'playwright';
import { getProfileDir, DEFAULT_PORT } from './utils.js';

let browser = null;
let context = null;
let page = null;
let server = null;

// State for extended features
let networkLog = [];
let consoleLog = [];
let isCapturingNetwork = false;
let isCapturingConsole = false;
let blockedPatterns = [];

// Phase 2 state
let currentFrame = null; // null = main page, otherwise frame reference
let dialogMode = 'off'; // 'off', 'accept', 'dismiss', 'prompt'
let dialogPromptText = '';

/**
 * Initialize browser with persistent context
 */
async function initBrowser(options = {}) {
  const profileDir = getProfileDir(options.profile || 'default');
  const headless = options.headless === true;

  context = await chromium.launchPersistentContext(profileDir, {
    headless: headless,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  // Get existing page or create new one
  const pages = context.pages();
  page = pages.length > 0 ? pages[0] : await context.newPage();

  console.log(`Browser started (headless: ${headless}, profile: ${options.profile || 'default'})`);
}

/**
 * Handle incoming commands
 */
async function handleCommand(action, params) {
  if (!context || !page) {
    throw new Error('Browser not initialized');
  }

  switch (action) {
    case 'navigate':
      return await handleNavigate(params);
    case 'click':
      return await handleClick(params);
    case 'type':
      return await handleType(params);
    case 'snapshot':
      return await handleSnapshot(params);
    case 'screenshot':
      return await handleScreenshot(params);
    case 'wait':
      return await handleWait(params);
    case 'execute':
      return await handleExecute(params);
    case 'download':
      return await handleDownload(params);
    case 'upload':
      return await handleUpload(params);
    case 'tabs':
      return await handleTabs(params);
    case 'network':
      return await handleNetwork(params);
    case 'console':
      return await handleConsole(params);
    case 'video':
      return await handleVideo(params);
    case 'emulate':
      return await handleEmulate(params);
    case 'frame':
      return await handleFrame(params);
    case 'scroll':
      return await handleScroll(params);
    case 'mouse':
      return await handleMouse(params);
    case 'select':
      return await handleSelect(params);
    case 'cookies':
      return await handleCookies(params);
    case 'storage':
      return await handleStorage(params);
    case 'dialog':
      return await handleDialog(params);
    case 'check':
      return await handleCheck(params);
    case 'getPageInfo':
      return await getPageInfo();
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Navigate to URL or back/forward
 */
async function handleNavigate(params) {
  const { url, direction, waitUntil = 'load', timeout = 30000 } = params;

  if (direction === 'back') {
    await page.goBack({ waitUntil, timeout });
  } else if (direction === 'forward') {
    await page.goForward({ waitUntil, timeout });
  } else if (direction === 'reload') {
    await page.reload({ waitUntil, timeout });
  } else if (url) {
    await page.goto(url, { waitUntil, timeout });
  } else {
    throw new Error('URL or direction required');
  }

  return await getPageInfo();
}

/**
 * Click element
 */
async function handleClick(params) {
  const { selector, text, coords, button = 'left', clickCount = 1, delay, force = false, timeout = 5000 } = params;
  const frame = getActiveFrame();

  if (selector) {
    await frame.click(selector, { button, clickCount, delay, force, timeout });
  } else if (text) {
    await frame.getByText(text, { exact: false }).click({ button, clickCount, delay, force, timeout });
  } else if (coords) {
    const [x, y] = coords.split(',').map(Number);
    await page.mouse.click(x, y, { button, clickCount, delay });
  } else {
    throw new Error('Selector, text, or coords required');
  }

  return await getPageInfo();
}

/**
 * Type text or press key
 */
async function handleType(params) {
  const { selector, text, key, clear = false, delay, submit = false, timeout = 5000 } = params;
  const frame = getActiveFrame();

  if (key) {
    await page.keyboard.press(key);
  } else if (selector && text !== undefined) {
    if (clear) {
      await frame.fill(selector, '', { timeout });
    }
    await frame.type(selector, text, { delay, timeout });
    if (submit) {
      await page.keyboard.press('Enter');
    }
  } else {
    throw new Error('Selector and text, or key required');
  }

  return await getPageInfo();
}

/**
 * Get page snapshot (accessibility tree or HTML)
 */
async function handleSnapshot(params) {
  const { format = 'accessibility', selector } = params;
  const frame = getActiveFrame();

  let content;
  try {
    if (format === 'html') {
      content = selector 
        ? await frame.locator(selector).innerHTML()
        : await frame.content();
    } else if (format === 'text') {
      content = selector
        ? await frame.locator(selector).innerText()
        : await frame.locator('body').innerText();
    } else {
      // Accessibility tree - use ariaSnapshot for structured output
      content = await frame.locator('body').ariaSnapshot();
    }
  } catch (error) {
    // Fallback to text if accessibility fails
    if (format === 'accessibility') {
      content = await frame.locator('body').innerText();
    } else {
      throw error;
    }
  }

  const info = await getPageInfo();
  return { ...info, content };
}

/**
 * Take screenshot
 */
async function handleScreenshot(params) {
  const { output: outputPath, selector, fullPage = false } = params;

  if (!outputPath) {
    throw new Error('Output path required');
  }

  const options = { path: outputPath, fullPage };

  if (selector) {
    await page.locator(selector).screenshot(options);
  } else {
    await page.screenshot(options);
  }

  const info = await getPageInfo();
  return { ...info, screenshot: outputPath };
}

/**
 * Wait for condition
 */
async function handleWait(params) {
  const { selector, text, hidden = false, time, network = false, timeout = 30000 } = params;
  const frame = getActiveFrame();

  if (time) {
    await frame.waitForTimeout(parseInt(time, 10));
  } else if (network) {
    await page.waitForLoadState('networkidle', { timeout });
  } else if (selector) {
    if (hidden) {
      await frame.waitForSelector(selector, { state: 'hidden', timeout });
    } else {
      await frame.waitForSelector(selector, { state: 'visible', timeout });
    }
  } else if (text) {
    await frame.getByText(text).waitFor({ state: 'visible', timeout });
  } else {
    throw new Error('Selector, text, time, or network flag required');
  }

  return await getPageInfo();
}

/**
 * Execute JavaScript
 */
async function handleExecute(params) {
  const { code, file } = params;
  const frame = getActiveFrame();

  let script = code;
  if (file) {
    const fs = await import('fs/promises');
    script = await fs.readFile(file, 'utf-8');
  }

  if (!script) {
    throw new Error('Code or file required');
  }

  const result = await frame.evaluate(script);
  const info = await getPageInfo();
  return { ...info, result };
}

/**
 * Download file
 */
async function handleDownload(params) {
  const { selector, outputDir, url, outputFile, timeout = 30000 } = params;
  const path = await import('path');
  const fs = await import('fs/promises');

  // Mode 1: Direct URL download (fetch with browser cookies)
  if (url && outputFile) {
    const resolvedPath = outputFile.replace('~', process.env.HOME);
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    // Use Playwright's request API with browser context cookies
    const response = await context.request.get(url, { timeout });
    
    if (!response.ok()) {
      throw new Error(`Download failed: ${response.status()} ${response.statusText()}`);
    }

    const buffer = await response.body();
    await fs.writeFile(resolvedPath, buffer);

    const info = await getPageInfo();
    return { 
      ...info, 
      downloadedFile: resolvedPath, 
      size: buffer.length,
      contentType: response.headers()['content-type']
    };
  }

  // Mode 2: Click-triggered download
  if (!selector || !outputDir) {
    throw new Error('Either (url + outputFile) or (selector + outputDir) required');
  }

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Set up download handler
  const downloadPromise = page.waitForEvent('download', { timeout });
  
  // Click the download trigger
  await page.click(selector, { timeout: 5000 });
  
  // Wait for download
  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();
  const filePath = path.join(outputDir, suggestedFilename);
  
  await download.saveAs(filePath);

  const info = await getPageInfo();
  return { ...info, downloadedFile: filePath, filename: suggestedFilename };
}

/**
 * Upload files
 */
async function handleUpload(params) {
  const { selector, files, timeout = 5000 } = params;
  const path = await import('path');

  // Resolve paths
  const resolvedFiles = files.map(f => {
    if (f.startsWith('/') || f.startsWith('~')) {
      return f.replace('~', process.env.HOME);
    }
    return path.resolve(f);
  });

  // Set files on the input
  await page.setInputFiles(selector, resolvedFiles, { timeout });

  const info = await getPageInfo();
  return { ...info, uploadedFiles: resolvedFiles };
}

/**
 * Manage tabs
 */
async function handleTabs(params) {
  const { action, url, index } = params;

  switch (action) {
    case 'list': {
      const pages = context.pages();
      const tabs = await Promise.all(pages.map(async (p, i) => ({
        index: i,
        url: p.url(),
        title: await p.title().catch(() => ''),
        active: p === page
      })));
      return { tabs };
    }
    
    case 'new': {
      const newPage = await context.newPage();
      page = newPage;
      if (url) {
        await page.goto(url);
      }
      return await getPageInfo();
    }
    
    case 'switch': {
      const pages = context.pages();
      if (index === undefined || index < 0 || index >= pages.length) {
        throw new Error(`Invalid tab index: ${index}. Available: 0-${pages.length - 1}`);
      }
      page = pages[index];
      await page.bringToFront();
      return await getPageInfo();
    }
    
    case 'close': {
      const pages = context.pages();
      if (index !== undefined) {
        if (index < 0 || index >= pages.length) {
          throw new Error(`Invalid tab index: ${index}`);
        }
        await pages[index].close();
        // Switch to another tab if we closed the current one
        if (pages[index] === page) {
          const remaining = context.pages();
          page = remaining.length > 0 ? remaining[0] : await context.newPage();
        }
      } else {
        await page.close();
        const remaining = context.pages();
        page = remaining.length > 0 ? remaining[0] : await context.newPage();
      }
      return await getPageInfo();
    }
    
    default:
      throw new Error(`Unknown tabs action: ${action}`);
  }
}

/**
 * Network capture and blocking
 */
async function handleNetwork(params) {
  const { action, pattern } = params;

  switch (action) {
    case 'start': {
      networkLog = [];
      isCapturingNetwork = true;
      
      page.on('request', (request) => {
        if (isCapturingNetwork) {
          networkLog.push({
            type: 'request',
            url: request.url(),
            method: request.method(),
            timestamp: new Date().toISOString()
          });
        }
      });
      
      page.on('response', (response) => {
        if (isCapturingNetwork) {
          networkLog.push({
            type: 'response',
            url: response.url(),
            status: response.status(),
            timestamp: new Date().toISOString()
          });
        }
      });
      
      return { message: 'Network capture started', capturing: true };
    }
    
    case 'stop': {
      isCapturingNetwork = false;
      const log = [...networkLog];
      networkLog = [];
      return { message: 'Network capture stopped', requests: log };
    }
    
    case 'block': {
      blockedPatterns.push(pattern);
      await page.route(`**/*${pattern}*`, route => route.abort());
      return { message: `Blocking URLs matching: ${pattern}`, blockedPatterns };
    }
    
    case 'unblock': {
      await page.unroute('**/*');
      blockedPatterns = [];
      return { message: 'All URL blocks cleared', blockedPatterns: [] };
    }
    
    default:
      throw new Error(`Unknown network action: ${action}`);
  }
}

/**
 * Console capture
 */
async function handleConsole(params) {
  const { action } = params;

  switch (action) {
    case 'start': {
      consoleLog = [];
      isCapturingConsole = true;
      
      page.on('console', (msg) => {
        if (isCapturingConsole) {
          consoleLog.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
          });
        }
      });
      
      page.on('pageerror', (error) => {
        if (isCapturingConsole) {
          consoleLog.push({
            type: 'error',
            text: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      return { message: 'Console capture started', capturing: true };
    }
    
    case 'stop': {
      isCapturingConsole = false;
      const log = [...consoleLog];
      consoleLog = [];
      return { message: 'Console capture stopped', messages: log };
    }
    
    default:
      throw new Error(`Unknown console action: ${action}`);
  }
}

/**
 * Video recording
 */
async function handleVideo(params) {
  const { action, outputDir } = params;

  // Note: Video recording requires context-level configuration
  // This is a simplified implementation that provides guidance
  
  if (action === 'start') {
    return { 
      message: 'Video recording requires restarting session with video enabled.',
      hint: 'Use: node scripts/session.js restart --video-dir ' + outputDir,
      supported: false
    };
  }
  
  if (action === 'stop') {
    return {
      message: 'No recording in progress.',
      supported: false
    };
  }
  
  throw new Error(`Unknown video action: ${action}`);
}

/**
 * Device/viewport emulation
 */
async function handleEmulate(params) {
  const { action, device, viewport, touch, geolocation, locale, timezone } = params;
  const { devices } = await import('playwright');

  if (action === 'reset') {
    await page.setViewportSize({ width: 1280, height: 800 });
    return { message: 'Reset to default viewport', viewport: { width: 1280, height: 800 } };
  }

  let appliedSettings = {};

  if (device) {
    const deviceConfig = devices[device];
    if (!deviceConfig) {
      const available = Object.keys(devices).slice(0, 20).join(', ');
      throw new Error(`Unknown device: ${device}. Available: ${available}...`);
    }
    await page.setViewportSize(deviceConfig.viewport);
    appliedSettings.device = device;
    appliedSettings.viewport = deviceConfig.viewport;
  }

  if (viewport) {
    await page.setViewportSize(viewport);
    appliedSettings.viewport = viewport;
  }

  if (geolocation) {
    await context.setGeolocation(geolocation);
    await context.grantPermissions(['geolocation']);
    appliedSettings.geolocation = geolocation;
  }

  if (locale) {
    // Note: locale requires context-level setting, providing info
    appliedSettings.locale = locale;
    appliedSettings.localeNote = 'Locale requires session restart to take effect';
  }

  if (timezone) {
    // Note: timezone requires context-level setting
    appliedSettings.timezone = timezone;
    appliedSettings.timezoneNote = 'Timezone requires session restart to take effect';
  }

  const info = await getPageInfo();
  return { ...info, emulation: appliedSettings };
}

/**
 * Get current frame (for iframe support)
 */
function getActiveFrame() {
  return currentFrame || page;
}

/**
 * Frame/iframe management
 */
async function handleFrame(params) {
  const { action, by, value } = params;

  switch (action) {
    case 'list': {
      const frames = page.frames();
      const frameList = frames.map((f, i) => ({
        index: i,
        name: f.name() || '',
        url: f.url()
      })).filter((f, i) => i > 0); // Skip main frame
      return { frames: frameList, currentFrame: currentFrame ? 'iframe' : 'main' };
    }
    
    case 'switch': {
      const frames = page.frames();
      let targetFrame = null;
      
      if (by === 'index') {
        // Index 0 is main, so +1 for actual frame array
        const frameIndex = value + 1;
        if (frameIndex < 1 || frameIndex >= frames.length) {
          throw new Error(`Invalid frame index: ${value}. Available: 0-${frames.length - 2}`);
        }
        targetFrame = frames[frameIndex];
      } else if (by === 'name') {
        targetFrame = frames.find(f => f.name() === value);
        if (!targetFrame) {
          throw new Error(`Frame with name "${value}" not found`);
        }
      } else if (by === 'src') {
        targetFrame = frames.find(f => f.url().includes(value));
        if (!targetFrame) {
          throw new Error(`Frame with src containing "${value}" not found`);
        }
      }
      
      currentFrame = targetFrame;
      return { message: `Switched to frame`, frameUrl: targetFrame.url() };
    }
    
    case 'main': {
      currentFrame = null;
      return { message: 'Switched to main page context' };
    }
    
    case 'current': {
      return { 
        context: currentFrame ? 'iframe' : 'main',
        frameUrl: currentFrame ? currentFrame.url() : page.url()
      };
    }
    
    default:
      throw new Error(`Unknown frame action: ${action}`);
  }
}

/**
 * Scroll actions
 */
async function handleScroll(params) {
  const { action, target, amount, max = 10 } = params;
  const frame = getActiveFrame();

  if (action === 'to') {
    if (target === 'top') {
      await frame.evaluate(() => window.scrollTo(0, 0));
    } else if (target === 'bottom') {
      await frame.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else {
      // Selector - scroll into view
      await frame.locator(target).scrollIntoViewIfNeeded();
    }
    return await getPageInfo();
  }
  
  if (action === 'by') {
    await frame.evaluate((amt) => window.scrollBy(0, amt), amount);
    return await getPageInfo();
  }
  
  if (action === 'infinite') {
    let lastHeight = await frame.evaluate(() => document.body.scrollHeight);
    let loadCount = 0;
    
    for (let i = 0; i < max; i++) {
      await frame.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await frame.waitForTimeout(1000);
      
      const newHeight = await frame.evaluate(() => document.body.scrollHeight);
      if (newHeight === lastHeight) {
        break; // No new content loaded
      }
      lastHeight = newHeight;
      loadCount++;
    }
    
    const info = await getPageInfo();
    return { ...info, loadsTriggered: loadCount };
  }
  
  throw new Error(`Unknown scroll action: ${action}`);
}

/**
 * Mouse actions (hover, drag, etc.)
 */
async function handleMouse(params) {
  const { action, selector, x, y, from, to, delta } = params;
  const frame = getActiveFrame();

  if (action === 'hover') {
    if (selector) {
      await frame.locator(selector).hover();
    } else if (x !== undefined && y !== undefined) {
      await page.mouse.move(x, y);
    } else {
      throw new Error('Selector or coordinates required');
    }
    return await getPageInfo();
  }
  
  if (action === 'drag') {
    await frame.locator(from).dragTo(frame.locator(to));
    return await getPageInfo();
  }
  
  if (action === 'move') {
    await page.mouse.move(x, y);
    return await getPageInfo();
  }
  
  if (action === 'wheel') {
    await page.mouse.wheel(0, delta);
    return await getPageInfo();
  }
  
  throw new Error(`Unknown mouse action: ${action}`);
}

/**
 * Select dropdown handling
 */
async function handleSelect(params) {
  const { selector, action, by, option } = params;
  const frame = getActiveFrame();

  if (action === 'list') {
    const options = await frame.locator(selector).locator('option').evaluateAll(opts => 
      opts.map((o, i) => ({
        index: i,
        value: o.value,
        label: o.textContent,
        selected: o.selected
      }))
    );
    return { options };
  }
  
  if (action === 'select') {
    if (by === 'value') {
      await frame.selectOption(selector, { value: option });
    } else if (by === 'label') {
      await frame.selectOption(selector, { label: option });
    } else if (by === 'index') {
      await frame.selectOption(selector, { index: option });
    }
    return await getPageInfo();
  }
  
  throw new Error(`Unknown select action: ${action}`);
}

/**
 * Cookie management
 */
async function handleCookies(params) {
  const { action, name, value, domain, path: cookiePath, expires, output, file } = params;
  const fs = await import('fs/promises');
  const pathModule = await import('path');

  switch (action) {
    case 'list': {
      let cookies = await context.cookies();
      if (domain) {
        cookies = cookies.filter(c => c.domain.includes(domain));
      }
      return { cookies };
    }
    
    case 'get': {
      const cookies = await context.cookies();
      const cookie = cookies.find(c => c.name === name);
      return cookie ? { cookie } : { cookie: null, message: `Cookie "${name}" not found` };
    }
    
    case 'set': {
      const currentUrl = page.url();
      const url = new URL(currentUrl);
      
      const cookie = {
        name,
        value,
        domain: domain || url.hostname,
        path: cookiePath || '/'
      };
      
      if (expires) {
        cookie.expires = Date.now() / 1000 + (expires * 24 * 60 * 60);
      }
      
      await context.addCookies([cookie]);
      return { message: `Cookie "${name}" set`, cookie };
    }
    
    case 'delete': {
      const cookies = await context.cookies();
      const cookie = cookies.find(c => c.name === name);
      if (cookie) {
        await context.clearCookies({ name });
      }
      return { message: `Cookie "${name}" deleted` };
    }
    
    case 'clear': {
      await context.clearCookies();
      return { message: 'All cookies cleared' };
    }
    
    case 'export': {
      const cookies = await context.cookies();
      const resolvedPath = pathModule.resolve(output);
      await fs.writeFile(resolvedPath, JSON.stringify(cookies, null, 2));
      return { message: `Exported ${cookies.length} cookies`, file: resolvedPath };
    }
    
    case 'import': {
      const resolvedPath = pathModule.resolve(file);
      const data = await fs.readFile(resolvedPath, 'utf-8');
      const cookies = JSON.parse(data);
      await context.addCookies(cookies);
      return { message: `Imported ${cookies.length} cookies` };
    }
    
    default:
      throw new Error(`Unknown cookies action: ${action}`);
  }
}

/**
 * Web storage management
 */
async function handleStorage(params) {
  const { action, storage, key, value } = params;
  const frame = getActiveFrame();
  const storageType = storage === 'session' ? 'sessionStorage' : 'localStorage';

  switch (action) {
    case 'list': {
      const items = await frame.evaluate((st) => {
        const s = window[st];
        const result = {};
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          result[k] = s.getItem(k);
        }
        return result;
      }, storageType);
      return { storage: storageType, items };
    }
    
    case 'get': {
      const val = await frame.evaluate(([st, k]) => window[st].getItem(k), [storageType, key]);
      return { key, value: val };
    }
    
    case 'set': {
      await frame.evaluate(([st, k, v]) => window[st].setItem(k, v), [storageType, key, value]);
      return { message: `Set ${storageType}["${key}"]` };
    }
    
    case 'delete': {
      await frame.evaluate(([st, k]) => window[st].removeItem(k), [storageType, key]);
      return { message: `Deleted ${storageType}["${key}"]` };
    }
    
    case 'clear': {
      await frame.evaluate((st) => window[st].clear(), storageType);
      return { message: `Cleared ${storageType}` };
    }
    
    default:
      throw new Error(`Unknown storage action: ${action}`);
  }
}

/**
 * Dialog handling configuration
 */
async function handleDialog(params) {
  const { mode, text } = params;

  if (mode === 'status') {
    return { 
      mode: dialogMode, 
      promptText: dialogMode === 'prompt' ? dialogPromptText : undefined 
    };
  }

  // Remove existing listener if any
  page.removeAllListeners('dialog');

  if (mode === 'accept') {
    dialogMode = 'accept';
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    return { message: 'Auto-accepting all dialogs', mode: dialogMode };
  }
  
  if (mode === 'dismiss') {
    dialogMode = 'dismiss';
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    return { message: 'Auto-dismissing all dialogs', mode: dialogMode };
  }
  
  if (mode === 'prompt') {
    dialogMode = 'prompt';
    dialogPromptText = text || '';
    page.on('dialog', async dialog => {
      await dialog.accept(dialogPromptText);
    });
    return { message: `Auto-accepting dialogs with text: "${dialogPromptText}"`, mode: dialogMode };
  }
  
  if (mode === 'off') {
    dialogMode = 'off';
    return { message: 'Dialog auto-handling disabled', mode: dialogMode };
  }
  
  throw new Error(`Unknown dialog mode: ${mode}`);
}

/**
 * Element assertions
 */
async function handleCheck(params) {
  const { assertion, selector, expected } = params;
  const frame = getActiveFrame();
  const locator = frame.locator(selector);

  let passed = false;
  let details = '';

  try {
    switch (assertion) {
      case 'exists': {
        const count = await locator.count();
        passed = count > 0;
        details = passed ? `Element exists (${count} found)` : 'Element not found';
        break;
      }
      
      case 'visible': {
        passed = await locator.isVisible();
        details = passed ? 'Element is visible' : 'Element is not visible';
        break;
      }
      
      case 'hidden': {
        const visible = await locator.isVisible();
        passed = !visible;
        details = passed ? 'Element is hidden' : 'Element is visible';
        break;
      }
      
      case 'enabled': {
        passed = await locator.isEnabled();
        details = passed ? 'Element is enabled' : 'Element is disabled';
        break;
      }
      
      case 'disabled': {
        const enabled = await locator.isEnabled();
        passed = !enabled;
        details = passed ? 'Element is disabled' : 'Element is enabled';
        break;
      }
      
      case 'checked': {
        passed = await locator.isChecked();
        details = passed ? 'Element is checked' : 'Element is not checked';
        break;
      }
      
      case 'unchecked': {
        const checked = await locator.isChecked();
        passed = !checked;
        details = passed ? 'Element is not checked' : 'Element is checked';
        break;
      }
      
      case 'text': {
        const text = await locator.innerText();
        passed = text.includes(expected);
        details = passed 
          ? `Element contains "${expected}"` 
          : `Element text "${text.substring(0, 100)}" does not contain "${expected}"`;
        break;
      }
      
      case 'value': {
        const value = await locator.inputValue();
        passed = value === expected;
        details = passed 
          ? `Input value matches "${expected}"` 
          : `Input value "${value}" does not match "${expected}"`;
        break;
      }
      
      case 'count': {
        const count = await locator.count();
        passed = count === expected;
        details = passed 
          ? `Found exactly ${expected} elements` 
          : `Found ${count} elements, expected ${expected}`;
        break;
      }
      
      default:
        throw new Error(`Unknown assertion: ${assertion}`);
    }
  } catch (error) {
    passed = false;
    details = `Error: ${error.message}`;
  }

  return { assertion, selector, passed, details };
}

/**
 * Get current page info
 */
async function getPageInfo() {
  try {
    return {
      url: page.url(),
      title: await page.title()
    };
  } catch (error) {
    // Page may have navigated, wait briefly and retry
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    return {
      url: page.url(),
      title: await page.title().catch(() => 'Loading...')
    };
  }
}

/**
 * Handle HTTP request
 */
function handleRequest(req, res) {
  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      success: true, 
      status: 'running',
      url: page?.url() || null,
      title: null
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/shutdown') {
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Shutting down' }));
    shutdown();
    return;
  }

  if (req.method === 'POST' && req.url === '/command') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { action, params } = JSON.parse(body);
        const result = await handleCommand(action, params);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (error) {
        res.writeHead(200);
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('Shutting down...');
  
  if (context) {
    await context.close();
    context = null;
    page = null;
  }
  
  if (server) {
    server.close();
    server = null;
  }
  
  process.exit(0);
}

/**
 * Start server
 */
async function start() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') options.port = parseInt(args[++i], 10);
    if (args[i] === '--profile') options.profile = args[++i];
    if (args[i] === '--headless') options.headless = true;
  }

  const port = options.port || DEFAULT_PORT;

  try {
    await initBrowser(options);
    
    server = http.createServer(handleRequest);
    server.listen(port, 'localhost', () => {
      console.log(`Server listening on http://localhost:${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error(`Failed to start: ${error.message}`);
    process.exit(1);
  }
}

start();
