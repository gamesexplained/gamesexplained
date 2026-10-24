'use strict';
// The port's source, loaded in node as the page loads it: core.js, then every group.
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '../src');
function loadPort() {
  require(path.join(SRC, 'core.js'));
  for (const f of fs.readdirSync(SRC).sort()) if (f !== 'core.js' && f.endsWith('.js')) require(path.join(SRC, f));
  return globalThis.SFPort;
}
module.exports = { loadPort, SRC };
