# Falcon Patrol — orientation

How to get from the contributor's own copy to the analysed state. Someone
else must be able to follow this exactly.

## The image

`falcon-patrol.d64`, 174,848 bytes, a standard 35-track D64. It is **not**
the original release: it is a cracked version by the group Remember,
titled on screen "Falcon Patrol +5 and Highscoresaver 100%". The directory
holds four entries:

| Name | Type | Blocks |
|---|---|---|
| `----------------` | del | 0 |
| `f.patrol+5hi/rem` | prg | 46 |
| `f.patrol hi /rem` | prg | 1 |
| `----------------` | del | 0 |

The two `del` entries are decoration. `f.patrol+5hi/rem` is what
autostarts; `f.patrol hi /rem` is the saved high-score list the crack
writes back to disk.

The crack matters for everything downstream: the code in memory is the
1983 Virgin Games game **plus** a cracktro, a trainer menu, and a
high-score saver patched in front of and into it. Anything found near the
menus, the high-score save path, or a lives counter may be the cracker's
work rather than Steve Lee's, and must be attributed carefully rather than
described as how the game shipped. An original disk or tape image would
settle any such question; the contributor does not have one.

## From power-on to play

1. Attach and autostart `work/falcon-patrol.d64`. Autostart leaves warp
   mode on in some runs; turn it off (`WarpMode: 0`) before timing
   anything.
2. The Remember cracktro appears (logo, "PROUDLY PRESENTS", scroller).
   It does not advance on fire. **Press SPACE** — hold it long, around
   2000 ms; the game and its front end poll the keyboard themselves and
   drop short taps.
3. The instructions screen appears ("DOCUMENTS TO FALCON PATROL"). Press
   **SPACE** again, held the same way.
4. Trainer menu: `[H]ighscore or [T]rainers ??`. Press **H**. This is the
   plain game with only the high-score saver; `T` would add the cheats,
   which we do not want.
5. Second menu: `[R]eset or [L]oad Highscorelist ??`. Press **R**, so the
   state does not depend on whatever high-score file happens to be on the
   contributor's disk.
6. The game's own title screen appears: FALCON PATROL, five blank
   high-score rows, "PRESS FIRE TO START", the name-entry alphabet strip
   `.ABCDEFGHIJKLMNOPQRSTUVWXYZ_`, and "©VIRGIN GAMES 1983 WRITTEN BY
   STEVE LEE".
7. **Press fire on control port 1.** The emulator cannot do this with its
   joystick tool (see below). Use `kit/c64/vice.py`: `stick_arm(rpc)`,
   `stick(rpc, FIRE)`, release after ~600 ms, then `stick_release(rpc)` to
   give CIA1 port B back to the keyboard before doing anything else.
8. Play starts immediately: the jet is airborne over the desert with full
   gas and 100 AAMs. Snapshot taken here, a frame that was looked at
   first, saved **without ROMs** as `work/play-round1.vsf`.

### Input: this game reads control port 1

The instructions screen says "Joystick control, Port 1", and that is the
case `kit/skills/c64/tool-vice-mcp` warns about: `vice_joystick_set` and
`vice_joystick_tap` cannot drive control port 1 at all, and report success
while doing nothing. The way in is `stick_arm`, which sets CIA1 DDRB
(`$DC03`) to `$1F` so that bits 0–4 of `$DC01` become outputs and a plain
memory write is what the game reads. Confirmed working: fire started the
game this way after the joystick tools had no effect.

## Steady state

Measured live in the snapshotted state, PAL (`MachineVideoStandard: 1`),
machine `C64SC`:

| What | Value |
|---|---|
| Processor port `$01` | `$37` — BASIC ROM, I/O and KERNAL ROM all banked in. The game plays no banking tricks. |
| IRQ vector `$0314/$0315` | **`$4AC0`** — the game's own handler |
| BRK `$0316/$0317` | `$FE66` — KERNAL default, untouched |
| NMI `$0318/$0319` | `$FE47` — KERNAL default, untouched |
| Hardware vectors `$FFFA`–`$FFFF` | KERNAL defaults; the RAM underneath is not used, since `$01` never leaves `$37` |

`$4AC0` was confirmed, not inferred: a non-stopping checkpoint on it
counted 302 hits in 2 s and 604 in 4 s, about 151 Hz, which is three
interrupts per 50 Hz PAL frame.

The handler is a three-band raster split driven by a state byte at `$B0`:

| `$B0` on entry | Sets | Next raster (`$D012`) | `$B0` becomes |
|---|---|---|---|
| negative (`$FF`) | `$D021` = `$0C`, `$D023` = `$00` | `$01` | `$01` |
| positive (`$01`) | `$D021` = `$0E` | `$8A` (138) | `$00` |
| zero | `$D021` = `$0C`, `$D023` = `$08` | `$D2` (210) | `$FF` |

It acknowledges with `$D019` = `$01` and leaves through `jmp $EA7E`, the
KERNAL's IRQ exit, not `$EA31`.

The installer at `$4B20` is textbook: `sei`, point `$0314/$0315` at
`$4AC0`, `$D01A` = `$01` to enable the raster interrupt, **`$DC0D` = `$7F`
to disable every CIA1 interrupt source**, set the first raster to `$8A`,
spin until `$D012` reads `$FE` to sync, seed `$B0` = `$00`, acknowledge,
`cli`, `rts`.

So the game's tick is the raster, and the KERNAL's timer interrupt is
switched off while it runs. A consequence worth recording because it
misleads: `$00A0`–`$00A2`, the KERNAL jiffy clock, is no longer a clock.
Watched across 3 s of play it went `$0010` → `$000D` — *down*, about one
per second. The game has repurposed those bytes. A test that only asked
"did it change?" would have concluded the KERNAL clock was still running.

Where the code and data sit is **not yet established** beyond the IRQ
handler and its installer around `$4AC0`–`$4B55`. A page-occupancy scan of
the snapshot suggests the working set is at least `$0800`–`$7EFF`, but the
test used (a page is untouched if every byte is `$00` or `$FF`) is too
crude to publish: it cannot tell real data that happens to be all `$00`
and `$FF` from never-written RAM, and it reported `$C000`–`$FFFF` as
written, which is unexplained. The proper census belongs to `40-sweep`.

Nothing is known yet about whether anything is reloaded per level; no
second load has been observed, but play has only reached the first wave.

## The loader, in a paragraph

Autostarting the disk runs `f.patrol+5hi/rem`, which brings in the
cracktro, the front end and the game together — no further disk access has
been seen after the initial load, and the game itself is a 1983 title
small enough to fit the file's 46 blocks. The loader is the crack's, not
Virgin's: it puts up the Remember logo and scroller, then the
instructions screen, then the two menus that choose trainers and the
high-score list, and only then hands over to the game's own title screen.
The high-score saver is the one part of the crack that stays resident and
writes back to the disk, to `f.patrol hi /rem`. Not annotated further, by
policy.
