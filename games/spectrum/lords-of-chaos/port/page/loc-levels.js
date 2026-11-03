/* loc-levels */
// What the Maps page reads from a scenario, in memory M (the engine with the scenario's file over
// it from $D003) with sym(name) giving the scenario listing's labels. Needs LOCMap (loc-map).
// - scenario(M, sym) gives S:
//   starts and portals, [row, column] pairs from the header ($D072, $D043 of them; $D06A, $D044);
//   things, the scenario's own objects and creatures as start_hook copies them into the entries
//     from 4: { e (entry), r, c, t (type), by (the entry holding or carrying it, $FF none), b5 };
//   waypoint(n) ([row, column]) and waypointCount, routes (lists of waypoint numbers, each list led
//     by a length byte with bit 7 set, $80 ending them), indep (the independent creatures' plan entries:
//     { e, route, step, orders }, ending $FE) and trips ([row, column, group], ending $FE);
//   wizard, the computer's wizard ({ name, mana } from the record at $D082);
//   secrets, scenario 3's squares its own code treats apart: the teleports (seven, four bytes each:
//     square, then where it leads), the trap floors $28-$2A and what they spread (trap_terrain),
//     the floor that kills (terrain 7) and the altar ($0A, deadly_floors), the walls a creature can
//     cross ($0E) or break ($19), and the four walls the altar turns into locked doors.
// - terrain(S, r, c) names the terrain on a square and what a step onto it costs ($D208 + 5v).
// - woken(S, g) lists the things whose plan entry waits for group g (bit 6 of the orders).
var LOCLevels = (function () {
  const name = (M, v) => LOCMap.text(M, v + 1).trim();
  function scenario(M, sym) {
    const opt = k => { try { return sym(k); } catch (e) { return null; } };
    const S = { M, name: v => name(M, v) };
    S.starts = []; for (let i = 0; i < M[0xD043]; i++) S.starts.push([M[0xD072 + 2 * i], M[0xD073 + 2 * i]]);
    S.portals = []; for (let i = 0; i < M[0xD044]; i++) S.portals.push([M[0xD06A + 2 * i], M[0xD06B + 2 * i]]);
    S.things = [];
    for (let a = sym('start_objects'), e = 4; a < sym('start_creature_records'); a += 6, e++)
      if (M[a + 2] !== 0xFF) S.things.push({ e, r: M[a], c: M[a + 1] & 0x3F, t: M[a + 2], by: M[a + 4], b5: M[a + 5] });
    S.byEntry = new Map(S.things.map(t => [t.e, t]));
    // waypoint n is the two bytes at the table plus 2n, read as waypoint_square reads it, with no
    // check on n: a route that names a waypoint past the table's end gets the bytes after it
    const wp = sym('waypoints');
    S.waypointCount = (sym('independents') - wp) >> 1;
    S.waypoint = n => [M[wp + 2 * n], M[wp + 2 * n + 1]];
    S.routes = [];
    for (let a = sym('routes'); M[a] !== 0x80; a += M[a] & 0x7F) S.routes.push([...M.slice(a + 1, a + (M[a] & 0x7F))]);
    S.indep = []; for (let a = sym('independents'); M[a] !== 0xFE; a += 4) S.indep.push({ e: M[a], route: M[a + 1], step: M[a + 2], orders: M[a + 3] });
    S.trips = []; for (let a = sym('trip_squares'); M[a] !== 0xFE; a += 3) S.trips.push([M[a], M[a + 1], M[a + 2]]);
    S.wizard = { name: String.fromCharCode(...M.slice(0xD082 + 59, 0xD082 + 69)).replace(/[^ -~]/g, ' ').trim(), mana: M[0xD082] };
    S.secrets = [];
    const tele = opt('teleports'), trap = opt('trap_terrain');
    if (tele !== null) {
      for (let a = tele; a < tele + 28; a += 4)
        S.secrets.push({ r: M[a], c: M[a + 1], to: [M[a + 2], M[a + 3]], what: 'a teleport to row ' + M[a + 2] + ', column ' + M[a + 3] });
      for (let r = 0; r < 36; r++) for (let c = 0; c < 36; c++) {
        const v = LOCMap.square(M, r, c);
        if (v >= 0x28 && v <= 0x2A) S.secrets.push({ r, c, what: 'a trap floor: stepping onto it turns the eight squares round it into ' + name(M, M[trap + v - 0x28]) });
        else if (v === 0x07) S.secrets.push({ r, c, dim: true, what: 'FLOOR that kills a creature standing on it at the start of its turn' });
        else if (v === 0x0A) S.secrets.push({ r, c, what: 'the altar: a creature standing on it at the start of its turn dies, and four squares of row 16 become locked doors' });
        else if (v === 0x0E) S.secrets.push({ r, c, what: 'WALL that costs ' + M[0xD208 + 5 * v] + ' action points to cross, as a floor does' });
        else if (v === 0x19) S.secrets.push({ r, c, what: 'WALL of toughness ' + M[0xD208 + 5 * v + 1] + ', where the other walls have 255' });
      }
      for (let k = 0; k < 4; k++) S.secrets.push({ r: 16, c: 6 + 2 * k, dim: true, what: 'one of the four squares the altar turns into a locked door' });
    }
    return S;
  }
  function terrain(S, r, c) {
    const v = LOCMap.square(S.M, r, c), step = S.M[0xD208 + 5 * v];
    const hex = '$' + v.toString(16).toUpperCase().padStart(2, '0');
    return (S.name(v) || 'terrain with no name') + ' (' + hex + '), ' + (step === 255 ? 'impassable' : step + ' action points a step');
  }
  const woken = (S, g) => S.indep.filter(i => (i.orders & 0x40) && (i.orders & 0x3F) === g).map(i => S.byEntry.get(i.e)).filter(Boolean);
  return { scenario, terrain, woken };
})();
// end of loc-levels
