// A Game & Watch's buzzer, played live: the piezo is one output pin of the chip (on the SM5A, R1),
// so a page's game hands over each change of the pin with the chip's cycle count, and this plays
// them as a square wave a little behind the game, keeping no more than half a second waiting, as
// the site's other live sound does. No dependencies. Exposes GNWBuzzer (window.GNWBuzzer on a
// page; globalThis.GNWBuzzer in node).
//
//   const b = GNWBuzzer.create({ hz })   hz: the chip's cycles a second (default 16,384)
//   b.start()        inside a click or key press: makes the AudioContext; resolves to whether
//                    the browser has sound
//   b.stop()         silence (the edges still come and are dropped)
//   b.edge(level, T) the pin went to level (0 or 1) at cycle T
//   b.flush(T)       play everything up to cycle T; call it once a frame
globalThis.GNWBuzzer = (() => {
  const LEAD = 0.1, MOST = 0.5, GAIN = 0.12;
  function create(opts) {
    const hz = (opts && opts.hz) || 16384;
    let ctx = null, on = false, level = 0, from = null, base = null, edges = [];
    async function start() {
      try {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return false;
        ctx = ctx || new AC();
        if (ctx.state === 'suspended') await ctx.resume();
        on = true; base = null; return true;
      } catch (e) { return false; }
    }
    function stop() { on = false; }
    function edge(lv, T) { edges.push([T, lv & 1]); }
    function flush(T) {
      if (from === null) from = T;
      if (!on || !ctx || T <= from) { for (const e of edges) level = e[1]; edges = []; from = T; return; }
      const now = ctx.currentTime;
      if (base === null || base + from / hz < now || base + from / hz > now + MOST) base = now + LEAD - from / hz;
      if (!edges.length && !level) { from = T; return; }
      const rate = ctx.sampleRate, n = Math.max(1, Math.round((T - from) / hz * rate));
      const buf = ctx.createBuffer(1, n, rate), d = buf.getChannelData(0);
      let k = 0;
      for (let i = 0; i < n; i++) {
        const t = from + i / rate * hz;
        while (k < edges.length && edges[k][0] <= t) level = edges[k++][1];
        d[i] = level ? GAIN : 0;
      }
      while (k < edges.length) level = edges[k++][1];
      const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start(base + from / hz);
      edges = []; from = T;
    }
    return { start, stop, edge, flush, get on() { return on; } };
  }
  return { create };
})();
