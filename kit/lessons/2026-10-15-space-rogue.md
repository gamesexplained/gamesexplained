## next · 2026-10-15 · Space Rogue (C64) · air with Claude

- **A routine's carry on return is part of the sum that follows it.**
  Space Rogue's HIVE! sets the wait for its next mound with
  `JSR random_upto` and then `ADC`, with no `CLC` between. The random
  routine leaves its last comparison's carry behind, set only when the
  number equals its limit, so one result in 91 gives a wait one longer
  than the listing said. Reading the two routines apart did not show it;
  running the game's own code with every result the routine can give
  did. When a `JSR`'s result goes straight into `ADC` or `SBC`, write down
  the carry the routine returns on each of its exits before stating the
  range of the sum.
- **Check where the game's work buffers sit inside the files it loads.**
  Space Rogue's buffer for a typed line is at `$BF00`, inside the last
  page of the packed star field loaded to `$B700`. The answer to the copy
  protection overwrites the end of the packed stream, and the star field
  unpacked again after a wrong answer comes out recoloured, its border
  blue or grey. The memory map shows such an overlap at a glance once the
  buffers are on it: for each buffer that overlaps loaded data, find what
  reads that data again after the buffer is written, and test it.
