'use strict';
// Compare the page renderer with independently rendered captured maps.
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, 'levels.html'), 'utf8');
const data = html.match(/<script id="map-data" type="application\/json">([\s\S]*?)<\/script>/);
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert(data && script, 'map data and renderer are present');
const elements = {};
function element(id) {
  if (!elements[id]) elements[id] = {id, style: {}, listeners: {}, options: [], checked: false,
    addEventListener(type, fn) { this.listeners[type] = fn; },
    append(option) { this.options.push(option); }, scrollTo() {}};
  return elements[id];
}
element('map-data').textContent = data[1];
const canvas = element('map');
canvas.parentElement = {scrollTo() {}};
canvas.getContext = () => ({createImageData(w, h) { return {data: new Uint8ClampedArray(w * h * 4)}; },
  putImageData(image) { canvas.pixels = image.data; }});
const document = {getElementById: element, createElement() { return {}; }};
vm.runInNewContext(script[1], {document, Uint8ClampedArray, JSON, Number, Math, parseInt});
assert.equal(element('map-select').options.length, 31);
const expected = {
  1: [1536, 240, '32ea53104d9fd8b8d57487b5cc413ef5bdf16336850d08a7ec84e8eafdc24dd2'],
  2: [1840, 256, '45a882fec46e1fcc15748a1c03bde12f0303c71bbf3ef14770fe8f95fbc4d39f'],
  3: [1632, 224, 'b1ae66500e367b9c8ccf7d562f5150a21d8b5f287939b75ca2d5c7498fdce0b1'],
  24: [400, 1152, 'fe73d43de6f5540b2e7cfb631108121f3ac55c645aeb12587d70d5a785d8e135'],
  31: [1024, 256, '3cff74b17c833a24feec8f570ef7d88c18f8b7428e4c4eb2f0c994ea57d80ab0'],
};
for (const [number, [width, height, hash]] of Object.entries(expected)) {
  const select = element('map-select'); select.value = String(Number(number) - 1); select.listeners.change();
  assert.equal(canvas.width, width); assert.equal(canvas.height, height);
  assert.equal(crypto.createHash('sha256').update(canvas.pixels).digest('hex'), hash, `load ${number} pixels`);
}
element('zoom').checked = true; element('zoom').listeners.change();
assert.equal(canvas.style.width, '2048px');
assert(element('next').disabled);
console.log('OK - five captured map renderings, selection and zoom');
