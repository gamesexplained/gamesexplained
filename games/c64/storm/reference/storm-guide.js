/* storm-guide */
// The Play tab's guide: the way from where a player stands to the nearest brooch that player can
// reach with what the two of them carry, or, once three brooches are carried, to Corrine's room.
// It reads the game's memory as it stands and draws each room it looks into with the port's own
// routines (StormPort: draw_floor, draw_walls, draw_border, draw_generators, draw_objects) on a
// copy, so a room is what the game would draw on entering it: walls a trap has opened stay open,
// objects taken stay gone, and generators are back. The room the player is in is read from the
// screen, with the generators shot down gone. Monsters move and are shot, so they never block.
//
// A player stands on a cell (x from 0 to $10, y from 0 to $10) and covers four characters across
// and two down. A step tests what walk ($69F7) tests: the row or column the player moves into.
// Floor and empty characters let a player through, and monsters, which are shot or move on; walls
// stop one, and generators until they are shot down (counted as twelve steps); an object lets
// one through when touch_object ($6A8A) would: anything to pick up, a trap (it fires and the
// player walks on; the search goes on from the nearest trap with it fired), a door with its key (keys for the plain doors, the two special keys for
// theirs, three brooches for the laboratory door), but never a solid object (class $20). A player
// on x 0 or $10, or y 0 or $10, has left by that side (edge_check, $7A58), and comes into the next
// room on the far side, at row or column 9 for Agravain and 7 for Storm.
// The search is by distance, in each room and across them; a step is one cell. It
// counts each door's key once, as if every door of a kind could take the same key.
//
// StormGuide.plan(M, who, want) gives { goal, places, path, target } or null when nothing is
// reachable: goal 'brooch' or 'corrine'. want, for other uses (test_play.js's autopilot), sets
// another goal: { place } the way into that map place, { types } the way to the nearest object of
// one of those types, a door with no key for it included. places, the map places from the player's
// to the target's; path, the
// cells [x, y] from the player to the edge they leave by (or to the brooch, in its room); target,
// { room, place }. who is 0 for Agravain (player A) and 1 for Storm (player B).
globalThis.StormGuide = (function () {
  'use strict';
  const LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3;
  const STEP = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const PLACE = [-1, 1, -16, 16];                     // leaving by a side moves the place by this
  const GEN = 12;                                     // what shooting a generator down costs, in steps

  function create(Port) {
    const io = { vicRead: () => 0, vicWrite() {}, sidWrite() {}, colourWrite() {}, ciaRead: () => 0xFF,
      ciaWrite() {}, cia2Read: () => 0, cia2Write() {}, read: () => 0, write() {} };
    const S = new Uint8Array(65536), T = new Uint8Array(65536);
    const P = Port.create(S, io), PT = Port.create(T, io);
    const w16 = (m, a) => m[a] | m[a + 1] << 8;

    // the map: place i holds room (tens and units in decimal) or none ($FF)
    function map(M) {
      const place = [], at = [];
      for (let i = 0; i < 192; i++) {
        const b = M[0x471C + i];
        place.push(b === 0xFF ? -1 : (b >> 4) * 10 + (b & 15));
        if (b !== 0xFF) at[place[i]] = i;
      }
      return { place, at };
    }
    // a room's objects as draw_objects numbers their characters: record k from $42 + 8k
    function objects(m, room) {
      const p = w16(m, 0x17CD + 2 * room), out = [];
      for (let k = 0; k < 8 && m[p + 3 * k]; k++) out.push({ k, at: m[p + 3 * k], type: m[p + 3 * k + 1], cls: m[p + 3 * k + 2] & 0xF0 });
      return out;
    }
    // room r drawn on the copy as enter_room draws it, without the players
    function draw(r) {
      S.fill(0, 0x0400, 0x0800);
      S[0x8118] = r;
      for (const a of [0x814C, 0x8141, 0x8142, 0x8143, 0x8145, 0x8147, 0x8107, 0x8125]) S[a] = 0;
      P.draw_floor(); P.draw_walls(); P.draw_border(); P.draw_generators(); P.draw_objects();
    }
    // the room's 18 rows of 36 characters, from row_addr ($8570)
    function rows(m) {
      const g = new Uint8Array(18 * 36);
      for (let y = 0; y < 18; y++) { const a = w16(m, 0x8570 + 2 * y); for (let x = 0; x < 36; x++) g[y * 36 + x] = m[a + x]; }
      return g;
    }
    // what each character does to a player stepping into it: 0 through, 1 stopped, 2 the goal,
    // 3 a trap, 4 a generator (a way through once it is shot down, at a cost)
    function judge(m, room, live, goal) {
      const keys = m[0x811A], k7 = m[0x811B], k8 = m[0x811C], br = m[0x811D];
      const kind = new Uint8Array(256);
      for (let c = 0; c < 256; c++) {
        if (c === 0 || (c >= 0x12 && c < 0x42) || c >= 0xFE) kind[c] = 0;        // floor, players, shots
        else if (c >= 0xA0) kind[c] = 0;                                            // monsters: shot or gone
        else if (c >= 0x82) kind[c] = 4;                                            // generators: shot down first
        else kind[c] = 1;                                                           // walls, objects not listed
      }
      for (const o of objects(m, room)) {
        if (o.type & 0x80) continue;                                                // taken: not drawn
        let k = 0;
        const t = o.type;
        if (o.cls === 0x20) k = 1;
        else if (o.cls !== 0x10) k = 3;
        else if (goal instanceof Set ? goal.has(t) : goal === 'brooch' && t === 0x17) k = 2;
        else if (t === 0x0D && !keys || t === 0x0F && !k7 || t === 0x1A && !k8 || t === 0x1B && br !== 3) k = 1;
        for (let c = 0x42 + 8 * o.k; c < 0x4A + 8 * o.k; c++) kind[c] = k;
      }
      return kind;
    }
    // the cells of one room by distance from (x0, y0), a step costing 1 and a step through a
    // generator GEN more: each cell's distance and the way back, the goal cells reached, the traps
    function search(g, kind, x0, y0) {
      const N = 17, dist = new Int16Array(N * N).fill(-1), from = new Int16Array(N * N).fill(-1);
      const block = (x, y, w, h) => {                                              // the characters walk tests
        let k = 0;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const v = kind[g[(y + j) * 36 + x + i]];
          if (v === 1) return 1;
          if (v > k) k = v;
        }
        return k;
      };
      const done = new Uint8Array(N * N), goals = [], traps = [], open = [x0 + N * y0];
      dist[x0 + N * y0] = 0;
      while (open.length) {
        let i = 0;
        for (let j = 1; j < open.length; j++) if (dist[open[j]] < dist[open[i]]) i = j;
        const c = open[i];
        open[i] = open[open.length - 1]; open.pop();
        if (done[c]) continue;
        done[c] = 1;
        const x = c % N, y = (c / N) | 0;
        if (c !== x0 + N * y0 && (x === 0 || x === 0x10 || y === 0 || y === 0x10)) continue;   // gone: the room changes here
        for (let d = 0; d < 4; d++) {
          const nx = x + STEP[d][0], ny = y + STEP[d][1], n = nx + N * ny;
          if (nx < 0 || nx > 0x10 || ny < 0 || ny > 0x10 || done[n]) continue;
          const k = d === UP ? block(2 * x, ny, 4, 1) : d === DOWN ? block(2 * x, ny + 1, 4, 1)
            : d === LEFT ? block(2 * nx, y, 2, 2) : block(2 * x + 4, y, 2, 2);
          if (k === 1) continue;
          const nd = dist[c] + 1 + (k === 4 ? GEN : 0);
          if (dist[n] >= 0 && dist[n] <= nd) continue;
          dist[n] = nd; from[n] = c;
          if (k === 2) { if (!goals.includes(n)) goals.push(n); continue; }
          if (k === 3 && !traps.includes(n)) traps.push(n);
          open.push(n);
        }
      }
      const trail = (c) => { const out = []; for (; c >= 0; c = from[c]) out.unshift([c % N, (c / N) | 0]); return out; };
      return { dist: (c) => dist[c], trail, goals, traps, N };
    }
    // a room searched from (x, y), and again from its nearest trap with the trap fired (trap_fire,
    // run by the port on a second copy): the two joined, each cell by the shorter way
    function explore(m, room, live, goal, x, y) {
      const a = search(rows(m), judge(m, room, live, goal), x, y);
      let b = null, t = -1;
      for (const c of a.traps) if (t < 0 || a.dist(c) < a.dist(t)) t = c;
      if (t >= 0) {
        T.set(m);
        const tx = t % a.N, ty = (t / a.N) | 0;
        T[0x8115] = tx; T[0x8116] = ty;
        for (const _ of PT.trap_fire(tx, ty)) { /* its raster waits pass at once here */ }
        b = search(rows(T), judge(T, room, live, goal), tx, ty);
      }
      const N = a.N, at = (c) => {
        const da = a.dist(c), db = b && b.dist(c) >= 0 ? a.dist(t) + b.dist(c) : -1;
        return da >= 0 && (db < 0 || da <= db) ? [da, 0] : db >= 0 ? [db, 1] : [-1, 0];
      };
      const exits = [];
      for (let c = 0; c < N * N; c++) {
        const [d] = at(c);
        if (d < 0) continue;
        const x1 = c % N, y1 = (c / N) | 0;
        const side = x1 === 0 ? LEFT : x1 === 0x10 ? RIGHT : y1 === 0 ? UP : y1 === 0x10 ? DOWN : -1;
        if (side >= 0 && !(x1 === x && y1 === y) && (exits[side] === undefined || d < at(exits[side])[0])) exits[side] = c;
      }
      const goals = a.goals.concat(b ? b.goals : []);
      return {
        exits, goals,
        dist: (c) => at(c)[0],
        trail: (c) => at(c)[1] ? a.trail(t).concat(b.trail(c).slice(1)) : a.trail(c),
      };
    }

    function plan(M, who, want) {
      const mp = map(M), base = who ? 0x861E : 0x8629, room = M[0x8118];
      const x = M[base], y = M[base + 1];
      if (x & 0x80 || M[who ? 0x8619 : 0x8618]) return null;
      const goal = want ? (want.types ? new Set(want.types) : 'place') : M[0x811D] >= 3 ? 'corrine' : 'brooch';
      const start = mp.at[room];
      if (start === undefined) return null;
      S.set(M);
      const across = who ? 7 : 9;
      const best = new Map(), open = [];
      const visit = (place, side, cost, prev, cell) => {
        const key = place * 4 + side;
        if (best.has(key) && best.get(key).cost <= cost) return;
        const e = { place, side, cost, prev, cell };
        best.set(key, e); open.push(e);
      };
      let found = null;
      const expand = (e, s) => {
        const r = mp.place[e.place];
        if (goal === 'corrine' && r === 99 || goal === 'place' && e.place === want.place && e !== root) {
          if (!found || e.cost < found.cost) found = { cost: e.cost, e, s, cell: -1 };
          return;
        }
        for (const c of s.goals) if (!found || e.cost + s.dist(c) < found.cost) found = { cost: e.cost + s.dist(c), e, s, cell: c };
        for (let side = 0; side < 4; side++) {
          const c = s.exits[side];
          if (c === undefined) continue;
          const np = e.place + PLACE[side];
          if (np < 0 || np >= 192 || mp.place[np] < 0) continue;
          visit(np, side ^ 1, e.cost + s.dist(c) + 1, e, c);                       // in on the far side
        }
      };
      const root = { place: start, side: -1, cost: 0, prev: null, cell: -1 };
      const first = explore(M, room, true, goal, x, y);
      root.s = first;
      expand(root, first);
      const memo = new Map();
      while (open.length) {
        let i = 0;
        for (let j = 1; j < open.length; j++) if (open[j].cost < open[i].cost) i = j;
        const e = open.splice(i, 1)[0];
        if (best.get(e.place * 4 + e.side) !== e) continue;
        if (found && e.cost >= found.cost) break;
        const r = mp.place[e.place], key = r * 4 + e.side;
        let s = memo.get(key);
        if (!s) {
          draw(r);
          const ex = e.side === LEFT ? 1 : e.side === RIGHT ? 0x0F : across, ey = e.side === UP ? 1 : e.side === DOWN ? 0x0F : across;
          s = explore(S, r, false, goal, ex, ey);
          memo.set(key, s);
        }
        e.s = s;
        expand(e, s);
      }
      if (!found) return null;
      const places = [];
      let leave = -1;
      for (let e = found.e; e; e = e.prev) { places.unshift(e.place); if (e.prev === root) leave = e.cell; }
      const path = found.e === root ? (found.cell >= 0 ? first.trail(found.cell) : []) : first.trail(leave);
      return { goal: goal instanceof Set ? 'object' : goal, places, path, target: { room: mp.place[found.e.place], place: found.e.place }, cost: found.cost };
    }
    return { plan, map, objects };
  }
  return { create };
})();
