'use strict';
// Where the game lets time pass: its raster waits, as the lockstep's { wait: line } (kit/c64/
// lockstep.js), and its busy loops, as { cycles: n }.
(function (root) {
  const groups = (root.AEPort || (root.AEPort = {})).groups || (root.AEPort.groups = []);
  groups.push(function (P) {
    const LINES = 312;
    // the raster line now: $D012 and bit 7 of $D011
    P.rasterLine = () => P.rb(0xD012) | ((P.rb(0xD011) & 0x80) << 1);
    // a loop that reads $D012 until it holds low: it leaves on the next line whose low byte that is
    // (line low, or low + 256 on the lines a PAL frame has past 255), at once when this line is one
    P.waitRasterLow = function* (low) {
      const cur = P.rasterLine();
      let to;
      if ((cur & 255) === low) to = cur;
      else if (cur < low) to = low;
      else if (low + 256 < LINES && cur < low + 256) to = low + 256;
      else to = low;
      yield { wait: to };
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
