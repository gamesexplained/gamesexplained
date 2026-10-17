'use strict';
// The port's files, loaded as the page loads them (core.js first, then every group), giving
// globalThis.WTPort.
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, '..', 'src');
function loadPort() {
  if (!globalThis.WTPort) {
    require(path.join(SRC, 'core.js'));
    for (const f of fs.readdirSync(SRC).filter(f => /^g-.*\.js$/.test(f)).sort()) require(path.join(SRC, f));
  }
  return globalThis.WTPort;
}
module.exports = { loadPort, SRC };
