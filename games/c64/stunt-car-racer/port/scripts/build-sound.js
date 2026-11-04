'use strict';
// How it works (index.html), its sound: the practice race race-sound.js records from the Play tab's
// machine, put in the page's block sfx-race for its player to play back. Run it after
// build-play.js; test_sound.js holds the published page to it.
//   node build-sound.js
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../..');
const { record, carried } = require('./race-sound.js');
const r = record(DIR);
if (r.split.length || r.other.length) { console.log('the race cannot be played back: split ' + r.split + ', other writes ' + r.other); process.exit(1); }
const file = path.join(DIR, 'index.html');
const text = fs.readFileSync(file, 'utf8');
const re = /(<script type="application\/json" id="sfx-race">)[^<]*(<\/script>)/;
if (!re.test(text)) { console.log('index.html has no block sfx-race'); process.exit(1); }
const json = JSON.stringify(carried(r));
fs.writeFileSync(file, text.replace(re, (_, a, b) => a + json + b));
console.log('wrote index.html, ' + Math.round(fs.statSync(file).size / 1024) + ' KB: a race of ' + r.frames + ' frames, ' + r.events.length + ' calls, played from frame ' + r.from);
