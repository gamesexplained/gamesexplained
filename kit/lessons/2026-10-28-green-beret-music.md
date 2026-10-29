## 0.0.260 · 2026-10-28 · Green Beret (C64) · air with Claude

- **Test a sound driver from its source text alone.** Green Beret's
  `createDriver` read the hi-score tune's bytes from a constant beside
  it on the page. Its test took `createDriver` from the page's script
  block, where that constant was defined, and matched the game's code
  write for write over 21,321 frames; the page's player runs the
  driver's source text alone in an AudioWorklet, where the name was
  undefined, so both players stayed at 0:00 without a word on the
  console. Made with `vm.runInNewContext` from its text, the test failed
  with the same `ReferenceError`. The rule is in
  `kit/skills/c64/steps`, and `site/lib/sid.js` now logs such an error
  and shows it under the player.
