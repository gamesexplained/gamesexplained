'use strict';
// Puts each shared block of port/page/ into the pages that carry it. A page carries block <name>
// as the lines from /* <name> */ to // end of <name>, inside a <script>; this replaces those lines
// with port/page/<name>.js, which opens and ends with the same two lines, so every page holds the
// same text and the tests' g.sameBlock(name) passes. Pages are self-contained (kit/skills/core/
// 70-minisite, "Building it"): the blocks are copied in, never loaded.
//   node games/spectrum/lords-of-chaos/port/scripts/build-pages.js
const fs = require('fs'), path = require('path');
const GAME = path.resolve(__dirname, '../..');
const BLOCKS = path.join(GAME, 'port', 'page');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let changed = 0;
for (const page of fs.readdirSync(GAME).filter(f => f.endsWith('.html'))) {
  let src = fs.readFileSync(path.join(GAME, page), 'utf8');
  const before = src;
  for (const f of fs.readdirSync(BLOCKS).filter(f => f.endsWith('.js'))) {
    const name = f.slice(0, -3);
    const re = new RegExp('^/\\* ' + esc(name) + ' \\*/$[\\s\\S]*?^// end of ' + esc(name) + '$', 'm');
    const text = fs.readFileSync(path.join(BLOCKS, f), 'utf8').replace(/\n$/, '');
    src = src.replace(re, () => text);
  }
  if (src !== before) { fs.writeFileSync(path.join(GAME, page), src); changed++; console.log('updated ' + page); }
}
if (!changed) console.log('every page already holds the blocks as port/page has them');
