## next · 2026-10-24 · Last Ninja Remix (C64) · air with Claude

- **Hold a picture widget against the painted picture, not the memory
  behind it.** Each level's title card was drawn in the page by the
  level's own routine, and its test compared a fingerprint of the play
  window's bitmap and screen colours with the emulator's. The test
  passed while the card's status panel came out with its lettering
  broken: the routine writes colour RAM only for the window, and the
  panel's colours come from a copy of colour RAM the engine keeps in
  RAM, which the page had not loaded. A screenshot showed it. Paint the
  frame with the site's renderer and compare pixels with the emulator's
  own state painted the same way, over the whole screen where the state
  is known: colour RAM, the registers and the sprites are all in the
  picture, and only some of them are in a memory fingerprint.
- **When later parts are one part's code reassembled, carry the comments
  and fix them at the source.** The six later levels were Central
  Park's code at other addresses with their own data. Pairing routines by
  walking instruction streams from unique anchors, and copying each
  comment to its twin with its operands rewritten, described the six
  levels' shared code without writing it again. It also copied every
  mistake six times: a correction must be made to the first part's
  comment and the copies generated again, or the next generation puts
  the mistake back, and a sample that counts the copies as separate
  comments counts one belief many times. Keep the copies out of the sample's population, and audit
  the code each level changed on its own.
- **A live test's length is how long it was watched.** The intro's
  hidden credits were recorded as running for 3,210 frames, which was
  how long the test ran, and the page first said so. The text is 1,058
  characters at four frames each: 4,232 frames. Write down what was
  observed as an observation ("803 characters in 3,210 frames") and work
  the whole from the code.
