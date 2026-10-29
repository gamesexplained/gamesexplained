'use strict';
// Writes games/c64/green-beret/play.html: port/play.template.html with, at
// <!-- port -->, the port's sources (each file of port/src as a script of its own, core.js first),
// the page's machine (page/runtime.js), the pacing measured on the game (cost.json) and the machine
// as the page carries it (scripts/pack-data.js: memory and chips at the start-up the depacker jumps to,
// the code left out but the sound driver's); and at <!-- differences --> the section on what
// differs from a C64 (page/differences.html).
//   node build-play.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, '../play.html');
const script = (name, text) => '<script>\n/* port/' + name + ' */\n' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
let html = fs.readFileSync(path.join(ROOT, 'play.template.html'), 'utf8');
const parts = [];
const src = ['core.js'].concat(fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js') && f !== 'core.js').sort());
for (const f of src) parts.push(script('src/' + f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
parts.push(script('page/runtime.js', fs.readFileSync(path.join(ROOT, 'page', 'runtime.js'), 'utf8')));
parts.push('<script>\nwindow.GB_COST = ' + fs.readFileSync(path.join(ROOT, 'cost.json'), 'utf8').trim() + ';\n</script>');
parts.push('<script type="application/json" id="gb-data">' + JSON.stringify(require('./pack-data.js').pack().state) + '</script>');
html = html.replace('<!-- port -->', () => parts.join('\n'));   // a function, so that $' in the code stays as it is
html = html.replace('<!-- differences -->', () => fs.readFileSync(path.join(ROOT, 'page', 'differences.html'), 'utf8').trim());
fs.writeFileSync(OUT, html);
console.log('wrote play.html, ' + Math.round(html.length / 1024) + ' KB');
