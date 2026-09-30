// The page's picture against site/lib/c64.js's renderFrame, on every saved moment of play.
const fs = require('fs'), path = require('path');
require('../../../../../site/lib/c64.js'); require('../src/screen.js');
const dir = path.join(__dirname, '../../work/states');
let ok = 0, n = 0, t = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, f)));
  const ram = new Uint8Array(Buffer.from(s.ram, 'base64')), colour = new Uint8Array(Buffer.from(s.colour, 'base64'));
  const r = C64.renderFrame({ vic: s.vic.slice(0, 47), cia2: [0xC7, 0x3F], writes: [], ram: [{ a: 0, b: ram }], colour });
  const px = new Uint8Array(384 * 272), t0 = Date.now();
  ChillerScreen.draw(ram, s.vic, colour, px); t += Date.now() - t0;
  let d = 0, first = -1;
  for (let i = 0; i < px.length; i++) if (px[i] !== r.px[i]) { d++; if (first < 0) first = i; }
  n++; if (!d) ok++; else if (n - ok <= 5) console.log(f, d, 'pixels differ, first at', first % 384, Math.floor(first / 384), 'renderFrame', r.px[first], 'page', px[first]);
}
console.log(ok + '/' + n + ' pictures identical to renderFrame; ' + (t / n).toFixed(2) + ' ms a picture');
