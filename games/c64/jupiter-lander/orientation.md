# Jupiter Lander — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`work/jupiter-lander.d64`, a 174,848-byte disk image. The directory shows a
disk named `c64.com` with one program between two `del` separators:

| Name | Type | Blocks |
|---|---|---|
| `jup.lander+2/rem` | prg | 28 |

This is not the original release. It is a crack of the cartridge by the
group Remember, release #213, dated 24-03-00, credited on its own screen to
Fungus: "supplied, cracked from cartridge, +2 trained, and docs typed by".
The `+2` is two trainer options. Findings should be qualified as being about
this release; the engine itself identifies only as
`COPYRIGHT 1982 BY COMMODORE AND HAL LABORATORY` on its instruction screen.

## From power-on to play

1. Attach the image to drive 8 and autostart it. On a PAL C64 with a 1541,
   the load takes about 45 seconds.
2. A "REMEMBER" logo with a scrolling message appears. Press **space**.
3. Four pages of documentation typed in by the cracker follow. **Space**
   turns the page, **run/stop** exits. The documentation is the cracker's
   transcript of the manual, not the game's own text, and it disagrees with
   the game on one point: it dates the game 1981, the game's own screen says
   1982.
4. The trainer menu appears as two questions:

   ```
   INFINATE FUEL ?           (Y/N)
   NO BACKGROUND COLLISION ? (Y/N)
   ```

   **Answer N to both.** Everything recorded in `facts.md` is the untrained
   game. Answering Y patches the engine and would make the fuel and
   collision findings meaningless.

   The second N has to go through the KERNAL keyboard buffer rather than the
   key matrix. With the vice-mcp server, `vice_keyboard_matrix` works for
   the first answer and `vice_keyboard_type` for the second.
5. The Commodore title logo flashes up, then the game's own instruction
   screen, which alternates with a demonstration flight. Hold **F1** for
   about three seconds on the instruction screen to start a game. A short
   press is not enough: the game only looks at F1 inside its interrupt
   handler, which runs about 59 times a second, and the emulator's short
   taps can fall between two looks.
6. F1 is also the up thruster, so the same press that starts the game fires
   the engine.

## Snapshots

| File | State |
|---|---|
| `work/play-inflight.vsf` | paused in flight, lander descending towards the x5 pad, fuel partly used. **This is the snapshot everything downstream is read from.** |
| `work/play-descent.vsf` | a second play snapshot, caught during the explosion after a crash |

Save them without ROMs. The 64 KB RAM image then starts at file offset 209
and is byte-for-byte what the CPU sees, except at `$0000` and `$0001`: the
processor port is stored separately in the `C64MEM` module header and the
two RAM bytes underneath it hold unrelated values. Colour RAM is not at
`$D800` in the image; it lives in the VIC-II module. Reading it back through
the emulator after loading the snapshot is easier than finding it in the
file, and the emulator must be **paused immediately after the load** or the
game runs on and the screen no longer matches.

## Steady state

- **Banking.** `$01` is `$05` with a data direction of `$2F`: RAM under
  BASIC and under the KERNAL, I/O still visible. The KERNAL is switched out
  during reset and never comes back, so the game owns the machine.
- **Vectors.** The KERNAL RAM vectors at `$0314`-`$0319` still hold their
  power-on values and are dead. The live vectors are the hardware ones in
  RAM at `$FFFA`: NMI `$E037`, RESET `$E037`, IRQ `$EB39`.
- **Interrupts.** CIA1 timer A is latched to `$411B`, about 59 Hz on PAL.
  Its handler runs **only during the attract sequence**: `start_game`
  (`$E093`) executes `sei` and the only `cli` in the game is in
  `attract_entry` (`$E7A9`). During play the machine runs with interrupts
  masked and no interrupt at all.
- **Video.** Standard character mode. `$D018` = `$1E`: screen at `$0400`,
  character set at `$3800`. VIC bank 0 (`$DD00` low bits `%11`). No raster
  interrupt is enabled.
- **Where the code and data sit.**

  | Range | What |
  |---|---|
  | `$0000`-`$0032` | all of the game's variables |
  | `$0400`-`$07E7` | screen, with sprite pointers at `$07F8` |
  | `$3800`-`$3BFF` | 128 character glyphs |
  | `$3C00`-`$3FFF` | 16 sprite shapes, sharing the same 2 KB block |
  | `$E000`-`$F450` | the entire engine: code, tables, text, terrain |
  | `$F451`-`$FFF9` | zero |
  | `$FFFA`-`$FFFF` | the three hardware vectors |

  Everything between `$0800` and `$1DFF` is the cracker's loader, trainer
  and documentation text. The game never touches it.

- **No overlays.** Nothing is reloaded from disk after the initial load. One
  snapshot covers the whole game.

## The loader, in a paragraph

The crack is a single 28-block program that loads at `$0801`, shows the
group's logo and scroller, pages through the typed-in documentation, asks
the two trainer questions, then installs the cartridge image into RAM at
`$E000`-`$F450` together with the character set and sprites at
`$3800`-`$3FFF`, switches the ROMs out through `$01` and jumps to the
cartridge's own entry point at `$E037`. The original was an 8 KB cartridge
mapped where the KERNAL normally sits, which is why the engine's addresses
run from `$E000` and why all three hardware vectors point into it. The
loader is not annotated further, by policy.
