## next · 2026-10-30 · World Games (C64) · air with Claude

- **A computed jump into unrolled code can land inside an instruction.**
  Weightlifting draws its plates with 75 `STA` instructions in a row,
  entered at three bytes for each pixel line down, and the sum is kept
  to a byte. For every weight the game allowed by its own limits the
  entry fell on an instruction, so nothing showed. At 865 kg the plate's
  offset wraps from -129 to +127, the sum overflows, and the entry lands
  on the second byte of an `STA`, `$F2`, a code that stops the processor.
  A player's report of a crash at that weight led there. Where code
  enters a run of instructions at a computed place, work the sum for
  every value its inputs can take, kept to the width the code keeps it,
  and check that each one lands on an instruction's first byte.
- **A limit tested for equality lets past a value that arrives another
  way.** The stick stops raising the weight only at exactly 225 kg
  (`CMP` and `BEQ`), and a good lift at 225 kg makes the next round
  start at 230 kg, from where the stick raises it with no limit. The
  timing table ends at 225 kg, so every weight above reads its factor
  from the code after it. When a value is capped by an equality test,
  look for every other path that sets it, and read what each table
  indexed by it holds past its end.
