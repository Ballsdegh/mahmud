'use strict';
/*
 * check_harness.js — Node harness that runs game.js headless.
 * Provides: fake clock (performance.now / rAF / setTimeout), a minimal
 * DOM (elements, classList, querySelector with descendant selectors,
 * innerHTML parsing), a no-op 2D canvas, stubs for localStorage /
 * navigator / location / Image. No real browser is required.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VOID = { img: 1, br: 1, input: 1, hr: 1 };

/* ---------- 2d context stub ---------- */
function makeCtxStub() {
  const grad = { addColorStop: function () {} };
  const target = {
    canvas: null,
    measureText: function (t) { return { width: String(t || '').length * 8 }; },
    createRadialGradient: function () { return grad; },
    createLinearGradient: function () { return grad; },
    createPattern: function () { return null; },
    getImageData: function (x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; }
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return function () {};
    },
    set(t, prop, v) { t[prop] = v; return true; }
  });
}

/* ---------- minimal element ---------- */
let EL_COUNT = 0;
class El {
  constructor(tag, doc) {
    this.__el = ++EL_COUNT;
    this.tagName = String(tag).toUpperCase();
    this.doc = doc;
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.style = {};
    this.id = '';
    this._cls = new Set();
    this.listeners = {};
    this._text = '';
    const self = this;
    this.classList = {
      add: function () { for (const c of arguments) if (c) self._cls.add(String(c)); },
      remove: function () { for (const c of arguments) if (c) self._cls.delete(String(c)); },
      toggle: function (c, force) {
        const on = force === undefined ? !self._cls.has(String(c)) : !!force;
        if (on) self._cls.add(String(c)); else self._cls.delete(String(c));
        return on;
      },
      contains: function (c) { return self._cls.has(String(c)); }
    };
  }
  get className() { return Array.from(this._cls).join(' '); }
  set className(v) { this._cls = new Set(String(v || '').split(/\s+/).filter(Boolean)); }
  get textContent() {
    let out = this._text || '';
    for (const c of this.children) if (c instanceof El) out += c.textContent;
    return out;
  }
  set textContent(v) { this.children.length = 0; this._text = String(v == null ? '' : v); }
  getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; }
  setAttribute(n, v) { this.attrs[n] = String(v); if (n === 'id') { this.id = String(v); this.doc.byId[this.id] = this; } }
  removeAttribute(n) { delete this.attrs[n]; }
  appendChild(c) {
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    this.children.push(c);
    if (c.id) this.doc.byId[c.id] = c;
    return c;
  }
  removeChild(c) {
    const i = this.children.indexOf(c);
    if (i >= 0) this.children.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  removeEventListener(t, fn) {
    const l = this.listeners[t];
    if (!l) return;
    const i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }
  dispatch(type, extra) {
    const ev = Object.assign({ target: this, preventDefault: function () {}, stopPropagation: function () {} }, extra || {});
    for (const fn of (this.listeners[type] || []).slice()) fn(ev);
  }
  _all(out) {
    for (const c of this.children) {
      if (c instanceof El) { out.push(c); c._all(out); }
    }
    return out;
  }
  _matchCompound(part) {
    const m = part.match(/^([a-zA-Z]+)?((?:\.[\w-]+)*)(?:#([\w-]+))?(?:\[([\w-]+)\])?$/);
    if (!m) return false;
    if (m[1] && this.tagName !== m[1].toUpperCase()) return false;
    const cls = m[2] ? m[2].split('.').filter(Boolean) : [];
    for (const c of cls) if (!this._cls.has(c)) return false;
    if (m[3] && this.id !== m[3]) return false;
    if (m[4] && !Object.prototype.hasOwnProperty.call(this.attrs, m[4])) return false;
    return true;
  }
  _matchFull(sel) {
    const parts = sel.trim().split(/\s+/);
    if (!this._matchCompound(parts[parts.length - 1])) return false;
    let i = parts.length - 2;
    let anc = this.parentNode;
    while (i >= 0 && anc) {
      if (anc instanceof El && anc._matchCompound(parts[i])) i--;
      anc = anc.parentNode;
    }
    return i < 0;
  }
  querySelectorAll(sel) {
    if (sel.indexOf(',') >= 0) {
      const out = [];
      for (const s of sel.split(',')) {
        if (!s.trim()) continue;
        for (const el of this.querySelectorAll(s.trim())) if (out.indexOf(el) < 0) out.push(el);
      }
      return out;
    }
    const parts = sel.trim().split(/\s+/);
    const all = this._all([]);
    const res = [];
    for (const el of all) {
      if (!el._matchCompound(parts[parts.length - 1])) continue;
      let i = parts.length - 2;
      let anc = el.parentNode;
      while (i >= 0 && anc) {
        if (anc instanceof El && anc._matchCompound(parts[i])) i--;
        anc = anc.parentNode;
      }
      if (i < 0) res.push(el);
    }
    return res;
  }
  querySelector(sel) {
    const r = this.querySelectorAll(sel);
    return r.length ? r[0] : null;
  }
  closest(sel) {
    let n = this;
    while (n) {
      if (n instanceof El && n._matchFull(sel)) return n;
      n = n.parentNode;
    }
    return null;
  }
  get innerHTML() {
    return this.children.map(c => c.outerHTML).join('');
  }
  set innerHTML(html) {
    this.children.length = 0;
    this._text = '';
    if (html && String(html).length) parseHTML(String(html), this, this.doc);
  }
  get outerHTML() {
    const attrs = Object.keys(this.attrs).map(k => ' ' + k + '="' + this.attrs[k] + '"').join('');
    if (VOID[this.tagName.toLowerCase()]) return '<' + this.tagName.toLowerCase() + attrs + ' />';
    return '<' + this.tagName.toLowerCase() + attrs + '>' + this._text + this.children.map(c => c.outerHTML).join('') + '</' + this.tagName.toLowerCase() + '>';
  }
  getContext(kind) {
    if (kind === '2d' && !this._ctx) this._ctx = makeCtxStub();
    return this._ctx || null;
  }
  get offsetWidth() { return 0; }
  get offsetHeight() { return 0; }
  get scrollTop() { return this._scrollTop || 0; }
  set scrollTop(v) { this._scrollTop = v; }
  get firstChild() { return this.children[0] || null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i + 1] || null;
  }
  click() { this.dispatch('click'); }
}

function parseHTML(str, parent, doc) {
  const tagRe = /<\s*([a-zA-Z][a-zA-Z0-9]*)((?:\s+[\w-]+(?:\s*=\s*("[^"]*"|'[^']*'))?)*)\s*(\/?)>|<\/\s*([a-zA-Z][a-zA-Z0-9]*)\s*>|([^<]+)/g;
  const stack = [parent];
  let m;
  while ((m = tagRe.exec(str))) {
    if (m[6] !== undefined) {
      if (m[6].trim()) stack[stack.length - 1]._text += m[6];
      continue;
    }
    if (m[5] !== undefined) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === m[5].toUpperCase()) { stack.length = i; break; }
      }
      continue;
    }
    const el = new El(m[1], doc);
    const attrs = m[2] || '';
    const am = attrs.match(/\s([\w-]+)(?:\s*=\s*("[^"]*"|'[^']*'))?/g) || [];
    for (const a of am) {
      const mm = a.match(/\s([\w-]+)(?:\s*=\s*("[^"]*"|'[^']*'))?/);
      el.attrs[mm[1]] = mm[2] ? mm[2].slice(1, -1) : '';
    }
    if (el.attrs.id) el.id = el.attrs.id;
    if (el.attrs.class) el.className = el.attrs.class;
    if (el.attrs.style) {
      const sm = el.attrs.style.match(/([\w-]+)\s*:\s*([^;"]+);?/g) || [];
      for (const s of sm) {
        const kv = s.split(':');
        el.style[kv[0].trim()] = kv.slice(1).join(':').trim();
      }
    }
    stack[stack.length - 1].appendChild(el);
    if (!m[4] && !VOID[m[1].toLowerCase()]) stack.push(el);
  }
}

/* ---------- Image stub ---------- */
class ImageStub {
  constructor() { this.onload = null; this.onerror = null; this._src = ''; }
  set src(v) {
    this._src = v;
    if (this.onload) { try { this.onload(); } catch (e) {} }
  }
  get src() { return this._src; }
}

/* ---------- harness ---------- */
function createHarness(opts) {
  opts = opts || {};
  const H = {
    nowMs: 1000000,
    raf: [],
    timers: [],
    tid: 0,
    errCount: 0,
    warnCount: 0,
    logs: []
  };

  const byId = {};
  const body = new El('body', null);
  const html = new El('html', null);
  const doc = {
    byId: byId,
    readyState: 'complete',
    hidden: false,
    body: body,
    documentElement: html,
    listeners: {},
    getElementById: function (id) { return byId[id] || null; },
    createElement: function (tag) { return new El(tag, doc); },
    addEventListener: function (t, fn) { (doc.listeners[t] = doc.listeners[t] || []).push(fn); },
    dispatch: function (t, ev) {
      for (const fn of (doc.listeners[t] || []).slice()) fn(Object.assign({ target: doc, preventDefault: function () {} }, ev || {}));
    }
  };
  body.doc = doc; html.doc = doc;
  doc.appendChild = function (c) { return body.appendChild(c); };

  // root nodes as in index.html
  const game = new El('canvas', doc); game.id = 'game'; byId['game'] = game; body.appendChild(game);
  const ui = new El('div', doc); ui.id = 'ui'; byId['ui'] = ui; body.appendChild(ui);
  const loading = new El('div', doc); loading.id = 'loading'; byId['loading'] = loading;
  loading.className = 'on';
  const loadFill = new El('div', doc); loadFill.id = 'loadFill'; byId['loadFill'] = loadFill; loading.appendChild(loadFill);
  const loadPct = new El('div', doc); loadPct.id = 'loadPct'; byId['loadPct'] = loadPct; loading.appendChild(loadPct);
  body.appendChild(loading);
  const fatal = new El('div', doc); fatal.id = 'fatal'; byId['fatal'] = fatal;
  const fcard = new El('div', doc); fcard.className = 'f-card'; fatal.appendChild(fcard);
  const fh = new El('h2', doc); fcard.appendChild(fh);
  const fp = new El('p', doc); fcard.appendChild(fp);
  body.appendChild(fatal);

  const win = {
    innerWidth: opts.w || 390,
    innerHeight: opts.h || 844,
    devicePixelRatio: opts.dpr || 2,
    confirm: function () { return true; },
    listeners: {},
    addEventListener: function (t, fn) { (win.listeners[t] = win.listeners[t] || []).push(fn); },
    dispatch: function (t, ev) {
      for (const fn of (win.listeners[t] || []).slice()) fn(Object.assign({ target: win, preventDefault: function () {} }, ev || {}));
    }
  };

  const localStorage = {
    _m: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
    setItem(k, v) { this._m[k] = String(v); },
    removeItem(k) { delete this._m[k]; },
    clear() { this._m = {}; }
  };

  const sandbox = {
    window: win,
    document: doc,
    localStorage: localStorage,
    navigator: { vibrate: function () {} },
    location: { search: opts.dev ? '?dev=1' : '', href: 'file:///index.html', reload: function () { H.reloaded = true; } },
    performance: { now: function () { return H.nowMs; } },
    requestAnimationFrame: function (fn) { H.raf.push({ t: H.nowMs, fn: fn }); return H.raf.length; },
    cancelAnimationFrame: function () {},
    setTimeout: function (fn, ms) { H.tid++; H.timers.push({ id: H.tid, t: H.nowMs + (ms || 0), fn: fn }); return H.tid; },
    clearTimeout: function (id) { H.timers = H.timers.filter(t => t.id !== id); },
    setInterval: function (fn, ms) { H.tid++; const t = { id: H.tid, t: H.nowMs + (ms || 0), fn: fn, every: ms }; H.timers.push(t); return t.id; },
    clearInterval: function (id) { H.timers = H.timers.filter(t => t.id !== id); },
    Image: ImageStub,
    console: {
      log: function () { H.logs.push(Array.prototype.map.call(arguments, x => str(x)).join(' ')); },
      warn: function () { H.warnCount++; H.logs.push('WARN ' + Array.prototype.map.call(arguments, x => str(x)).join(' ')); },
      error: function () { H.errCount++; H.logs.push('ERROR ' + Array.prototype.map.call(arguments, x => str(x)).join(' ')); }
    }
  };
  function str(x) {
    if (typeof x === 'string') return x;
    if (x && x.stack) return x.stack;
    try { return JSON.stringify(x); } catch (e) { return String(x); }
  }
  // primitives
  ['Math', 'JSON', 'Date', 'Object', 'Array', 'Set', 'Map', 'Promise', 'Symbol', 'Reflect',
   'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'String', 'Number', 'Boolean', 'RegExp',
   'Error', 'TypeError', 'RangeError', 'SyntaxError', 'encodeURIComponent', 'decodeURIComponent',
   'Uint8ClampedArray', 'Uint8Array', 'Float32Array', 'Infinity', 'NaN', 'undefined'
  ].forEach(k => { sandbox[k] = global[k]; });
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);

  function tick(ms) {
    const end = H.nowMs + ms;
    let guard = 0;
    while (H.nowMs < end && guard < 10000000) {
      guard++;
      H.nowMs += 16.7;
      const due = H.raf;
      H.raf = [];
      for (const f of due) {
        try { f.fn(H.nowMs); } catch (e) { H.errCount++; H.logs.push('ERROR raf ' + (e && e.stack || e)); }
      }
      const now = H.nowMs;
      H.timers = H.timers.filter(t => {
        if (t.t <= now) {
          try { t.fn(); } catch (e) { H.errCount++; H.logs.push('ERROR timer ' + (e && e.stack || e)); }
          if (t.every) t.t = now + t.every; else return false;
        }
        return true;
      });
    }
    if (guard >= 10000000) throw new Error('tick guard overflow');
  }

  const root = html;
  function findEl(sel) {
    const all = [root, body];
    const res = [];
    for (const r of all) r._all(res);
    for (const el of res) if (el._matchFull(sel)) return el;
    return null;
  }
  function click(selOrEl) {
    const el = typeof selOrEl === 'string' ? findEl(selOrEl) : selOrEl;
    if (!el) throw new Error('click: element not found: ' + selOrEl);
    el.dispatch('click');
    return el;
  }
  function clickAll(sel) {
    const all = [body];
    const res = [];
    for (const r of all) r._all(res);
    const matched = res.filter(el => el._matchFull(sel));
    for (const el of matched) el.dispatch('click');
    return matched.length;
  }

  function load() {
    const src = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
    vm.runInContext(src, ctx, { filename: 'game.js' });
    tick(300);
    return sandbox;
  }

  return {
    H: H,
    doc: doc,
    win: win,
    body: body,
    byId: byId,
    localStorage: localStorage,
    sandbox: sandbox,
    tick: tick,
    click: click,
    clickAll: clickAll,
    findEl: findEl,
    load: load,
    get F() { return sandbox.window.FALLEN_DEBUG; }
  };
}

module.exports = { createHarness: createHarness, El: El };
