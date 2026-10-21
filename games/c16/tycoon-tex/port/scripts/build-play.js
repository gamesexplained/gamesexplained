'use strict';
// Writes games/c16/tycoon-tex/play.html: port/play.template.html with, at <!-- port -->, the
// port's sources (each file of port/src as a script of its own, core.js first), the page's machine
// (page/runtime.js) and the pacing the fit wrote (cost.json); and the section on what differs
// from a C16 (page/differences.html). The page reads the game's memory from listing.json, as
// every page of the game does.
//   node build-play.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, '../play.html');
const script = (name, text) => '<script>\n/* port/' + name + ' */\n' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
let html = fs.readFileSync(path.join(ROOT, 'play.template.html'), 'utf8');
const parts = [];
const src = ['core.js'].concat(fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js') && f !== 'core.js').sort());
for (const f of src) parts.push(script('src/' + f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
parts.push(script('page/runtime.js', fs.readFileSync(path.join(ROOT, 'page', 'runtime.js'), 'utf8')));
parts.push('<script>\nwindow.TEX_COST = ' + fs.readFileSync(path.join(ROOT, 'cost.json'), 'utf8').trim() + ';\n</script>');
html = html.replace('<!-- port -->', () => parts.join('\n'));   // a function, so that $' in the code stays as it is
for (const f of ['differences']) {
  const p = path.join(ROOT, 'page', f + '.html');
  if (fs.existsSync(p)) html = html.replace('<!-- ' + f + ' -->', () => fs.readFileSync(p, 'utf8').trim());
}
fs.writeFileSync(OUT, html);
console.log('wrote play.html, ' + Math.round(html.length / 1024) + ' KB');
