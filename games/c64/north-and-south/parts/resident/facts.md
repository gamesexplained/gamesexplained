# The loader and the script — verified technical facts

What stays in memory from the boot to the end: `$0000`-`$0FFF` less what
the other parts load over it. Every address here is this part's. Unless
marked *live*, a fact comes from the code in `work/entry.vsf`, stopped on
the title's entry.

- The boot is the tape's first file, loaded by the KERNAL (`$029F`-`$033A`
  by its header at `$033C`, name "NORTH & SOUTH"): it draws the banner
  "CYBERLOAD NOW LOADING NORTH & SOUTH" (`boot_stage1`, `$02A7`; text at
  `$02EE`), decodes the code in the rest of the tape header by an XOR chain
  (`$02DC`) and runs it, which loads the game's loader. Nothing runs it
  again.
- The script (`script`, `$0806`) and `load_file` (`$0803`): see the game's
  `facts.md`, "How the parts connect".
- The tape prompt (`rewind_prompt`, `$092E`): "REWIND TAPE t SIDE s, HIT
  FIRE THEN PLAY" on the bottom row, the digits from `$08F6` and `$08E8`,
  then waits for fire on either joystick or a key on the same line
  (`wait_fire`, `$096C`).
- The Cyberload loader (`fast_load`, `$0A63`): an interrupt for
  each pulse on the tape, from the cassette's read line on CIA 1 (`loader_irq`,
  `$0ACB`), the pulse's length against
  timer A giving the bit; sync bytes `$0F` then `$AA`; a header whose name
  must match the two letters asked for, else the file is skipped; blocks of
  up to 256 bytes with a checksum (`$9B`). A raster interrupt during a load
  is passed on through the vector at `$03FE` (`$0AC0`).
- The year's text: the file left the text at `$0400`; `year_text` (`$09EC`)
  shows it in the ROM's mixed-case set and waits for fire.
