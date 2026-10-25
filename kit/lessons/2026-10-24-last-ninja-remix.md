## 0.0.236 · 2026-10-24 · Last Ninja Remix (C64) · air with Claude

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
  the code each level changed on its own. A copy on code of the same shape
  is not always right when the first part's is: about sixty described a
  routine the level calls in place of the first part's, or a value the
  level loads differently. Before counting a comment as a copy, compare
  each paired call's target and each paired immediate with the first
  part's.
- **A live test's length is how long it was watched.** The intro's
  hidden credits were recorded as running for 3,210 frames, which was
  how long the test ran, and the page first said so. The text is 1,058
  characters at four frames each: 4,232 frames. Write down what was
  observed as an observation ("803 characters in 3,210 frames") and work
  the whole from the code.
- **A trainer's code can stay in the game with its options off.** The
  disk was The Force's crack with Ikari+Talent's trainer, run with both
  its options at NO. The listing described the 26 bytes at the end of the engine's interrupt
  (`$1F52-$1F6B`) as the game's: a level skip on the ← key and two
  `BIT` instructions. They are the trainer's: the level skip is always
  on, and the two `BIT`s become `STA`s when the options are turned on.
  An auditor found it, and X-Rated's crack of the same disk confirmed
  it: its interrupt goes from the clock straight to restoring `$01`.
  Comparing the code in play with another release's at the start would
  have found it before any comment was written.
- **Correct a template, not the instances a checker read.** An audit
  item stood for every comment written from one template, shown to the
  checker through up to four instances. Where the checker found the
  template wrong, the corrections went to those instances only, and the
  same error stayed in the members it had not been shown: 66 condition
  lists in six levels, and eight other comments in the last two
  levels. The second sample drew one of them. Correct the template and
  generate again, then search every member for the words the correction
  replaced.
