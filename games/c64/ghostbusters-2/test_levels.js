'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
function embedded(file, id) {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const match = text.match(new RegExp(`<script id="${id}" type="application/json">([^<]+)</script>`));
  assert(match, `${file}: missing ${id}`);
  return JSON.parse(match[1]);
}
const levels = embedded('levels.html', 'level-frames');
assert.equal(levels.length, 3);
assert.deepStrictEqual(levels[0], embedded('index.html', 'frame-data'));
assert.deepStrictEqual(levels[1], embedded('graphics.html', 'broadway-frame-data'));
assert.deepStrictEqual(levels[2], embedded('graphics.html', 'museum-frame-data'));
console.log('OK - episode frames match the verified frame viewers');
