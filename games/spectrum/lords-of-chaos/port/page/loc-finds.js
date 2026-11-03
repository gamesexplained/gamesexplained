/* loc-finds */
// Three of the game's rules the Discoveries page lets the reader try, as the game's code has them.
// test_discoveries.js holds each to that code, run on the kit's Z80.
//   LOCFinds.fileName(name, ext)   the twelve characters the game looks for: the name typed, cut or
//                                  padded to eight, a dot and the extension (ask_file_name,
//                                  set_extension $C644)
//   LOCFinds.find(want, files)     the index of the file on the tape the game loads, or -1: find_file
//                                  ($C675) reads each header in turn and compares only its first
//                                  character with the name's (B is loaded with 12 and never counted)
//   LOCFinds.potionTurns(strength, consumption)   how many turns a potion from a vial lasts: drink
//                                  ($73D0) works out (strength x 3 + 10) in eight bits and divides it
//                                  by the creature's potion consumption (divide $94B7)
//   LOCFinds.keep(experience)      what EXIT keeps of the designer's experience points: a score of a
//                                  quarter of them, rounded down (design_exit $E14B), which the next
//                                  design turns back into four points each (design_wizard $E0C0)
var LOCFinds = (function () {
  function fileName(name, ext) {
    return (String(name).toUpperCase() + '        ').slice(0, 8) + '.' + (String(ext).toUpperCase() + '   ').slice(0, 3);
  }
  function find(want, files) {
    for (let i = 0; i < files.length; i++) if (files[i].charCodeAt(0) === want.charCodeAt(0)) return i;
    return -1;
  }
  function potionTurns(strength, consumption) {
    const a = ((strength & 255) * 3 + 10) & 255;
    return consumption ? Math.floor(a / consumption) : 0;
  }
  function keep(experience) {
    const score = (experience >> 2) & 255;
    return { score, next: 4 * score, lost: experience - 4 * score };
  }
  return { fileName, find, potionTurns, keep };
})();
// end of loc-finds
