// The screens group: building a screen from its level record, the cards shown between screens
// (the CHILLER logo, MASTERTRONIC'S, the text printed through the KERNAL), the HUD kept across a
// card, the block copier, and the music driver that plays in the KERNAL's interrupt.
(function (root) {
'use strict';
(root.ChillerGroups = root.ChillerGroups || {}).screens = function (P) {
  const M = P.M;
  const K = () => root.ChillerKernal;
  // P.io is read when a routine runs: the lockstep sets it after the port is made.
  const vw = (r, v) => P.io.vicWrite(r, v & 0xFF), vr = r => P.io.vicRead(r);
  const sw = (r, v) => P.io.sidWrite(r, v & 0xFF);
  const cw = (i, v) => P.io.colourWrite(i, v & 0xFF);
  // Memory as the processor sees it with $01 = $36 (the chips at $D000-$DFFF), or, while
  // copy_under_kernal runs with $01 = $34, all RAM.
  let allRam = false;
  function rd(a) {
    a &= 0xFFFF;
    if (!allRam && a >= 0xD000 && a < 0xE000) return P.io.read(a) & 0xFF;
    return M[a];
  }
  function wr(a, v) {
    a &= 0xFFFF; v &= 0xFF;
    if (!allRam && a >= 0xD000 && a < 0xE000) P.io.write(a, v); else M[a] = v;
  }
  const zp16 = z => M[z] | (M[(z + 1) & 0xFF] << 8);
  const rec = y => rd(zp16(0x11) + y);               // (zp $11),y: the level record
  const regs = (r, o) => Object.assign({}, r, o);
  const signBit = v => (v & 0x80) ? 1 : 0;

  // $2A80 copy_block: X/Y point at a six-byte descriptor (source, end, destination); put it
  // into block_copy's operands and copy.
  function copy_block(r) {
    M[0xFB] = r.x & 0xFF; M[0xFC] = r.y & 0xFF;
    const d = zp16(0xFB);
    M[0xC29E] = rd(d); M[0xC2A2] = rd(d + 1);
    M[0xC2AE] = rd(d + 2); M[0xC2B3] = rd(d + 3);
    M[0xC2A6] = rd(d + 4); M[0xC2AA] = rd(d + 5);
    return block_copy(regs(r, { y: 5 }));
  }
  // $C29D block_copy: copy from the source to the destination held in its own operands, a byte
  // at a time, until the source reaches the end ($0390/$0391, the high byte compared first).
  function block_copy(r) {
    M[0xFB] = M[0xC29E]; M[0xFC] = M[0xC2A2];
    M[0xFD] = M[0xC2A6]; M[0xFE] = M[0xC2AA];
    M[0x0390] = M[0xC2AE]; M[0x0391] = M[0xC2B3];
    for (;;) {
      wr(zp16(0xFD), rd(zp16(0xFB)));
      M[0xFB] = (M[0xFB] + 1) & 0xFF; if (M[0xFB] === 0) M[0xFC] = (M[0xFC] + 1) & 0xFF;
      M[0xFD] = (M[0xFD] + 1) & 0xFF; if (M[0xFD] === 0) M[0xFE] = (M[0xFE] + 1) & 0xFF;
      if (M[0x0391] !== M[0xFC]) continue;
      if (M[0x0390] === M[0xFB]) break;
    }
    return regs(r, { a: M[0x0390], y: 0, z: 1, c: 1, n: 0 });
  }
  // $72A4 copy_under_kernal: copy_block with the KERNAL and the chips banked out ($01 = $34), so
  // a return screen can come from the RAM under the KERNAL; then $01 = $36.
  function copy_under_kernal(r) {
    M[0x00] |= 0x02; M[0x01] = 0x34;
    allRam = true;
    let o;
    try { o = copy_block(r); } finally { allRam = false; }
    M[0x01] = 0x36;
    return regs(o, { a: 0x36, z: 0, n: 0 });
  }

  // $2CF3 s_2CF3: keep the music setting in $2E81; when the caller's load of it was not zero,
  // write 0 to $FFFF (the RAM under the KERNAL).
  function s_2CF3(r) {
    M[0x2E81] = r.a & 0xFF;
    const zero = r.z !== undefined ? !!r.z : (r.a & 0xFF) === 0;
    if (zero) return regs(r, {});
    M[0xFFFF] = 0;
    return regs(r, { a: 0, z: 1, n: 0 });
  }
  // $2F4D s_2F4D: start the music, for hud_and_music.
  function s_2F4D(r) { return music_start(r); }

  // $5A41 card_and_border: show the card with the HUD kept, then the border in the current
  // player's colour (6 the boy, 10 the girl).
  function* card_and_border(r) {
    const o = yield* hud_restore(r);
    const c = M[0x5A08] ? 0x0A : 0x06;
    vw(0x20, c);
    return regs(o, { a: c, z: 0, n: 0 });
  }
  // $5A60 first_setup: once after loading, the walking frame every 2nd call ($450C = 2), $CF07
  // cleared, then video_setup.
  function first_setup(r) {
    M[0x450C] = 2; M[0xCF07] = 0;
    return video_setup(regs(r, { a: 0 }));
  }
  // $5BB0 wait_line16: wait for raster line 16, above the visible screen.
  function* wait_line16(r) {
    let guard = 0;
    while (!(vr(0x12) === 0x10 && !(vr(0x11) & 0x80))) {
      yield { wait: 0x10 };
      if (++guard > 1000) break;
    }
    return regs(r, { a: 0, z: 1, n: 0 });
  }
  // $5BC7 show_level_card: the title font back, sprites off, multicolours black, the screen's
  // card (+$74 of its record), then the card tune ($6A18) until it signals.
  function* show_level_card(r) {
    let o = copy_block(regs(r, { x: 0xBF, y: 0x5B }));
    vw(0x15, 0); vw(0x22, 0); vw(0x23, 0);
    const x = rec(0x74), y = rec(0x75);
    o = yield* show_card(regs(o, { a: y, x, y }));
    M[0xB7] = 0x18; M[0xB8] = 0x6A;
    return yield* card_wait(regs(o, { a: 0x6A }));
  }
  // $5C00 draw_logo: the big CHILLER logo, glyphs from $E7 in five-row strips three columns to a
  // letter, from $0545 in red, $6A strips in all; the last cell gets glyph $32.
  function draw_logo(r) {
    M[0x5BFF] = 0xE7;
    logo_reset(r);
    let x = 0, y = 0;
    M[0xFB] = 0x45; M[0xFC] = 0x05; M[0xFD] = 0x45; M[0xFE] = 0xD9;
    const scr = zp16(0xFB), col = zp16(0xFD);
    for (;;) {
      logo_next_glyph({ a: 0, x, y });
      M[0x5BFB] = (M[0x5BFB] + 1) & 0xFF;
      if (M[0x5BFB] === 0x6A) {
        wr(scr + 0x31, 0x32); wr(col + 0x31, 0x0A);
        return regs(r, { a: 0x0A, x, y: 0x31, z: 0, n: 0 });
      }
      wr(scr + y, M[0x5BFF]); wr(col + y, 0x0A);
      if (++x !== 5) { y = (y + 0x28) & 0xFF; continue; }
      y = (y - 0x9F) & 0xFF; x = 0;
      M[0x5BFE] = (M[0x5BFE] + 1) & 0xFF;
      if (M[0x5BFE] === 3) { M[0x5BFE] = 0; y = (y + 1) & 0xFF; }
    }
  }
  // $5C4F show_card: print the card at X/Y, black border and background, the logo, multicolour
  // text and the title font ($D018 = $1C), MASTERTRONIC'S in red on row 5, then the apostrophe.
  function* show_card(r) {
    let o = print_card(r);
    vw(0x20, 0); vw(0x21, 0);
    M[0x5BFD] = 0;
    o = draw_logo(regs(o, { a: 0 }));
    vw(0x16, vr(0x16) | 0x10);
    vw(0x18, 0x1C);
    for (let x = 0; x < 14; x++) { M[0x04D6 + x] = M[0x5D00 + x]; cw(0xD6 + x, 2); }
    return yield* card_apostrophe(regs(o, { a: 2, x: 14 }));
  }
  // $5C87 logo_next_glyph: the next glyph, +$19 down a letter's strip, back $63 after five.
  function logo_next_glyph(r) {
    M[0x5BFD] = (M[0x5BFD] + 1) & 0xFF;
    let a;
    if (M[0x5BFD] === 6) {
      M[0x5BFD] = 1;
      const d = M[0x5BFF] - 0x63;
      a = d & 0xFF; M[0x5BFF] = a;
      return regs(r, { a, c: d >= 0 ? 1 : 0, z: a === 0 ? 1 : 0, n: signBit(a) });
    }
    const s = M[0x5BFF] + 0x19;
    a = s & 0xFF; M[0x5BFF] = a;
    return regs(r, { a, c: s > 0xFF ? 1 : 0, z: a === 0 ? 1 : 0, n: signBit(a) });
  }
  // $5CC5 logo_reset: clear draw_logo's counters.
  function logo_reset(r) {
    M[0x5BFE] = M[0x5BFB] = M[0x5BFC] = M[0x5BFD] = 0;
    return regs(r, { a: 0, z: 1, n: 0 });
  }
  // $5CD8 print_card: clear the screen, put the cursor at the card's first two bytes (row,
  // column), then print the card's PETSCII up to its $01.
  function print_card(r) {
    const k = K();
    k.chrout(P.k, 0x93);
    M[0xFB] = r.x & 0xFF; M[0xFC] = r.y & 0xFF;
    const p = zp16(0xFB);
    const row = rd(p), column = rd(p + 1);
    k.plot(P.k, row, column);
    let y = 2, a;
    for (;;) {
      a = rd(p + y);
      if (a === 1) break;
      y = (y + 1) & 0xFF;
      k.chrout(P.k, a);
    }
    return regs(r, { a: 1, x: row, y, z: 1, c: 1, n: 0 });
  }
  // $5D20 unpack_colours: the screen's colour map (its address in the operands at $5D21/$5D23)
  // into colour RAM $D800-$DBEF, two cells a byte, the low nibble first.
  function unpack_colours(r) {
    const x = M[0x5D21];
    let src = x | (M[0x5D23] << 8), dst = 0xD800;
    do {
      const v = rd(src);
      wr(dst, v); wr(dst + 1, v >> 4);
      src = (src + 1) & 0xFFFF; dst = (dst + 2) & 0xFFFF;
    } while (dst !== 0xDBF0);
    M[0xFB] = src & 0xFF; M[0xFC] = src >> 8; M[0xFD] = dst & 0xFF; M[0xFE] = dst >> 8;
    return regs(r, { a: 0xF0, x, y: 1, z: 1, c: 1, n: 0 });
  }
  // $5D80 video_setup: multicolour text, the third and fourth background colours (grey, white),
  // BASIC banked out, then gravity_setup.
  function video_setup(r) {
    vw(0x16, vr(0x16) | 0x10);
    vw(0x23, 0x0B); vw(0x24, 0x01);
    const o = bank_basic_out(r);
    return P.gravity_setup(o);
  }
  // $5D98 screen_done: out of energy: GAME OVER on row 1, then the jingle at $6B10.
  function* screen_done(r) {
    const o = P.show_game_over(r);
    M[0xB7] = M[0xB9] = 0x10; M[0xB8] = M[0xBA] = 0x6B;
    return regs(o, { a: 0x6B, z: 0, n: 0 });
  }
  // $5DA9 j_5DA9: wait for the jingle's count, stop the music, clear pending energy and poison,
  // then game_over.
  function* j_5DA9(r) {
    for (;;) { yield; if (M[0x02FF]) break; }
    const o = music_stop(r);
    M[0x5A0D] = 0; M[0x5A11] = 0;
    throw new P.Goto('game_over', regs(o, { a: 0, z: 1, n: 0 }));
  }
  // $5E00 show_forest_card: the older forest card at $5D0D; nothing calls it.
  function* show_forest_card(r) { return yield* show_card(regs(r, { x: 0x0D, y: 0x5D })); }
  // $5E0A bank_basic_out: clear bit 0 of the processor port: BASIC out, $A000-$BFFF is RAM.
  function bank_basic_out(r) {
    M[0x01] &= 0xFE;
    return regs(r, { a: 0, z: 1, n: 0 });
  }
  // $5E19 setup_screen: build screen X/2 from its level record: the card with the HUD kept, the
  // play area and the character set, the colour map, the multicolours, the boy and the girl, the
  // enemy tables, the path table, the crosses, and the crosses needed.
  function* setup_screen(r) {
    const x0 = r.x & 0xFF;
    M[0x11] = rd(0x7290 + x0);
    M[0x12] = rd(0x7291 + x0);
    let o = yield* card_and_border(regs(r, { a: M[0x12] }));
    o = copy_under_kernal(regs(o, { x: M[0x11], y: M[0x12] }));
    o = copy_block(regs(o, { x: (M[0x11] + 6) & 0xFF, y: M[0x12] }));
    M[0x5D21] = rec(0x0C);
    M[0x5D23] = rec(0x0D);
    o = unpack_colours(o);
    let x = o.x, y = 0x0E, a;
    vw(0x22, rec(y)); y++;
    vw(0x23, rec(y)); y++;
    o = P.set_boy_x({ a: rec(y), x, y }); x = o.x; y = (o.y + 1) & 0xFF;
    o = P.set_boy_y({ a: rec(y), x, y }); x = o.x; y = (o.y + 1) & 0xFF;
    o = P.set_boy_xmsb({ a: rec(y), x, y }); x = o.x; y = (o.y + 1) & 0xFF;
    M[0x07F8] = rec(y); y++;
    vw(0x02, rec(y)); y++;
    vw(0x03, rec(y)); y++;
    vw(0x10, (M[0x4518] & 0xFD) | rec(y)); y++;
    M[0x07F9] = rec(y);
    // the enemy tables, five bytes each
    for (const base of [0xCF68, 0xCF3D, 0xCF38, 0x45AD, 0xCF9C, 0x54E5, 0x45E2, 0x575E, 0xCF24]) {
      for (let i = 0; i < 5; i++) { y++; a = rec(y); M[base + i] = a; }
    }
    // the path table
    for (x = 0; x < 0x19; x++) { y++; M[0x4519 + x] = rec(y); }
    M[0x5FDC] = 0x0E;
    o = place_crosses({ a: 0x0E, x, y });
    M[0x5FDC] = 0x0A;
    o = place_crosses(regs(o, { a: 0x0A }));
    return set_crosses_needed(o);
  }
  // $5FC0 place_crosses: five crosses from the record's next ten bytes: the cross tile $57 at
  // each screen address, its colour ($5FDC, patched) in colour RAM $D4 pages above.
  function place_crosses(r) {
    let y = r.y & 0xFF;
    for (let x = 0; x < 5; x++) {
      y = (y + 1) & 0xFF; M[0xFB] = rec(y);
      y = (y + 1) & 0xFF; M[0xFC] = rec(y);
      wr(zp16(0xFB), 0x57);
      M[0xFC] = (M[0xFC] + 0xD4) & 0xFF;
      wr(zp16(0xFB), M[0x5FDC]);
    }
    return regs(r, { a: y, x: 5, y, z: 1, c: 1, n: 0 });
  }

  // The music driver. $60A0 music_init_filter: cutoff $45/$05, resonance 15 with voice 1
  // filtered, low-pass and band-pass, volume 15.
  function music_init_filter(r) {
    sw(0x15, 0x05); sw(0x16, 0x45); sw(0x17, 0xF1); sw(0x18, 0x3F);
    return regs(r, { a: 0x3F, z: 0, n: 0 });
  }
  // The KERNAL's tail of the interrupt ($EA31), where the handler leaves.
  function tail(r) { K().irqTail(P.k); return r; }
  // $60B5 music_irq_exit: with the step timer at 3, gate voice 1 off (its waveform less one) and
  // set voice 2's control to $50; then the KERNAL's tail.
  function music_irq_exit(r) {
    if (M[0x02] !== 3) return tail(regs(r, { a: 3, z: 0, c: 3 >= M[0x02] ? 1 : 0, n: signBit(3 - M[0x02]) }));
    const x = (M[0x02AC] - 1) & 0xFF;
    sw(0x04, x); sw(0x0B, 0x50);
    return tail(regs(r, { a: 0x50, x, z: 0, c: 1, n: 0 }));
  }
  // $60CA music_start: silence the SID, the play position and the loop point at the tune $61F9,
  // the filter and volume, and music_irq in $0314.
  function music_start(r) {
    M[0x02] = 0; M[0x02FF] = 0;
    for (let x = 0x20; x > 0; x--) P.io.write(0xD400 + x, 0);
    M[0xB7] = M[0xB9] = 0xF8; M[0xB8] = M[0xBA] = 0x61;
    music_init_filter(r);
    M[0x0314] = 0xF5; M[0x0315] = 0x60;
    return regs(r, { a: 0x60, x: 0, z: 0, n: 0 });
  }
  // $60F5 music_irq: the interrupt: count the step timer zp $02 down; when it has run out, play
  // commands until one ends the step.
  function music_irq(r) {
    const y = 0;
    if ((r.a & 0xFF) === M[0x02]) return music_next_command(regs(r, { y }));
    M[0x02] = (M[0x02] - 1) & 0xFF;
    return music_irq_exit(regs(r, { y }));
  }
  // $61E9 music_fetch: advance the play position and give the byte there.
  function music_fetch(r) {
    fetchPos();
    const a = rd(zp16(0xB7) + (r.y & 0xFF));
    return regs(r, { a, z: a === 0 ? 1 : 0, n: signBit(a) });
  }
  function fetchPos() { M[0xB7] = (M[0xB7] + 1) & 0xFF; if (M[0xB7] === 0) M[0xB8] = (M[0xB8] + 1) & 0xFF; }
  const fetch = r => { const o = music_fetch(r); r.a = o.a; return o.a; };
  // The command handlers, by address. Each takes the registers and gives true when the step goes
  // on to the next command, false when it has ended (in the KERNAL's tail).
  const CMD = {
    // $6100 (the byte $00): music_next_command itself, a filler the tunes use
    0x6100: () => true,
    // $610E voice 1's note: frequency high and low, gate off and on with voice 1's waveform
    0x610E: r => { sw(0x01, fetch(r)); sw(0x00, fetch(r)); r.a = M[0x02AC]; sw(0x04, r.y); sw(0x04, r.a); return true; },
    // $6126 voice 2's note
    0x6126: r => { sw(0x08, fetch(r)); sw(0x07, fetch(r)); r.a = M[0x02AD]; sw(0x0B, r.y); sw(0x0B, r.a); return true; },
    // $613E both voices' notes, then both retriggered
    0x613E: r => { sw(0x01, fetch(r)); sw(0x00, fetch(r)); sw(0x08, fetch(r)); sw(0x07, fetch(r)); return CMD[0x6156](r); },
    // $6156 gate both voices off and on again
    0x6156: r => { sw(0x04, r.y); sw(0x0B, r.y); sw(0x04, M[0x02AC]); r.a = M[0x02AD]; sw(0x0B, r.a); return true; },
    // $616B the tempo from the next byte; the step ends
    0x616B: r => { M[0x02AA] = fetch(r); return false; },
    // $6174 a rest: the step timer from the tempo
    0x6174: r => { r.a = M[0x02AA]; M[0x02] = r.a; return false; },
    // $617C count: $02FF goes up, which the game polls
    0x617C: r => { M[0x02FF] = (M[0x02FF] + 1) & 0xFF; return false; },
    // $6182 the two voices' waveforms
    0x6182: r => { M[0x02AC] = fetch(r); M[0x02AD] = fetch(r); return true; },
    // $6191 attack/decay 1 and 2, then sustain/release 1 and 2
    0x6191: r => { sw(0x05, fetch(r)); sw(0x0C, fetch(r)); sw(0x06, fetch(r)); sw(0x0D, fetch(r)); return true; },
    // $61AC the pulse widths, lo and hi for voice 1, then voice 2
    0x61AC: r => { sw(0x02, fetch(r)); sw(0x03, fetch(r)); sw(0x09, fetch(r)); sw(0x0A, fetch(r)); return true; },
    // $61C7 back to the loop point
    0x61C7: r => { M[0xB7] = M[0xB9]; r.a = M[0xBA]; M[0xB8] = r.a; return false; },
  };
  // Run the handler at address, then the commands after it until one ends the step.
  function play(at, r) {
    r = regs(r, {});
    for (;;) {
      const f = CMD[at];
      if (!f) throw new Error('music: no command handler at $' + at.toString(16));
      if (!f(r)) return tail(r);
      // $6100 music_next_command: the next byte, stored into the JMP at $610B
      fetchPos();
      r.a = rd(zp16(0xB7) + (r.y & 0xFF));
      M[0x610C] = r.a;
      at = M[0x610C] | (M[0x610D] << 8);
    }
  }
  // $6100 music_next_command: the next command byte into music_dispatch's JMP, and on.
  function music_next_command(r) {
    fetchPos();
    const a = rd(zp16(0xB7) + (r.y & 0xFF));
    M[0x610C] = a;
    return music_dispatch(regs(r, { a }));
  }
  // $610B music_dispatch: the JMP to $61xx that music_next_command patched.
  function music_dispatch(r) { return play(M[0x610C] | (M[0x610D] << 8), r); }
  // $61D2 music_stop: silence the SID and give $0314 back to the KERNAL's $EA31.
  function music_stop(r) {
    for (let x = 0x20; x > 0; x--) P.io.write(0xD400 + x, 0);
    M[0x0314] = 0x31; M[0x0315] = 0xEA;
    return regs(r, { a: 0xEA, x: 0, z: 0, n: 1 });
  }

  // $72E0 card_apostrophe: the apostrophe of MASTERTRONIC'S (glyph $AC, row 4, column 26) in
  // red, then the PROGRAMMED BY line when this is the title card ($75E0).
  function* card_apostrophe(r) {
    M[0x04BA] = 0xAC; cw(0xBA, 2);
    return yield* P.j_75E0(regs(r, { a: 2 }));
  }
  // $72ED show_programmed_by: the 40 cells of txt_programmed_by ($77C0) on row 0 in purple.
  function show_programmed_by(r) {
    for (let x = 0; x < 0x28; x++) { M[0x0400 + x] = M[0x77C0 + x]; cw(x, 4); }
    return regs(r, { a: 4, x: 0x28, z: 1, c: 1, n: 0 });
  }
  // $7580 title_flicker: one step of the card flicker for the title after a game. Its second
  // branch stores to $7523 instead of $D023, so only $D022 ever flickers.
  function title_flicker(r) {
    let o = P.random(r);
    if ((o.y & 0xFF) !== 0) return regs(o, { z: 0, c: 1, n: signBit(o.y) });
    o = P.random(o);
    const y = o.y & 0xFF;
    let a;
    if ((y - 0x40) & 0x80) { a = vr(0x22) ^ 2; vw(0x22, a); } else { a = (vr(0x23) ^ 2) & 0xFF; M[0x7523] = a; }
    return regs(o, { a: a & 0xFF, z: (a & 0xFF) === 0 ? 1 : 0, n: signBit(a), c: y >= 0x40 ? 1 : 0 });
  }
  // $7600 set_crosses_needed: the crosses to collect from the record (+$72) into $5A15;
  // sprites 0 and 1 on.
  function set_crosses_needed(r) {
    const y = (r.y + 1) & 0xFF;
    M[0x5A15] = rec(y);
    vw(0x15, 3);
    return regs(r, { a: 3, y, z: 0, n: 0 });
  }
  // $7610 card_wait: wait on the card until the card tune's count sets $02FF, and meanwhile,
  // when random gives 0, flicker $D022 or $D023; then the play music.
  function* card_wait(r) {
    let o = regs(r, {});
    for (;;) {
      yield;
      if (M[0x02FF]) break;
      o = P.random(o);
      if ((o.y & 0xFF) !== 0) continue;
      o = P.random(o);
      const reg = ((o.y - 0x40) & 0x80) ? 0x22 : 0x23;
      o.a = (vr(reg) ^ 2) & 0xFF;
      vw(reg, o.a);
    }
    return music_start(o);
  }
  // $763F hud_save: screen rows 0-1 (80 bytes from $0400) to $0200, then show_level_card.
  function* hud_save(r) {
    M[0xFB] = 0; M[0xFC] = 4;
    let a = 4;
    for (let y = 0; y < 0x50; y++) { a = M[0x0400 + y]; M[0x0200 + y] = a; }
    return yield* show_level_card(regs(r, { a, y: 0x50 }));
  }
  // $7659 hud_restore: save the HUD and show the card (hud_save), then put the 80 bytes back.
  function* hud_restore(r) {
    const o = yield* hud_save(r);
    M[0xFB] = 0; M[0xFC] = 2;
    let a = 2;
    for (let y = 0; y < 0x50; y++) { a = M[0x0200 + y]; M[0x0400 + y] = a; }
    return regs(o, { a, y: 0x50, z: 1, c: 1, n: 0 });
  }
  // $7673 j_7673: tile_touch_b for tiles from $70 (signed compare): below, return; from $70 on,
  // as $5B8D.
  function* j_7673(r) {
    const a = r.a & 0xFF, d = (a - 0x70) & 0xFF;
    const f = { c: a >= 0x70 ? 1 : 0, z: d === 0 ? 1 : 0, n: signBit(d) };
    if (f.n) return regs(r, f);
    return yield* P.j_5B8D(regs(r, f));
  }
  // $7680 next_screen: on from the screen with level byte X. On the way out (X below 10, signed)
  // keep the play area for the way back; then setup_screen X + 2; the girl playing swaps the two
  // sprite pointers and has the light red border; from level byte 10 on both sprites stay on.
  function* next_screen(r) {
    const x = r.x & 0xFF;
    M[0x767F] = x;
    let o = regs(r, {});
    if ((x - 0x0A) & 0x80) {
      M[0x7FE4] = rd(0x7FE8 + x);
      M[0x7FE5] = rd(0x7FE9 + x);
      o = copy_block(regs(o, { x: 0xE0, y: 0x7F }));
    }
    o = yield* setup_screen(regs(o, { x: (M[0x767F] + 2) & 0xFF }));
    if (M[0x5A08]) {
      const a = M[0x07F8], b = M[0x07F9];
      M[0x07F9] = a; M[0x07F8] = b;
      o = regs(o, { x: b });
      vw(0x20, 0x0A);
    } else vw(0x20, 0x06);
    M[0xC19B] = 1;
    const v = rec(0x73);
    const a = ((v - 0x0A) & 0x80) ? 1 : 3;
    vw(0x15, a);
    return regs(o, { a, y: 0x73, z: 0, n: 0 });
  }
  // $7720 game_over_wait: on the title (black border) the flicker; otherwise count the three
  // timers down (255 x 255 x 10 calls), and at the end the high score, the title font, the
  // colours off, the title card and its music.
  function* game_over_wait(r) {
    const b = vr(0x20) & 0x0F;
    if (!b) return title_flicker(regs(r, { a: 0 }));
    const dec = at => (M[at] = (M[at] - 1) & 0xFF);
    let v = dec(0x771C);
    if (v) return regs(r, { a: b, z: 0, n: signBit(v) });
    M[0x771C] = 0xFF;
    v = dec(0x771D);
    if (v) return regs(r, { a: 0xFF, z: 0, n: signBit(v) });
    M[0x771D] = 0xFF;
    v = dec(0x771E);
    if (v) return regs(r, { a: 0xFF, z: 0, n: signBit(v) });
    M[0x771E] = 0x0A;
    let o = P.check_hiscore(regs(r, { a: 0x0A }));
    o = copy_block(regs(o, { x: 0xBF, y: 0x5B }));
    for (const reg of [0x15, 0x22, 0x23, 0x20, 0x21]) vw(reg, 0);
    o = yield* show_card(regs(o, { a: 0, x: 0, y: 0x7C }));
    return music_start(o);
  }
  // $C6E7 delay: a busy wait, $CF66 times round a loop of $CF65; X and Y kept, A left as Y.
  function* delay(r) {
    do {
      const n = M[0xCF65] || 256;
      M[0xCF67] = 0;
      yield { cycles: 8 + n * 9 - 1 + 9 };
      M[0xCF66] = (M[0xCF66] - 1) & 0xFF;
    } while (M[0xCF66]);
    const y = r.y & 0xFF;
    return regs(r, { a: y, z: y === 0 ? 1 : 0, n: signBit(y) });
  }

  Object.assign(P, {
    copy_block, s_2CF3, s_2F4D, card_and_border, first_setup, wait_line16, show_level_card,
    draw_logo, show_card, logo_next_glyph, logo_reset, print_card, unpack_colours, video_setup,
    screen_done, j_5DA9, show_forest_card, bank_basic_out, setup_screen, place_crosses,
    music_init_filter, music_irq_exit, music_start, music_irq, music_next_command, music_dispatch,
    mcmd_note_v1: r => play(0x610E, r), mcmd_note_v2: r => play(0x6126, r),
    mcmd_note_both: r => play(0x613E, r), mcmd_retrigger_both: r => play(0x6156, r),
    mcmd_set_tempo: r => play(0x616B, r), mcmd_rest: r => play(0x6174, r),
    mcmd_count: r => play(0x617C, r), mcmd_set_waveforms: r => play(0x6182, r),
    mcmd_set_envelopes: r => play(0x6191, r), mcmd_set_pulse: r => play(0x61AC, r),
    mcmd_loop: r => play(0x61C7, r),
    music_stop, music_fetch, copy_under_kernal, card_apostrophe, show_programmed_by, title_flicker,
    set_crosses_needed, card_wait, hud_save, hud_restore, j_7673, next_screen, game_over_wait,
    block_copy, delay,
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
