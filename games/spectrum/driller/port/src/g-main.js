// The main program ($97A4-$9838, $9990-$9BF6, $9C36-$9DC8): the start, the main loop, the
// commands taken from the keys or the demonstration, the scripts run after them, a new game and
// the probe put at an area's entrance.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.main = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const sgn8 = v => (v & 0x80) !== 0;

  // The main loop's checkpoints: the address of each CALL in the main program's body.
  P.CHECKPOINTS = [0x97B5, 0x97BA, 0x97CA, 0x97D3, 0x97D6, 0x97E0, 0x97E8, 0x97EB, 0x97FD,
    0x9807, 0x9815, 0x9822, 0x9825, 0x9828, 0x9833,
    // and where each wait on the sensors' beam ($8A21) begins and ends, so that the interrupts it
    // waits on fall where the game's did
    0x9931, 0x9937, 0x9ABB, 0x9AC1, 0xB47A, 0xB481, 0xC3ED, 0xC3F3];
  // the frame counter at $8FC2 set and waited out
  const frames = function* (n) { M[0x8FC2] = n; yield* P.until0(0x8FC2, 0xFF, 29); };
  P.frames = frames;

  // The main program, from the loader's hand-over at $97A4 (boot) or from the main loop's first
  // checkpoint ($9807). The start: a new game, the interrupt, three seconds, the security question.
  // Each game: the view and the console drawn, the control options (not in the demonstration), the
  // crosshair shown; then a pass of the main loop for each command: the view redrawn, the sensors
  // checked when anything moved, the console, the commands, the scripts; until a pass asks for a
  // new game ($8920 bit 1).
  P.program = function* (boot) {
    let inLoop = !boot;
    if (boot) {
      M[0x891F] = 1;
      M[0x8FC5] = 0;
      setw(0x8A22, 0x5C3A);
      yield { cp: 0x97B5 }; P.new_game({});
      yield { cp: 0x97BA }; P.install_interrupt({});
      for (let b = 3; b > 0; b--) yield* frames(0x32);
      yield { cp: 0x97CA }; yield* P.security({});
    }
    for (;;) {
      if (!inLoop) {
        setw(0x8920, 0xFFFD);
        yield { cp: 0x97D3 }; P.draw_view({});
        yield { cp: 0x97D6 }; P.update_panel({});
        yield { cp: 0x97E0 }; P.print_text({ hl: 0xCFC8, ix: 0x88A4 });
        const demo = M[0x891F] === 3;
        yield { cp: 0x97E8 }; if (!demo) yield* P.control_options({});
        yield { cp: 0x97EB }; yield* P.process_sensors({});
        if (!demo) {
          yield* frames(0x28);
          yield { cp: 0x97FD }; yield* P.aim_command({ a: 0x15 });
        }
        M[0x8BF2] = 0;
      }
      for (let first = !inLoop; ; first = false) {
        if (!first) {
          yield { cp: 0x9807 }; P.draw_view({});
          if ((M[0x8920] & 4) || (M[0x8921] & 8)) {
            yield { cp: 0x9815 }; yield* P.process_sensors({});
            M[(w(0x8BF3) + 4) & 0xFFFF] = M[0x8A65];
          }
          yield { cp: 0x9822 }; P.update_panel({});
        }
        yield { cp: 0x9825 }; yield* P.take_commands({});
        yield { cp: 0x9828 }; yield* P.run_scripts({});
        if (M[0x8920] & 2) break;
      }
      yield { cp: 0x9833 }; P.new_game({});
      inLoop = false;
    }
  };

  // take_commands ($9990): a pass's commands. In the demonstration ($891F = 3) one command from
  // the recording at ($8927) (a byte with bit 7 set repeats the next that many times less one; 0
  // ends it), and a key pressed ends it. In play it waits for keys (or the clock's minute, $889D,
  // which asks for the scripts), turns each key held into a command by the tables at $8FC8 (three
  // bytes a key: the key, its command, its command while the keys move the crosshair, $8FC6 of
  // them) and after them (two bytes a key, $8FC7 of them), $7F for none, and carries them out in
  // turn: 1-$14 move_command, $15-$1E aim_command, $28 and $2A drill, $29 the information screen
  // (each of these last two ends the pass). The game over ($8BF2 set by the interrupt or a script)
  // is here too.
  P.def(0x9990, 'take_commands', function* () {
    setw(0x8920, 0);
    for (const a of [0x8A69, 0x8BF1, 0x8BF0, 0x8A64, 0x8A1F, 0x8A1E, 0x998F]) M[a] = 0;
    for (let k = 0, hl = w(0x8BF3); k < 5; k++) M[(hl + k) & 0xFFFF] = M[0x8A66];
    let a;
    if (M[0x891F] === 3) {
      const k = yield* P.read_keys({});
      if (k.cf) { M[0x891F] = 1; P.play_sound({ a: 6 }); setw(0x8920, 2); return {}; }
      M[0x8FBC] = 1;
      let hl = w(0x8927);
      if (M[0x8926]) {
        const n = (M[0x8926] - 1) & 255;
        M[0x8926] = n;
        a = M[hl];
        if (!n) setw(0x8927, hl + 1);
      } else {
        a = M[hl];
        if (!a) { setw(0x8920, 2); return {}; }
        hl = (hl + 1) & 0xFFFF;
        setw(0x8927, hl);
        if (a & 0x80) { M[0x8926] = ((a & 0x7F) - 1) & 255; a = M[hl]; }
      }
    } else {
      for (;;) {
        const k = yield* P.read_keys({});
        const end = P.irqByte(0x8BF2);
        if (end) { yield* gameOver(end); return {}; }
        const minute = P.irqByte(0x889D);
        if (M[0x88AE] !== minute) { M[0x88AE] = minute; M[0x8A64] = 1; return {}; }
        // plug-in point: the keys read again, for their commands (a pass for the clock's minute
        // reads none)
        P.plug.read();
        if (k.cf) break;
        yield;
      }
      for (let n = M[0x8FBC] || 256, de = 0x998A, ix = 0x8FBD; n > 0; n--, de = (de + 1) & 0xFFFF, ix = (ix + 1) & 0xFFFF) {
        const c = M[ix];
        let hl = 0x8FC8, found = -1;
        for (let b = M[0x8FC6] || 256; b > 0; b--) {
          const hit = M[hl] === c;
          hl = (hl + 1) & 0xFFFF;
          if (hit) { if (M[0x88AC]) hl = (hl + 1) & 0xFFFF; found = M[hl]; break; }
          hl = (hl + 2) & 0xFFFF;
        }
        if (found < 0) {
          for (let b = M[0x8FC7] || 256; b > 0; b--) {
            const hit = M[hl] === c;
            hl = (hl + 1) & 0xFFFF;
            if (hit) { found = M[hl]; break; }
            hl = (hl + 1) & 0xFFFF;
          }
        }
        M[de] = found < 0 ? 0x7F : found;
      }
      a = M[0x998A];
    }
    M[w(0x8BF3)] = M[0x8A65];
    for (;;) {
      // plug-in point: whether a held key's command is carried out again; a rise or a fall on foot,
      // a whole cell, is $80 more than the jet's, which moves by the step
      const act = (a === 1 || a === 2) && !M[0x877A] ? a | 0x80 : a;
      if (!P.plug.take(act)) { /* passed over */ }
      else if (!sgn8(a - 1) && sgn8(a - 0x15)) yield* P.move_command({ a });
      else if (!sgn8(a - 0x15) && sgn8(a - 0x1F)) yield* P.aim_command({ a });
      else if (a === 0x28 || a === 0x2A) { yield* P.drill({ a }); return {}; }
      else if (a === 0x29) { yield* P.info_screen({}); return {}; }
      M[0x998F] = (M[0x998F] + 1) & 255;
      if (M[0x8FBC] === M[0x998F]) return {};
      a = M[(0x998A + M[0x998F]) & 0xFFFF];
    }
  });

  // The game over: the reason on the message line ($8BF2: 1 the shield, 2 the time, 3 the energy,
  // 4 a fall, 5 every sector made safe, 6 aborted from the information screen), its sound (but for 5),
  // the view of area $7F with the count of safe sectors, held 13 x 75 frames, the last twelve of
  // them ended by a key; then the demonstration ($891F = 3) unless a key was pressed.
  function* gameOver(end) {
    yield { cp: 0x9ABB };
    M[0x8A21] = P.irqByte(0x8A21) | 4;
    yield* P.until0(0x8A21, 1, 24);
    yield { cp: 0x9AC1 };
    const ix = { 1: 0x8CC8, 2: 0x8CBA, 3: 0x8CD6, 4: 0x8CE4, 5: 0x8D00 }[end] || 0x8CF2;
    P.print_text({ hl: 0xCFAD, ix });
    P.invert({ hl: 0xCFAD });
    if (P.irqByte(0x8BF2) !== 5) P.play_sound({ a: 0x14 });
    M[0x8862] = 0x7F;
    M[0x8911] = 0;
    M[0x88A2] = 0;
    P.set_start({});
    const nix = (w(0x8866) + 1) & 0xFFFF;
    P.write_number({ hl: M[0x889E], de: 0, ix: nix, a: 2 });
    if (M[nix] === 0x30) M[nix] = 0x20;
    setw(0x8920, 0x4004);
    P.draw_view({});
    yield* P.process_sensors({});
    P.update_panel({});
    P.invert({ hl: 0xCFAD });
    let key = false;
    for (let b = 0x0D; b > 0 && !key; b--) {
      M[0x8FC2] = 0x4B;
      do {
        if (sgn8(b - 0x0D) && (yield* P.read_keys({})).cf) { key = true; break; }
        if (!P.irqByte(0x8FC2)) break;
        yield sgn8(b - 0x0D) ? undefined : { tstates: 50 };
      } while (true);
    }
    if (!key) M[0x891F] = 3;
    P.play_sound({ a: 6 });
    setw(0x8920, 2);
  }

  // run_scripts ($9B6E): when the pass moved anything ($8A64): the script of the object the probe
  // walked into or shot ($8A69; its type's script offset from $8929, or sound $13 for an object
  // with none when $8A1E asks), then the game's shared scripts ($8922) and the area's ($8868), each
  // a count, then each script's length and bytes.
  P.def(0x9B6E, 'run_scripts', function* () {
    if (!M[0x8A64]) return {};
    // plug-in point: the script of an object a step alone runs into, or the bump when it has none,
    // which adds up with each run (a shot's runs with the shot)
    if (M[0x8A69] && (M[0x8BF1] || P.plug.once(0x8A69))) {
      M[0x8916] = M[0x8A69];
      const f = P.find_object({ a: 0 });
      if (!(f.a & 255)) {
        const ix = f.ix & 0xFFFF;
        const e = M[(0x8929 + (M[ix] & 0x0F)) & 0xFFFF];
        const n = (M[(ix + 8) & 0xFFFF] - e) & 255;
        if (n) yield* P.run_script({ ix: (ix + e) & 0xFFFF, a: n });
        else if (M[0x8A1E]) {
          if ((M[0x8920] & 4) || (M[0x8921] & 8)) M[0x8A1F] = 0x13;
          else P.play_sound({ a: 0x13 });
        }
      }
    }
    for (const p of [0x8922, 0x8868]) {
      let ix = w(p);
      const n = M[ix];
      if (!n) continue;
      ix = (ix + 1) & 0xFFFF;
      for (let b = n; b > 0; b--) {
        const len = M[ix];
        ix = (ix + 1) & 0xFFFF;
        yield* P.run_script({ ix, a: len });
        ix = (ix + len) & 0xFFFF;
      }
    }
    return {};
  });

  // new_game ($9C36): the probe's height, step and turn from the game's data ($CFFC, $D000, $D001),
  // the game ended until the start ($8BF2 = 1) with the view to be dissolved in, the score, the
  // variables and flags, the rigs and the sensors cleared, the energy and shield of both vehicles,
  // init_game_data, the first area ($CF41) at its entrance ($CF42), and every object of every area
  // shown again but those that start hidden (bit 7 of their type byte). Every register kept.
  P.def(0x9C36, 'new_game', () => {
    M[0x8772] = M[0xCFFC]; M[0x876B] = M[0xD000]; M[0x8770] = M[0xD001];
    M[0x8BF2] = 1; M[0x8BF0] = 1;
    M[0x8A20] = 0x3F;
    for (const a of [0x88A2, 0x8A24, 0x8A25, 0x889E, 0x879F, 0x8A1F, 0x88AC, 0x88AD]) M[a] = 0;
    M.fill(0, 0x8872, 0x8875);
    M.fill(0, 0x887B, 0x887F);
    M.fill(0, 0x887F, 0x889F);
    M.fill(0, 0x877B, 0x878D);
    M.fill(0, 0x878D, 0x879F);
    M[0x8876] = M[0xCF44]; M[0x8877] = M[0xCF46]; M[0x8879] = M[0xCF45]; M[0x887A] = M[0xCF47];
    M[0x876A] = M[(0x88BF + M[0x876B]) & 0xFFFF];
    M[0x876F] = M[(0x88CA + M[0x8770]) & 0xFFFF];
    P.init_game_data({});
    M[0x8862] = M[0xCF41];
    M[0x8911] = M[0xCF42];
    P.set_start({});
    let hl = w(0x8914);
    for (let c = M[0xCF3E]; c > 0; c--) {
      let ix = (w(0x8912) + w(hl)) & 0xFFFF;
      hl = (hl + 2) & 0xFFFF;
      const n = M[(ix + 1) & 0xFFFF];
      if (!n) continue;
      ix = (ix + 0x19) & 0xFFFF;
      for (let b = n; b > 0; b--) {
        let a = M[ix] & 0x9F;
        if (a & 0x80) a |= 0x40;
        M[ix] = a;
        ix = (ix + M[(ix + 8) & 0xFFFF]) & 0xFFFF;
      }
    }
    return {};
  });

  // set_start ($9D1C): area $8862 loaded and the probe put at its entrance $8911: the entrance's
  // cell (its x, height and z, 64 fine units to a cell, half a cell in) and its pitch, heading and
  // roll, standing at the probe's height when walking. With no such entrance the probe keeps its
  // place but for coming in at the opposite edge: x first, else z, each only when it was on an
  // edge (cell 0 or $7E). Every register kept.
  P.def(0x9D1C, 'set_start', () => {
    P.load_area({});
    M[0x8916] = M[0x8911];
    const f = P.find_object({ a: 0 }), ix = f.ix & 0xFFFF, o = k => M[(ix + k) & 0xFFFF];
    const fine = v => (((v & 255) << 6) + 0x20) & 0xFFFF;
    const none = !!(f.a & 255);
    let a, z = true;
    if (!none) a = o(1);
    else {
      const x = M[0x88B5];
      if (x === 0x7E) a = 1; else if (!x) a = 0x7D; else z = false;
    }
    if (z && a !== undefined) {
      M[0x88B5] = a; setw(0x8762, fine(a));
      if (none) return {};
      a = o(3);
    } else {
      const v = M[0x88B7];
      if (v === 0x7E) a = 1; else if (!v) a = 0x7D; else return {};
    }
    M[0x88B7] = a; setw(0x8766, fine(a));
    if (none) return {};
    a = o(2);
    M[0x88B6] = a;
    let h = a;
    if (!M[0x877A]) h = (h + M[0x8776] - 1) & 255;
    setw(0x8764, fine(h));
    M[0x876C] = o(4); M[0x876D] = o(5); M[0x876E] = o(6);
    for (const a of [0x876C, 0x876D, 0x876E]) P.plug.whole(a);
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
