'use strict';
// Writes games/spectrum/where-time-stood-still/play.html: port/play.template.html with, at
// <!-- port -->, the port's sources (each file of port/src as a script of its own, core.js first),
// the page's machine (page/runtime.js), the wide view (page/wide.js), the mouse (page/mouse.js),
// the pacing the fit wrote (cost.json) and the machine as the page carries it
// (scripts/pack-data.js: the eight banks at the hand-over, the code left out, and ROM 0's bytes
// the game reads); and the sections that describe the port (page/port-results.html,
// differences.html).
//   node build-play.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, '../play.html');
const script = (name, text) => '<script>\n/* port/' + name + ' */\n' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
let html = fs.readFileSync(path.join(ROOT, 'play.template.html'), 'utf8');
const parts = [];
const src = ['core.js'].concat(fs.readdirSync(path.join(ROOT, 'src')).filter(f => /^g-.*\.js$/.test(f)).sort());
for (const f of src) parts.push(script('src/' + f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
parts.push(script('page/runtime.js', fs.readFileSync(path.join(ROOT, 'page', 'runtime.js'), 'utf8')));
for (const f of ['wide.js', 'mouse.js']) parts.push(script('page/' + f, fs.readFileSync(path.join(ROOT, 'page', f), 'utf8')));
parts.push('<script>\nwindow.WT_COST = ' + fs.readFileSync(path.join(ROOT, 'cost.json'), 'utf8').trim() + ';\n</script>');
parts.push('<script type="application/json" id="wt-data">' + JSON.stringify(require('./pack-data.js').pack().state) + '</script>');
html = html.replace('<!-- port -->', () => parts.join('\n'));   // a function, so that $' in the code stays as it is
for (const f of ['port-results', 'differences']) {
  const p = path.join(ROOT, 'page', f + '.html');
  if (fs.existsSync(p)) html = html.replace('<!-- ' + f + ' -->', () => fs.readFileSync(p, 'utf8').trim());
}
fs.writeFileSync(OUT, html);
console.log('wrote play.html, ' + Math.round(html.length / 1024) + ' KB');
