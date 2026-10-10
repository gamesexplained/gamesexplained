'use strict';
// The page's half of a test that holds a page's port against the game's own code (kit/skills/core/
// 70-minisite, "A widget that runs a mechanic is a claim too"). Such a test cuts the port out of the
// page, runs it in node, runs the game's routine on the committed listing.json in the kit's
// simulator, and compares the two. This file does the cutting, the running and the listing, the
// same way for every game, so a test holds only its cases and its comparison. A test written in
// Python (its simulator is SkoolKit's) uses kit/scripts/port_check.py, which runs this file.
// Checked by kit/scripts/test_port_check.js.
//
//   const path = require('path');
//   const { game, differ } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
//   const g = game(__dirname);                   // the folder the test is in: a game's, or a part's
//   const { createDriver } = g.run('index.html', 'svs-music', 'createDriver');
//   const L = g.listing();                       // listing.json's 64 KB, as C64.load gives it
//
// A block, and its name
// - A page names each block a test runs. The block named name starts at the first line that opens
//   it: the comment /* name */ on a line of its own (a script element headed /* adventure.js */),
//   or the declaration function name(, const name =, let name = or var name = (a function inside
//   the page's own script). It ends before a line // end of name, or else at the end of its
//   <script> element, or at the end of the file for a .js file beside the page.
// - g.block(page, name) gives { text, line, file }: the block's source and the line of the page it
//   starts on. A page with no such block, or a block with nothing in it but its opening comment,
//   stops the test with the page and the name, so a page that renamed its port fails rather than
//   tests nothing.
// - g.run(page, name, ...wanted) runs the block in node and returns { wanted: value } for each
//   identifier asked for, read in the block's own scope and then on globalThis; with none asked
//   for, the block's name, when that is an identifier. An identifier the block does not define
//   stops the test. An error the block throws names the page and its line. Each call runs the
//   block again: call it once and keep what it gives.
//
// The rest of the game folder
// - game(dir) serves the folder to fetch(url), as a page's server would, for C64.load,
//   Spectrum.load and a block that fetches what it draws. A url is a path from the folder (the
//   folder of the last game() made, when a test makes more than one).
// - g.lib(name, ...) loads site/lib/<name>.js, as the page's <script src> does: what it defines
//   is on globalThis then (g.lib('c64') gives C64, and C64.load reads the folder).
// - g.listing(file) gives { ram, has, names, byName, listing, bytes(a, n), sym(label) } from the
//   folder's listing.json (or file, a path from the folder: 'parts/engine/listing.json'), as
//   C64.load and Spectrum.load do, but at once: every byte the listing records, the rest 0, has[a]
//   1 where a record holds the byte. Each call gives ram and has of their own.
// - g.read(file) and g.json(file) read a file in the folder.
//
// Comparing
// - differ(a, b, ranges) gives the first address where the memories a and b differ inside ranges,
//   [first, last] pairs with both included, or -1 when they agree; with no ranges, all of a.
//
// As a script
//   node kit/scripts/port_check.js <game folder> <page> <name> [identifier ...]
//       runs the block and prints what each identifier is: a check that the page's block runs in
//       node before a test is written around it
//   node kit/scripts/port_check.js --ask
//       port_check.py's half: reads { game, page, name, wanted, body, request } as JSON on stdin,
//       runs the block, then body as a function of the wanted identifiers, game (g above) and
//       request, and prints what body returns as JSON
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const IDENT = /^[A-Za-z_$][\w$]*$/;

function fail(msg) {
  const e = new Error(msg);
  e.portCheck = true;
  throw e;
}

// Where the block called name starts in src, and where it ends.
function findBlock(src, name, isScript) {
  const open = [new RegExp('^[ \\t]*/\\*[ \\t]*' + esc(name) + '[ \\t]*\\*/[ \\t]*$', 'm')];
  if (IDENT.test(name)) {
    open.push(new RegExp('^[ \\t]*function\\s+' + esc(name) + '\\s*\\(', 'm'),
              new RegExp('^[ \\t]*(?:const|let|var)\\s+' + esc(name) + '\\s*=', 'm'));
  }
  let start = -1;
  for (const re of open) {
    const m = re.exec(src);
    if (m && (start < 0 || m.index < start)) start = m.index;
  }
  if (start < 0) return null;
  const endMark = new RegExp('^[ \\t]*//[ \\t]*end of ' + esc(name) + '[ \\t]*$', 'm');
  const rest = src.slice(start);
  const marks = [];
  const em = endMark.exec(rest);
  if (em) marks.push(em.index);
  if (!isScript) {
    const close = rest.search(/<\/script>/i);
    if (close >= 0) marks.push(close);
  }
  if (!marks.length && !isScript) return null;     // a page's block must sit in a <script>
  const end = marks.length ? start + Math.min(...marks) : src.length;
  return { start, end };
}

function game(dir) {
  dir = path.resolve(dir);
  const file = f => path.resolve(dir, f);
  const read = f => fs.readFileSync(file(f), 'utf8');
  const json = f => JSON.parse(read(f));

  globalThis.fetch = async url => {
    const p = file(String(url).replace(/[?#].*$/, ''));
    if (!fs.existsSync(p)) return { ok: false, status: 404, json: async () => { throw new Error('404 ' + url); },
                                     text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) };
    return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')),
             text: async () => fs.readFileSync(p, 'utf8'),
             arrayBuffer: async () => { const b = fs.readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } };
  };

  function block(page, name) {
    let src;
    try { src = read(page); } catch (e) { fail(`${page}: cannot read it beside ${dir} (${e.code || e.message})`); }
    const at = findBlock(src, name, /\.m?js$/i.test(page));
    if (!at) fail(`${page}: no block ${name} (a line /* ${name} */, or function ${name}( or const ${name} =, inside a <script>)`);
    const text = src.slice(at.start, at.end);
    if (!text.replace(/^\s*\/\*[\s\S]*?\*\//, '').trim()) fail(`${page}: the block ${name} is empty`);
    return { text, line: src.slice(0, at.start).split('\n').length, file: file(page) };
  }

  function run(page, name, ...wanted) {
    if (!wanted.length) {
      if (!IDENT.test(name)) fail(`${page}: say which identifiers the block ${name} gives: g.run(page, name, 'X')`);
      wanted = [name];
    }
    for (const w of wanted) if (!IDENT.test(w)) fail(`not an identifier: ${w}`);
    const b = block(page, name);
    // One function round the block, opened on its first line, so the page's line numbers stand in
    // a stack trace; its last statement reads each identifier where the block left it.
    const give = wanted.map(w => `${JSON.stringify(w)}: typeof ${w} !== 'undefined' ? ${w} : globalThis[${JSON.stringify(w)}]`);
    const code = '(function () {' + b.text + '\n;return {' + give.join(', ') + '};\n})()';
    let script;
    try {
      script = new vm.Script(code, { filename: b.file, lineOffset: b.line - 1 });
    } catch (e) {
      const last = b.line + b.text.split('\n').length - 1;
      fail(`${page}: the block ${name}, lines ${b.line}-${last}, does not compile on its own (${e.message}); `
           + `a block inside a larger script ends at a line // end of ${name}`);
    }
    const out = script.runInThisContext();
    for (const w of wanted) if (out[w] === undefined) fail(`${page}: the block ${name} defines no ${w}`);
    return out;
  }

  function listing(f = 'listing.json') {
    const L = json(f);
    const ram = new Uint8Array(0x10000), has = new Uint8Array(0x10000);
    for (const r of L.records) {
      if (!r.b) continue;
      for (let i = 0; i < r.b.length; i++) { ram[r.a + i] = r.b[i]; has[r.a + i] = 1; }
    }
    const names = new Map(L.records.filter(r => r.l).map(r => [r.a, r.l]));
    const byName = new Map(L.records.filter(r => r.l).map(r => [r.l, r.a]));
    return { ram, has, names, byName, listing: L,
             bytes: (a, n) => ram.subarray(a, a + n),
             sym: n => { if (!byName.has(n)) throw new Error('no symbol ' + n); return byName.get(n); } };
  }

  function lib(...names) {
    for (const name of names) require(path.join(ROOT, 'site', 'lib', name + '.js'));
  }

  return { dir, root: ROOT, read, json, block, run, listing, lib };
}

function differ(a, b, ranges) {
  for (const [lo, hi] of ranges || [[0, a.length - 1]]) {
    for (let i = lo; i <= hi; i++) if (a[i] !== b[i]) return i;
  }
  return -1;
}

module.exports = { game, differ, ROOT };

if (require.main === module) {
  const args = process.argv.slice(2);
  const usage = () => {
    const head = fs.readFileSync(__filename, 'utf8').split('\n');
    const at = head.findIndex(l => l.startsWith('// As a script'));
    console.log(head.slice(at, head.findIndex((l, i) => i > at && !l.startsWith('//'))).map(l => l.slice(3)).join('\n'));
  };
  const main = async () => {
    if (!args.length || args[0] === '-h' || args[0] === '--help') { usage(); return args.length ? 0 : 2; }
    if (args[0] === '--ask') {
      const ask = JSON.parse(fs.readFileSync(0, 'utf8'));
      const g = game(ask.game);
      const got = g.run(ask.page, ask.name, ...(ask.wanted || []));
      const wanted = Object.keys(got);
      const body = vm.runInThisContext('(async function (' + wanted.concat(['game', 'request']).join(', ') + ') {\n'
                                       + ask.body + '\n})', { filename: 'port_check.py body', lineOffset: -1 });
      const out = await body(...wanted.map(w => got[w]), g, ask.request);
      process.stdout.write(JSON.stringify(out === undefined ? null : out));
      return 0;
    }
    if (args.length < 3) { usage(); return 2; }
    const [dir, page, name, ...wanted] = args;
    const g = game(dir);
    const b = g.block(page, name);
    const got = g.run(page, name, ...wanted);
    const lines = b.text.split('\n').length;
    console.log(`${page}: block ${name}, ${lines} lines from line ${b.line}, runs in node`);
    for (const [k, v] of Object.entries(got)) {
      const kind = typeof v === 'function' ? `function(${v.length})`
        : v && typeof v === 'object' ? `object { ${Object.keys(v).slice(0, 12).join(', ')}${Object.keys(v).length > 12 ? ', ...' : ''} }`
        : typeof v;
      console.log(`  ${k}: ${kind}`);
    }
    return 0;
  };
  // exitCode, not exit(): a pipe takes the answer a piece at a time, and exit() would cut it off
  main().then(code => { process.exitCode = code; }, e => {
    console.error(e.portCheck ? e.message : (e.stack || String(e)));
    process.exitCode = 1;
  });
}
