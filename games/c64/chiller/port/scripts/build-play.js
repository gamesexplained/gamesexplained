'use strict';
// Writes games/c64/chiller/play.html: port/play.template.html with the port's sources put in at
// <!-- port --> (each file of port/src as a script of its own, the groups in a fixed order) and
// the cost table the pacing fit wrote (port/cost.json).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ORDER = ['kernal.js', 'core.js', 'g-fabric.js', 'g-player.js', 'g-energy.js', 'g-enemies.js', 'g-screens.js', 'screen.js', 'runtime.js'];
let html = fs.readFileSync(path.join(ROOT, 'play.template.html'), 'utf8');
const parts = [];
for (const f of ORDER) {
  const p = path.join(ROOT, 'src', f);
  if (!fs.existsSync(p)) { console.log('missing ' + f); continue; }
  parts.push('<script>\n/* port/src/' + f + ' */\n' + fs.readFileSync(p, 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
}
const cost = path.join(ROOT, 'cost.json');
if (fs.existsSync(cost)) parts.push('<script>\nwindow.CHILLER_COST = ' + fs.readFileSync(cost, 'utf8').trim() + ';\n</script>');
html = html.replace('<!-- port -->', () => parts.join('\n'));   // a function, so that $' in the code stays as it is
for (const f of ['port-results', 'differences']) {
  const p = path.join(ROOT, f + '.html');
  if (fs.existsSync(p)) html = html.replace('<!-- ' + f + ' -->', () => fs.readFileSync(p, 'utf8').trim());
}
fs.writeFileSync(path.join(ROOT, '../play.html'), html);
console.log('wrote play.html, ' + Math.round(html.length / 1024) + ' KB');
