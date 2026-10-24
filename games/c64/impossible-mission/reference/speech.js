/* speech.js */
// Impossible Mission's speech, shared by the Sound and speech and The ending tabs.
// The bytes the speech driver reads, from listing.json (address, base64): its tables at $0A47,
// $0AD5 and $0B63, the sample base at $0CFE and the file words at $E000. A page copies them into
// its memory image with speechLoad(M) before calling say().
const SPEECH_DATA = [[2631, "CBAYIA=="], [2773, "ANC6YAwOEBIIDBAUAgoSGg=="], [2915, "9Pb4+vz+/wABAgQGCAoMDg=="], [3326, "AOA="], [57344, "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rakzY8xuVVXKmPEcDsfjcDx8PzyO4+NwOA/TpaW1paUtY3xXZXeGupm6fGZ3iFaXmdpsdnd3d4eZymx3d3d3h5m6bGZ2d3eImapsZlV1iJmZumx3ZlV1iJf8jGeIRnN5ZftMtZ40VXZ2+mzYjxJkl4jZjGWYZ0SWePp8ZneHd6iauWxVZnaHmJnKbGZmdoiImbpsZmZ2iJmZumxmZWaHmKnLfGaYJHV3l/uceKkUcpeZ+pwplElUhZr6jFeFZ0WUi/mMdmZlVpaZ/Ix3VlVll7r8fGdlZnaXutyMZlZ1d6iqynx3d3Z3Z3Z3d6ep2nyXd2aHV5d3ZLWp6XyIeGaHZ4dnZYaYynx3d2ZmZod3doeYynx3d2ZmZnd3d5iZunx3d2Zmdnd3h5iZunx3d2dmdod3h5iZunx3Z2ZmdoeHiJiZupO2xCmlLY2NZ2xOzZmkLS0zHo6Hx3E8jo3TcWY5q4czcc4xTiqL5+G9jDnOMZmmPHmLuYZjjkd5O2POmJnZso2dObaZOePMnGNmxpizMXOGMzNnjDFnnmFchVh0eLlY6FyHV2R4yVnnbFV2h3hWluxcZWZ3d2aX/Gxld3dWZpf8bGaGeVVmhvx8Z2V3RoSZ+nx4ZVdUZpjrfGhkZ1VlqPyMRmSZR1WF/Zx6M6dYZWT8fHdmdndWZYh4mJm6fHdmd2ZmZYeImYjKfHd3ZndWdoiIiJi6fHd3ZmZWdoiIiJiqfIeJiGdVdoiIZ4bKfHd3Z2Zmdoh3iIjKfHdnZmZmh4h3mJmprHhmZnaJp5uHiTREY6tV+3xml3mmjHWad1dkR2HORfpsmFa4Wcd6dolmVZky/Bj2fIdnuVinaYZ4V2O8I/ka9HyJZbpXt0iFeFd0qyP6KvWMiHioWJZYdXhWZKo06kr2jIiIiIhnh1d1V2SZdqmKuHx4iId4iIh4dldVh1XJaud8h4h3mIh3d3dnZYhE2Ur2bJd5dapnh4h3V3SJVNo492xml4mXqnlmqCdyi1Opecl8d3eIiJh4d3d3VlWmrDX4nIh3d3eIeGZnZnd3Znao23yImXhmdoiIZ2WHmWdFdfuMd3eIiHhml4lndoeZR1P7jHiXaWWYeIh4iGdEyHwy+YxohZpWqHmHeHZ4NaWMM/l8ZpeJd6iaZ4Z4dkaUvST3nGh2mJloZnaIaEVkuYtV2ZyIiHh3iGdVZmZ2h4iIiLqMiIiIiGeHeFZVVZerV3XrfFeFmoiqV6acJHSId2d163xohopmuliWqzZTdphoZftsh4hnl6t4h5lXQ2aXi0T5bHeYaKebeIeIVkR2qItE+Xx3mImZiXd3VkRliIh4dvuMiIh3d4d3ZmZmd3eHiKm6fGZmh5mqiXd3ZmZmZoapy3xnZoaZqZp3d3dmVVWGqdyceGZ2h5mJh3h3eGZFZKjsrHhWZYeIiIiIiHhWRHWY25x4ZmaHiIiIiIh4VkR1mMuMiHd3iJiId2Z3h3dmdpjKYz42x+HheLB5fDgP/OCHzVx2Z4aqmarbTGR3h5jLiupMdHeHmMqL6Vxkd3eIyor7XGR3dojKm+tMdWh1mbmr62x2eIeoqanrjFZlh4lmZ4dnZpfbjFZVdohnd3dnZpjbjGZmdndndnd3d5jbfHdndmdmdoh4h6nLfGdmZmZmdneIiKm6fGc0hhODaHaYqqrrbIkzdjREdXh1/Gv5fJg2hjRlVYhl7Fn5fHdmZ1VmZnd3qYnafIh3iIh5ZXd3Z4aIVmaX/Yx4h4iIZ1Z2eGZmh1d1qP2cmXiIiGdWZXdmZndXdan8jIiIiIh3VmV3d2Z2h4iZyoyIeHd3d2ZmZmZ2h4iYqbqciYh4d2ZmZmZmZneImamqnImId3dmZlZmZnZ3mJmpuoyIiHh3Z2ZmZmZ2h4iZmap8mImIZ3dmdoh4RXWIiHfrjIh3mHh3ZnZ3d3eIeFWG64yId5h4d2Z3d3dnhmhml+x8iIeId3d3d2d2d3dnZZf8jHiHmZh5ZohnRVSHd2ao7HyId5mYiVaGaGZVh1d1l/2ciHeIiGdml3hmRZdnVafsjHh3mYhmVoeIVneXWGWX63yHiIiYiXh3d2dFZXd3mPuMd4eImHmGiHdnRHZ3Zob8jHd3iIh4d4h3d1V3Z2aY63x3doiIeHaIiGdliGdml9uMh3iHd4d3d4d4Znd3h4faHY83ntEX8zkh88OH1TgYwyc+ahwNWXRRi5PFadnBZ7qHOtbF1E1y8I8bdoEDdnBYVXI8XbExN+eldpzGYXRa8dNhMccbnIUjk1nypA/bmJydyZiYHVmTJ5yZiXdmZWZ2h5iZmZyZiXdWVVV2iJmZmIyIeId4d1dVVXap24yZeHd3iGdWRHWo7IypmnhVh3d4NWSo7HypeYhGdXiHZ1WG/IyJhptWZzO5OIR4+qx6dZpmeSHZOJVo+WyZuEuBjkJnhZpF+Uyoqjmij0GIZodn2Wx3yExxvlVVhoo0+VyXmmlk7BeVVplE+ky6eGiUzjSGR4VX+WyIZql4qiS3N2V1/WyZd5pVaGWpN2OI+3x3d2dVdniYaIaIynyId3dFhniXSIR5+myneqdZhViWJ3OJ+1yFqqpIlHmXJ1GH/FyWiZlnh4mINkKX/FyGmZlohomINkKW/FyGiZlohpmINkKH+1yGmJlodoiJNkOW/Fx2mJp4doiINmOH+1yGmZpnd4eJRlSH61yHmZlndoiIRlSX23x3h4iIeId4ZXdmZoeJh8psd3eImImIiWZ3Z2aGmXfJbHd3iJiJl3lmd2ZWhZp3yXx3iHeYiYd4ZnZ3ZnapaNh8d4h4mIl3d2Z2d2Z2uVnnjHeYiYh4ZndmZmZ3drlq14yIiIh4d2d3VndmiGa5adiMiIiId3h2VmZ2Z4dnyVnYnImIiHd3ZmZmd2aId7hq15yJiIl3d2ZmVWZmiHe5esiciYh4h2hmVmZnZYl2qZm6jJl4iHd3ZmZmZmaId6mJyZyIiHiGaHVWdmd1iXapibmciYeId2dmZmZ2Zoh2uXnInIiJiHd4ZmZWdnZ4hqmJuIyIiHh3eHZnZnZndoiIiMmMmIlnRYaZqmh2d4hWVJbbjJh4Z1WHiJl4d4d4VlSX24yIeGdmhpiZeIeIeEZUl8uMiIhnZneYmXh2iIhWVJfLjIh4Z2aHiIh4d4h3VmWYuoyIeHdmh4iId4eIZ2Z2mLpsZlZ2mJl52XxmV3WImWf6jIdGVIapafmMh0dDZal5+nyHaDRTuHr5bIdoNFO5evl8d0cydbt4+nx1ZzRjunn6bFZlRmSpiPxsRXU1lJuX/GxWVDWDzGj7bIlFNIS8RvmsNjJUholm+mw0ZHhUh5jsbFVVVmWXquyMiHh3d3dnZnZ3dnd3mKq6fIeId3d3d3d3d2Z2d5iqunx3d4iYmYl4VlVEZWaYust8d2eHiKmJmHl3VlVEdbnsnHhmZYeYmYiId3dnRWSY64yJd1Zlh5mZeXaIeEZUluuceHd3ZnaHqopmdod3VnXrnHh3ZnZ4h5mZeGZmd2dl6px4Z3eHZ3apmmd2iHdmddqMeHd3d4eZiXd3d3dWZZfLfHeHiIiIiIiId2ZmZneYunx3h4iIiIiIeHdmVWaHmapsd4eIiIiIeHdnZmZ2iJm6fHdmZndndoiImZmpfHdmZnZndoiImZmpbHeYeGdVhploZXf6fIeqeFZUmIlXU4f8fJiJd1ZVh4hXZJj8bJiJeEVliIhXVKf9fJiZZ1Vlh5lHVJb9jJmJV1VVhohWVaf8nJmJVlRldmdVdrncjIh4VlV2d3dWdqjcjHd3ZmZ2d2dmh6nLjHdmVWZmd3eHmJmqjHdmZmZ2d3d3mJmpfHdmZnZ3d3d3iJmpfHd3d3d3d3d3iJmpbHd3Z3dmd5iIiIjKbGaXmWhEdbmKVpfbbFSGmXhVhqlYQ6b9fGZ3h3lVdploVKf9fGZmmHlldqlpQ5f8bGWGqmhFdblaQ5b9XHWpmldUhpk2Qrf/bJiZiUZUh5lGVKf9fIeZeFZldnhmZqjsfIeIeGZmZndmdqjbnJmIeGZWZWZmh6nLjIiId2Zmh4hmdpjKfIiId3aHiIhndoipjIiId3d3iIhndpipjIh3d3eHiIh3d5iqjHh3d3d3d3d3d5iqjIh3d3dnd2Z2Z3aIiJmZqoyIeHd4Zndmd2Z2iIiZmap8iIh3d3eIZ2ZVdoiId5jKnIh4ZXeXiXdnZYeJR1SX/JyIZ3V4l5qIRnSJiDYxp/2ceGZ2iKiaeDVkmKomQZf9jHhmh4iZiXhFZYiJRlOn/Zx4ZnaYmnhmVWaHiFZVp9x8d3eHmJmIZ2Zmd3dmdqjLjHh3h5iZeGZVZXd3d3eYuoyId4eIiHdndnd3d3d3mLqMiIiIeHd3Z3d3d3d3h5i6jIiIiHh3Z2Z3d3d3d4iZqY8H89GD8cED47nBx8PDx8PDw8fhAx/4wYx3h5l4ZnaYaFSH2oxnl6p5VmWpWUOG+3xnl6qJVnWoWFNm+pxHhZmrV2WoWVNm+pxHhZm6SGSoWFN2+4w1dMrNR0OXWXRn+ZwVg8u9VzSmamNn+YxXhamaRmWZaER1/HxGhaq7N2OZaGVl6ow1hLu8NlOoaXZW+Yw1hLq8NlOnanZW+Yx4d3eIZ3aoimd2iHhmdsmcd4d4d2d2qZpnZnaIZ3XKjHh3h3h2iJiJZ2aHeVZ2yoPDg9d0woNjH57npA0lYR/j5WHJYRuKw4yJd2d2d4eYmnd3d0ZTqOuMeHd3d2aHmJp3iHdGU6jarFeFiXYltom8d4lWRiCn/Yx4doeIZoeYmXhmdmhEhvuMiHd3h3h3l5l3ZodnZZe6bLpIpWhGdflsrGaGaEZ0+2zKW4NZNYT7XNlscllVhfpc2ntiaFaF+1ynvEZDmHf5bJipRodIg/x8mJpWd0eT/Gynq0V2WJT8bKirNXVYlPx8qYlmZjW1/GypmkR2SIT8bLlqZJdHdPt8mWlkdmeG+4yZeWVmZ3b6fLpoZXdWhtt8umlkd1aG63y6aVR3VoX7jKp5VWZnZfuMmXllZmd1+oyZeWZ2Z2X5fLlqRHd3ddp8uWpTeGZk+3ypeWOIZ3XqfKhpZHhXdet8qGpUiFd0+3yYeWZ3Z2X5fKh6VYdndfp8qIpVh1d16oyYilWHZ3X6fKh5ZXdXheqMqHpVd1Z1+4yoeWV3Z3XqjKh5VXdWhfuMqHlVd1Z1+4yYeWV3Z3bqjKh5VYdXdeuMqHlVd2d1+4ypaVV3ZnbqjKlpVXdmdup8qWlUd2d164y5aVR3ZnXrjLppU3dndeuMuWlUd1d1+3y6aVR3V3XrjKl5VXZndeuMqXlVdmd164yqeVV2V4XbfLppVXdWhet8umlVd1aF63y6aVV3VoXrjLppVXZWhet8umlUd1aF+4y6aVV2VoX8jLppVWZWhfyMumlUZlaF/Iy6aVRmVYb8jKppVFZVlvyMqmlUZlWF/IypaFVmVYX7jKloVGdVhvuMmGhlZ2aG2oyYaGV3Z3bKjJloVXZ3h7mMmWhmZnaHuYyIeGZ2d3e5jIh4Znd3d6mMiHh2d4d3qIyHiGd3d4eojIh4d3d3d6iMiHh3d4d4qIyIiGaHiHeYjIeIZ4d4d5h8iHh3d3h3qHyIiGeHd4eYfIiIZod4h5g="]];
function speechLoad(M) {
  for (const [a, b] of SPEECH_DATA) { const s = atob(b); for (let i = 0; i < s.length; i++) M[a + i] = s.charCodeAt(i); }
}

// Port of the speech driver at $0880-$0CFF: say(M, line) returns what the game writes to the SID
// volume register on each of its timer NMIs (one every 101 cycles), as an array of levels 0-15,
// with -1 where an NMI writes nothing. M is the game's memory (a Uint8Array(65536)); the driver
// patches its own code, so the port writes the same bytes into M and reads them back from there.
function say(M, line) {
  const out = [];
  const rd = a => M[a & 0xFFFF], wr = (a, v) => { M[a & 0xFFFF] = v & 0xFF; };
  const V = a => rd(0x0CF0 + a), SV = (a, v) => wr(0x0CF0 + a, v);   // speech_vars, $0CF1-$0CFF
  const zp = { frames: 0, pitch: 0, data: 0, levels: 0 };              // $A5, $A7, $A9, $AB
  let up = 0, down = 0, gap = 0, vec = 0;                              // $AD, $AE, $AF, $FFFA
  let A = 0, X = 0, C = 0;
  const buf = i => rd(0x0800 + (i & 0xFF)), setbuf = (i, v) => wr(0x0800 + (i & 0xFF), v);
  const adc = (a, b) => { const s = a + b + C; C = s > 255 ? 1 : 0; return s & 0xFF; };

  function pitch_step() {                                             // $0B1D
    SV(11, V(11) + 1);
    if (V(11) !== 0) { SV(12, V(12) + V(13)); SV(4, V(12) >> 1); return; }
    const b0 = rd(zp.pitch);
    SV(12, b0 & 0xFE);
    C = b0 & 1;
    zp.pitch = (zp.pitch & 0xFF00) | ((zp.pitch + 1) & 0xFF);         // inc lo only, as the code does
    let a = rd(zp.pitch);
    for (let k = 0; k < 4; k++) { const c = a & 1; a = (a >> 1) | (C << 7); C = c; }
    SV(11, a | 0xE0);
    SV(13, rd(0x0B63 + (rd(zp.pitch) & 0x0F)));
    zp.pitch = (zp.pitch + 1) & 0xFFFF;
    SV(4, V(12) >> 1);
  }
  function smooth() {                                                 // $0BFD
    const src = V(10), add = V(2), dst = ((V(2) & 0x40) ^ 0x40) | 0x20;
    wr(0x0C18, src); wr(0x0C1C, add); wr(0x0C20, dst);
    let x = 0;
    do { const s = rd(0x0800 + src + x) + rd(0x0860 + add - 0x60 + x) + 1;
         wr(0x0820 + dst - 0x20 + x, s >> 1); x = (x + 1) & 0xFF; } while (x !== V(3));
    SV(2, dst);
  }
  function loop2(a) {                                                 // $0A75: the 2-bit loop
    wr(0x0AA3, a);
    zp.levels = 0x0A00 | ((((a & 3) << 2) + 0xD5) & 0xFF);
    let l = rd(zp.levels + ((a >> 2) & 3));
    setbuf(X, l); X = (X + 1) & 0xFF;
    for (;;) {
      setbuf(X, l); X = (X + 1) & 0xFF;                               // $0AAB
      const b = rd(0x0AA3);
      setbuf(X, rd(zp.levels + ((b >> 4) & 3))); X = (X + 1) & 0xFF;
      setbuf(X, rd(zp.levels + (b >> 6))); X = (X + 1) & 0xFF;
      zp.data = (zp.data + 1) & 0xFFFF;
      if (X === rd(0x0AD5)) return;
      const n = rd(zp.data);                                          // $0A92
      wr(0x0AA3, n);
      setbuf(X, rd(zp.levels + (n & 3))); X = (X + 1) & 0xFF;
      l = rd(zp.levels + ((n >> 2) & 3));
    }
  }
  function dec_2bit() { wr(0x0AD5, adc(A, V(3))); SV(10, X); loop2(rd(zp.data)); }
  function dec_4bit() {                                               // $0AE5
    wr(0x0B19, adc(A, V(3))); SV(10, X);
    let v = (rd(zp.data) >> 3) & 0x1E;
    setbuf(X, v); X = (X + 1) & 0xFF;
    for (;;) {
      setbuf(X, v); X = (X + 1) & 0xFF;                               // $0B0E
      zp.data = (zp.data + 1) & 0xFFFF;
      if (X === rd(0x0B19)) return;
      const b = rd(zp.data);
      setbuf(X, (b << 1) & 0x1E); X = (X + 1) & 0xFF;
      v = (b >> 3) & 0x1E;
    }
  }
  const lvl = bit => bit ? 0x10 : 0x0E;
  function put4(v) { for (let k = 0; k < 4; k++) { setbuf(X, lvl(v & 1)); X = (X + 1) & 0xFF; v >>= 1; } return v; }
  function dec_1bit() {                                               // $0B73
    SV(2, A); wr(0x0BAB, adc(A, V(8))); SV(3, V(8));
    let b = rd(zp.data);
    setbuf(X, lvl(b & 2)); X = (X + 1) & 0xFF;
    setbuf(X, lvl(b & 2)); X = (X + 1) & 0xFF;
    setbuf(X, lvl(b & 4)); X = (X + 1) & 0xFF;
    setbuf(X, lvl(b & 8)); X = (X + 1) & 0xFF;
    let y = b >> 4;
    for (;;) {
      put4(y);                                                        // $0BA0
      zp.data = (zp.data + 1) & 0xFFFF;
      if (X === rd(0x0BAB)) return;
      y = put4(rd(zp.data));                                          // $0B99
    }
  }
  function dec_1bit_cont() {                                          // $0BE3
    SV(2, A); wr(0x0AD5, adc(A, V(8))); SV(3, V(8));
    loop2((rd(zp.data) & 0xFC) | 1);
  }
  function frame_end() {                                              // $099B
    const f = rd(0x09B7);
    if (f & 0x40) { wr(0x09B7, f ^ 0x40); SV(2, V(10)); }
    else smooth();
    pitch_step();
  }
  function frame_header() {                                           // $09B6
    if (rd(0x09B7) & 0x80) { wr(0x092F, 0x7B); return; }
    const h = k => rd(zp.frames + k);
    SV(5, h(0) | 0xC0);
    SV(6, (h(1) >> 3) | 0xE0);
    if (h(1) & 4) {                                                   // $0A4B: a repeated frame
      wr(0x09B7, h(3)); wr(0x0911, 0x37); wr(0x092F, 0x81);
    } else {
      C = 0;
      const lo = adc(h(2), V(14));
      wr(0x09B7, h(3));
      zp.data = lo | (adc(h(3) & 0x3F, V(15)) << 8);
      SV(1, 0x83);
      const x = h(1) & 3;
      if (x >= 2) {
        SV(3, rd(0x0A47 + (h(0) >> 6)));
        wr(0x0911, 0x39); wr(0x092F, x & 1 ? 0x92 : 0x98);
      } else {
        const w = (h(0) & 0x40) || 0x20;
        SV(8, w); SV(9, w >> 3);
        wr(0x0911, 0x51); SV(4, 0);
        wr(0x092F, x & 1 ? 0x8C : 0x8F);
      }
    }
    zp.frames = (zp.frames + 4) & 0xFFFF;
  }
  function decoder() {                                                // the jsr at $092E
    switch (rd(0x092F)) {
      case 0x7B: SV(1, 0xE1); break;                                  // speech_set_end
      case 0x81: SV(1, 0xC3); SV(4, 0x80); break;                     // speech_start_gap
      case 0x8C: dec_1bit(); break;
      case 0x8F: dec_1bit_cont(); break;
      case 0x92: dec_2bit(); frame_end(); break;
      case 0x98: dec_4bit(); frame_end(); break;
      default: throw new Error('decoder ' + rd(0x092F).toString(16));
    }
  }
  function next_period() {                                            // $08F2
    vec = V(1); wr(0x0885, V(2)); up = down = V(3); gap = V(4);
    SV(7, V(7) + 1);
    if (V(7) !== 0) {
      const t = rd(0x0911);
      if (t === 0x39) { if (V(10) !== V(2)) smooth(); pitch_step(); }
      else if (t === 0x51) {                                          // speech_shift_window
        if (V(3) === 0x10) { SV(2, V(2) & 0x40); SV(3, V(8)); }
        else { SV(3, V(3) - V(9)); SV(2, V(2) + V(9)); }
      }
      return;
    }
    SV(5, V(5) + 1);
    if (V(5) === 0) frame_header();
    SV(7, V(6));
    A = X = (V(2) & 0x40) ^ 0x40; C = 0;
    decoder();
  }
  // speech_command with A = line: speech_lookup, speech_init_chain, the timer started
  const base = V(14) | V(15) << 8;                                    // the sample base the game set, $E000
  const e = (base + 4 * line) & 0xFFFF;
  zp.pitch = (base + (rd(e) | rd(e + 1) << 8)) & 0xFFFF;
  SV(11, 0xFF);
  zp.frames = (base + (rd(e + 2) | rd(e + 3) << 8)) & 0xFFFF;
  wr(0x09B7, 0);
  wr(0x0911, 0x37); wr(0x092F, 0x81);
  SV(1, 0xC3); SV(4, 0x80);
  SV(6, 0xFE); SV(7, 0xFE); SV(5, 0xFE);
  vec = 0xC3; gap = 1;
  for (let n = 0; n < 2000000; n++) {
    if (vec === 0x83) {                                               // nmi_speech_up
      out.push(rd(0x0800 + rd(0x0885)) >> 1);
      if (--up === 0) { vec = 0xA4; wr(0x08A6, rd(0x0885)); } else wr(0x0885, rd(0x0885) + 1);
    } else if (vec === 0xA4) {                                        // nmi_speech_down
      out.push(rd(0x0800 + rd(0x08A6)) >> 1);
      if (--down === 0) { if (gap === 0) next_period(); else vec = 0xC3; } else wr(0x08A6, rd(0x08A6) - 1);
    } else if (vec === 0xC3) {                                        // nmi_speech_hold
      out.push(7);
      gap = (gap - 1) & 0xFF;
      if (gap === 0) next_period(); else vec = 0xD9;
    } else if (vec === 0xD9) {                                        // nmi_speech_wait
      out.push(-1);
      gap = (gap - 1) & 0xFF;
      if (gap === 0) next_period();
    } else if (vec === 0xE1) { out.push(7); return out; }             // nmi_speech_end
    up &= 0xFF; down &= 0xFF;
  }
  throw new Error('no end');
}

// Plays the levels of say() through the Web Audio context a at rate interrupts a second, starting
// 50 ms from now; the SID holds each level until the next write. Returns the source node, the
// context time the line starts and its length in seconds.
function speechPlay(a, s, rate) {
  const len = Math.ceil(s.length / rate * a.sampleRate), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
  let v = 7;
  for (let i = 0, k = 0; i < len; i++) {
    const j = Math.floor(i * rate / a.sampleRate);
    while (k <= j && k < s.length) { if (s[k] >= 0) v = s[k]; k++; }
    d[i] = (v - 7.5) / 8;
  }
  const src = a.createBufferSource(), hp = a.createBiquadFilter(), g = a.createGain();
  hp.type = 'highpass'; hp.frequency.value = 40; g.gain.value = 0.8;
  src.buffer = b; src.connect(hp); hp.connect(g); g.connect(a.destination);
  const t0 = a.currentTime + 0.05;
  src.start(t0);
  return { src, t0, dur: s.length / rate };
}
