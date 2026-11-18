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
