'use strict';
// Writes games/c64/alter-ego/play.html, levels.html and graphics.html.
// play.html: port/play.template.html with, at <!-- port -->, the
// port's sources (each file of port/src as a script of its own, core.js first), the page's
// machine (page/runtime.js), the pacing the fit wrote (cost.json) and the game's data as the page
// carries it (scripts/pack-data.js: the machine at the hand-over and the files the game reads,
// its program left out); and the sections that describe the port (page/port-results.html,
// page/differences.html).
// levels.html (the Stages tab): port/levels.template.html with, at <!-- port -->, the port's
// drawing routines (src/core.js, natives.js, ui.js), and at <!-- stages -->, the seven stages'
// headers as the life object reads them from the MAP files the Play page carries: the file, the
// eight bytes of ages, the 24 choices, the map's words, the cell the stage starts on and the
// number of scene blocks.
// graphics.html (the Graphics tab): port/graphics.template.html with the same drawing routines
// and the waits they make (src/time.js),
// and stages, and at <!-- glyphs -->, the character ROM's glyphs the game copies (as play.html
// carries them).
//   node build-play.js
// pack-data.js reads the disks from work/, which only a contributor with the game has; without
// them the data already in play.html is kept.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, '../play.html');
const script = (name, text) => '<script>\n/* port/' + name + ' */\n' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
let html = fs.readFileSync(path.join(ROOT, 'play.template.html'), 'utf8');
const parts = [];
const src = ['core.js'].concat(fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js') && f !== 'core.js').sort());
for (const f of src) parts.push(script('src/' + f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
parts.push(script('page/runtime.js', fs.readFileSync(path.join(ROOT, 'page', 'runtime.js'), 'utf8')));
parts.push('<script>\nwindow.AE_COST = ' + fs.readFileSync(path.join(ROOT, 'cost.json'), 'utf8').trim() + ';\n</script>');
let data;
try {
  const p = require('./pack-data.js').pack();
  data = JSON.stringify({ state: p.state, files: p.files, glyphs: p.glyphs });
} catch (e) {
  const m = fs.existsSync(OUT) && /<script type="application\/json" id="ae-data">([^<]*)<\/script>/.exec(fs.readFileSync(OUT, 'utf8'));
  if (!m) throw new Error('no disks in work/ and no play.html to keep its data from: ' + e.message);
  console.log('kept the data in play.html (' + e.message.split('\n')[0] + ')');
  data = m[1];
}
parts.push('<script type="application/json" id="ae-data">' + data + '</script>');
html = html.replace('<!-- port -->', () => parts.join('\n'));   // a function, so that $' in the code stays as it is
for (const f of ['port-results', 'differences']) {
  const p = path.join(ROOT, 'page', f + '.html');
  if (fs.existsSync(p)) html = html.replace('<!-- ' + f + ' -->', () => fs.readFileSync(p, 'utf8').trim());
}
fs.writeFileSync(OUT, html);
console.log('wrote play.html, ' + Math.round(html.length / 1024) + ' KB');

// ---- the Stages tab
// a MAP file's payload: 252 bytes of each 254-byte record, after its first
function payload(b) {
  const out = [];
  for (let i = 0; i < b.length; i += 254) for (let j = i + 1; j < Math.min(i + 253, b.length); j++) out.push(b[j]);
  return out;
}
// each stage's header (load_stage_header, $88A9, after open_stage_map_stream): stage 1's in MAP1 and stage 7's in MAP27 at the
// place the file's first four bytes give, stage 2's in MAP27 after those four bytes, stages 3-6 at
// the start of MAP3-MAP6. Its words: four of ages and the stages left, 24 choices, the map's
// length and words, the cell the stage starts on, the number of scene blocks
function stages(files) {
  const out = [];
  for (let st = 1; st <= 7; st++) {
    const file = st === 1 ? 'MAP1' : st === 2 || st === 7 ? 'MAP27' : 'MAP' + st;
    const b = payload(Buffer.from(files[file], 'base64'));
    const w = o => b[o] | b[o + 1] << 8;
    let o = st === 1 || st === 7 ? (b[0] | b[1] << 8 | b[2] << 16 | b[3] * 16777216) : st === 2 ? 4 : 0;
    const h8 = [0, 2, 4, 6].map(i => w(o + i)); o += 8;
    const choices = Array.from({ length: 24 }, (_, i) => w(o + 2 * i)); o += 48;
    const n = w(o); o += 2;
    const grid = Array.from({ length: n }, (_, i) => w(o + 2 * i)); o += 2 * n;
    const start = w(o); o += 2;
    out.push({ file, h8, choices, grid, start, blocks: w(o) });
  }
  return out;
}
const LEVELS = path.join(ROOT, '../levels.html');
let lv = fs.readFileSync(path.join(ROOT, 'levels.template.html'), 'utf8');
const draw = ['core.js', 'natives.js', 'ui.js'].map(f => script('src/' + f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
const st = JSON.stringify(stages(JSON.parse(data).files));
lv = lv.replace('<!-- port -->', () => draw.join('\n'));
lv = lv.replace('<!-- stages -->', () => '<script type="application/json" id="ae-stages">' + st + '</script>');
fs.writeFileSync(LEVELS, lv);
console.log('wrote levels.html, ' + Math.round(lv.length / 1024) + ' KB');

// ---- the Graphics tab
const GRAPHICS = path.join(ROOT, '../graphics.html');
let gr = fs.readFileSync(path.join(ROOT, 'graphics.template.html'), 'utf8');
gr = gr.replace('<!-- port -->', () => draw.concat(script('src/time.js', fs.readFileSync(path.join(ROOT, 'src', 'time.js'), 'utf8'))).join('\n'));
gr = gr.replace('<!-- stages -->', () => '<script type="application/json" id="ae-stages">' + st + '</script>');
gr = gr.replace('<!-- glyphs -->', () => '<script type="application/json" id="ae-glyphs">' + JSON.stringify(JSON.parse(data).glyphs) + '</script>');
fs.writeFileSync(GRAPHICS, gr);
console.log('wrote graphics.html, ' + Math.round(gr.length / 1024) + ' KB');
