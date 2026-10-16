// A check on the listing pieces the page of a withheld game carries (kit/scripts/build.py,
// embed_listings). Copy the game's listing.json beside the built page and open the page with
// ?listing-reads in its address: C64.load, BBC.load and Spectrum.load then fetch
// the whole listing behind each embedded one, hand the page the whole image, and note every byte
// and label the page reads from it. Each one the page's data-listing tag leaves out, which the
// published page reads as 0 or fails to find, is reported on the console as an error naming the
// ranges and labels to add to the tag, and the lines of the page's code that read them;
// ListingReads.report() returns the same. Exercise every widget before reading the report: a
// byte only a click reads is read only on that click.
//
// Watched: the image's ram and has, and every copy made of them with slice, subarray, set,
// copyWithin, Uint8Array.from or new Uint8Array(image), into a 64 KB Uint8Array the page makes
// (an emulator's memory, say), through which each byte keeps the address it came from until the
// page writes over it; bytes(), sym(), names and byName. Copied into anything else, a range of
// the image counts as read when it is copied. Not watched: the listing's records themselves (the
// page gets the embedded ones, as published) and anything reached through an array's .buffer.
globalThis.ListingReads = globalThis.ListingReads || (function () {
  const U8 = Uint8Array;     // the real one: while the check runs, the page's is wrapped
  const books = new Map();   // url -> what the page read of that listing that its pieces leave out
  const byId = [];           // the same, by number
  const hex = a => '$' + a.toString(16).toUpperCase().padStart(4, '0');

  function image(L) {
    const ram = new U8(0x10000), has = new U8(0x10000);
    for (const r of L.records) {
      if (!r.b) continue;
      for (let i = 0; i < r.b.length; i++) { ram[r.a + i] = r.b[i]; has[r.a + i] = 1; }
    }
    return { ram, has, names: new Map(L.records.filter(r => r.l).map(r => [r.a, r.l])),
             byName: new Map(L.records.filter(r => r.l).map(r => [r.l, r.a])) };
  }

  function book(url, got, F) {
    if (books.has(url)) return books.get(url);
    const out = new U8(0x10000);   // bytes the whole listing has and the pieces leave out
    let n = 0;
    for (let a = 0; a < 0x10000; a++) if (F.has[a] && !got.has[a]) { out[a] = 1; n++; }
    const B = { url, out, n, full: F, names: new Set([...F.names.keys()].filter(a => !got.names.has(a))),
                labels: new Set([...F.byName.keys()].filter(l => !got.byName.has(l))),
                hit: new U8(0x10000), hitLabels: new Set(), where: new Map(), told: '', timer: 0 };
    B.id = byId.push(B) - 1;
    books.set(url, B);
    return B;
  }

  function ranges(hit) {
    const runs = [];
    for (let a = 0; a < 0x10000; a++) {
      if (!hit[a]) continue;
      const last = runs[runs.length - 1];
      if (last && a - last[1] <= 8) last[1] = a; else runs.push([a, a]);
    }
    return runs.map(([lo, hi]) => hex(lo) + '-' + hex(hi));
  }
  function summary(B) {
    const rs = ranges(B.hit), where = {};
    for (const r of rs) {
      const [lo, hi] = r.split('-').map(x => parseInt(x.slice(1), 16)), at = new Set();
      for (let k = lo >> 6; k <= hi >> 6; k++) if (B.where.has(k)) at.add(B.where.get(k));
      where[r] = [...at].slice(0, 3);
    }
    return { ranges: rs, labels: [...B.hitLabels].sort(), where };
  }
  function tell(B) {
    clearTimeout(B.timer);
    B.timer = setTimeout(() => {
      const s = summary(B), key = JSON.stringify(s);
      if (key === B.told) return;
      B.told = key;
      const parts = [];
      if (s.ranges.length) parts.push('the bytes at ' + s.ranges.map(r => r + (s.where[r].length ? ` (read at ${s.where[r].join(', ')})` : '')).join(', ') +
                                      ', which the published page reads as 0');
      if (s.labels.length) parts.push('the labels ' + s.labels.join(', ') + ', which the published page does not find');
      console.error(`listing-reads: ${B.url}: the page read ${parts.join(', and ')}. Add them to its data-listing tag ` +
                    `for ${B.url}: ${JSON.stringify([...s.labels, ...s.ranges])}`);
    }, 300);
  }
  // The first line of the page's own code on the stack, for each 64-byte block read.
  function caller() {
    const lines = (new Error().stack || '').split('\n').slice(1);
    const own = lines.find(l => !/listing-reads\.js/.test(l)) || '';
    return own.replace(/^\s*at\s+/, '').replace(/^.*?\(?((?:https?|file):[^)]*)\)?$/, '$1').replace(/^.*\//, '');
  }
  // v: where a byte came from, as book number * 0x10000 + address; -1 for the page's own.
  function read(v) {
    if (v < 0) return;
    const B = byId[v >> 16], a = v & 0xFFFF;
    if (!B.out[a] || B.hit[a]) return;
    B.hit[a] = 1;
    if (!B.where.has(a >> 6)) B.where.set(a >> 6, caller());
    tell(B);
  }
  function label(B, l) { if (B.labels.has(l) && !B.hitLabels.has(l)) { B.hitLabels.add(l); tell(B); } }
  function named(B, a) { if (B.names.has(a)) label(B, B.full.names.get(a)); }

  // A Uint8Array t whose element i holds the byte from[i] came from (read above), watched.
  const WATCHED = Symbol('watched');
  const WHOLE = new Set(['values', 'entries', 'forEach', 'map', 'filter', 'reduce', 'reduceRight', 'join', 'indexOf',
    'lastIndexOf', 'includes', 'find', 'findIndex', 'findLast', 'findLastIndex', 'some', 'every', 'toString',
    'toLocaleString', 'toReversed', 'toSorted', 'reverse', 'sort', 'with']);
  const own = n => new Int32Array(n).fill(-1);
  function watched(t, from) {
    const index = p => { if (typeof p !== 'string') return -1; const i = +p; return i >= 0 && i < t.length && Number.isInteger(i) && String(i) === p ? i : -1; };
    const span = (s, e) => { for (let i = s; i < e; i++) read(from[i]); };
    const at = (v, d) => { const n = t.length; return v === undefined ? d : v < 0 ? Math.max(n + Math.trunc(v), 0) : Math.min(Math.trunc(v), n); };
    const bound = (s, e) => { const lo = at(s, 0); return [lo, Math.max(at(e, t.length), lo)]; };
    const P = new Proxy(t, {
      get(t, p) {
        if (p === WATCHED) return { t, from };
        const i = index(p);
        if (i >= 0) { read(from[i]); return t[i]; }
        const v = t[p];
        if (typeof v !== 'function') return v;
        if (p === 'subarray') return (s, e) => { const [lo, hi] = bound(s, e); return watched(t.subarray(lo, hi), from.subarray(lo, hi)); };
        if (p === 'slice') return (s, e) => { const [lo, hi] = bound(s, e); return watched(t.slice(lo, hi), from.slice(lo, hi)); };
        if (p === 'set') return (src, off = 0) => {
          const w = src && src[WATCHED];
          t.set(w ? w.t : src, off);
          if (w) from.set(w.from, off); else from.fill(-1, off, off + src.length);
        };
        if (p === 'fill') return (v, s, e) => { const [lo, hi] = bound(s, e); t.fill(v, lo, hi); from.fill(-1, lo, hi); return P; };
        if (p === 'copyWithin') return (to, s, e) => { const [lo, hi] = bound(s, e), d = at(to, 0); t.copyWithin(d, lo, hi); from.copyWithin(d, lo, hi); return P; };
        if (p === 'at') return k => { const j = k < 0 ? t.length + k : k; if (j >= 0 && j < t.length) read(from[j]); return t.at(k); };
        if (p === Symbol.iterator || WHOLE.has(p)) return (...args) => { span(0, t.length); return v.apply(t, args); };
        return v.bind(t);
      },
      set(t, p, v) {
        const i = index(p);
        if (i >= 0) from[i] = -1;
        t[p] = v;
        return true;
      },
    });
    return P;
  }

  // While the check runs, the page's Uint8Array makes a watched copy of a watched array, and a
  // watched 64 KB array for the page's own memory, so a byte copied into either keeps its source.
  let copies = false;
  function watchCopies() {
    if (copies) return;
    copies = true;
    function Watching(...args) {
      const w = args.length === 1 && args[0] && args[0][WATCHED];
      if (w) return watched(new U8(w.t), w.from.slice());
      if (args.length === 1 && args[0] === 0x10000 && (new.target === Watching || new.target === undefined)) return watched(new U8(0x10000), own(0x10000));
      return Reflect.construct(U8, args, new.target === undefined || new.target === Watching ? U8 : new.target);
    }
    Watching.prototype = U8.prototype;
    Object.setPrototypeOf(Watching, U8);
    Watching.from = function (src, fn, self) {
      const w = !fn && src && src[WATCHED];
      return w ? watched(new U8(w.t), w.from.slice()) : U8.from.call(U8, src, fn, self);
    };
    globalThis.Uint8Array = Watching;
  }
  function map(m, on) {
    return new Proxy(m, { get(m, p) {
      const v = m[p];
      if (p === 'get' || p === 'has') return k => { on(k); return v.call(m, k); };
      return typeof v === 'function' ? v.bind(m) : v;
    } });
  }

  const listings = new Map();
  // got: what the loader made of the pieces the page carries. The page gets the whole image in
  // its place, watched; or got itself when the pieces carry all of the listing.
  async function watch(url, got) {
    if (!listings.has(url)) listings.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));
    let L;
    try { L = await listings.get(url); }
    catch (e) {
      console.error(`listing-reads: ${url}: the whole listing did not load (${e.message}), so this page's reads of it are not ` +
                    'checked; a game whose listing the site withholds needs a copy of it served beside the page for the check');
      return got;
    }
    const F = image(L), B = book(url, got, F);
    if (!B.n && !B.labels.size && !B.names.size) return got;
    watchCopies();
    const from = new Int32Array(0x10000);
    for (let a = 0; a < 0x10000; a++) from[a] = B.id * 0x10000 + a;
    const ram = watched(F.ram, from), has = watched(F.has, from.slice());
    return { ram, has, listing: got.listing,
             names: map(F.names, a => named(B, a)), byName: map(F.byName, l => label(B, l)),
             bytes: (a, n) => ram.subarray(a, a + n),
             sym: n => { label(B, n); if (!F.byName.has(n)) throw new Error('no symbol ' + n); return F.byName.get(n); } };
  }

  function report() {
    const out = {};
    for (const [url, B] of books) out[url] = summary(B);
    return out;
  }
  return { watch, report };
})();
