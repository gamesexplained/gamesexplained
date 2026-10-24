// The Play page's mouse, which the Spectrum never had. In play, a click with no menu up opens the
// first menu, as SPACE does. With a menu open in full, the game's pointer goes where the mouse is
// in its window, and a click there is fire with the pointer there: on an icon, the icon's action.
// With the game paused from its menu, a click is fire, which carries on.
//
// The page writes the pointer's place ($8D23 across and $8D24 down, in the window's pixels from
// its top left corner, where the game draws the pointer's) and the input code ($8D20: 9, fire and
// no direction) after the pass has read the controls (leader_input, $8B81, before the checkpoint
// $86C1) and before the menus' pass looks at them (menus_pass, $C8D4, at $86EB), and lets go of
// the press of fire before ($C893, menu_fire's once a press). The pointer stays where the game
// keeps it ($CAA7 and the others): up to the window's width less the pointer's, and 72 pixels
// less its height. The game's own test of fire on an icon ($CAF4: 26 pixels across from its
// column, 18 or 26 down from its row) takes in the whole of the icon's picture, so a click on a
// picture is a click on its icon. The game is paused while $BF30, the border's colour, is not 0
// ($CDEE).
//
//   const mouse = WTMouse.create(rt)    rt the page's machine (page/runtime.js)
//   mouse.menu()       the menu open in full, or null: { x, y, w, h } its window on the screen, in
//                      its pixels, and maxX and maxY the pointer's reach
//   mouse.move(x, y)   the mouse at (x, y) on the screen, in its pixels
//   mouse.click(x, y)  a click there: 'space' for the page to press SPACE, 'fire' to press fire;
//                      otherwise null, and the click is kept for the next pass
//   mouse.pass()       at the checkpoint $86C1: the pointer and the fire written
//   mouse.reset()      at a new game ($8521): not in play until the next pass
(function (root) {
'use strict';
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
// the pixel row of a screen address ($4000 or $C000 on)
const rowOf = a => ((a >> 5) & 0xC0) | ((a >> 2) & 0x38) | ((a >> 8) & 7);

function create(rt) {
  let at = null, moved = false, clicked = false, playing = false;
  // the window's record in bank 3, $C8A6 the first menu's and $C899 the second's: its columns,
  // rows and column, its width at +5, and at +11 where its first row is in the row table
  function menu() {
    const M = rt.M, t = M[0x8D22] & 0x1B;
    if (t !== 3 && t !== 0x18) return null;
    const b3 = rt.mem.bank(3), rd = a => b3[a - 0xC000];
    const rec = t === 3 ? 0xC8A6 : 0xC899, r = k => rd(rec + k);
    const tab = r(11) | r(12) << 8;
    return {
      x: r(2) * 8, y: rowOf(M[tab] | M[tab + 1] << 8), w: r(0) * 8, h: r(1) * 8,
      maxX: ((r(5) - rd(0xC8BA)) * 8) & 255, maxY: (0x48 - rd(0xC8BB)) & 255,
    };
  }
  // the pointer's place in the window for the mouse at (x, y) on the screen; null outside it
  function pointer(m, x, y) {
    const px = x - m.x, py = y - m.y;
    if (px < 0 || py < 0 || px >= m.w || py >= m.h) return null;
    return [clamp(px, 0, m.maxX), clamp(py, 0, m.maxY)];
  }
  function move(x, y) { at = [x, y]; moved = true; }
  function click(x, y) {
    if (!playing) return null;
    if (rt.M[0xBF30]) return 'fire';
    at = [x, y];
    if (!rt.M[0x8D22]) return 'space';
    clicked = true;
    return null;
  }
  function pass() {
    playing = true;
    const fire = clicked, m = (moved || fire) && at ? menu() : null;
    moved = clicked = false;
    const p = m && pointer(m, at[0], at[1]);
    if (!p) return;
    rt.M[0x8D23] = p[0]; rt.M[0x8D24] = p[1];
    if (fire) { rt.M[0x8D20] = 9; rt.mem.bank(3)[0xC893 - 0xC000] = 0; }
  }
  function reset() { playing = moved = clicked = false; }
  return { menu, move, click, pass, reset };
}
root.WTMouse = { create };
})(typeof window !== 'undefined' ? window : globalThis);
