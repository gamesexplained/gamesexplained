'use strict';
// The input for the moments of play and the lockstep, frame by frame: from the hand-over a script
// (SELECT CONTROLS, LOAD SCENARIO n, PLAY GAME, the number of players), then a seeded player that
// moves the cursor with Q, A, O and P, taps SPACE to open menus and choose in them, and now and then
// presses a digit or ENTER; and the script that saves moments of play to work/states from it, each
// where a human turn's loop is about to read the controls ($61E6); with `ai` where the computer
// starts to move a creature ($974E), for the tests of the computer's play; with `designer` at the
// wizard designer's reads of the controls and keyboard, the player going into it first.
//   node sessions.js [sessions] [frames] [every] [ai|designer]
// (player's o.designer: true, or 'load' to save a wizard and load it back first)
//   saves work/states/[ai-]s<scenario>-<k>-f<n>.json, or dz-<k>-f<n>.json
const lib = require('./lib.js');

// [keys, frames held, weight]
const ACTIONS = [
  [['SPACE'], 6, 10], [['Q'], 8, 5], [['A'], 8, 5], [['O'], 8, 5], [['P'], 8, 5], [['Q'], 30, 2], [['A'], 30, 2],
  [['O'], 30, 2], [['P'], 30, 2], [['Q', 'O'], 15, 1], [['A', 'P'], 15, 1], [[], 20, 6], [['ENTER'], 6, 1], [['1'], 6, 1],
  [['2'], 6, 1], [['Y'], 6, 1], [['N'], 6, 1],
];
const TOTAL = ACTIONS.reduce((s, a) => s + a[2], 0);
function pick(rnd) {
  let x = rnd(TOTAL);
  for (const a of ACTIONS) { if (x < a[2]) return a; x -= a[2]; }
  return ACTIONS[0];
}
// A menu worked through: SPACE to open it, the bar moved down k times, SPACE to choose, and the
// same again for a menu that follows (a confirmation, a target, a spell): [[keys, frames], ...]
function menuMacro(rnd) {
  const s = [];
  for (let j = 0; j < 2; j++) {
    s.push([['SPACE'], 6], [[], 25]);
    for (let k = rnd(8); k > 0; k--) s.push([['A'], 6], [[], 14]);
    s.push([['SPACE'], 6], [[], 40]);
  }
  return s;
}
// The start, frame by frame from the hand-over: [frame, keys held from it]. With o.designer only
// SELECT CONTROLS: the player goes on into the wizard designer before it loads a scenario.
function startScript(o) {
  if (o.designer) return { steps: [[120, ['SPACE']], [130, []]], end: 150 };
  const s = [[120, ['SPACE']], [130, []]];
  let f = 150;
  for (let i = 0; i < 4; i++) { s.push([f, ['A']], [f + 10, []]); f += 30; }
  s.push([f, ['SPACE']], [f + 10, []]); f += 50;
  s.push([f, [String(o.scenario)]], [f + 10, []]); f += 30;
  s.push([f, ['ENTER']], [f + 10, []]); f += 300;
  s.push([f, ['SPACE']], [f + 10, []]); f += 70;
  s.push([f, [String(o.players)]], [f + 10, []]); f += 70;
  return { steps: s, end: f };
}
// The purposeful player: at each read of the controls ($622B) or of the keyboard through the ROM
// ($028E) it looks at what is reading them (the return address on the stack, and the routine it is
// in) and at the game's memory, and holds the keys that do something there. On the human turn it
// takes the cursor to one of its creatures with action points left and selects it, or, after a few,
// opens the cursor menu and ends the turn. In select mode it steps towards the nearest enemy and
// walks into it, or opens the select menu (END MOVE mostly, a spell, a throw or a shot, or any other
// option now and then). It aims a target at the nearest enemy, casts a spell it has, answers YES to
// END TURN, presses fire where the game waits for it, plays again from the file panel, and now and
// then does something at random. Each key is held for one read and let go for the next, so that
// every read sees one move.
const standin = require('./standin.js');
const KEY = { up: 'Q', down: 'A', left: 'O', right: 'P', fire: 'SPACE' };
let CODE_LABELS = null;
function routineAt(a, part) {
  if (!CODE_LABELS) {
    const L = standin.labels();
    CODE_LABELS = { engine: [...L.byAddress.entries()].sort((x, y) => x[0] - y[0]), up: {} };
    for (const n of [0, 1, 2, 3]) CODE_LABELS.up[n] = [...L.up[n].entries()].map(([l, x]) => [x, l]).sort((x, y) => x[0] - y[0]);
  }
  const list = a >= 0xD003 ? CODE_LABELS.up[part] || [] : CODE_LABELS.engine;
  let best = null;
  for (const [x, l] of list) { if (x > a) break; best = l; }
  return best;
}
const MENUS = { cursor: 0x9334, select: 0x6D8E, endturn: 0x7557, file: 0xCC7C };
function agent(rnd, o) {
  const st = { held: [], turn: -1, player: -1, tried: new Set(), acts: 0, actsMax: 3, steps: 0, menuFor: null, menuIndex: undefined,
    menuNext: null, goal: null, spell: -1, stuck: 0, lastCursor: -1, typed: 0,
    dz: { acts: 0, most: o.designer ? 2 + rnd(6) : 0, want: -1, keys: 0, opts: 0, saved: null, loading: false, saving: false, name: 0 } };
  const ram = m => m.ram, w = (M, a) => M[a] | M[(a + 1) & 0xFFFF] << 8;
  const wrapd = (a, b) => { let d = (b - a) % 36; if (d > 18) d -= 36; if (d < -18) d += 36; return d; };
  const dist = (r1, c1, r2, c2) => Math.max(Math.abs(wrapd(r1, r2)), Math.abs(wrapd(c1, c2)));
  // the creatures on the map: { e, row, col, type, owner, ap, air }
  const creatures = M => {
    const out = [];
    for (let k = 0; k < 0x91; k++) {
      const e = 0x5B5A + 6 * k, t = M[e + 2];
      if (t === 0xFF || t < 0x8C || (M[e + 4] !== 0xFF && M[e + 4] !== 0xFE)) continue;
      const rec = (0x5EC0 + 5 * M[e + 5]) & 0xFFFF;
      out.push({ k, e, row: M[e], col: M[e + 1] & 0x3F, type: t, owner: M[rec + 4] & 7, ap: M[rec], air: M[e + 4] === 0xFE });
    }
    return out;
  };
  // the key that takes the cursor one square nearer (row, col), or null when it is there
  const towards = (M, row, col) => {
    const dr = wrapd(M[0xD0D3], row), dc = wrapd(M[0xD0D4], col);
    if (!dr && !dc) return null;
    if (Math.abs(dr) >= Math.abs(dc)) return dr < 0 ? KEY.up : KEY.down;
    return dc < 0 ? KEY.left : KEY.right;
  };
  const nearestEnemy = (M, row, col) => {
    let best = null, bd = 99;
    for (const c of creatures(M)) {
      if (c.owner === M[0x5B11]) continue;
      const d = dist(row, col, c.row, c.col);
      if (d < bd) { bd = d; best = c; }
    }
    return best ? Object.assign(best, { d: bd }) : null;
  };
  const press = k => (k ? [k] : []);
  // a menu: the index of the option whose handler's label passes want(name), or a random one
  const menuPick = (M, table, want) => {
    const n = M[0x5B0A], idx = [];
    for (let i = 0; i < n; i++) {
      const code = M[0xD1E8 + i], name = standin.labels().byAddress.get(w(M, (table + code) & 0xFFFF)) || '';
      if (want(name)) idx.push(i);
    }
    return idx.length ? idx[rnd(idx.length)] : rnd(Math.max(1, n));
  };
  // In the wizard designer (o.designer): the panel's options at random (DESIGN WIZARD most, SAVE,
  // DELETE, and LOAD WIZARD once a wizard has been saved, typing its name), NAME, CHARACTER and
  // SPELLS with a few keys each, then EXIT; after a few, LOAD SCENARIO as at the start.
  const dz = st.dz;
  const ch = c => (c === 0x20 ? 'SPACE' : String.fromCharCode(c));
  function designer(M, pc, ctx) {
    if (pc === 0x028E) {
      if (ctx === 'name_screen') {
        if (dz.keys++ > 3 + rnd(10)) { dz.keys = 0; return press('ENTER'); }
        const x = rnd(10);
        return press(x < 2 ? '0' : x < 3 ? 'SPACE' : String.fromCharCode(0x41 + rnd(26)));
      }
      if (ctx === 'ask_file_name' && dz.loading) {
        const n = dz.saved || '';
        if (dz.name < n.length) return press(ch(n.charCodeAt(dz.name++)));
        dz.name = 0; dz.loading = false; return press('ENTER');
      }
      return undefined;
    }
    if (pc !== 0x622B) return undefined;
    if (ctx === 'run_file_menu') {
      const layout = M[0x5B0B];
      if (layout === 3) return press(M[0xC662] === 0 ? KEY.fire : KEY.down);
      if (layout === 2) { if (dz.want < 0) dz.want = o.designer === 'load' ? 0 : rnd(4); }
      else if (dz.want < 0) {
        // after a save, the first character of the name it went under (all find_file compares)
        if (dz.saving) { dz.saving = false; if (M[0xC637] !== 0x20) dz.saved = String.fromCharCode(M[0xC637]); }
        const x = rnd(10);
        // (designer: 'load' designs a wizard in the first slot, saves it and loads it back first)
        const load = o.designer === 'load' && !dz.loaded;
        dz.want = load ? (dz.saved ? 1 : dz.designed ? 2 : 0) : dz.acts >= dz.most ? 4 : x < 5 ? 0 : x < 7 ? 2 : x < 8 ? 3 : dz.saved ? 1 : 0;
        if (dz.want === 1) dz.loaded = true;
        if (dz.want === 0) dz.designed = true;
        dz.acts++;
        if (dz.want === 1) { dz.loading = true; dz.name = 0; }
        if (dz.want === 2) dz.saving = true;
      }
      if (M[0xC662] === dz.want) { dz.want = -1; return press(KEY.fire); }
      return press(M[0xC662] < dz.want ? KEY.down : KEY.up);
    }
    if (ctx === 'design_wizard') {
      if (dz.want < 0) { dz.want = dz.opts > 2 ? 3 : rnd(3); dz.opts++; }
      if (M[0xE1EC] === dz.want) { if (dz.want === 3) dz.opts = 0; dz.want = -1; return press(KEY.fire); }
      return press(KEY.down);
    }
    if (ctx === 'character_screen' || ctx === 'spells_edit') {
      if (rnd(12) === 0) return press(KEY.fire);
      return press([KEY.up, KEY.down, KEY.left, KEY.right, KEY.right][rnd(5)]);
    }
    return undefined;
  }
  function decide(m, part) {
    const M = ram(m), pc = m.cpu.pc, ret = w(M, m.cpu.sp), ctx = routineAt(ret, part) || '';
    if (M[0x5B11] !== st.player || M[0xD065] !== st.turn) {
      st.player = M[0x5B11]; st.turn = M[0xD065]; st.tried.clear(); st.acts = 0; st.actsMax = 1 + rnd(4); st.goal = null;
    }
    if (part === 0 && o.designer) { const k = designer(M, pc, ctx); if (k !== undefined) return k; }
    if (pc === 0x028E) {
      if (ctx === 'start_game') return press(String(o.players));
      if (ctx === 'ask_file_name') {
        if (st.typed === 0) { st.typed = 1; return press(String(o.scenario)); }
        if (st.typed < 4) { st.typed++; return []; }
        st.typed = 0; return press('ENTER');
      }
      if (ctx === 'find_file') return [];
      return null;
    }
    if (pc !== 0x622B) return null;
    if (ctx !== 'run_menu' && ctx !== 'key_repeat') st.menuIndex = undefined;
    switch (ctx) {
      case 'wait_release': case 'short_wait': case 'key_repeat': case 'key_repeat_slow': return [];
      case 'wait_press': case 'wait_fire': case 'wait_fire_flashing': case 'big_map': return press(KEY.fire);
      case 'choose_from_list': return press(rnd(3) ? KEY.fire : KEY.down);
      case 'run_file_menu': {
        const want = M[0xD03F] ? 0 : 1;
        if (M[0xC662] === want) return press(KEY.fire);
        return press(KEY.down);
      }
      case 'run_menu': {
        if (st.menuIndex === undefined) {
          const f = st.menuFor;
          let i;
          if (f === 'endturn-cursor') i = menuPick(M, MENUS.cursor, n => n === 'end_turn');
          else if (f === 'select-cursor') i = menuPick(M, MENUS.cursor, n => /^select_/.test(n));
          else if (f === 'endturn') i = menuPick(M, MENUS.endturn, n => n === (rnd(10) ? 'end_turn_yes' : 'end_turn_no'));
          else if (f === 'select-menu') {
            const x = rnd(20);
            const re = x < 9 ? /^end_move$/ : x < 13 ? /^cast_/ : x < 15 ? /^(fire|throw)_/ : x < 17 ? /^(pick_up|drop|use|drink|eat|fill|change|ride|rider|fly|land)$/ : /./;
            i = menuPick(M, MENUS.select, n => re.test(n));
          } else i = rnd(Math.max(1, M[0x5B0A]));
          st.menuIndex = i; st.menuNext = f === 'endturn-cursor' ? 'endturn' : null;
        }
        if (M[0xC662] === st.menuIndex) { st.menuIndex = undefined; st.menuFor = st.menuNext; return press(KEY.fire); }
        return press(M[0xC662] < st.menuIndex ? KEY.down : KEY.up);
      }
      case 'human_turn': {
        st.steps = 0; st.spell = -1;
        if (st.acts >= st.actsMax) { st.menuFor = 'endturn-cursor'; return press(KEY.fire); }
        const mine = creatures(M).filter(c => c.owner === M[0x5B11] && c.ap >= 2 && !st.tried.has(c.k));
        if (!mine.length) { st.menuFor = 'endturn-cursor'; return press(KEY.fire); }
        if (!st.goal || st.tried.has(st.goal.k)) st.goal = mine[rnd(mine.length)];
        const k = towards(M, st.goal.row, st.goal.col);
        if (k) return press(k);
        st.tried.add(st.goal.k); st.acts++; st.menuFor = 'select-cursor';
        return press(KEY.fire);
      }
      case 'select_ground': {
        st.steps++;
        const row = M[0x5B55], col = M[0x5B56], ap = M[w(M, 0x5B50)];
        if (ap < 2 || st.steps > 12 + rnd(8) || rnd(25) === 0) {
          const k = towards(M, row, col);
          if (k) return press(k);
          st.menuFor = 'select-menu';
          return press(KEY.fire);
        }
        const en = nearestEnemy(M, row, col);
        let tr = row, tc = col;
        if (en && en.d <= 1) { tr = en.row; tc = en.col; }
        else if (en) { const dr = Math.sign(wrapd(row, en.row)), dc = Math.sign(wrapd(col, en.col)); tr = (row + dr + 36) % 36; tc = (col + dc + 36) % 36; }
        else { tr = (row + rnd(3) + 35) % 36; tc = (col + rnd(3) + 35) % 36; }
        const k = towards(M, tr, tc);
        if (k) return press(k);
        return press(KEY.fire);
      }
      case 'pick_target': {
        const row = M[0x5B55], col = M[0x5B56];
        const en = nearestEnemy(M, row, col);
        const cur = M[0xD0D3] | M[0xD0D4] << 8;
        st.stuck = cur === st.lastCursor ? st.stuck + 1 : 0; st.lastCursor = cur;
        if (!en || st.stuck > 2 || rnd(12) === 0) { st.stuck = 0; return press(KEY.fire); }
        const k = towards(M, en.row, en.col);
        return press(k || KEY.fire);
      }
      case 'choose_spell': {
        if (st.spell < 0) {
          const rec = w(M, 0x5B04), have = [];
          for (let s = 0; s < 0x2D; s++) if (M[(rec + 2 + s) & 0xFFFF] & 0x0F) have.push(s);
          st.spell = have.length && rnd(8) ? have[rnd(have.length)] : 0x2D;
        }
        if (M[0xFF3A] === st.spell) { st.spell = -1; return press(KEY.fire); }
        return press(KEY.down);
      }
      default: return null;
    }
  }
  return {
    // the keys for this read: a held key let go first, so that each read sees one move
    keys(m, part) {
      // a scenario asked for with the cassette at its end: rewound, as a player would, before the
      // search for its name (o.onRewind rewinds the port's copy at the same moment)
      if (m.cpu.pc === 0x028E && routineAt(w(ram(m), m.cpu.sp), part) === 'find_file' && m.tape && m.tape.pos >= m.tape.blocks.length) {
        m.tape.rewind();
        if (o.onRewind) o.onRewind();
      }
      if (st.held.length) { st.held = []; return []; }
      let k = rnd(30) === 0 ? null : decide(m, part);
      if (k === null) { const a = pick(rnd); k = a[0]; }
      st.held = k;
      return k;
    },
  };
}

// player(rnd, machine, { scenario, players, boot, random }): { pass(n, m), frame(f, m), check(m) }
function player(rnd, m0, o = {}) {
  o = Object.assign({ scenario: 1 + rnd(3), players: 1 + rnd(2), boot: m0 && m0.cpu.pc === 0xE1ED }, o);
  const start = o.boot ? startScript(o) : null;
  let f0 = m0 ? m0.frames : 0, keys = [], left = 0, i = 0, queue = [];
  // the keys are set on the machine only where it reads them whole (check(m), at a checkpoint):
  // changed in the middle of the game's four reads of the keyboard, they would be half one and half
  // the other, which the port, reading them at once, never sees
  let want = [];
  const set = (m, k) => { want = k; };
  const smart = o.random ? null : agent(rnd, o);
  let started = !start;
  return {
    pass() {},
    check(m) {
      if (smart && started && (m.cpu.pc === 0x622B || m.cpu.pc === 0x028E)) want = smart.keys(m, lib.partOf(m.ram));
      m.releaseAll(); for (const x of want) m.press(x);
    },
    frame(f, m) {
      const t = m.frames - f0;
      if (start && t < start.end) {
        while (i < start.steps.length && start.steps[i][0] <= t) set(m, start.steps[i++][1]);
        return;
      }
      if (!started) { started = true; want = []; }
      if (smart) return;
      if (left-- > 0) return;
      if (!queue.length && rnd(4) === 0) queue = menuMacro(rnd);
      const a = queue.length ? queue.shift() : pick(rnd);
      keys = a[0]; left = a[1];
      set(m, keys);
    },
  };
}

if (require.main === module) {
  const sessions = +(process.argv[2] || 6), frames = +(process.argv[3] || 6000), every = +(process.argv[4] || 300);
  const mode = process.argv[5] || '', ai = mode === 'ai', dzm = mode === 'designer';
  const at = ai ? 0x974E : 0x61E6, pre = ai ? 'ai-' : dzm ? 'dz-' : '';
  for (let s = 1; s <= sessions; s++) {
    const scen = 1 + (s - 1) % 3, players = 1 + ((s - 1) >> 1) % 2;
    const m = lib.boot();
    const input = player(lib.makeRnd(s * 7919), m, { scenario: scen, players, designer: dzm });
    const t = Date.now();
    let saved = 0, want = false, last = -every;
    m.hooks[at] = q => {
      if (!want || q !== m || dzm) return false;
      want = false;
      lib.writeState(pre + 's' + scen + '-' + s + '-f' + String(m.frames).padStart(6, '0'), m);
      saved++;
      return false;
    };
    m.hooks[0x622B] = m.hooks[0x028E] = q => {
      if (q !== m) return false;
      if (dzm && want && lib.partOf(m.ram) === 0) { want = false; lib.writeState(pre + s + '-f' + String(m.frames).padStart(6, '0'), m); saved++; }
      input.check(m);
      return false;
    };
    for (let f = 0; f < frames; f++) {
      input.frame(f, m);
      input.check(m);
      m.runFrames(1);
      if (m.frames - last >= every && lib.partOf(m.ram) === (dzm ? 0 : scen)) { want = true; last = m.frames; }
    }
    console.log('session ' + s + ' (scenario ' + scen + ', ' + players + ' players): ' + frames + ' frames, ' + saved + ' states, ' + (Date.now() - t) + ' ms');
  }
}

module.exports = { player, ACTIONS, routineAt };
