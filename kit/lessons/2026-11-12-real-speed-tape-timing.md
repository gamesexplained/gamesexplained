## next · 2026-11-12 · Driller, Fat Worm Blows a Sparky, Laser Squad, Lords of Chaos and Valhalla (ZX Spectrum) · air with Claude

- **An emulator's real-speed tape is a resampled copy of the tape, so time
  a load from the tape file, and take only the order of events from the
  emulator.** Drawing each game's loading picture as the tape fills it in
  needed the five tapes played as sound. ZEsarUX 13.0 turns a tape into a
  sound file at 15,600 samples a second before it plays it, which rounds
  every pulse to about 224 T-states. The ROM's own pulses (855 and 1,710
  T-states) barely move, but Driller's turbo loader (583 and 1,166) and Fat
  Worm Blows a Sparky's (453 and 709) ran up to 5 per cent fast or slow
  against the TZX file's timings. The pages take each byte's arrival from
  the TZX's pulse lengths and the picture's bits (`site/lib/spectrum.js`,
  `tapeTimes`), and used the emulator to see what appears when. The same
  run found that `smartload` copies blocks at the ROM's speed straight into
  memory through the tape traps, so it shows no load at all, and that two
  emulators given tapes of the same file name shared one sound file and
  played the same game, which the launcher now keeps apart with a folder
  to each port (`kit/skills/spectrum/tool-zesarux`, "Tapes").
