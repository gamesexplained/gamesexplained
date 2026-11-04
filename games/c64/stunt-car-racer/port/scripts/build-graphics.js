'use strict';
// The Graphics tab (graphics.html): the cockpit's frame, the sprites' shapes and the opponent's
// frames as the Play tab's machine shows them (race-frame.js), put in the page's block gx-data;
// and How it works (index.html): frames of a race in a row, in its block hw-data.
// Run it after build-play.js; test_graphics.js holds the published page to them.
//   node build-graphics.js
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../..');
const out = require('./race-frame.js').graphics(DIR);
const index = out.index;
delete out._frames; delete out._passes; delete out.index;
// each page's block of JSON replaced
function put(name, id, data) {
  const file = path.join(DIR, name);
  const text = fs.readFileSync(file, 'utf8');
  const re = new RegExp('(<script type="application/json" id="' + id + '">)[^<]*(</script>)');
  if (!re.test(text)) { console.log(name + ' has no block ' + id); process.exit(1); }
  fs.writeFileSync(file, text.replace(re, (_, a, b) => a + JSON.stringify(data) + b));
  return Math.round(fs.statSync(file).size / 1024) + ' KB';
}
console.log('wrote graphics.html, ' + put('graphics.html', 'gx-data', out) + ': the cockpit, ' + Object.keys(out.sprites).length + ' sprites, ' + out.opponent.length + ' frames of the opponent');
console.log('wrote index.html, ' + put('index.html', 'hw-data', index) + ': ' + (index.views.length + 1) + ' frames of a race');
