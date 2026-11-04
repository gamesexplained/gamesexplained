'use strict';
// The Tracks tab (levels.html): the eight tracks seen from above as the Play tab's machine draws
// them, and each track's figures (track-previews.js), put in the page's block sl-data. Run it after
// build-play.js, since the pictures come from the page that builds; test_levels.js holds the
// published page to them.
//   node build-levels.js
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../..');
const out = require('./track-previews.js').previews(DIR);
const file = path.join(DIR, 'levels.html');
const text = fs.readFileSync(file, 'utf8');
const re = /(<script type="application\/json" id="sl-data">)[^<]*(<\/script>)/;
if (!re.test(text)) { console.log('levels.html has no block sl-data'); process.exit(1); }
const json = JSON.stringify(out);
fs.writeFileSync(file, text.replace(re, (_, a, b) => a + json + b));
console.log('wrote levels.html, ' + Math.round(fs.statSync(file).size / 1024) + ' KB: ' + out.tracks.length + ' tracks, ' + out.tracks.reduce((n, t) => n + t.views.length, 0) + ' pictures');
