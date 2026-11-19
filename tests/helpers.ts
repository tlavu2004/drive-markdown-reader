import assert from 'node:assert/strict';
import { JSDOM, type DOMWindow } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');

type ViewerModule = {
  act: typeof import('react').act;
  mountViewer: typeof import('../src/viewer/app/mount.tsx').mountViewer;
};
type RenderModule = typeof import('../src/viewer/rendering/createMarkdownRenderer.ts');
type Mermaid = Pick<typeof mermaid, 'initialize' | 'run'>;
type BrowserWindow = Pick<DOMWindow,
  'alert' | 'clearTimeout' | 'close' | 'document' | 'history' | 'localStorage' |
  'parent' | 'setTimeout' | 'addEventListener' | 'removeEventListener' | 'dispatchEvent'
>;
export type TestWindow = BrowserWindow & Pick<typeof globalThis,
  'eval' | 'AbortController' | 'DOMException' | 'Event' | 'HTMLElement' | 'MessageEvent' | 'PageTransitionEvent'
> & {
  __testModule: ViewerModule;
  __viewerAct: ViewerModule['act'];
  __viewerRoot: ReturnType<ViewerModule['mountViewer']>;
  IS_REACT_ACT_ENVIRONMENT: boolean;
  DriveMarkdown: typeof import('../src/content/drive.ts');
  createMarkdownRenderer: RenderModule['createMarkdownRenderer'];
  mermaid: Mermaid;
  marked: typeof marked;
  chrome: object;
  fetch: (url: string, options: { signal: AbortSignal }) => Promise<MockResponse>;
};
export type MockResponse = {
  ok: boolean;
  status?: number;
  url?: string;
  headers?: { get: (name: string) => string };
  text?: () => Promise<string>;
};

export function bundleText(result: { outputFiles: { text: string }[] }) {
  const output = result.outputFiles[0];
  assert.ok(output, 'Expected one JavaScript bundle');
  return output.text;
}

export function element(doc: Document, id: string) {
  const node = doc.getElementById(id);
  assert.ok(node, `Expected element #${id}`);
  return node;
}

const compiled = new Map<string, string>();
export function load(window: TestWindow, file: string) {
  if (file === 'src/viewer/main.tsx') {
    if (!compiled.has(file)) compiled.set(file, bundleText(buildSync({
      stdin: { contents: "export { act } from 'react'; export { mountViewer } from './src/viewer/app/mount';", resolveDir: root, loader: 'ts' },
      bundle: true, write: false, format: 'iife', globalName: '__testModule',
      define: { 'process.env.NODE_ENV': '"development"' }, target: 'chrome120'
    })));
    window.eval(compiled.get(file) + '\nwindow.__testModule = __testModule;');
    const { act, mountViewer } = window.__testModule;
    window.IS_REACT_ACT_ENVIRONMENT = true;
    window.__viewerAct = act;
    const dispatch = window.dispatchEvent.bind(window);
    window.dispatchEvent = event => { let result = false; act(() => { result = dispatch(event); }); return result; };
    const click = window.HTMLElement.prototype.click;
    window.HTMLElement.prototype.click = function () { act(() => click.call(this)); };
    act(() => { window.__viewerRoot = mountViewer(); });
    return;
  }
  if (file.endsWith('.ts')) {
    if (!compiled.has(file)) compiled.set(file, bundleText(buildSync({
      entryPoints: [path.join(root, file)], bundle: true, write: false,
      format: 'iife', globalName: '__testModule', target: 'chrome120'
    })));
    window.eval(compiled.get(file) + '\nwindow.__testModule = __testModule;');
    if (file.endsWith('/drive.ts')) window.DriveMarkdown = window.__testModule as unknown as TestWindow['DriveMarkdown'];
    if (file.endsWith('/createMarkdownRenderer.ts')) window.createMarkdownRenderer = (window.__testModule as unknown as RenderModule).createMarkdownRenderer;
    return;
  }
  window.eval(fs.readFileSync(path.join(root, file), 'utf8'));
}
export function viewer() {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/viewer/index.html'), 'utf8'), {
    url: 'https://extension.test/src/viewer/index.html', runScripts: 'outside-only'
  });
  const w = dom.window as unknown as TestWindow;
  const close = w.close.bind(w);
  w.close = () => {
    if (w.__viewerRoot) w.__viewerAct(() => w.__viewerRoot.unmount());
    close();
  };
  const calls: Parameters<Mermaid['initialize']>[0][] = [];
  w.mermaid = { initialize: config => { calls.push(config); }, run: async () => {} };
  for (const file of ['vendor/dompurify/purify.min.js', 'vendor/marked/marked.min.js', 'src/viewer/rendering/createMarkdownRenderer.ts']) load(w, file);
  return { dom, w, calls, content: element(w.document, 'content') };
}
export function drive() {
  const dom = new JSDOM('<title>example.md - Google Drive</title><body></body>', {
    url: 'https://drive.google.com/file/d/fileA/view', runScripts: 'outside-only'
  });
  const w = dom.window as unknown as TestWindow;
  const timers = new Map<number, () => void>();
  let nextTimer = 0;
  let runtimeListener: ((request: unknown, sender: object, respond: () => void) => void) | undefined;
  w.setTimeout = (callback: TimerHandler) => {
    assert.ok(typeof callback === 'function', 'Expected a timer callback');
    timers.set(++nextTimer, () => { callback(); });
    return nextTimer;
  };
  w.clearTimeout = id => { if (id !== undefined) timers.delete(id); };
  const alerts: string[] = [];
  w.alert = text => { alerts.push(String(text)); };
  w.chrome = { runtime: {
    getURL: (file: string) => `chrome-extension://test-extension/${file}`,
    onMessage: { addListener: (callback: NonNullable<typeof runtimeListener>) => { runtimeListener = callback; } }
  } };
  w.fetch = async () => ({ ok: true, text: async () => '# File A' });
  load(w, 'src/content/drive.ts'); load(w, 'dist/content.js');
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const tick = async () => {
    const pending = [...timers.values()]; timers.clear();
    pending.forEach(callback => callback()); await settle();
  };
  const send = (data: unknown, overrides: Omit<MessageEventInit, 'source'> & { source?: Window | TestWindow } = {}) => {
    const frame = w.document.querySelector<HTMLIFrameElement>('#drive-md-viewer-frame');
    w.dispatchEvent(new w.MessageEvent('message', {
      data, origin: 'chrome-extension://test-extension', source: frame?.contentWindow, ...overrides
    } as MessageEventInit));
  };
  const manual = () => {
    assert.ok(runtimeListener, 'Expected the content script message listener');
    runtimeListener({ action: 'RENDER_NOW' }, {}, () => {});
  };
  function viewerWindow() {
    const frame = w.document.querySelector<HTMLIFrameElement>('#drive-md-viewer-frame');
    assert.ok(frame?.contentWindow, 'Expected the mounted viewer iframe');
    return frame.contentWindow;
  }
  return { dom, w, viewerWindow, timers, tick, settle, send, manual, alerts, frame: () => w.document.querySelector<HTMLIFrameElement>('#drive-md-viewer-frame') };
}
