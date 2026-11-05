'use strict';
// Where the game lets time pass. The port runs no instructions, so it counts the cycles its
// routines would have taken (P.spend, and the costs a page or a test gives each routine) and hands
// them on at its next yield (P.due), as the lockstep's { cycles: n } (kit/c64/lockstep.js). The
// game's raster waits (a loop that reads $D012 until it holds a value) are polling loops in the
// port: a bare yield a turn, so the game, or the page's clock, moves on a raster line each time.
(function (root) {
  const groups = (root.AEPort || (root.AEPort = {})).groups || (root.AEPort.groups = []);
  groups.push(function (P) {
    P.work = 0;
    // cycles of the game's own work, to be handed on at the next yield
    P.spend = n => { P.work += n; };
    P.due = () => { const n = Math.round(P.work); P.work = 0; return n; };
    // the raster line now: $D012 and bit 7 of $D011
    P.rasterLine = () => P.rb(0xD012) | ((P.rb(0xD011) & 0x80) << 1);
    // a loop that reads $D012 until it holds low (line low, or low + 256 on the lines a PAL frame
    // has past 255): the work before it handed on, then a turn a line
    P.pollRasterLow = function* (low) {
      const n = P.due();
      if (n) yield { cycles: n };
      while (P.rb(0xD012) !== low) yield;
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
