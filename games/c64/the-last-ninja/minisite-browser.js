'use strict';

const assert = require('node:assert/strict');
const { start } = require('../../../kit/scripts/play_browser.js');

async function canvasImage(page, selector) {
  return page.locator(selector).evaluate(canvas => canvas.toDataURL());
}

async function waitForInk(page, selector) {
  await page.waitForFunction(id => {
    const canvas = document.querySelector(id);
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((channel, index) => index % 4 === 3 && channel !== 0);
  }, selector);
}

async function waitForNewImage(page, selector, before) {
  await page.waitForFunction(([id, old]) => document.querySelector(id).toDataURL() !== old, [selector, before]);
}

async function testMaps(page, game) {
  await page.goto(game + 'levels.html');
  await waitForInk(page, '#room-picture');
  const wastelands = await canvasImage(page, '#room-picture');
  assert.match(await page.locator('#room-record').getAttribute('href'), /source-wastelands\.html#080D$/);

  await page.locator('#room-chapter').selectOption({ label: 'The Inner Sanctum' });
  await waitForNewImage(page, '#room-picture', wastelands);
  assert.equal(await page.locator('#room-slot option').count(), 16);
  assert.match(await page.locator('#room-record').getAttribute('href'), /source-inner-sanctum\.html#080D$/);

  await page.locator('#room-slot').selectOption({ label: '15' });
  await page.waitForFunction(() => document.querySelector('#room-caption').textContent.endsWith('slot 15'));
  assert.match(await page.locator('#room-record').getAttribute('href'), /source-inner-sanctum\.html#0853$/);

  const control = page.locator('#room-exits button').first();
  const destination = await control.textContent();
  await control.click();
  await page.waitForFunction(slot => document.querySelector('#room-caption').textContent.endsWith('slot ' + slot), destination);
  assert.equal(await page.locator('#room-slot').evaluate(select => select.selectedOptions[0].text), destination);
}

async function testGraphics(page, game) {
  await page.goto(game + 'graphics.html');
  const first = await canvasImage(page, '#ninja-pose');
  await page.locator('#pose-frame').press('ArrowRight');
  await waitForNewImage(page, '#ninja-pose', first);
  assert.match(await page.locator('#pose-number').textContent(), /^2 of 7$/);

  const complete = await canvasImage(page, '#ninja-pose');
  await page.locator('#pose-upper').uncheck();
  await waitForNewImage(page, '#ninja-pose', complete);
  await page.locator('#pose-lower').uncheck();
  const paintedPixels = await page.locator('#ninja-pose').evaluate(canvas =>
    canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0));
  assert.equal(paintedPixels, false);

  await page.locator('#pose-lower').check();
  await page.locator('#pose-upper').check();
  const beforePlay = await canvasImage(page, '#ninja-pose');
  await page.locator('#pose-play').click();
  await waitForNewImage(page, '#ninja-pose', beforePlay);
  await page.locator('#pose-play').click();
  assert.equal(await page.locator('#pose-play').getAttribute('aria-pressed'), 'false');

  await waitForInk(page, '#stored-sprite');
  await page.locator('#stored-bank').selectOption('dungeons');
  await waitForInk(page, '#stored-sprite');
  assert.equal(await page.locator('#stored-frame').getAttribute('max'), '57');
  assert.match(await page.locator('#stored-source').getAttribute('href'), /source-dungeons\.html#9E00$/);
  const firstDungeons = await canvasImage(page, '#stored-sprite');
  await page.locator('#stored-frame').press('End');
  await waitForNewImage(page, '#stored-sprite', firstDungeons);
  assert.equal(await page.locator('#stored-number').textContent(), '57 of 57');
}

async function testTapeAndMusic(page, game) {
  await page.goto(game + 'gameplay.html');
  const tape = page.locator('#ninja-load-chapter');
  await tape.selectOption('D');
  assert.equal(await page.locator('#ninja-tape-side').textContent(), 'Side 2');
  assert.deepEqual(await page.locator('[data-segment]').allTextContents(),
    ['0D', '1D', '2D', '3D', '4D', '5D', '6D', '7D']);
  await tape.selectOption('C');
  assert.equal(await page.locator('#ninja-tape-side').textContent(), 'Side 1');

  await page.goto(game + 'music.html');
  assert.equal(await page.locator('#ninja-music [data-tune]').count(), 12);
  const tune = page.getByRole('button', { name: 'Dungeons gameplay', exact: true });
  await tune.click();
  await page.waitForFunction(() => {
    const volume = document.querySelector('#ninja-music [data-g="vol"]');
    return volume && Number(volume.textContent) > 0;
  });
  assert.equal(await tune.getAttribute('aria-pressed'), 'true');
  await page.locator('#ninja-music [data-stop]').click();
  assert.equal(await tune.getAttribute('aria-pressed'), 'false');
}

async function main() {
  const { browser, base, stop } = await start(process.argv.slice(2));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const game = base + '/c64/the-last-ninja/';
  try {
    await testMaps(page, game);
    await testGraphics(page, game);
    await testTapeAndMusic(page, game);
    assert.deepEqual(errors, []);
    console.log('The room viewer, sprite controls, tape selector, and SID player passed.');
  } finally {
    await stop();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
