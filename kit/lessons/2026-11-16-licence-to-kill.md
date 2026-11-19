## 0.0.356 · 2026-11-16 · Licence To Kill (C64) · unorig with Claude

- **A table copied by a loop is named by where it goes.** The spawn
  routine of Licence To Kill copies fourteen enemy type tables into
  fourteen slot tables, in an order of its own. The annotation named
  eight type tables by their neighbours in memory, and each label was
  one field off: the "gun Y offset" was the gun's X, the "hit box
  width" its Y. Nothing failed. A 60-comment sample caught two, and the
  copy loop, read line by line, fixed all eight. Read the `LDA` and
  `STA` pairs and label each source by its destination.
- **A compare against a patched operand compares against a variable.**
  The level 1 crash test reads `CMP #$02` in the snapshot, and the
  routine's comment said a character of height 2 or more crashes the
  helicopter. The operand's own comment said it was rewritten, but the
  routine's comment had been written from the bytes. The routine copies
  the throttle into that operand every frame: the throttle is the
  helicopter's height, and at throttle 24 or more nothing in the
  opening scene can be hit. When an instruction's operand has a writer,
  the comment on every routine that uses it names the variable, not the
  value the snapshot caught.
