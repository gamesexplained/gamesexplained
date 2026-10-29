'use strict';
// The port's source, loaded in node as the page loads it: core.js, the names, then every group.
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '../src');
function loadPort() {
  require(path.join(SRC, 'core.js'));
  require(path.join(SRC, 'names.js'));
  for (const f of fs.readdirSync(SRC).sort()) if (/^g-.*\.js$/.test(f)) require(path.join(SRC, f));
  return globalThis.GBPort;
}
module.exports = { loadPort, SRC };
