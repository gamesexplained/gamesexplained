## next · 2026-11-17 · Summer Games (C64) · unorig with Claude

- **A flag that a comment leaves open is usually settled by the
  instruction before it.** Summer Games' diving adds to the difficulty
  with `ADC #$03` and no `CLC`, after a `CMP` that has just found the
  frame equal (`half_turn_bonus`, diving `$ABF7`). The comment said "adds
  3 (4 with the carry)", the page said "0.3 or 0.4 a half-turn", and the
  60-comment sample passed it. A `CMP` that branches on equal leaves the
  carry set, so every half-turn adds 0.4. The reader review asked when it
  was 0.4, which is what found it. When a comment gives two outcomes
  for one flag, trace the flag back to the instruction that last set it
  before writing either.
- **A code map recorded from the boot holds the code that ran before a
  part loaded.** Swimming unpacks over the whole engine, and its
  `codemap.json` listed 1,222 bytes of engine code, which had run before
  the load, as the swimming part's own. For a part that loads over code
  that has run, record its map from the load onward, or drop the
  addresses another part ran at before it.
