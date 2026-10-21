# The resident part — verified technical facts

What stays in memory from the boot to the end: zero page, `$0200`-`$07FF`,
the loader at `$CB20`-`$DFFF` and the vectors. Every address here is this
part's. A fact comes from the code in `work/entry.vsf` (the game's).

- The loader's jump table is at `$CC20`; `$CD96` loads a file by its code
  byte; the decoding EOR is at `$CEAA` (its operand `$CEAB`); the unpacker
  at `$CC8D`.
- `restore_briefing` (`$CBD2`) unpacks the briefing's code from the stash
  at `$D100`-`$DFFF`, under the I/O area, to `$5000`-`$64AF` before each
  load.
- Variables that outlive a part: `sound_mode` (`$CB47`), `level_number`
  (`$CB48`, 0-99), the expected access code (`$CB49`), the cheat flag
  (`$CB61`); per lemming `$0424` action, `$0456` flags, `$0488` X, `$04BA`
  Y.
- The level and tune file codes: `$CF83` and `$CFF1`, copied to `$0400` and
  `$0700`.
