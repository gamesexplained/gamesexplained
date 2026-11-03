// The computer's player. Every scenario carries its own copy of it in its block from the tape, the
// same routines but for a few changes from one scenario to the next, each at its own addresses;
// this file writes them once, and each scenario's table (TABLES, below) gives the addresses of its
// copy and its changes (the flags at the end of each table).
//
// The map of each scenario is cut into areas, rectangles (AREAS, five bytes each: the first row,
// the row after the last, the first column, the column after the last, and the area's number), and
// strewn with waypoints (POINTS, a row and a column each, NPOINTS of them). LINKS lists, for each
// waypoint, the waypoints a unit can walk to from it in a straight line and what the walk costs;
// DISTANCES gives a rough cost between two areas. Each unit of the computer's side has its orders
// ($1A, a number), ten bytes at ORDERS: a list of waypoints to walk round (from byte 1, ended by
// 0, with byte 0 the one it is making for), a byte of flags ($08) and the row of VALUES ($09) that
// scores the enemies by the area they stand in.
//
// In the computer's half-turn each of its units on the map, one by one: reloads when its weapon is
// empty; fires at the enemies it can see (aiFire) and, when it has the points, steps into a square
// out of their sight after (peek); then, with no enemy in sight, either hunts one (chooseTarget:
// the enemy that scores highest, by what it carries, where it stands and how long since it was
// seen) along the cheapest route between waypoints (findRoute), or walks its orders (nextPoint).
// Each step is to the neighbouring square nearest the next waypoint, never one it stood on in this
// walk (the trail), opening doors and breaking through the squares in BREAKABLE on the way, and
// not into the sight of an enemy that could still fire (aiDanger). A unit whose orders say so
// keeps half its points for firing in the other side's turn.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};

// Each scenario's addresses. The routines are named as in the listings; the variables are bytes
// inside each scenario's code.
const BASE = {
  nextLink: 0xB732, onPath: 0xB778, findRoute: 0xB78C, pointAt: 0xB83F, areaAt: 0xB852, areaDistance: 0xB87D,
  aiTurn: 0xB89F, knownEnemy: 0xBA5C, nextPoint: 0xBA88, moveOn: 0xBAB1, aiStep: 0xBC27, onTrail: 0xBC72,
  clearTrail: 0xBC92, faceTo: 0xBCA6, pointNumber: 0xBD41, nearestPoint: 0xBD66, aiCanGo: 0xBDB3, peek: 0xBDDE,
  aiFire: 0xBECA, aimJitter: 0xBFBA, chooseTarget: 0xBFD6, unitPos: 0xC0E4, visiblePoints: 0xC0F3,
  shotSeen: 0xC14C, aiDanger: 0xC185, hideView: 0xC1E4,
  STACK: 0xB72C, LINK_I: 0xB72E, LINK_LIST: 0xB72F, ZONE: 0xB731, BEST: 0xB787, FROM: 0xB788, TO: 0xB789,
  DEPTH: 0xB78A, FOUND: 0xB78B, AREA_A: 0xB87B, AREA_B: 0xB87C, BEST_ROUTE: 0xB89D, RESERVE: 0xB89E,
  ORDER: 0xBA86, GOAL: 0xBAAF, ARRIVED: 0xBAB0, TRAIL: 0xBC70, FACE: 0xBCA3, LEFTS: 0xBCA4, RIGHTS: 0xBCA5,
  AT: 0xBD3F, NEAREST: 0xBD64, NEAR_D: 0xBD65, COVER: 0xBDDB, COVER_COST: 0xBDDD, TARGET: 0xBFD4, SCORE: 0xBFD5,
  NPOINTS: 0xC21D, VALUES: 0xC21E, KIND_VALUES: 0xC23E, RANGES: 0xC25C, BREAKABLE: 0xC25E, ORDERS: 0xC266,
  LINKS: 0xC740, AREAS: 0xC88C, POINTS: 0xC914, DISTANCES: 0xC978,
  // the changes: FOUND 0 where findRoute keeps no flag; depthMax, the deepest route it tries (0 for
  // any); keepIX, chooseTarget leaves IX on the unit again; VALUES or KIND_VALUES undefined where
  // chooseTarget leaves that score out; refill, the rounds an empty weapon is given in place of a
  // reload (refillHeld: only a weapon held); kindSix, the squares of kind 6 and up opened or broken
  // like doors; skipZero, an enemy that scores 0 never chosen; maxHalf, aiDanger's half from the
  // enemy's most points less one, and nothing to fear for units from $9C; twoMaps, areaDistance's
  // two triangles (the pointer, areas 1-16, areas 17 on); aliens (Cyber Hordes), units from $9C
  // walk to the terminals in TERMINALS and shoot them; charge (Paradise Valley), CHARGE and
  // CHARGE_D, the enemy units of orders with bit 4 run at.
  depthMax: 0, keepIX: true,
};
const TABLES = {
  'assassins': BASE,
  'moonbase-assault': Object.assign({}, BASE, {
    findRoute: 0xB78B, pointAt: 0xB834, areaAt: 0xB847, areaDistance: 0xB872, aiTurn: 0xB894,
    knownEnemy: 0xBA4B, nextPoint: 0xBA77, moveOn: 0xBAA0, aiStep: 0xBC16, onTrail: 0xBC61,
    clearTrail: 0xBC81, faceTo: 0xBC95, pointNumber: 0xBD30, nearestPoint: 0xBD55, aiCanGo: 0xBDA2,
    peek: 0xBDCD, aiFire: 0xBEB9, aimJitter: 0xBFA9, chooseTarget: 0xBFC5, unitPos: 0xC0CF,
    visiblePoints: 0xC0DE, shotSeen: 0xC137, aiDanger: 0xC170, hideView: 0xC1CF, FOUND: 0, AREA_A: 0xB870,
    AREA_B: 0xB871, BEST_ROUTE: 0xB892, RESERVE: 0xB893, ORDER: 0xBA75, GOAL: 0xBA9E, ARRIVED: 0xBA9F,
    TRAIL: 0xBC5F, FACE: 0xBC92, LEFTS: 0xBC93, RIGHTS: 0xBC94, AT: 0xBD2E, NEAREST: 0xBD53, NEAR_D: 0xBD54,
    COVER: 0xBDCA, COVER_COST: 0xBDCC, TARGET: 0xBFC3, SCORE: 0xBFC4, NPOINTS: 0xC261, VALUES: 0xC262,
    KIND_VALUES: 0xC273, RANGES: 0xC286, BREAKABLE: 0xC288, ORDERS: 0xC290, LINKS: 0xC7B5, AREAS: 0xC989,
    POINTS: 0xCA39, DISTANCES: 0xCAE5, keepIX: false,
  }),
  'rescue-from-the-mines': Object.assign({}, BASE, {
    pointAt: 0xB846, areaAt: 0xB859, areaDistance: 0xB884, aiTurn: 0xB8A6, knownEnemy: 0xBA63,
    nextPoint: 0xBA8F, moveOn: 0xBAB8, aiStep: 0xBC2E, onTrail: 0xBC79, clearTrail: 0xBC99, faceTo: 0xBCAD,
    pointNumber: 0xBD48, nearestPoint: 0xBD6D, aiCanGo: 0xBDBA, peek: 0xBDE5, aiFire: 0xBED1,
    aimJitter: 0xBFC1, chooseTarget: 0xBFDD, unitPos: 0xC0EB, visiblePoints: 0xC0FA, shotSeen: 0xC153,
    aiDanger: 0xC18C, hideView: 0xC1EB, AREA_A: 0xB882, AREA_B: 0xB883, BEST_ROUTE: 0xB8A4, RESERVE: 0xB8A5,
    ORDER: 0xBA8D, GOAL: 0xBAB6, ARRIVED: 0xBAB7, TRAIL: 0xBC77, FACE: 0xBCAA, LEFTS: 0xBCAB, RIGHTS: 0xBCAC,
    AT: 0xBD46, NEAREST: 0xBD6B, NEAR_D: 0xBD6C, COVER: 0xBDE2, COVER_COST: 0xBDE4, TARGET: 0xBFDB,
    SCORE: 0xBFDC, NPOINTS: 0xC224, VALUES: 0xC225, KIND_VALUES: 0xC245, RANGES: 0xC263, BREAKABLE: 0xC265,
    ORDERS: 0xC26D, LINKS: 0xC816, AREAS: 0xCA86, POINTS: 0xCAFF, DISTANCES: 0xFF1F, depthMax: 9,
  }),
  'cyber-hordes': Object.assign({}, BASE, {
    findRoute: 0xB78B, pointAt: 0xB83B, areaAt: 0xB84E, areaDistance: 0xB879, aiTurn: 0xB89B,
    knownEnemy: 0xBAB4, nextPoint: 0xBAE0, moveOn: 0xBB09, aiStep: 0xBC83, onTrail: 0xBCD1,
    clearTrail: 0xBCF1, faceTo: 0xBD05, pointNumber: 0xBDA0, nearestPoint: 0xBDC5, aiCanGo: 0xBE12,
    peek: 0xBE3D, aiFire: 0xBF29, aimJitter: 0xC019, chooseTarget: 0xC035, unitPos: 0xC10F,
    visiblePoints: 0xC11E, shotSeen: 0xC177, aiDanger: 0xC1B0, hideView: 0xC213,
    terminalAttack: 0xCA41, pickTerminal: 0xCB5D, terminalAt: 0xCB7E, terminalsLeft: 0xCB8D,
    FOUND: 0, AREA_A: 0xB877, AREA_B: 0xB878, BEST_ROUTE: 0xB899, RESERVE: 0xB89A, ORDER: 0xBADE,
    GOAL: 0xBB07, ARRIVED: 0xBB08, TRAIL: 0xBCCF, FACE: 0xBD02, LEFTS: 0xBD03, RIGHTS: 0xBD04, AT: 0xBD9E,
    NEAREST: 0xBDC3, NEAR_D: 0xBDC4, COVER: 0xBE3A, COVER_COST: 0xBE3C, TARGET: 0xC033, SCORE: 0xC034,
    NPOINTS: 0xC24C, VALUES: undefined, KIND_VALUES: 0xC24D, RANGES: 0xC268, BREAKABLE: 0xC26A,
    ORDERS: 0xC272, LINKS: 0xC6DF, AREAS: 0xC91B, POINTS: 0xC985, DISTANCES: 0xFEDF, TERMINALS: 0xCB48,
    keepIX: false, depthMax: 15, refill: 0x3C, kindSix: true, maxHalf: true, aliens: true,
  }),
  'paradise-valley': Object.assign({}, BASE, {
    findRoute: 0xB78B, pointAt: 0xB83B, areaAt: 0xB84E, areaDistance: 0xB87B, aiTurn: 0xB8D3,
    knownEnemy: 0xBA8E, nextPoint: 0xBABA, moveOn: 0xBAE3, aiStep: 0xBC98, onTrail: 0xBCE3,
    clearTrail: 0xBD03, faceTo: 0xBD17, pointNumber: 0xBDB2, nearestPoint: 0xBDD7, aiCanGo: 0xBE26,
    peek: 0xBEA2, aiFire: 0xBF97, aimJitter: 0xC087, chooseTarget: 0xC0A3, unitPos: 0xC189,
    visiblePoints: 0xC198, shotSeen: 0xC1F1, aiDanger: 0xC22A, hideView: 0xC28D, FOUND: 0,
    AREA_A: 0xB877, AREA_B: 0xB878, BEST_ROUTE: 0xB8D1, RESERVE: 0xB8D2, ORDER: 0xBAB8, GOAL: 0xBAE1,
    ARRIVED: 0xBAE2, TRAIL: 0xBCE1, FACE: 0xBD14, LEFTS: 0xBD15, RIGHTS: 0xBD16, AT: 0xBDB0,
    NEAREST: 0xBDD5, NEAR_D: 0xBDD6, COVER: 0xBE9F, COVER_COST: 0xBEA1, TARGET: 0xC0A1, SCORE: 0xC0A2,
    NPOINTS: 0xC2C6, VALUES: 0xC2C7, KIND_VALUES: undefined, RANGES: 0xC347, BREAKABLE: 0xC349,
    ORDERS: 0xC351, LINKS: 0xC7F6, AREAS: 0xC9FC, POINTS: 0xCA7A, DISTANCES: undefined,
    CHARGE: 0xBE24, CHARGE_D: 0xBE25,
    keepIX: false, depthMax: 20, refill: 0x14, refillHeld: true, kindSix: true, skipZero: true,
    maxHalf: true, twoMaps: [0xB879, 0xFF76, 0xFF61], charge: true,
  }),
};

G.ai = P => {
  const M = P.M, w = P.w, setw = P.setw;
  const ixOf = (r, ix) => (r && r.ix !== undefined ? r.ix : ix);
  const sat = v => (v > 255 ? 255 : v);

  function make(t) {
    const R = {};
    const def = (name, f) => { R[name] = f; return f; };

    // ---- routes between waypoints ----

    // nextLink: from the waypoint ZONE, the links from the A-th on: the first to a waypoint not
    // on the route so far (onPath) whose cost, added to the route's, is below BEST: Z, ZONE that
    // waypoint, B the cost, LINK_I the link's number. NZ when the list ends (a byte with bit 7 set:
    // each list begins with its length, with bit 7 set, so the next list's length ends this one).
    def('nextLink', r => {
      M[t.LINK_I] = r.a;
      let c = r.a;
      let hl = t.LINKS;
      for (let b = M[t.ZONE] || 256; b; b--) hl = hl + (M[hl] & 0x7F) & 0xFFFF;
      hl = hl + 1 & 0xFFFF;
      setw(t.LINK_LIST, hl);
      for (let n = 0; ; n++) {
        if (n > 0x10000) throw new Error('nextLink: no end to the links of waypoint ' + M[t.ZONE]);
        hl = hl + 2 * c & 0xFFFF;
        const z = M[hl];
        if (z & 0x80) return { a: z, zf: false, hl };
        if (!R.onPath({ a: z }).zf) {
          M[t.ZONE] = z;
          const cost = M[w(t.STACK) - 1 & 0xFFFF] + M[hl + 1 & 0xFFFF] & 255;
          if (cost < M[t.BEST]) return { a: 0, zf: true, b: cost };
        }
        M[t.LINK_I] = M[t.LINK_I] + 1 & 255;
        c = M[t.LINK_I];
        hl = w(t.LINK_LIST);
      }
    });
    // onPath: Z if waypoint A is on the route so far (the 50 entries of three bytes from $5B01), or
    // is 0.
    def('onPath', r => {
      for (let hl = 0x5B01, b = 50; b; b--, hl += 3) if (M[hl] === r.a) return { a: r.a, zf: true, hl };
      return { a: r.a, zf: r.a === 0, hl: 0x5B97 };
    });
    // findRoute: the cheapest route from waypoint FROM to waypoint TO, tried link by link, deepest
    // first, with every route that gets there cheaper than the best so far kept: its waypoints, ten
    // at most, at $5CF0, its cost in BEST (to begin with the distance between the two waypoints'
    // areas, or 25 in the same area) and FOUND set. The route so far is a stack of three bytes a
    // waypoint from $5B01: the waypoint, the link tried last, the cost to it.
    def('findRoute', () => {
      if (t.FOUND) M[t.FOUND] = 0;
      setw(t.STACK, 0x5B01);
      M.fill(0xFF, 0x5B01, 0x5B97);
      R.pointAt({ a: M[t.FROM] });
      M[t.AREA_A] = R.areaAt().a;
      R.pointAt({ a: M[t.TO] });
      M[t.AREA_B] = R.areaAt().a;
      M[t.BEST] = M[t.AREA_B] === M[t.AREA_A] ? 0x19 : R.areaDistance().a;
      M[0x5B00] = 0;
      M[t.DEPTH] = 0;
      M[t.ZONE] = M[t.FROM];
      for (let n = 0; ; n++) {
        if (n > 0x100000) throw new Error('findRoute: no end to the search');
        let hl = w(t.STACK);
        M[hl] = M[t.ZONE];
        if (M[hl] === M[t.TO]) {
          M[t.BEST] = M[hl - 1 & 0xFFFF];
          if (t.FOUND) M[t.FOUND] = 1;
          for (let k = 0; k < 10; k++) M[0x5CF0 + k] = M[0x5B01 + 3 * k];
        } else {
          hl = hl + 1 & 0xFFFF;
          M[hl] = M[hl] + 1 & 255;
          const l = R.nextLink({ a: M[hl] });
          if (l.zf && !(t.depthMax && M[t.DEPTH] >= t.depthMax)) {
            M[hl] = M[t.LINK_I];
            M[hl + 1 & 0xFFFF] = l.b;
            setw(t.STACK, hl + 2);
            M[t.DEPTH] = M[t.DEPTH] + 1 & 255;
            continue;
          }
        }
        if (!M[t.DEPTH]) return { a: 0, zf: true };
        hl = w(t.STACK);
        M[hl + 1 & 0xFFFF] = 0xFF;
        M[hl] = 0xFF;
        hl = hl - 3 & 0xFFFF;
        setw(t.STACK, hl);
        M[t.ZONE] = M[hl];
        M[t.DEPTH] = M[t.DEPTH] - 1 & 255;
      }
    });
    // pointAt: $5D3A (and DE) = waypoint A's square.
    def('pointAt', r => {
      const hl = t.POINTS + 2 * (r.a - 1 & 255) & 0xFFFF;
      const de = w(hl);
      setw(0x5D3A, de);
      return { de, hl: hl + 1 & 0xFFFF };
    });
    // areaAt: A = the number of the area the square ($5D3A) lies in, or 0 for none.
    def('areaAt', () => {
      for (let hl = t.AREAS; ; hl = hl + 5 & 0xFFFF) {
        const r = M[0x5D3A], c = M[0x5D3B];
        if (r >= M[hl] && r < M[hl + 1 & 0xFFFF] && c >= M[hl + 2 & 0xFFFF] && c < M[hl + 3 & 0xFFFF]) {
          return { a: M[hl + 4 & 0xFFFF], hl, zf: false, cf: true };
        }
        if (M[hl + 5 & 0xFFFF] === 0xFF) return { a: 0, zf: true, hl: hl + 5 & 0xFFFF };
      }
    });
    // areaDistance: A = the cost between areas AREA_A and AREA_B (0 for the same): a triangle of
    // bytes from DISTANCES, a row for each area from the second, as long as its number less one.
    // With twoMaps, two triangles: one for areas 1 to 16, the other for 17 on (the two numbers
    // less 16, kept so), $FF between an area of each.
    def('areaDistance', () => {
      let hl = t.DISTANCES;
      if (t.twoMaps) {
        const [ptr, lo, hi] = t.twoMaps;
        if (M[t.AREA_A] < 0x11) {
          if (M[t.AREA_B] >= 0x11) return { a: 0xFF };
          setw(ptr, lo);
        } else {
          if (M[t.AREA_B] < 0x11) return { a: 0xFF };
          M[t.AREA_A] = M[t.AREA_A] - 16 & 255;
          M[t.AREA_B] = M[t.AREA_B] - 16 & 255;
          setw(ptr, hi);
        }
        hl = w(ptr);
      }
      let c = M[t.AREA_A], b = M[t.AREA_B];
      if (c === b) return { a: 0, zf: true };
      if (c > b) { const x = b; b = c; c = x; }
      let de = 0;
      b = b - 1 & 255; c = c - 1 & 255;
      for (let k = b || 256; k; k--) { hl = hl + de & 0xFFFF; de++; }
      hl = hl + c & 0xFFFF;
      return { a: M[hl], hl, b: 0, c };
    });

    // ---- the half-turn ----

    // aiTurn: the computer's half-turn ($B621): the sides along the bottom and the view hidden,
    // then each of its units on the map in turn ($5C50, side 1): $5D26 its number, $5D24 its
    // square, $5D2F the square's place in the map, $5D33 and IX its record, ORDER its orders;
    // selected, and its move.
    def('aiTurn', function* () {
      P.showSides();
      yield* P.computerStep();
      let hl = 0x5C50;
      for (let b = 20; b; b--, hl = hl + 4 & 0xFFFF) {
        if (M[hl] !== 1) continue;
        M[0x5D26] = 0xA0 - b & 255;
        setw(0x5D24, w(hl + 1));
        setw(0x5D2F, P.mapSquare({ d: M[hl + 2], e: M[hl + 1] }).hl);
        let ix = P.unitPtr({ a: M[0x5D26] }).ix;
        setw(0x5D33, ix);
        const alien = t.aliens && M[0x5D26] >= 0x9C;
        if (!alien) setw(t.ORDER, t.ORDERS + 10 * M[ix + 0x1A] & 0xFFFF);
        M[0x5D36] = 1;
        ix = ixOf(yield* P.computerStep({ ix }), ix);
        P.showAllUnits();
        ix = ixOf(yield* P.selectUnit({ ix }), ix);
        if (alien) { yield* R.alienMove({ ix }); continue; }
        if (t.charge) {
          // $B928: an enemy in sight to run at (aiCanGo), and the unit runs at it
          M[0x5D37] = 0;
          M[0x5D62] = 0;
          M[t.CHARGE] = 0;
          R.aiCanGo({ ix });
          if (M[t.CHARGE]) { yield* R.nextPoint({ ix }); continue; }
        }
        yield* R.unitMove({ ix });
      }
      M[0x5D36] = 0;
      return { a: 0, zf: true };
    });
    // unitMove: one unit's move, $B8F4 to $BA4C in the listing, as the jumps there go: with no
    // rounds in its weapon ($24) it reloads when it carries a clip of the weapon's kind ($10); an
    // enemy in sight is fired at (peek); then, while it can go on ($5D37 clear), an enemy known
    // (knownEnemy) is faced and fired at from the square next to it nearest, else the enemy chosen
    // is hunted (bit 3 of the orders' flags clear), else the orders walked.
    def('unitMove', function* (r) {
      let ix = r.ix;
      if (r.at) return yield* walk(ix, r.at);
      // (with charge, cleared before the look for an enemy to run at, which may set $5D37)
      if (!t.charge) {
        M[0x5D37] = 0;
        M[0x5D62] = 0;
      }
      if (t.refill) {
        // an empty weapon (held, with refillHeld) is simply filled, and its clip too
        if ((!t.refillHeld || M[ix + 0x17]) && !M[ix + 0x24]) {
          M[ix + 0x24] = t.refill;
          const c = P.carriedPtr({ a: M[ix + 0x17] });
          if (c.iy === undefined) throw new Error('unitMove: a refill with nothing held writes through IY');
          M[c.iy + 4 & 0xFFFF] = t.refill;
        }
      } else if (!M[ix + 0x24]) {
        P.listCarried({ ix });
        const o = P.objectPtr({ a: M[ix + 0x23] }).ix;
        setw(0x5DC2, o);
        const f = P.findCarried({ a: M[o + 0x10] });
        ix = w(0x5D33);
        if (f.zf) {
          P.delay200();
          ix = ixOf(yield* P.reload({ ix }), ix);
          ix = ixOf(P.unitStats({ ix }), ix);
        }
      }
      if (M[0x5D59]) ix = ixOf(yield* R.peek({ ix }), ix);
      if (M[0x5D37]) return { ix };
      return yield* walk(ix, R.knownEnemy().zf ? (M[w(t.ORDER) + 8] & 8 ? 'walk' : 'hunt') : 'face');
    });
    function* walk(ix, at) {
      for (let n = 0; ; n++) {
        if (n > 100000) throw new Error('unitMove: the unit never stops');
        if (at === 'hunt') {
          // $B942
          if (t.aliens && M[0x5D26] >= 0x9C) return { ix };
          ix = ixOf(R.chooseTarget({ ix }), ix);
          const tg = M[t.TARGET];
          if (!tg || !M[0xB63A + (tg - 0x8C & 255)]) { at = 'walk'; continue; }
          setw(0x5D3A, R.unitPos({ a: tg }).de);
          R.visiblePoints();
          if (!M[0x5D8F]) { at = 'walk'; continue; }
          M[t.FROM] = R.nearestPoint().a;
          let hl = 0x5C0A;
          M[t.BEST_ROUTE] = 0xFF;
          for (let b = M[0x5D8F]; b; b--, hl = hl + 1 & 0xFFFF) {
            M[t.TO] = M[hl];
            R.findRoute();
            if (t.FOUND && !M[t.FOUND]) continue;
            if (M[t.BEST] >= M[t.BEST_ROUTE]) continue;
            M[t.BEST_ROUTE] = M[t.BEST];
            M[t.GOAL] = M[t.TO];
          }
          M[t.RESERVE] = 0;
          ix = ixOf(yield* R.moveOn({ ix }), ix);
          if (M[0x5D62]) { at = 'face'; continue; }
          if (M[0x5D37]) return { ix };
          if (M[0x5D59]) ix = ixOf(yield* R.peek({ ix }), ix);
          if (M[0x5D37]) return { ix };
          at = R.knownEnemy().zf ? 'hunt' : 'face';
        } else if (at === 'walk') {
          // $B9CF
          const fl = M[w(t.ORDER) + 8];
          M[t.RESERVE] = 0;
          if (!(fl & 1) && (fl & 2 || M[0xB714])) M[t.RESERVE] = M[ix + 5] >> 1;
          at = 'orders';
        } else if (at === 'orders') {
          // $B9F1
          ix = ixOf(yield* R.nextPoint({ ix }), ix);
          if (!R.knownEnemy().zf || M[0x5D62]) { at = 'face'; continue; }
          // $BA3C
          if (M[0x5D37] || !M[0x5D59]) return { ix };
          ix = ixOf(yield* R.peek({ ix }), ix);
        } else {
          // $B9FF: face the enemy known, from the square next to the unit nearest it
          if (!M[ix + 8]) return { ix };
          setw(0xA5DA, R.unitPos({ a: M[0xB713] }).de);
          setw(0xA5DC, w(0x5D24));
          P.nearSquares();
          setw(0x5D3A, w(0x5B00));
          ix = ixOf(yield* R.faceTo({ ix }), ix);
          M[0x5D62] = 0;
          if (M[0x5D59]) {
            ix = ixOf(yield* R.peek({ ix }), ix);
            if (M[0x5D37]) return { ix };
          }
          at = 'hunt';
        }
      }
    }
    // alienMove (Cyber Hordes, $B8D3 to $B937): an alien ($5D26 from $9C) shoots a terminal it can
    // see (terminalAttack), or walks to the waypoint of the one it is after ($1A, chosen at random
    // when it has none or that one is gone): with an enemy in sight it fires (peek) instead, an
    // enemy known is faced; at the terminal's waypoint it chooses again in its next turn.
    def('alienMove', function* (r) {
      let ix = r.ix;
      M[0x5D37] = 0;
      M[0x5D62] = 0;
      ix = ixOf(yield* R.terminalAttack({ ix }), ix);
      if (M[ix + 0x1A] === 0xFF) ix = ixOf(R.pickTerminal({ ix }), ix);
      const a = R.terminalAt({ a: M[ix + 0x1A] }).a;
      M[t.GOAL] = a;
      if (!a) ix = ixOf(R.pickTerminal({ ix }), ix);
      if (M[0x5D59]) return yield* R.peek({ ix });
      ix = ixOf(yield* R.moveOn({ ix }), ix);
      if (!R.knownEnemy().zf || M[0x5D62]) return yield* walk(ix, 'face');
      if (M[0x5D59]) return yield* R.peek({ ix });
      if (M[t.ARRIVED]) M[w(0x5D33) + 0x1A] = 0xFF;
      return { ix };
    });
    // terminalAttack ($CA41, Cyber Hordes, for aliens only): when the alien is on a square of its
    // own, the first terminal left (TERMINALS: seven of three bytes, its square and its waypoint,
    // the waypoint 0 once it is gone) in a clear line is faced, from the square next to it nearest,
    // and given snap shots while the unit has the points, the rounds and its life.
    def('terminalAttack', function* (r) {
      let ix = r.ix;
      for (;;) {
        if (M[0x5D26] < 0x9C) return { ix, cf: true };
        const s = P.shared();
        if (!s.zf) return Object.assign({ ix }, s);
        setw(0x5D47, w(0x5D24));
        let hl = t.TERMINALS, seen = false;
        for (let b = 7; b && !seen; b--) {
          const de = w(hl), a = M[hl + 2 & 0xFFFF];
          hl = hl + 3 & 0xFFFF;
          if (!a) continue;
          setw(0x5D49, de);
          setw(0x5D3A, de);
          seen = P.lineClear2().zf;
        }
        if (!seen) return { ix, b: 0 };
        setw(0xA5DA, w(0x5D3A));
        setw(0xA5DC, w(0x5D24));
        P.nearSquares();
        setw(0x5D3A, w(0x5B00));
        const f = yield* R.faceTo({ ix });
        ix = ixOf(f, ix);
        if (f.zf) return f;
        P.clearFires();
        P.showAllUnits();
        ix = w(0x5D33);
        if (!M[ix + 0x24]) { M[0x5D37] = 1; return { ix, a: 1 }; }
        M[0x5DE7] = M[ix + 0x23];
        setw(0x5DC2, P.objectPtr({ a: M[ix + 0x23] }).ix);
        setw(0x5D11, w(0x5D24) - w(0x5CFC));
        setw(0xA54B, w(0x5D24));
        setw(0x5D47, w(0x5D24));
        setw(0xA54D, w(0x5D49));
        M[0xB712] = 0;
        P.sideView();
        M[0xB712] = 1;
        M[w(0x5D2F)] = M[0x5D26];
        ix = ixOf(P.findSeen({ ix }), ix);
        ix = ixOf(P.showSeen({ ix }), ix);
        P.aimStart();
        P.fireInfo();
        R.aimJitter({ de: w(0xA54D) });
        ix = w(0x5D33);
        if (M[ix + 6] < M[0x5DE2]) { M[0x5D37] = 1; return P.fireEnd(); }
        M[0x5D36] = 0;
        yield* P.run('snapShot', { ix });
        M[0x5D36] = 1;
        P.fireEnd();
        ix = w(0x5D33);
        R.terminalsLeft();
        if (!R.terminalAt({ a: M[ix + 0x1A] }).a) { M[ix + 0x1A] = 0xFF; M[0x5D37] = 1; }
        if (!M[ix + 8] || M[0x5D37]) return { ix };
        ix = ixOf(P.unitStats({ ix }), ix);
      }
    });
    // pickTerminal ($CB5D): the alien's terminal ($1A) at random, of the seven, until one with its
    // waypoint (GOAL) still on the map ($24): one found gone has its waypoint cleared.
    def('pickTerminal', r => {
      const ix = r.ix;
      M[0x5D9B] = 7;
      for (let n = 0; ; n++) {
        if (n > 0x10000) throw new Error('pickTerminal: no terminal left');
        const a = P.random().a;
        M[ix + 0x1A] = a;
        const p = R.terminalAt({ a });
        if (!p.a) continue;
        M[t.GOAL] = p.a;
        if (M[P.mapSquare({ d: p.de >> 8, e: p.de & 255 }).hl] === 0x24) return { ix, a: 0x24, zf: true, hl: p.hl };
        M[p.hl] = 0;
      }
    });
    // terminalAt ($CB7E): terminal A's square (DE) and waypoint (A; HL its address).
    def('terminalAt', r => {
      const hl = t.TERMINALS + 3 * r.a & 0xFFFF;
      return { de: w(hl), a: M[hl + 2 & 0xFFFF], hl: hl + 2 & 0xFFFF };
    });
    // terminalsLeft ($CB8D): each terminal no longer on the map ($24) has its waypoint cleared.
    def('terminalsLeft', () => {
      for (let b = 7, hl = t.TERMINALS; b; b--, hl = hl + 3 & 0xFFFF) {
        if (M[P.mapSquare({ d: M[hl + 1 & 0xFFFF], e: M[hl] }).hl] !== 0x24) M[hl + 2 & 0xFFFF] = 0;
      }
      return { b: 0 };
    });
    // knownEnemy: NZ, and $B713 the unit, when one of the enemies listed from $5B99 (by twos and
    // threes: the game reads the list a byte out) has been seen lately (its count at $B63A + its
    // number not 0).
    def('knownEnemy', () => {
      let hl = 0x5B99;
      for (;;) {
        const a = M[hl];
        if (a === 0xFF) return { a, zf: true, hl };
        if (M[0xB63A + (a - 0x8C & 255) & 0xFFFF]) {
          M[0xB713] = a;
          return { a: 1, zf: false, hl };
        }
        hl = hl + 1 & 0xFFFF;
        if (M[hl] === 0xFF) return { a: 0xFF, zf: true, hl };
        hl = hl + 2 & 0xFFFF;
      }
    });

    // ---- walking ----

    // nextPoint: the unit's orders: the waypoint byte 0 picks (GOAL), back to the first after the
    // last (a 0), made for (moveOn) and, when the unit is there, the next.
    def('nextPoint', function* (r) {
      let ix = r.ix;
      for (let n = 0; ; n++) {
        if (n > 1000) throw new Error('nextPoint: the unit stands on every waypoint of its orders');
        M[t.TARGET] = 0;
        const hl = w(t.ORDER);
        const a = M[hl + M[hl] & 0xFFFF];
        M[t.GOAL] = a;
        if (!a) { M[hl] = 1; continue; }
        ix = ixOf(yield* R.moveOn({ ix }), ix);
        if (!M[t.ARRIVED]) return { ix, a: 0, zf: true };
        M[hl] = M[hl] + 1 & 255;
      }
    });
    // moveOn: walk the unit to waypoint GOAL (or, hunting, on to the enemy TARGET once there):
    // the route from the nearest waypoint it can see (findRoute), its first waypoint passed over
    // when the second is in sight, then square by square (step) to each waypoint of it in turn;
    // ARRIVED set at GOAL.
    // With charge, a unit running at an enemy (CHARGE) steps straight for it ($A5DA), and goes into
    // close combat with the enemy next to it.
    def('moveOn', function* (r) {
      let ix = r.ix;
      M[t.ARRIVED] = 0;
      let at;
      if (t.charge && M[t.CHARGE]) at = 'choose';
      else if (R.pointNumber({ hl: w(0x5D24) }).a === M[t.GOAL]) {
        M[t.ARRIVED] = 1;
        if (!M[t.TARGET]) return { ix, a: 1, zf: false };
        at = 'aim';
      } else {
        setw(t.STACK, 0x5CF0);
        M[t.TO] = M[t.GOAL];
        const a = R.nearestPoint().a;
        M[t.FROM] = a;
        if (a === M[t.TO]) {
          M[0x5CF0] = M[t.FROM];
        } else {
          R.findRoute();
          setw(t.STACK, 0x5CF0);
          setw(0x5D47, w(0x5D24));
          setw(0x5D49, R.pointAt({ a: M[w(t.STACK) + 1 & 0xFFFF] }).de);
          if (P.lineClear4().zf) setw(t.STACK, w(t.STACK) + 1);
        }
        at = 'next';
      }
      for (let n = 0; ; n++) {
        if (n > 100000) throw new Error('moveOn: the unit never arrives');
        if (at === 'next') {
          // $BB15: the next waypoint of the route
          const hl = w(t.STACK);
          M[t.ZONE] = M[hl];
          setw(t.STACK, hl + 1);
          setw(0xA5DA, R.pointAt({ a: M[hl] }).de);
          R.clearTrail();
          at = 'aim';
        }
        // $BB2A
        if (at === 'choose') at = 'aim';
        else if (M[t.ARRIVED] && M[t.TARGET]) {
          setw(0xA5DA, R.unitPos({ a: M[t.TARGET] }).de);
        } else {
          const a = R.pointNumber({ hl: w(0x5D24) }).a;
          if (a === M[t.GOAL]) {
            M[t.ARRIVED] = 1;
            if (!M[t.TARGET]) return yield* stop(ix, true);
            continue;
          }
          if (a === M[t.ZONE]) { at = 'next'; continue; }
        }
        // $BB62: the squares round the unit, nearest the waypoint first
        setw(0xA5DC, w(0x5D24));
        P.nearSquares();
        setw(0x5DFB, 0x5B00);
        let go = null;
        for (let b = 8; b && !go; b--) {
          const hl = w(0x5DFB);
          const de = w(hl);
          setw(0x5DFB, hl + 3);
          if ((de & 255) === 0xFF) continue;
          setw(0x5D3A, de);
          if (R.onTrail().zf) continue;
          M[0x5D38] = 0;
          ix = ixOf(P.stepCost({ ix }), ix);
          const k = M[0x5D29];
          if (k === 0 && t.charge) go = 'close';
          else if (k === 2) go = 'stop';
          else if (k === 5) go = 'step';
          else if (M[ix + 0x16] >= 0x8C) continue;
          else if (k === 1 || (t.kindSix && k >= 6)) {
            const iy = P.terrainPtr({ a: M[w(0x5D3E)] }).iy;
            if (M[iy + 8] === 1) go = { door: iy };
            else {
              const sq = M[w(0x5D3E)];
              for (let k2 = 0; k2 < 8; k2++) if (M[t.BREAKABLE + k2 & 0xFFFF] === sq) { go = 'break'; break; }
            }
          }
        }
        if (!go) {
          // $BBB0: nowhere to go
          const s = P.shared();
          if (!s.zf) return yield* P.undoMove({ ix });
          return Object.assign({ ix }, s);
        }
        if (go === 'stop') return yield* stop(ix, true);
        if (go === 'close') {
          // an enemy on the square: close combat, as the player's (and $5D36 left clear)
          M[0x5D36] = 0;
          P.centreOn();
          return yield* P.closeCombat({ ix });
        }
        if (go === 'step') {
          // $BBFD
          ix = ixOf(yield* R.aiStep({ ix }), ix);
          if (t.charge && M[t.CHARGE]) {
            ix = w(0x5D33);
            if (!M[ix + 6]) return yield* stop(ix, true);
            if (M[0x5D37]) return yield* stop(ix, false);
            setw(0xA5DA, R.unitPos({ a: M[t.CHARGE] }).de);
            at = 'choose';
            continue;
          }
          if (M[0x5D59] || M[0x5D62]) return yield* stop(ix, false);
          const c = R.aiCanGo({ ix });
          if (c.zf) return yield* stop(ix, true);
          if (M[0x5D37]) return yield* stop(ix, false);
          continue;
        }
        if (go.door) {
          // $BBB7: a door in the way, faced and opened
          const f = yield* R.faceTo({ ix });
          ix = ixOf(f, ix);
          if (f.zf) return yield* stop(ix, true);
          const o = yield* P.openDoor({ ix, iy: go.door });
          ix = ixOf(o, ix);
          if (o.cf) return yield* stop(ix, true);
          continue;
        }
        // $BBE8: a square of BREAKABLE in the way, faced and attacked
        const f = yield* R.faceTo({ ix });
        ix = ixOf(f, ix);
        if (f.zf) return yield* stop(ix, true);
        ix = ixOf(yield* P.attackTerrain({ ix }), ix);
        if (M[0x5D37]) return yield* stop(ix, true);
      }
    });
    // $BC1B and $BC20: the unit stops ($5D37 set at $BC1B), and is put back where it was kept when
    // it shares its square with another of its side.
    function* stop(ix, set) {
      if (set) M[0x5D37] = 1;
      const s = P.shared();
      if (!s.zf) return yield* P.undoMove({ ix });
      return Object.assign({ ix }, s);
    }
    // aiStep: a step to ($5D3A), faced first (faceTo): made (makeStep), kept on the trail and the
    // unit's panel shown, unless its points less RESERVE do not pay for it, or (bit 2 of the
    // orders' flags, or hunting) an enemy that could still fire would see it there (aiDanger): then
    // $5D37 is set and the unit stops.
    def('aiStep', function* (r) {
      let ix = r.ix;
      const f = yield* R.faceTo({ ix });
      ix = ixOf(f, ix);
      if (f.zf) return f;
      let a = M[ix + 6] - M[t.RESERVE];
      if (a < 0 || (a & 255) - M[0x5D28] < 0) { M[0x5D37] = 1; return { ix, a: 1 }; }
      if (M[w(t.ORDER) + 8] & 4 || M[t.TARGET]) {
        const d = R.aiDanger({ ix });
        ix = ixOf(d, ix);
        if (!d.zf) { M[0x5D37] = 1; return { ix, a: 1 }; }
      }
      ix = ixOf(yield* P.makeStep({ ix }), ix);
      const hl = w(t.TRAIL);
      setw(hl, w(0x5D24));
      setw(t.TRAIL, hl + 2);
      const u = P.unitPanel();
      if (t.aliens) return Object.assign({ ix }, yield* R.terminalAttack({ ix }));
      return Object.assign({ ix }, u);
    });
    // onTrail: Z if the square ($5D3A) is on the trail (25 squares from $5C0A, ended by $FF).
    def('onTrail', () => {
      let hl = 0x5C0A;
      for (let b = 0x19; b; b--) {
        if (M[hl] === 0xFF) break;
        if (M[0x5D3A] === M[hl] && M[0x5D3B] === M[hl + 1]) return { a: M[0x5D3B], zf: true, hl: hl + 1 };
        hl += 2;
      }
      return { a: 1, zf: false };
    });
    // clearTrail: a new trail, TRAIL at its start.
    def('clearTrail', () => {
      setw(t.TRAIL, 0x5C0A);
      M.fill(0xFF, 0x5C0A, 0x5C3C);
      return { hl: 0x5C3C, de: 0x5C3C, bc: 0 };
    });
    // faceTo: turn the unit to face the square ($5D3A) next to it, by the shorter way round, an
    // eighth (and an action point) at a time; Z when it may not go on (aiCanGo), NZ when it faces it.
    def('faceTo', function* (r) {
      let ix = r.ix;
      setw(0xA5DC, w(0x5D3A));
      const at = () => w(0xA5DC) === w(0x5D3A);
      M[t.FACE] = M[ix + 0x21];
      M[t.RIGHTS] = 0;
      for (let n = 0; ; n++) {
        if (n > 0x10000) throw new Error('faceTo: the square is not next to the unit');
        P.stepTarget({ a: M[t.FACE] });
        if (at()) break;
        M[t.RIGHTS] = M[t.RIGHTS] + 1 & 255;
        M[t.FACE] = M[t.FACE] + 1 & 255;
        if (M[t.FACE] >= 8) M[t.FACE] = 0;
      }
      M[t.LEFTS] = 0;
      M[t.FACE] = M[ix + 0x21];
      for (;;) {
        P.stepTarget({ a: M[t.FACE] });
        if (at()) break;
        M[t.LEFTS] = M[t.LEFTS] + 1 & 255;
        M[t.FACE] = M[t.FACE] - 1 & 255;
        if (M[t.FACE] === 0xFF) M[t.FACE] = 7;
      }
      const right = M[t.RIGHTS];
      if (right) {
        const turn = right < M[t.LEFTS] ? 'turnRight' : 'turnLeft';
        for (let b = right < M[t.LEFTS] ? right : M[t.LEFTS]; b; b--) {
          ix = ixOf(yield* P.run(turn, { ix }), ix);
          const c = R.aiCanGo({ ix });
          if (c.zf) return Object.assign({ ix }, c);
        }
      }
      return { ix, a: 1, zf: false };
    });
    // pointNumber: A = the number of the waypoint at the square HL (L the row), or 0 and Z.
    def('pointNumber', r => {
      setw(t.AT, r.hl);
      const n = M[t.NPOINTS];
      let hl = t.POINTS;
      for (let b = n || 256; b; b--, hl = hl + 2 & 0xFFFF) {
        if (M[t.AT] === M[hl] && M[t.AT + 1] === M[hl + 1 & 0xFFFF]) {
          const a = n + 1 - b & 255;
          return { a, zf: a === 0, hl: hl + 1 & 0xFFFF };
        }
      }
      return { a: 0, zf: true };
    });
    // nearestPoint: A = the waypoint at the unit's square ($5D24), or the nearest to it of those it
    // can see (NEAREST; its distance NEAR_D).
    def('nearestPoint', () => {
      const p = R.pointNumber({ hl: w(0x5D24) });
      if (p.a) return p;
      setw(0xA54B, w(0x5D24));
      setw(0x5D47, w(0x5D24));
      M[t.NEAR_D] = 0xFF;
      const n = M[t.NPOINTS];
      let hl = t.POINTS;
      for (let b = n || 256; b; b--, hl = hl + 2 & 0xFFFF) {
        const de = w(hl);
        setw(0xA54D, de);
        setw(0x5D49, de);
        if (!P.lineClear4().zf) continue;
        const d = P.distance().a;
        if (d >= M[t.NEAR_D]) continue;
        M[t.NEAR_D] = d;
        M[t.NEAREST] = n + 1 - b & 255;
      }
      return { a: M[t.NEAREST] };
    });
    // aiCanGo: NZ while the unit has points beyond RESERVE (not exactly those) and lives, and no
    // enemy is in sight; Z otherwise, with $5D37 set, or (an enemy in sight) $B714.
    // With charge, a unit of orders with bit 4 that sees enemies runs at the nearest (CHARGE; its
    // distance CHARGE_D, its square $A5DA) of the ten entries from $5B97, read past the list's end,
    // measured from row $FF (the game stores A where it means the unit's square) and the column
    // last measured from; RESERVE cleared.
    def('aiCanGo', r => {
      const ix = r.ix;
      const a = M[ix + 6];
      if (a && a !== M[t.RESERVE] && M[ix + 8]) {
        if (!M[0x5D59]) { const v = M[ix + 8] + 1 & 255; return { ix, a: v, zf: v === 0 }; }
        M[0xB714] = 1;
        if (t.charge && M[w(t.ORDER) + 8 & 0xFFFF] & 0x10) {
          M[t.CHARGE_D] = 0xFF;
          M[0xA54B] = 0xFF;
          for (let b = 10, hl = 0x5B97; b; b--, hl = hl + 3 & 0xFFFF) {
            if (M[hl] === 0xFF) continue;
            M[0x5D21] = M[hl + 2 & 0xFFFF];
            setw(0xA54D, w(hl));
            const d = P.distance().a;
            if (d >= M[t.CHARGE_D]) continue;
            M[t.CHARGE_D] = d;
            M[t.CHARGE] = M[0x5D21];
            setw(0xA5DA, w(0xA54D));
          }
          M[t.RESERVE] = 0;
        }
        return { ix, a: 0, zf: true };
      }
      M[0x5D37] = 1;
      return { ix, a: 0, zf: true };
    });

    // ---- seeing and firing ----

    // peek: with enemies in sight. Of the eight squares round the unit ($A5CA, the steps), each
    // is given the cost of a step onto it (the terrain's byte for the unit's kind, $04), or $FF
    // when an enemy can be seen from it, a unit stands there or the unit cannot go there; the
    // cheapest is COVER, its cost + 1 COVER_COST (0 for none). The unit fires (the hook at $B624,
    // aiFire) and then, with enemies still in sight and a square of cover, is put on it, with no
    // points left.
    def('peek', function* (r) {
      let ix = r.ix;
      // with charge, a unit of orders with bit 4 does not stop to fire
      if (t.charge && M[w(t.ORDER) + 8 & 0xFFFF] & 0x10) return { ix, zf: false };
      P.showAllUnits();
      M[0xB714] = 1;
      setw(0xA5DC, w(0x5D24));
      setw(0xA5DE, 0xA5CA);
      setw(0x5DFB, 0x5B00);
      for (let b = 8; b; b--) {
        setw(0x5D24, w(0xA5DC));
        const s = w(0xA5DE);
        M[0x5D3A] = M[0x5D24] + M[s] & 255;
        M[0x5D3B] = M[0x5D25] + M[s + 1 & 0xFFFF] & 255;
        setw(0xA5DE, s + 2);
        const de = w(0x5D3A);
        setw(0x5D24, de);
        let hl = w(0x5DFB);
        setw(hl, de);
        hl = hl + 2 & 0xFFFF;
        setw(0x5DFB, hl);
        setw(0x5D3E, P.mapSquare({ d: de >> 8, e: de & 255 }).hl);
        ix = ixOf(P.findSeen({ ix }), ix);
        let v = 0xFF;
        if (M[0x5B97] === 0xFF && M[w(0x5D3E)] < 0x8C) {
          const iy = P.terrainPtr({ a: P.floorAt().a }).iy;
          const c = M[iy + M[ix + 4] & 0xFFFF];
          if (c !== 0xFF) v = c;
        }
        M[w(0x5DFB)] = v;
        setw(0x5DFB, w(0x5DFB) + 1);
      }
      M[0x5DFD] = 7;
      setw(0xA578, 0x5B00);
      P.sortNear();
      setw(t.COVER, w(0x5B00));
      M[t.COVER_COST] = M[0x5B02] + 1 & 255;
      setw(0x5D24, w(0xA5DC));
      yield* P.computerReaction({ ix });
      ix = w(0x5D33);
      if (!M[0x5D59] || !M[t.COVER_COST]) return { ix };
      M[P.mapSquare({ d: M[0x5D25], e: M[0x5D24] }).hl] = M[ix + 0x16];
      setw(0x5D24, w(t.COVER));
      const hl = P.mapSquare({ d: M[0x5D25], e: M[0x5D24] }).hl;
      setw(0x5D2F, hl);
      const under = M[hl];
      M[hl] = M[0x5D26];
      M[ix + 0x16] = under;
      M[ix + 6] = 0;
      P.placeUnit({ a: M[0x5D26], ix });
      M[0x5D37] = 1;
      return Object.assign({ ix }, yield* P.computerStep({ ix }));
    });
    // aiFire: the computer's reaction ($B624): with rounds in its weapon, the unit aims at one of
    // the enemies in sight ($5CA0, one of $5D59 at random) when the line to it is clear, the
    // map as the computer sees it; its shot by the range (RANGES: aimed from the first on, snap
    // from the second, auto below) and its points, keeping COVER_COST for the step to cover after;
    // again while enemies are in sight and it lives. $5D37 set when it cannot.
    def('aiFire', function* (r) {
      let ix;
      for (;;) {
        P.clearFires();
        P.showAllUnits();
        ix = w(0x5D33);
        if (!M[ix + 0x24]) { M[0x5D37] = 1; return { ix, a: 1 }; }
        M[0x5DE7] = M[ix + 0x23];
        setw(0x5DC2, P.objectPtr({ a: M[ix + 0x23] }).ix);
        setw(0x5D11, w(0x5D24) - w(0x5CFC));
        setw(0xA54B, w(0x5D24));
        setw(0x5D47, w(0x5D24));
        M[0x5D9B] = M[0x5D59];
        const n = P.random().a;
        const de = R.unitPos({ a: M[0x5CA0 + n & 0xFFFF] }).de;
        setw(0x5D49, de);
        setw(0xA54D, de);
        const l = P.lineClear2();
        if (!l.zf) return Object.assign({ ix: w(0x5DC2) }, l);
        M[0xB712] = 0;
        P.sideView();
        M[0xB712] = 1;
        M[w(0x5D2F)] = M[0x5D26];
        ix = ixOf(P.findSeen({ ix }), ix);
        ix = ixOf(P.showSeen({ ix }), ix);
        if (!M[0x5D59]) return { ix, a: 0, zf: true };
        P.aimStart();
        P.fireInfo();
        R.aimJitter({ de: w(0xA54D) });
        ix = w(0x5D33);
        if (M[ix + 6] < M[t.COVER_COST]) return P.fireEnd();
        const d = P.distance().a;
        let shot = null;
        if (d >= M[t.RANGES]) {
          if (M[ix + 6] >= M[0x5DE4]) shot = 'aimedShot';
        } else if (d < M[t.RANGES + 1 & 0xFFFF]) shot = 'auto';
        if (!shot) {
          // $BF7B
          if (M[ix + 6] >= M[0x5DE2]) shot = 'snapShot';
          else if (!M[0x5DE0]) shot = 'none';
          else shot = 'auto';
        }
        if (shot === 'auto') shot = M[ix + 6] >= M[0x5DE0] ? 'autoOne' : 'none';
        if (shot === 'none') { M[0x5D37] = 1; return P.fireEnd(); }
        yield* P.run(shot, { ix });
        P.fireEnd();
        ix = w(0x5D33);
        if (!M[ix + 8]) return { ix, a: 0, zf: true };
        if (!M[0x5D59]) return { ix, a: 0, zf: true };
      }
    });
    // aimJitter: the view's corner at the enemy's square (DE), the crosshair 5 to 10 pixels into it
    // across and down, at random.
    def('aimJitter', r => {
      setw(0x5CFC, r.de);
      M[0x5D9B] = 6;
      M[0x5D11] = P.random().a + 5 & 255;
      const a = P.random().a + 5 & 255;
      M[0x5D12] = a;
      return { a };
    });
    // chooseTarget: TARGET, the enemy that scores the most (SCORE), listed with its score from
    // $5B00: its $27, plus a value for each object it carries (KIND_VALUES), plus the value of the
    // area it stands in for the unit's orders (VALUES, row $09 of the orders, 0 leaves the enemy
    // out), plus half of 255 less the cost to its area, plus how long it will be remembered ($B63A),
    // each sum at most 255. An enemy in no area scores 0.
    def('chooseTarget', r => {
      const keep = M[0x5D26];
      setw(0x5D3A, w(0x5D24));
      M[t.AREA_A] = R.areaAt().a;
      setw(0x5DFB, 0x5AFF);
      M[0x5D26] = 0x8B;
      let ix = r.ix;
      for (;;) {
        const a = M[0x5D26] + 1 & 255;
        if (a === 0xA0) break;
        let hl = w(0x5DFB) + 1 & 0xFFFF;
        M[hl] = a;
        hl = hl + 1 & 0xFFFF;
        M[hl] = 0;
        setw(0x5DFB, hl);
        M[0x5D26] = a;
        ix = P.unitPtr({ a }).ix;
        if (M[ix + 0x25] & 1 || !M[ix + 8]) continue;
        setw(0x5D3A, R.unitPos({ a }).de);
        const area = R.areaAt().a;
        if (!area) continue;
        M[t.AREA_B] = area;
        M[hl] = M[ix + 0x27];
        if (t.KIND_VALUES !== undefined) {
          P.listCarried({ ix });
          for (let b = M[0x5D8F], k = 0x5B7A; b; b--, k += 3) {
            const v = M[t.KIND_VALUES + (M[k] - 0x6E & 255) & 0xFFFF];
            M[hl] = sat(M[hl] + v);
          }
        }
        if (t.VALUES !== undefined) {
          const v = M[t.VALUES + 32 * M[w(t.ORDER) + 9 & 0xFFFF] + (M[t.AREA_B] - 1 & 255) & 0xFFFF];
          if (!v) { M[hl] = 0; continue; }
          M[hl] = sat(M[hl] + v);
        }
        const d = R.areaDistance().a;
        M[hl] = sat(M[hl] + ((0xFF - d & 255) >> 1));
        M[hl] = sat(M[hl] + M[0xB63A + (M[0x5D26] - 0x8C & 255) & 0xFFFF]);
      }
      M[0x5D26] = keep;
      M[t.TARGET] = 0;
      M[t.SCORE] = 0;
      for (let b = 20, iy = 0x5B00; b; b--, iy += 2) {
        if (M[iy + 1] < M[t.SCORE] || (t.skipZero && !M[iy + 1])) continue;
        M[t.SCORE] = M[iy + 1];
        M[t.TARGET] = M[iy];
      }
      if (t.keepIX) ix = w(0x5D33);
      return { ix, iy: 0x5B28, b: 0 };
    });
    // unitPos: DE = unit A's square, from the table at $5C50.
    def('unitPos', r => {
      const hl = 0x5C51 + 4 * (r.a - 0x8C & 255) & 0xFFFF;
      return { de: w(hl), hl: hl + 1 & 0xFFFF };
    });
    // visiblePoints: the waypoints that can be seen from the square ($5D3A), listed from $5C0A
    // ($5D8F of them): the waypoint on the square itself first, if there is one.
    def('visiblePoints', () => {
      setw(0x5D47, w(0x5D3A));
      M[0x5D8F] = 0;
      setw(0x5DFB, 0x5C0A);
      M[t.DEPTH] = 1;
      const p = R.pointNumber({ hl: w(0x5D3A) });
      if (p.a) {
        const hl = w(0x5DFB);
        M[hl] = p.a;
        setw(0x5DFB, hl + 1);
        M[0x5D8F] = 1;
      }
      let hl = t.POINTS;
      for (let b = M[t.NPOINTS] || 256; b; b--, hl = hl + 2 & 0xFFFF) {
        setw(0x5D49, w(hl));
        if (P.lineClear().zf) {
          const o = w(0x5DFB);
          M[o] = M[t.DEPTH];
          setw(0x5DFB, o + 1);
          M[0x5D8F] = M[0x5D8F] + 1 & 255;
        }
        M[t.DEPTH] = M[t.DEPTH] + 1 & 255;
      }
      return { b: 0 };
    });
    // shotSeen: the hook at $B627, a shot's square HL: when an enemy of the side firing can see it,
    // the unit firing ($5D26) is remembered by the computer ($B63A + its number = its skill,
    // $5DF8) and $B714 set. The line's start ($7091, $7093) is put back.
    def('shotSeen', r => {
      const keep = w(0x5D24);
      setw(0x5D24, r.hl);
      const s = P.findSeen({ ix: r.ix });
      if (M[0x5B97] !== 0xFF) {
        M[0xB63A + (M[0x5D26] - 0x8C & 255) & 0xFFFF] = M[0x5DF8];
        M[0xB714] = 1;
      }
      setw(0x7091, w(0x5DD8));
      setw(0x7093, w(0x5DD6));
      setw(0x5D24, keep);
      return { ix: ixOf(s, r.ix), de: keep, hl: w(0x5DD6) };
    });
    // aiDanger: NZ when, from the square ($5D3A) the unit is to step to, an enemy it remembers
    // ($B63A) could see it (inView) with more than half the points it starts a turn with left.
    def('aiDanger', r => {
      if (t.maxHalf && M[0x5D26] >= 0x9C) return { ix: r.ix, a: 0, zf: true };
      const keep = w(0x5D24);
      setw(0x5D24, w(0x5D3A));
      setw(0x5D49, w(0x5D3A));
      P.findSeen({ ix: r.ix });
      setw(0x5DFB, 0x5B97);
      let out = { a: 0xFF, zf: true };
      for (;;) {
        const hl = w(0x5DFB);
        if (M[hl] === 0xFF) break;
        setw(0x5D47, w(hl));
        const b = M[hl + 2 & 0xFFFF];
        setw(0x5DFB, hl + 3);
        if (!M[0xB63A + (b - 0x8C & 255) & 0xFFFF]) continue;
        const ix = P.unitPtr({ a: b }).ix;
        if (P.inView({ ix }).a) continue;
        const half = t.maxHalf ? (M[ix + 5] >> 1) - 1 & 255 : (M[ix + 0x1B] - M[ix + 0x11] - M[ix + 0x19] & 255) >> 1;
        if (half >= M[ix + 6]) continue;
        out = { a: 1, zf: false };
        break;
      }
      setw(0x5D24, keep);
      return Object.assign({ ix: r.ix }, out);
    });
    // hideView: the hook at $B62A: in the computer's turn the view is blanked (tile 0 in black,
    // 11 squares by 11) and message $65 shown, once ($B715).
    def('hideView', () => {
      if (M[0xB715]) return { a: M[0xB715], zf: false };
      setw(0x5CFE, 0x0101);
      for (let y = 11; y; y--) {
        for (let x = 11; x; x--) {
          M[0x5D00] = 0;
          P.drawTile({ a: 0 });
          M[0x5CFF] = M[0x5CFF] + 2 & 255;
        }
        M[0x5CFE] = M[0x5CFE] + 2 & 255;
        M[0x5CFF] = 1;
      }
      M[0xB715] = 1;
      return P.infoText({ a: 0x65 });
    });
    return R;
  }

  for (const [id, t] of Object.entries(TABLES)) {
    const R = make(t);
    for (const [name, f] of Object.entries(R)) if (t[name] !== undefined) P.defIn(id, t[name], name, f);
    // unitMove is a stretch of aiTurn, not a routine of its own: in P by name only
    P.SC[id].ai = R;
  }
};
G.ai.TABLES = TABLES;
})(typeof window !== 'undefined' ? window : globalThis);
