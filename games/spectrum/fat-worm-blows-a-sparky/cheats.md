# Fat Worm Blows a Sparky — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

Sources: the `.pok` file in the Spectrum Computing archive
(`Fat Worm Blows a Sparky (1986)(Durell Software).pok`, 74 bytes, read
29 September 2026) and the type-in hack on The Tipshop
(`the-tipshop.co.uk`), read 29 September 2026. Both are for this 1986
release. The addresses below are the game's own addresses; the `.pok`
format's bank/size fields are not interpreted here, only its addresses and
values.

| Effect | Poke | Status |
|---|---|---|
| Immunity from bugs | `POKE 30624,201` (`$77A0` = `$C9`): the routine that shuffles the bugs along the worm and starts the death returns at once | tested live, 3 October 2026: with a bug on each of the four sections the worm was still alive 40 passes later; without the poke the same worm died |
| Infinite sparkies | `POKE 30472,0` (`$7708`, the `DEC A` before a shot becomes `NOP`) and `POKE 41946,0` (`$A3DA`, the operand of the `SUB $01` paid for leaving the board becomes 0) | tested live, 3 October 2026: three shots and a spell off the board's edge left the count at 20; without the pokes it fell to 17 and then 14 |
| Immortality and infinite sparkies (Tipshop type-in) | loads a patch at `$FF88`, then `POKE 64249,240`, `POKE 64250,186`, `POKE 64260,136`, `POKE 64261,255`, `RANDOMIZE USR 64242` | candidate, not tested live. Traced against the loader: the first two pokes change the length in `LD DE,$BF68` at `$FAF8` to `$BAF0`, so the load stops below the loader, and the last two change the return address the loader pushes at `$FB03` from `$EFD8` to `$FF88`, so the load returns into the patch |

More from `facts.md`, each tested live on 3 October 2026 by writing the
value while the game was stopped at the top of its frame loop:

| Effect | Poke | What happened |
|---|---|---|
| Skip the forgery warning | `($FC00)` = 0 before the entry at `$EFD8` runs | the menu comes up at once |
| See the ending | write the item `08 00 90 20 00 30 F6` over the spindle at `$735C`, one cell west of the start, and run west | the head touches it, and the hand takes the disk |
| A de-bugger where you want one | the same with type `$F5` in place of `$F6` | each section that crosses it loses its bugs |
