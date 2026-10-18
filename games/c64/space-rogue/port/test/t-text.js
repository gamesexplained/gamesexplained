'use strict';
// Text, windows and menus alone against the game's (check.js): characters, scrolling and clearing
// in each of the seven windows, mirrored or not, reversed or not, in either buffer; the disk's
// texts decoded with the two block buffers in every state; word wrap, numbers, the menu bar and
// the delay. Nothing here waits for a key: a window's lines are kept from running out, and the
// menus' choosing, which waits, is the lockstep's to check.
const { check, moments } = require('./check.js');
const { loadPort, portDisk } = require('./lockstep.js');
let f = 0;
const t = o => { f += check(Object.assign({ cases: 600, outs: [] }, o)).fails ? 1 : 0; };
const w16 = (M, a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
const pick = (rnd, a) => a[rnd(a.length)];
const TEXT = 0x033C;                       // the cassette buffer, which the game leaves alone

// A window as select_window makes it, the cursor somewhere in it, enough lines left that a new
// line never waits (for a long text, lines: $FF, and a window of more than one line: in one, the
// line a new line blanks leaves the cursor past the right column, and word wrap never ends); text mirrored or not, reversed or not, drawn into either buffer
const win = (M, rnd, o = {}) => {
  const w = o.lines === 0xFF ? 2 + rnd(5) : rnd(7);
  M[0x9E9B] = w;
  M[0x0D24] = M[0x9E9C + w]; M[0x0D26] = o.lines !== undefined ? o.lines : 2 + rnd(40);
  M[0x0D20] = M[0x9EA3 + w]; M[0x0D21] = M[0x9EAA + w];
  M[0x0D22] = M[0x9EB1 + w]; M[0x0D23] = M[0x9EB8 + w];
  const lines = Math.floor((M[0x0D22] - M[0x0D23]) / 9) + 1;
  M[0x50] = (M[0x0D22] - 9 * rnd(lines)) & 255;
  M[0x4F] = M[0x0D20] + rnd(M[0x0D21] - M[0x0D20] + 1);
  if (rnd(2)) { M[0x0D28] = 1; M[0xA137] = M[0xA13F] = 0x81; M[0xA138] = 0x82; M[0xA140] = 0x1B; }
  else { M[0x0D28] = 0; M[0xA137] = M[0xA138] = M[0xA13F] = M[0xA140] = 0xEA; }
  M[0x0D25] = rnd(4) ? 0 : 0xFF;
  M[0x3A] = rnd(2) ? 0x80 : 0;
  return w;
};
// printable characters, with spaces and now and then a control that does not wait: in a text, no
// clear either, which gives the window back its few lines
const WAITS = new Set([0x0E, 0x8E, 0x00]), CLEARS = new Set([0x11, 0x91]);
const char = (rnd, inText) => {
  const a = pick(rnd, [0x20, 0x20, 0x41 + rnd(26), 0x61 + rnd(26), 0x30 + rnd(10), 0x21 + rnd(15), rnd(128), rnd(256),
    0x0F, 0x10, 0x12, 0x11, 0x0D]);
  return WAITS.has(a) || (inText && CLEARS.has(a)) ? 0x20 : a;
};
// words are kept shorter than any window is wide: a longer one never wraps, and the wrap never ends
const text = (M, rnd, a, n, words) => {
  for (let i = 0, run = 0; i < n; i++) {
    if (!words) { M[a + i] = char(rnd, true); continue; }
    run = rnd(5) === 0 || run === 12 ? 0 : run + 1;
    M[a + i] = run ? 0x41 + rnd(26) : 0x20;
  }
  M[a + n] = 0;
};
// The disk's texts that print without waiting: none of $0E or $11 (decoded by the port, which
// resolve_text's own check holds to the game's)
const COUNT = [];                         // the texts in each block, SPB's table at $BD00
const SAFE = (() => {
  const M = moments()[0].ram.slice();
  M[0] = 0x2F; M[1] = 0x34;
  for (let i = 0; i < 256; i += 2) COUNT.push(M[0xBD00 + i] | M[0xBD01 + i] << 8);
  const P = loadPort().makePort(M, portDisk());
  const out = [];
  for (let n = 0; n < 4096; n++) {
    P.resolve_text({ x: n & 255, y: 0xC0 + (n >> 8) });
    let ok = true;
    for (let i = 0; M[0xBF00 + i]; i++) if (M[0xBF00 + i] === 0x0E || M[0xBF00 + i] === 0x11) ok = false;
    if (ok) out.push(n);
  }
  return out;
})();
// a disk text, with the block buffers as play leaves them: holding nothing, or another text's
// blocks (the same block, or the one before or after), read by the port's resolve_text
const textBlock = n => { let k = n, b = 0; while (k >= COUNT[b]) k -= COUNT[b++]; return b; };
const diskText = (M, rnd) => {
  const n = pick(rnd, SAFE);
  const s = pick(rnd, ['none', 'none', 'near', 'held']);
  if (s !== 'none') {
    const b = textBlock(n) + (s === 'held' ? 0 : pick(rnd, [-1, 1]));
    const near = SAFE.filter(m => textBlock(m) === b);
    if (near.length) {
      const m1 = M[1];
      M[1] = 0x34;
      const m = pick(rnd, near);
      loadPort().makePort(M, portDisk()).resolve_text({ x: m & 255, y: 0xC0 + (m >> 8) });
      M[1] = m1;
    }
  }
  return { x: n & 255, y: 0xC0 + (n >> 8) };
};

// ---- windows
t({ name: 'select_window', setup: (M, c, rnd) => ({ y: rnd(4) ? rnd(7) : rnd(256) }), outs: ['a', 'y'] });
t({ name: 'mirror_text_on', outs: ['a'] });
t({ name: 'mirror_text_off', outs: ['a'] });
t({ name: 'save_cursor', setup: (M, c, rnd) => { M[0x9E9B] = rnd(5); }, outs: ['a', 'y'] });
t({ name: 'restore_cursor', setup: (M, c, rnd) => { M[0x9E9B] = rnd(5); }, outs: ['a', 'y'] });

// ---- characters, scrolling, clearing
t({ name: 'print_char', cases: 3000, setup: (M, c, rnd) => { win(M, rnd); return { a: char(rnd) }; }, outs: ['a', 'x', 'y'] });
t({ name: 'scroll_window', cases: 1000, setup: (M, c, rnd) => { win(M, rnd); return { a: 1 + rnd(3) }; }, outs: ['a', 'x', 'y'] });
t({ name: 'clear_window', cases: 300, setup: (M, c, rnd) => { win(M, rnd); }, outs: ['a', 'x', 'y'] });
t({ name: 's_A240', setup: (M, c, rnd) => { win(M, rnd); }, outs: ['a', 'x', 'y'] });

// ---- texts: in memory, and from the disk
t({ name: 'resolve_text', cases: 400, setup: (M, c, rnd) => {
  if (rnd(3)) return diskText(M, rnd);
  // not $FFFF, whose dropped return the hook in standin.js gives (alone, it would return to nowhere)
  const y = pick(rnd, [rnd(0xC0), 0xD0 + rnd(0x30)]);
  return { x: y === 0xFF ? rnd(255) : rnd(256), y };
}, outs: ['a', 'x', 'y'] });
t({ name: 'read_bit', setup: (M, c, rnd) => { M[0x9D21] = pick(rnd, [0xFF, rnd(256)]); M[0x9D22] = pick(rnd, [0xF6, 0xF7, 0xF8, 0xF9]); return { x: rnd(8) }; },
  outs: ['a', 'x', 'y'] });
t({ name: 'start_bits', setup: (M, c, rnd) => { M[0xF600] = rnd(256); M[0xF800] = rnd(256); return { a: rnd(2) ? 0xF6 : 0xF8 }; },
  outs: ['a', 'y', 'n', 'z'] });
t({ name: 'decode_char', cases: 1000, setup: (M, c, rnd) => {
  for (let i = 0; i < 0x400; i++) M[0xF600 + i] = rnd(256);
  M[0x9D21] = rnd(256); M[0x9D22] = pick(rnd, [0xF6, 0xF7, 0xF8]); M[0x9D5D] = rnd(8);
}, outs: ['a', 'x', 'y', 'z'] });
t({ name: 'print_text', cases: 800, setup: (M, c, rnd) => {
  win(M, rnd, { lines: 0xFF });
  if (rnd(3) === 0) return diskText(M, rnd);
  text(M, rnd, TEXT, rnd(40));
  return { x: TEXT & 255, y: TEXT >> 8 };
}, outs: ['a', 'x', 'y'] });
t({ name: 'print_message', cases: 400, setup: (M, c, rnd) => {
  win(M, rnd, { lines: 0xFF });
  if (rnd(3) === 0) { const d = diskText(M, rnd); return { x: d.x, a: d.y }; }
  text(M, rnd, TEXT, rnd(30));
  return { x: TEXT & 255, a: TEXT >> 8 };
}, outs: ['a', 'x', 'y'] });
t({ name: 'print_wrapped', cases: 800, setup: (M, c, rnd) => {
  win(M, rnd, { lines: 0xFF });
  M[0x9B84] = rnd(2);
  if (rnd(2)) { const d = diskText(M, rnd); return { x: d.x, a: d.y }; }
  text(M, rnd, TEXT, rnd(120), true);
  for (let i = 0; i < 3; i++) if (rnd(2)) M[TEXT + rnd(100)] = pick(rnd, [0x0D, 0x0F, 0x10]);
  return { x: TEXT & 255, a: TEXT >> 8 };
}, outs: ['a', 'x', 'y', 'c'], maxSteps: 4e7 });
t({ name: 'wrap_line', cases: 1500, setup: (M, c, rnd) => {
  win(M, rnd);
  M[0x4F] = rnd(6) ? M[0x4F] : M[0x0D21] + 1 + rnd(4);
  M[0x9B84] = rnd(2);
  text(M, rnd, TEXT, rnd(120), true);
  for (let i = 0; i < 3; i++) if (rnd(2)) M[TEXT + rnd(100)] = pick(rnd, [0x0D, 0x0F, 0x20, 0x20]);
  w16(M, 0x74, TEXT);
  return { y: rnd(3) ? 0 : rnd(100) };
}, outs: ['a', 'x', 'y', 'c'] });
t({ name: 'text_length', cases: 400, setup: (M, c, rnd) => {
  if (rnd(3) === 0) { const d = diskText(M, rnd); M[0x74] = d.x; M[0x75] = d.y; return; }
  text(M, rnd, TEXT, rnd(100)); w16(M, 0x74, TEXT);
}, outs: ['a', 'x', 'y'] });
t({ name: 'append_text', cases: 600, setup: (M, c, rnd) => {
  const to = 0xBF80;
  text(M, rnd, to, pick(rnd, [0, rnd(20), 120]));
  w16(M, 0x78, to);
  if (rnd(3) === 0) { const d = diskText(M, rnd); M[0x74] = d.x; M[0x75] = d.y; return; }
  text(M, rnd, TEXT, pick(rnd, [rnd(30), 150])); w16(M, 0x74, TEXT);
}, outs: ['a', 'x', 'y'] });
t({ name: 'find_text', cases: 800, setup: (M, c, rnd) => {
  const n = 5 + rnd(60);
  for (let i = 0; i < n; i++) M[TEXT + i] = 0x41 + rnd(4);
  M[TEXT + n] = 0;
  const w = 0x03B0, k = 1 + rnd(4), at = rnd(n);
  for (let i = 0; i < k; i++) M[w + i] = rnd(2) ? M[TEXT + at + i] || 0x41 : 0x41 + rnd(4);
  M[w + k] = 0;
  w16(M, 0x74, TEXT); w16(M, 0x78, w);
  if (rnd(4) === 0) { const d = diskText(M, rnd); M[0x74] = d.x; M[0x75] = d.y; }
}, outs: ['a', 'x', 'y', 'z', 'n'] });

// ---- numbers
t({ name: 'print_number', cases: 1000, setup: (M, c, rnd) => { win(M, rnd); w16(M, 0x60, pick(rnd, [rnd(65536), rnd(1000), rnd(10), 0, 65535])); },
  outs: ['a', 'x', 'y'] });
t({ name: 'print_signed', cases: 1000, setup: (M, c, rnd) => { win(M, rnd); return { a: rnd(256) }; }, outs: ['a', 'x', 'y'] });
t({ name: 'split_digits', setup: (M, c, rnd) => ({ a: rnd(256) }), outs: ['a', 'x', 'y', 'c', 'n', 'z'] });

// ---- the menus' drawing
t({ name: 'invert_bar', setup: (M, c, rnd) => { win(M, rnd); M[0x4F] = 1 + rnd(36); return { y: rnd(4) ? rnd(30) : rnd(256) }; },
  outs: ['a', 'x', 'y'] });
t({ name: 'dim_item', setup: (M, c, rnd) => { win(M, rnd); return { y: rnd(4) ? 1 + rnd(30) : rnd(256) }; }, outs: ['a', 'x', 'y'] });
const items = (M, rnd, n) => {
  const list = 0x03C0, ok = 0x03E0;
  for (let i = 0; i < n; i++) {
    const a = TEXT + 12 * i;
    text(M, rnd, a, 1 + rnd(10));
    if (rnd(6) === 0) { const d = diskText(M, rnd); M[list + 2 * i] = d.x; M[list + 2 * i + 1] = d.y; }
    else w16(M, list + 2 * i, a);
    M[ok + i] = rnd(3) ? 1 : 0;
  }
  w16(M, 0x7A, list); w16(M, 0x78, ok);
  M[0x79] = rnd(2) ? M[0x79] : 0;
};
t({ name: 'menu_draw', cases: 600, setup: (M, c, rnd) => {
  win(M, rnd); const n = 1 + rnd(5); items(M, rnd, n);
  M[0x8A] = 1 + rnd(12); M[0x50] = M[0x0D22];
  return { a: n };
}, outs: ['a', 'x', 'y'] });
t({ name: 'menu_blank', cases: 400, setup: (M, c, rnd) => {
  win(M, rnd); M[0x8B] = 1 + rnd(5); M[0x8A] = 1 + rnd(12); M[0x8E] = M[0x0D22];
}, outs: ['a', 'x', 'y'] });

// ---- the delay, with fire held or not
t({ name: 'wait_ticks', cases: 200, setup: (M, c, rnd) => { c.game.joy = rnd(2) ? 0x1F : 0x0F; return { a: 1 + rnd(3) }; }, outs: ['a', 'x', 'y'] });
process.exitCode = f ? 1 : 0;
