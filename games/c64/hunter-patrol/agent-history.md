# Hunter Patrol: agent history

13 November 2026, one run on claude-sonnet-5-5 in a cloud container.

- The first play snapshot was taken while the plane was exploding (`$3F` was 2), and every control test on it gave nothing: the game was in its crash animation. A second snapshot, taken with `$3F` at 0, gave the controls. The kit warns about it in `10-orient`; the check that would have caught it is reading the game's state variable before saving.
- The loader first looked like the game's start, but the real game is already unpacked when the cracker's menu waits at `$F142`; the checkpoint on the game's first instruction fired at `$A000` first, a call from `$14F5`, which turned out to be the music driver's install entry.
- The strafing-run prompt needs fire to be released and pressed again; an autoplay script that held fire the whole time sat at it for 150 seconds.

13 November 2026, a second run on claude-opus-5-5 in the same container, from 28 % to 100 %.

- Every comment the first run wrote was read again and rewritten; several were wrong in a detail (the plane's banking pictures, the flak's records at `$8880` taken for aircraft, the stripes at `$2900` taken for ground objects).
- Auto-named data symbols stop at 64 bytes even with a comment, so long tables were renamed to make their spans reach; block comments without a label did not start a span when another span reached them.
- `listing.py` warned about bytes excluded with a reason between two runs of code; the script now skips them (`kit-feedback.md`).
- The sample's checker found that the sort lists' shift loops only use the bytes before each list as a base address; the same belief sat in three comments and all three were corrected.
- Building the Music tab's player showed the driver's stop entry leaves the volume at 15, not 0.
- A live test of the stick showed that a climb rate of `$FF` moves the plane down the screen, which the first run had right and a comment of this run had stated ambiguously.
- The loading picture is in no snapshot: a boot to the picture and a read of `$E000` and `$DC00` while it was up gave its 10,000 bytes.
- The run stays Bronze in `game.json`: the kit asks for a maintainer's sample when any of the coverage ran on an unproven model, whatever came after.

## Audit and reader review, 18 November 2026

At the contributor's request the listing had a full audit on claude-opus-5-5: three fresh checkers, one address range each, checked all 397 comments and corrected 43 (A $0000-$1A10: 19; B $1A11-$8090: 15; C $8091 on: 9), and C checked every claim in facts.md and corrected 4. A new sample (seed 2618) by a fresh checker then found 3 of 60 wrong in a detail, all corrected. A reader on claude-opus-5-5 read the built site and made 16 findings. Fixed: the strafing run's aircraft hits on Gameplay, the flak's `$09` linked to the unused player on Discoveries, the test steps taken off Controls, Discoveries and Music, and four sentences reworded (Gameplay's collision test, Graphics' band copy and stripes, Music's timer periods). Left, in TODO.md: drawings of the unused shapes and of the target hit on one end, a sound-effects player, a section on the documents' faster later levels and on the extra strafing run. The "not complete" banner is the site template's and goes once the game is Silver.

## Play tab, 18 November 2026

On claude-opus-5-5, at the contributor's request, the whole game was ported to JavaScript (`reference/hp-port.js`) and held in the kit's lockstep against its own code (`test_play.js`), with a page runtime (`reference/hp-play.js`) and `play.html`.

- The lockstep found these mistakes in the port, and none in the listing: the stripes' base taken as `$496F` (the start of level's fill) where the code stores at `$4907`; `sprite_slot_hi` given the whole latch where the code passes it the latch ANDed with `$F0` (or `$70` in the strafing runs), which picked the wrong object for a hit; the template index tested with JavaScript's sign where the code's `BMI` tests bit 7; the strafing targets' X with a carry the `ASL` at `$2B55` had cleared; the name entry's delay loop, which counts `$1E` up to zero and so leaves it at zero and takes a different time each turn; and `move_aircraft`'s left and right steps, whose `$1B1B` skips the `$08` test when the `$10` step did not move.
- The collision latches `$3D` and `$3E` and the sprite pointers at `$47F8` are written by the band interrupt while the main program reads them; read through `irqByte`, once for each LDA of the game's, they agree.
- The random numbers from the timer and the raster could not be worked out on the port's side at the same cycle; a checkpoint just after each load, where the game's A holds what it read, gives them exactly.
- A loop that polls the fire button, yielded as a bare turn, let the port leave the loop on input the game had not yet reached, and the game then waited for 1,500 frames; naming the loop's head as a checkpoint at every turn keeps the two reading the button at the same turns. Two `{ cycles, at }` yields to the same address with nothing between counted as one stop, which lost a step in the name entry until the loop head `$12EB` was named too.
- The page's costs came first from a least-squares fit over the stretches, which came out 2.8 % slow and charged a loop turn 1,450 cycles; measured instead with `kit/cpu/profile.js` (each routine's own cycles over the port's count of its calls, the polling loops and the routines that yield left to the stretches), the page came within 1 % of the game's cycles.
