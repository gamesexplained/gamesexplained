/* Replays of measured controller outputs; this is not a game emulator. */
(() => {
  'use strict';
  const data = WZ_PLAYER_DATA;
  const sprites = data.sprites.map(s => Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  const elevator = Uint8Array.from(atob(data.elevatorSprite), c => c.charCodeAt(0));
  const byId = new Map(data.scenes.map(s => [s.id, s]));
  const stops = [];
  const $ = id => document.getElementById(id);

  function sprite(c, pixels, x, y, color, multi, scale = 4) {
    const colors = [null, palette[14], palette[color], palette[1]];
    for (let row = 0; row < 21; row++) {
      for (let col = 0; col < (multi ? 12 : 24); col++) {
        const value = multi
          ? (pixels[row * 3 + (col >> 2)] >> (6 - 2 * (col % 4))) & 3
          : (pixels[row * 3 + (col >> 3)] >> (7 - col % 8)) & 1;
        if (!value) continue;
        c.fillStyle = multi ? colors[value] : palette[color];
        c.fillRect(x + col * (multi ? 2 : 1) * scale, y + row * scale,
          (multi ? 2 : 1) * scale, scale);
      }
    }
  }

  function replay(prefix, selection) {
    const canvas = $(prefix + '-canvas'), c = canvas.getContext('2d');
    const range = $(prefix + '-time'), play = $(prefix + '-play');
    const background = document.createElement('canvas');
    const crop = { x: 64, y: 32, width: 160, height: prefix === 'travel' ? 144 : 80 };
    canvas.width = crop.width * 4; canvas.height = crop.height * 4;
    const screenX = x => (x - 24 - crop.x) * 4;
    const screenY = y => (y - 50 - crop.y) * 4;
    let scene, timer = null;
    function stop() { clearTimeout(timer); timer = null; play.textContent = 'Play'; }
    stops.push(stop);
    function draw() {
      const t = +range.value, f = scene.frames[t];
      c.imageSmoothingEnabled = false;
      c.drawImage(background, crop.x * 2, crop.y * 2, crop.width * 2, crop.height * 2,
        0, 0, canvas.width, canvas.height);
      if (!scene.videoFrames) {
        c.strokeStyle = '#ffffff55'; c.lineWidth = 2; c.beginPath();
        for (let i = 0; i <= t; i++) {
          const v = scene.frames[i].v, x = screenX(v[0] + 12), y = screenY(v[1] + 10);
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      if (scene.elevator) {
        const e = scene.elevator[t];
        sprite(c, elevator, screenX(e[0]), screenY(e[1]), 8, true);
      }
      sprite(c, sprites[f.p], screenX(f.v[0]), screenY(f.v[1]), f.color, f.multi);
      if (f.ghost) {
        const g = f.ghost;
        sprite(c, sprites[g.p], screenX(g.x), screenY(g.y), g.color, g.multi);
      }
      const state = f.phase === 'complete' ? 'Death animation complete'
        : f.phase === 'death' ? 'Death animation' : f.v[3] ? 'Death before landing' : f.v[5] ? 'Spell active'
        : f.v[2] ? 'Jumping' : f.v[4] ? 'Riding' : 'Jump inactive';
      $(prefix + '-count').textContent = t + ' / ' + (scene.frames.length - 1);
      $(prefix + '-readout').textContent = state + ' · X ' + f.v[0] + ' · Y ' + f.v[1]
        + (f.v[2] ? ' · ' + f.v[2] + ' jump steps remaining' : '');
      canvas.setAttribute('aria-label', scene.title + (scene.videoFrames ? ', frame ' : ', update ') + t + ': ' + state
        + ', X ' + f.v[0] + ', Y ' + f.v[1] + '.');
    }
    function choose() {
      stop(); scene = byId.get(selection());
      range.max = scene.frames.length - 1; range.value = 0;
      document.querySelector('label[for="' + prefix + '-time"]').textContent = scene.videoFrames ? 'Frame' : 'Update';
      paintMap(background, scene, false);
      $(prefix + '-note').textContent = scene.note;
      draw();
    }
    function tick() {
      if (+range.value >= +range.max) { stop(); return; }
      range.value = +range.value + 1; draw();
      if (+range.value === +range.max) stop();
      else timer = setTimeout(tick, delay());
    }
    function delay() { return scene.frames[+range.value].duration ?? scene.frameMs ?? 160; }
    play.onclick = () => {
      if (timer !== null) { stop(); return; }
      if (+range.value === +range.max) { range.value = 0; draw(); }
      play.textContent = 'Pause'; timer = setTimeout(tick, delay());
    };
    $(prefix + '-reset').onclick = () => { stop(); range.value = 0; draw(); };
    range.oninput = () => { stop(); draw(); };
    choose();
    return choose;
  }

  const chooseMovement = replay('player', () => {
    const kind = $('player-example').value;
    return ['walk', 'jump', 'vertical'].includes(kind) ? kind + '-' + $('player-gap').value : kind;
  });
  $('player-example').onchange = () => {
    $('player-gap-control').hidden = !['walk', 'jump', 'vertical'].includes($('player-example').value);
    chooseMovement();
  };
  $('player-gap').onchange = chooseMovement;
  const chooseSpell = replay('travel', () => $('travel-example').value);
  $('travel-example').onchange = chooseSpell;

  let spent = 0;
  function drawInvisibility() {
    const f = data.invisibility[spent], canvas = $('invisibility-canvas'), c = canvas.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, canvas.width, canvas.height);
    sprite(c, sprites[0], 44, 16, f.color, f.multi, 4);
    if (!f.multi && f.color === 0) {
      c.fillStyle = '#b2b2b2'; c.font = '14px system-ui'; c.textAlign = 'center';
      c.fillText('Hidden', canvas.width / 2, 64);
    }
    $('invisibility-count').textContent = f.remaining + ' / 32 protection remaining';
    $('invisibility-hit').disabled = spent === 32;
    $('invisibility-reset').disabled = spent === 0;
    $('invisibility-bar').value = f.remaining;
    canvas.setAttribute('aria-label', 'Wizard appearance after ' + spent + ' protected fatal reports. '
      + (spent < 16 ? 'The wizard blends into the black background.' : 'The sprite is becoming visible.'));
  }
  $('invisibility-safe').onclick = () => {
    $('invisibility-message').textContent = 'A safe update leaves the protection unchanged.';
    drawInvisibility();
  };
  $('invisibility-hit').onclick = () => {
    spent++;
    $('invisibility-message').textContent = spent === 32
      ? 'The last unit was spent. The next eligible fatal report reaches the death routine.'
      : 'One fatal report was suppressed. Staying in danger can spend more units on later updates.';
    drawInvisibility();
  };
  $('invisibility-reset').onclick = () => {
    spent = 0; $('invisibility-message').textContent = 'The spell starts with 32 units of protection.';
    drawInvisibility();
  };
  drawInvisibility();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stops.forEach(stop => stop()); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => stops.forEach(stop => stop()));
})();
