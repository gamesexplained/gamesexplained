# Chiller — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## Tools used

- Emulator: `release v3.13.1, v3.13.1-macos-arm64-gui.dmg` (`tools/vice-mcp`),
  PAL C64 (VIC-II 6569, SID 6581). `check-emulator`: 56 of 57, failing
  `pause-at-instruction`; stop with `pause()` in `kit/c64/vice.py`, never a
  bare `vice_execution_pause` (`kit/skills/c64/tool-vice-mcp/workarounds.md`).
- Disassembler: regenerator2000 0.9.20 (the contributor's own instance,
  answering on :3000).

## The image

`Chiller (1985)(Mastertronic).prg`, supplied by the contributor and copied
to `work/chiller-1985-mastertronic.prg` unchanged: 42,860 bytes, being a
two-byte load address of `$0801` and 42,858 bytes of program, covering
`$0801-$AF6A`. MD5 `71f92e5380d4564acb7970f9caee2502`. It is a single
program file, so there is no directory listing.

What the file is: the title screen credits "MASTERtronic'S" and the game
names itself CHILLER — THE FOREST. No trainer menu, cracktro or protection
screen appeared on load. The initial BASIC stub is line 2061, `SYS 2061`.
The stub the loader leaves behind at `$0801` is `SYS 2072` followed by the
text `(ANTISOFT)`, which is a watermark that appeared only after the first
stage ran. What ANTISOFT denotes was not established in this step.

## From power-on to play

1. `vice_autostart` the file; no attach is needed first. VICE wraps a
   bare PRG into a disk image of its own
   (`tools/vice-home/cache/vice/autostart-C64SC.d64`), attaches it as
   unit 8, and runs `LOAD"*",8,1` and `RUN`: the name is `*` because the
   file's is longer than 16 characters. This is VICE's default for any
   PRG, and the same call as dropping the file on its window.
2. Autostart turns warp mode on. Turn it off before timing anything:
   `tools_call` → `vice_machine_config_set` `{"resources": {"WarpMode": 0}}`
   (the typed wrapper rejects the argument).
3. Loader: the BASIC stub runs `SYS 2061`. The code there rewrites the stub
   at `$0801` to `SYS 2072 (ANTISOFT)` and hands over at `$0818`. That
   address is **not** the game: it is another copier, which moves
   `$0900-$09FF` to `$CE00`, `$0A00-$0AFF` to `$CF00` and writes
   `$08D0-$08FF` into `$D000` (VIC setup). The last hand-over, where the
   game's own code first runs, was not isolated in this step. By policy the
   loader is not annotated further.
4. No input is needed to start: about 15-18 s after autostart the title
   screen appears and the play screen follows on its own. No key press,
   fire button or joystick movement was sent at any point.
5. Snapshots taken:
   - `work/play-idle.vsf` — the play screen, untouched by input. **This is
     the analysis image.**
   - `work/entry.vsf` — stopped at `$0818`, the second stub's target, with
     a stopping checkpoint, before that copier ran.

   A hard reset (`vice_machine_reset`, `mode: hard`) precedes any boot whose
   memory is read: an autostart resets the CPU but keeps RAM, and this
   loader writes over most of its own load area.

## Steady state

- **Interrupt vectors during play.** `$0314/5 = $60F5`, a RAM address:
  the music player (`music_irq`, `facts.md`), which ends through the
  KERNAL's `$EA31`.
  The hardware IRQ vector `$FFFE` is still the KERNAL's `$FF48`, which
  dispatches through `$0314`. The game left NMI alone:
  `$FFFA = $FE43`, `$0318/9 = $FE47`, `$0316/7 = $FE66`, `$FFFC = $FCE2`,
  all KERNAL defaults.
- **Banking.** `$01` reads `$36` across eight live samples during play,
  and the snapshot's processor-port byte (file offset 205) is `$36` too:
  BASIC ROM banked out, KERNAL and I/O in. (`$0001` in the RAM image reads
  `$00`, but that byte is not the port; `c64-reference`.)
- **Where the code runs.** Non-stopping checkpoints over 3 s of play
  (`facts.md`, Memory layout) put it in `$0800`-`$2FFF`, `$5000`-`$7FFF`
  and `$C000`-`$CFFF`, with the KERNAL's IRQ path above `$E000`. Nothing
  executed in `$8000`-`$BFFF`. At play time the load area `$0801-$AF6A`
  differs from the file in 40,882 of its 42,858 bytes.
- **Consequence for the rest of the run.** The image everything is read
  from is `work/play-idle.vsf`, not the `.prg`: the loader moves and
  overwrites most of what the file holds. The disassembler must hold the
  snapshot.
- **Per-level reloads:** not established in this step.

## The loader, in a paragraph

The file is a single PRG with a BASIC stub. `SYS 2061` runs machine code
that rewrites the stub in place to `SYS 2072 (ANTISOFT)` and passes
control to `$0818`, which is a copier: it installs blocks at `$CE00`,
`$CF00` and the VIC registers at `$D000` before the game proper starts.
The result is a game that runs from `$0800`-`$2FFF`, `$5000`-`$7FFF` and `$C000`-`$CFFF`
with the music player on the IRQ at `$60F5`. The loader's stages before
the last hand-over are not annotated, by policy.

