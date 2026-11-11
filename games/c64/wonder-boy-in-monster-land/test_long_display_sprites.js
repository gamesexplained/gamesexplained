const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'long-display-observations.json')));
const html = fs.readFileSync(path.join(root, 'graphics.html'), 'utf8');
const gallery = JSON.parse(html.match(/<script id="observed-sprites-data" type="application\/json">([^<]+)<\/script>/)[1]);
assert.strictEqual(metadata.schema, 1);
assert.strictEqual(metadata.probe_frames, 1000);
let count = 0;
for (const group of metadata.loads) {
  const file = path.join(root, 'parts', `stage-${String(group.stage).padStart(2, '0')}`, 'listing.json');
  const memory = Buffer.alloc(65536);
  for (const record of JSON.parse(fs.readFileSync(file)).records) {
    if (record.b) Buffer.from(record.b).copy(memory, record.a);
  }
  for (const slot of group.slots) {
    const matches = gallery.filter(x => x.load === group.stage && x.pointer === slot.pointer);
    assert.strictEqual(matches.length, 1);
    const pixels = memory.subarray(slot.address, slot.address + 63);
    assert.strictEqual(crypto.createHash('sha256').update(pixels).digest('hex'), slot.hash);
    const sprite = matches[0], display = slot.display[0];
    assert.deepStrictEqual(sprite.pixels, [...pixels]);
    assert.strictEqual(sprite.frame, slot.first_frame);
    assert.strictEqual(sprite.displaySlot, display.index);
    assert.strictEqual(sprite.y, display.y);
    assert.strictEqual(sprite.colour, display.colour & 15);
    assert.strictEqual(sprite.multicolour, Boolean(display.flags & 1));
    assert.strictEqual(slot.executions, 0);
    count++;
  }
}
assert.strictEqual(count, 8);
console.log('Long display sprite evidence matches the listings and gallery.');
