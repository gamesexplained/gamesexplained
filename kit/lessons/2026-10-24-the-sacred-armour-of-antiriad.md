## 0.0.228 · 2026-10-24 · The Sacred Armour of Antiriad (C64) · air with Claude

- **Take a register's value from the store, not from a dump.** The VIC
  reads its unused bits back as 1, and every way the kit looks at the
  chip reads it back: a monitor dump, a snapshot, and the writes
  `kit/c64/frame.py capture` records. On 24 October 2026 a recorded frame
  of the game showed `$D01A` = `$F3` and `$F7` and `$D018` = `$0D` and
  `$0F`, where the raster interrupt stores `$03`, `$07`, `$0C` and `$0E`.
  The first draft of the game's orientation quoted the recorded values as
  the game's. Two games already published had made the same slip:
  Shadowfire's and Spy vs Spy's orientation both say `$D01A` = `$F1`,
  and both games store `$01` there. `kit/skills/c64/c64-reference` now
  lists the bits that read back as 1, and `frame.py -h` says its values
  are read back.
