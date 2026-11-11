# Super Wonder Boy in Monster Land — orientation

## Image and setup

Side A is a 174,848-byte D64 sector image, labelled `1989 ACTIVISION` in its directory. Its first program is `SUPER WB+17 [N0]`; the directory also contains `DOCS SUPER [N0]` and numbered `SWB` files. The Nostalgia release introduces a trainer and a modified loader. Whether this image is a freezer backup remains open.

VICE-MCP v3.14.0's macOS arm64 GUI release passed all 57 emulator checks. PAL was selected. The disassembler is regenerator2000. Both disk sides were supplied by the contributor and copied into `work/`. The contributor identified [this CSDb archive](https://csdb.dk/getinternalfile.php/101186/225_SuperWonderboyInMonsterland_1989_Activision.d64.rar) as the source; the agent did not download it.

## From power-on to play

1. Autostart side A in VICE. After the Nostalgia introduction, press Space.
2. On the trainer screen, leave every option at `NO`, select `START GAME`, and press Return.
3. At the first title logo, press and release fire on joystick port 2. The program waits for both edges at `$8390`–`$83A2`. A stopping checkpoint at `$3C42` catches the title fire-wait path. Let the wait loop run before stopping again to reproduce `work/title-fire-wait.vsf`.
4. Continue until the title screen says `Press Fire Button!`, then press fire on joystick port 2. The first round appears. `work/play-round1.vsf` was saved in the opening scene, without ROMs. The screenshot is `reference/round1.png`.

The contributor's title snapshot and `title-fire-wait.vsf` stop at `$3C42` with the same active stack return addresses, `$6DE8` and `$0327`. Their RAM differs at 33 addresses, including the interrupt handlers' self-modified saved-register operands and startup RAM. Of 12,114 initialized instruction and scalar rows parsed from the supplied listing, 18 differ. The canonical listings use their own captured entry bytes; imported bytes are not substituted for a different capture.

## Parts reached

The resident part's `work/entry.vsf` stops at `$0203`, before the title initializer requests its first load. The first-load part's `work/entry.vsf` stops at `$0249`, immediately after that load returns; its `work/title.vsf` and `work/play.vsf` show the title wait and round 1. The two measured unpacked ranges are identical between the first-load entry and title snapshots. The stage counter is `$FF` at the resident entry and `1` at the title wait.

For the second load, restore the first-load play snapshot, set the program counter to the game's own stage-advance entry `$0732` (with the stage counter at `1`), and stop at `$073B` when the loader returns. `parts/stage-02/work/entry.vsf` is that forced route; it is not a recording of a player reaching the transition. Advancing 200 frames gives `work/play.vsf`, showing `RND. 2`. Its address map records writes across `$7EDF`–`$BF81` and `$EB40`–`$F9BF`. Store watches on both endpoints stopped after `$7C91`; watches on the four adjacent bytes did not stop before `$073B`.

For the third load, restore `stage-02/work/play.vsf`, set the program counter to `$0732` with the stage counter at `2`, and stop at `$073B`. `stage-03/work/entry.vsf` is the result; after 200 frames `stage-03/work/play.vsf` shows a different scene with `RND. 2` still displayed. The measured unpacked ranges are `$7EDF`–`$9F50` and `$EB40`–`$FEBF`, with endpoint and adjacent-byte watches as for the second load. The forced route preserves prior game variables, so it does not establish which round a natural transition displays. The later-load procedure is recorded below; natural routes remain open.

The same forced procedure was repeated through load 31: restore the preceding part's `work/play.vsf`, set PC to `$0732`, stop at `$073B`, then advance 200 frames for the play snapshot. Loads 20–31 use side B; the loader's blue-border swap prompt was dismissed with joystick fire. Each part's `ranges` records the large contiguous writes reported by VICE's address map. Stopping store watches independently confirmed the boundaries through load 5. For loads 6–31, non-stopping store watches recorded writes at both ends of each range and no writes to the immediately adjacent bytes before the loader returned at $073B. Retained state and correspondence to natural gameplay still need verification.

## Transfer boundaries and open routes

The 31 load parts and resident engine have exported symbols and listings. For loads 2–31, two decoder calls per extracted disk file reproduce the recorded output ranges and entry bytes, including four post-load patches. `stream-boundaries.json` records the consumed input boundaries, output ranges and comparisons. The purpose and transfer of bytes beyond those two streams remain open.

Forced stage advancement establishes the captured memory states, not a complete legal route through the game. Natural transitions, retained-state effects and some callback entry conditions remain in `TODO.md`. The source listings describe those limits explicitly.
