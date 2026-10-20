/* tilt.js */
// The helicopter section's pictures: the helicopter on the ground at each tilt, drawn by the game's
// own routines from the listing on the kit's 6502. The attract mode (reference/demo.js) runs to the
// first time it draws the helicopter, on its pad at world X $1293, level; from there rock ($7803)
// rocks it on its skids to the tilt asked for, as the game does on the ground, and the helicopter's
// object (heli_object, $8276) draws its body, main rotor and tail rotor on the page being drawn.
// index.html loads it after reference/demo.js; test_tilt.js holds its pictures to the ones Apple2TS
// drew of a helicopter landing with a lean (facts.md, "Live tests").
//
//   ChopTilt.start(L)                the attract mode run to its first drawing of the helicopter
//   ChopTilt.draw(st, tilt, facing)  the helicopter rocked to tilt (-5 to +5), facing 1 (right) or
//                                    -1 (left), and drawn: { m, page, x, height, tilt, changed }
//   ChopTilt.place(st, at)           drawn alone on a black page, as given: at = { x, height, tilt,
//                                    facing, bounce, view, rotor, tail }, as the game holds them when
//                                    heli_object starts
// page is the hi-res page drawn on ($2000 or $4000); changed lists the page's bytes the drawing
// changed, by their offset in the page.
globalThis.ChopTilt = (function () {
  const SHOW = 0x12E3, HELI = 0x8276, DRAWN = 0x8298, ROCK = 0x7803;
  const X = 0x04, HEIGHT = 0x06, POSE = 0x08, TILT = 0x09, BOUNCE = 0x0F, VIEW = 0x72, G_PAGE = 0x8D;
  const G_VIEW = 0xC7;                                // the graphics library's own copy of the view
  const ROTOR = 0x7E38, TAIL = 0x7EE3;
  const s8 = v => (v << 24) >> 24;

  function start(L) {
    const s = ChopDemo.start(L);
    let drawing = false;
    while (!drawing) {
      if (s.cpu.pc === SHOW) s.cpu.step();
      s.cpu.run({ cycles: 20e6, hooks: { [SHOW]: () => true, [HELI]: () => (drawing = true) } });
    }
    return { m: s.m.slice(), sp: s.cpu.sp };
  }

  function machine(st) {
    const m = st.m.slice();
    const cpu = new C64Cpu.CPU(m, { io: { read() { return 0; }, write() {} }, ioPages: [0xC0] });
    return { m, cpu };
  }

  function drawHeli(st, m, cpu) {
    const page = m[G_PAGE] ? 0x4000 : 0x2000, before = m.slice(page, page + 0x2000);
    cpu.pc = HELI; cpu.sp = st.sp;
    cpu.run({ until: DRAWN });
    const changed = [];
    for (let i = 0; i < 0x2000; i++) if (m[page + i] !== before[i]) changed.push(i);
    return { m, page, x: m[X + 1] << 8 | m[X], height: m[HEIGHT], tilt: s8(m[TILT]), changed };
  }

  function draw(st, tilt, facing) {
    const { m, cpu } = machine(st);
    m[POSE] = facing < 0 ? 0xFB : 5;
    cpu.call(ROCK, { a: tilt & 0xFF, sp: st.sp });
    return drawHeli(st, m, cpu);
  }

  function place(st, at) {
    const { m, cpu } = machine(st);
    m[X] = at.x & 0xFF; m[X + 1] = at.x >> 8; m[HEIGHT] = at.height; m[TILT] = at.tilt & 0xFF;
    m[POSE] = at.facing < 0 ? 0xFB : 5; m[VIEW] = m[G_VIEW] = at.view & 0xFF; m[VIEW + 1] = m[G_VIEW + 1] = at.view >> 8;
    m[BOUNCE] = at.bounce;                            // a bounce draws the squashed picture
    m[ROTOR] = at.rotor; m[TAIL] = at.tail;           // each rotor steps its picture on as it draws
    const page = m[G_PAGE] ? 0x4000 : 0x2000;
    m.fill(0, page, page + 0x2000);
    return drawHeli(st, m, cpu);
  }

  return { start, draw, place };
})();
