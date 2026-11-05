'use strict';
// The Opponents tab (opponents.html): the port's routines its widgets run and the Play tab's
// renderer of the view from outside the car, each file of port/src or port/page it names put in
// its block (/* port/src/<file> */, /* port/page/<file> */) as play.html carries it, and the data
// its widgets draw from (opponents-data.js) in its block op-data. Run it after build-play.js;
// test_opponents.js holds the page to both.
//   node build-opponents.js
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../..');
const file = path.join(DIR, 'opponents.html');
let text = fs.readFileSync(file, 'utf8');
let blocks = 0;
text = text.replace(/(<script>\n\/\* port\/((?:src|page)\/[\w-]+\.js) \*\/\n)[\s\S]*?(<\/script>)/g, (_, head, name, end) => {
  blocks++;
  return head + fs.readFileSync(path.join(DIR, 'port', name), 'utf8').replace(/<\/script/gi, '<\\/script') + end;
});
const out = require('./opponents-data.js').opponents(DIR).data;
const re = /(<script type="application\/json" id="op-data">)[^<]*(<\/script>)/;
if (!re.test(text)) { console.log('opponents.html has no block op-data'); process.exit(1); }
text = text.replace(re, (_, a, b) => a + JSON.stringify(out) + b);
fs.writeFileSync(file, text);
console.log('wrote opponents.html, ' + Math.round(fs.statSync(file).size / 1024) + ' KB: ' + blocks + ' of the port\'s files, ' + out.tracks.length + ' tracks and a race of ' + out.race.passes.length + ' passes');
