## next · 2026-10-22 · Alter Ego (C64) · air with Claude

- **Start the emulator from the same RAM every time.** VICE fills RAM
  at power-on with runs of `$00` and `$FF` and then flips random bits
  in it, at every cold boot and every hard reset. On 22 October 2026,
  with VICE 3.13.2, each cold boot left about 520 single bits of
  `$0800`-`$FFFF` off the plain pattern, two cold boots differed in
  about 1,000 bytes, and a hard reset changed 965. Two captures of one
  disk therefore differed where nothing had written, and a flipped bit
  in a stretch nobody wrote reads like a value. The launcher now starts
  VICE with `-raminitrandomchance 0`: four cold boots and two hard
  resets gave the same RAM to the byte.
