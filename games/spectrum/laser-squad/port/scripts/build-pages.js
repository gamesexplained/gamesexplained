'use strict';
// Writes the How it works, Maps, Discoveries and Graphics tabs (games/spectrum/laser-squad/
// index.html, levels.html, discoveries.html and graphics.html): each page's template
// (port/how.template.html, which Discoveries and Graphics share, and port/maps.template.html)
// with, at <!-- standfirst --> and <!-- sections -->, the copy in its folder (how/, maps/, disc/,
// graphics/), and at <!-- port -->, the port's
// sources (core.js first, then each group of port/src), the machine as the Play tab carries it
// (scripts/pack-data.js: the engine's data and the five scenarios' blocks, the code left out), what
// the pages share (page/pages.js) and the page's own script (page.js in its folder); a
// folder with no page.js has no widgets, and its page carries none of them.
//   node build-pages.js
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const script = (name, text) => '<script>\n/* port/' + name + ' */\n' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
const data = '<script type="application/json" id="ls-data">' + JSON.stringify(require('./pack-data.js').pack().state) + '</script>';
const src = ['core.js'].concat(fs.readdirSync(path.join(ROOT, 'src')).filter(f => /^g-.*\.js$/.test(f)).sort());
for (const [dir, out, tpl] of [['how', 'index.html', 'how'], ['maps', 'levels.html', 'maps'], ['disc', 'discoveries.html', 'how'], ['graphics', 'graphics.html', 'how']]) {
  let html = fs.readFileSync(path.join(ROOT, tpl + '.template.html'), 'utf8');
  for (const f of ['standfirst', 'sections']) html = html.replace('<!-- ' + f + ' -->', () => fs.readFileSync(path.join(ROOT, dir, f + '.html'), 'utf8').trim());
  const own = path.join(ROOT, dir, 'page.js');
  let parts = [];
  if (fs.existsSync(own)) {
    parts = src.map(f => script('src/' + f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')));
    parts.push(data);
    parts.push(script('page/pages.js', fs.readFileSync(path.join(ROOT, 'page', 'pages.js'), 'utf8')));
    parts.push(script(dir + '/page.js', fs.readFileSync(own, 'utf8')));
  }
  html = html.replace('<!-- port -->', () => parts.join('\n'));
  fs.writeFileSync(path.join(ROOT, '..', out), html);
  console.log('wrote ' + out + ', ' + Math.round(html.length / 1024) + ' KB');
}
