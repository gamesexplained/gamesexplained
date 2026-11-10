// The Game & Watch's pages: drawing the LCD from the segments the chip lights, and the footprint.
//
//   GNW.draw(svg, lit)       svg: an <svg> element of the unit's screen, each segment's shape
//                            titled 'o.b.h' as MAME's are (kit/skills/gnw/gnw-reference, "The
//                            LCD"); lit: the names lit, as the kit's machine's lit() gives them
//   GNW.segments(svg)        { name: [shapes] }, every titled shape in the picture
//   GNWMap                   the footprint widget (site/lib/memmap.js), for the ROM's 1,856 bytes
//
// A segment that is off is drawn faintly, as an LCD shows its unlit shapes at an angle. The
// machine itself is lib/sm5a.js, the kit's (kit/gnw/sm5a.js), served beside this file.
globalThis.GNW = (() => {
  const OFF = 0.06;            // an unlit segment's opacity

  function segments(svg) {
    if (svg._gnwSegments) return svg._gnwSegments;
    const out = {};
    for (const t of svg.querySelectorAll('title')) {
      const name = (t.textContent || '').trim(), shape = t.parentElement;
      if (!/^\d+\.\d+\.\d+$/.test(name) || !shape) continue;
      (out[name] = out[name] || []).push(shape);
    }
    svg._gnwSegments = out;
    return out;
  }

  function draw(svg, lit) {
    const on = new Set(lit);
    const segs = segments(svg);
    for (const name in segs) for (const shape of segs[name]) shape.style.opacity = on.has(name) ? 1 : OFF;
  }

  return { segments, draw };
})();

if (globalThis.makeMemMap) {
  globalThis.GNWMap = globalThis.makeMemMap({
    code: 'code', graphics: 'screen tables', levels: 'level data', sound: 'sound', text: 'text', tables: 'tables',
    variables: 'variables', runtime: 'the data memory', rom: 'ROM', unused: 'unused' });
}
