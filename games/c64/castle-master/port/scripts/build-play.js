'use strict';
// Writes games/c64/castle-master/play.html: port/play.template.html with, at <!-- port -->, the
// port's sources (each file of port/src as a script of its own, core.js first), the page's
// machine (page/runtime.js), its modern view of the 3D view (page/modern.js) and its fast CPU
// (page/fast.js), the pacing the fit wrote (cost.json) and the machine as the page carries it
// (scripts/pack-data.js: memory and chips at the loader's jump, the code left out); and the
// sections that describe the port (page/port-results.html, modern.html, fast.html,
// differences.html).
//   node build-play.js
// pack-data.js reads the snapshot from work/, which only a contributor with the game has; without
// it the data already in play.html is kept.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, '../play.html');
const script = (name, text) => '<script>\n/* port/' + name + ' */\n' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
let html = fs.readFileSync(path.join(ROOT, 'play.template.html'), 'utf8');
const parts = [];
const src = ['core.js'].concat(fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js') && f !== 'core.js').sort());
for (const f of src) parts.push(script('src/' + f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
for (const f of ['runtime.js', 'modern.js', 'fast.js']) parts.push(script('page/' + f, fs.readFileSync(path.join(ROOT, 'page', f), 'utf8')));
parts.push('<script>\nwindow.CM_COST = ' + fs.readFileSync(path.join(ROOT, 'cost.json'), 'utf8').trim() + ';\n</script>');
let data;
try {
  data = JSON.stringify(require('./pack-data.js').pack().state);
} catch (e) {
  const m = fs.existsSync(OUT) && /<script type="application\/json" id="cm-data">([^<]*)<\/script>/.exec(fs.readFileSync(OUT, 'utf8'));
  if (!m) throw new Error('no snapshot in work/ and no play.html to keep its data from: ' + e.message);
  console.log('kept the data in play.html (' + e.message.split('\n')[0] + ')');
  data = m[1];
}
parts.push('<script type="application/json" id="cm-data">' + data + '</script>');
html = html.replace('<!-- port -->', () => parts.join('\n'));   // a function, so that $' in the code stays as it is
for (const f of ['port-results', 'modern', 'fast', 'differences']) {
  const p = path.join(ROOT, 'page', f + '.html');
  if (fs.existsSync(p)) html = html.replace('<!-- ' + f + ' -->', () => fs.readFileSync(p, 'utf8').trim());
}
fs.writeFileSync(OUT, html);
console.log('wrote play.html, ' + Math.round(html.length / 1024) + ' KB');
