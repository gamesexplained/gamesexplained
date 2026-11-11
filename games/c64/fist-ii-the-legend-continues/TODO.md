# Fist II: The Legend Continues — TODO

Tier: **Gold**. unorig curated every tab, section by section, in two passes: the first
(pull request #156) and a second on 2 November 2026, which added the
sample player on the Music tab (copy `human-edited`).

For Platinum: a Play tab that ports the whole game (`kit/skills/core/70-minisite/play.md`).

Worth doing, found in the run and not done:

- A pose viewer: build each of the 73 poses from its nine images
  (`$B210`, `$1C0F`) and step through the 44 move scripts (`$AF46`).
- symbols.json, the sample player (ported and checked on the Music tab,
  `reference/fist-samples.js`): the 40 bytes at `$FFCB` are the samples'
  start and end offsets from `$C8D0` (the listing calls them unknown);
  bytes 1-3 of each `$BEC6` entry are the rise, hold and fall counts of
  the loudness envelope; `step_level` (`$3EE8`) reports "there" in the Z
  flag, not in A as its comment says. Fix them in the next annotation
  session, which can rebuild the listing from a snapshot.
- Sample 10 (`$2BCA`) reads its entry from `$FFEF`, where the table runs
  into `$FF`/`$00` fill: check in the emulator what it sounds like in play,
  and what the bytes at `$FFEF-$FFF2` are while the game runs.
- Live tests not run: area 5 without scroll 8; the ending scene from room
  `$7A`; setting `$0455` to 0 for a second joystick; combination 8's store
  into the hero's slot; readers of the head sprites at `$B746`.
- The solution: drive the legs the search found and the emulator has not
  run: scroll 3 (room 114, from the stairs of room 113), the crevice in
  room 79 (from room 43's ladder at 88, somersault over 18-24 with scroll
  6), scrolls 7 and 5 and the ending; then win the fights instead of
  switching them off. The route is on the Solution tab;
  `solver/README.md` has the tools.
- Maps: the world map draws every room's scenery from the game's tables;
  only the outdoor sets were checked against screenshots (rooms 94 and
  100). Compare a set 0 room (caves, rooms 0-59) with the emulator, and
  draw the barriers that a scroll or a kick removes in their broken state
  once that is known (`restore_item_shapes`, `$0B2B`).
- symbols.json: `$0491` and `$0492` are the blink count and the scroll
  icon of `blink_icons` (`$2D57`); their comments still say "meaning not
  traced".
- The Overview has no reception or developer quotes: the review pages
  were refused in this environment. Commodore User, November 1986 (Ken
  McMahon, 8/10) and Zzap!64's interview with Gregg Barnett (October 1986)
  are known to exist; scans are needed to quote them.
- Compare the cassette release with the disk: a Lemon64 player
  describes the late-game respawns on the tape version, and the code read
  here is the disk's.

## From the disk's ledger

`media.json` lists everything on the Mindscape disk (11 November 2026).
What it found is here for the steward: no page was changed.

- **Two pictures are on the disk and drawn by no page.** `M` is the
  Mindscape logo and `T` is the title picture (the fighter's high kick,
  "FIST THE LEGEND CONTINUES", "COPYRIGHT © 1986 BEAM SOFTWARE"), which
  the overview shows as a screenshot. Each unpacks to 10,001 bytes: 8,000
  of bitmap, 1,000 screen colours, 1,000 bytes of colour RAM and a
  background byte, a multicolour picture. The packing is a count byte:
  `$00` ends the file, `$81`-`$FF` repeats the next byte that many times
  less `$80`, and `$01`-`$7F` copies that many bytes as they are
  (`LL`, `$9B0E`). The menu shows the logo first, and the title picture
  while the chosen program loads. A loading picture belongs on the
  Graphics tab, drawn from the disk's bytes (`kit/skills/core/70-minisite`,
  "Graphics").
- **A leftover of an earlier loader, a candidate for Discoveries.**
  `LOADALL` still holds the code to load a file `TITLE` and then `TSETUP`
  and to call `TSETUP` at `$1000`, which shows a picture held at `$6000`.
  This disk has no `TITLE`, and the menu jumps the loader over all of it
  (`LL`, `$9985`, writes `JMP $C06E` at `$C011`). So `TSETUP` is on the
  disk and nothing loads it. Read from the code of `LL` (in the copy of
  the disk without its protection) and `LOADALL`; not run in the
  emulator.
- **`DUMMY` is loaded by nothing** and is a copy of 256 bytes of the
  Training program: `TNK12A`'s bytes at `$1000`-`$10FF`.
- **The Training files are answered from the part `training`.**
  `TNK12A`, `TNK2B` and `TNK3` are in its listing whole, `TNK4A` and
  `TNK4B` in every byte the listing holds, `TOLOR` is its colour RAM and
  `LOADIT` its loader. One item is left open, the two sectors below.
- **Track 2, sectors 10 and 11** are marked used, belong to no file and
  hold 512 bytes with no pattern. The protection's drive program reads
  sector 0 of that track; whether it reads these two is not known.

## Training, analysed as a second part

The disk's Training program is the part `training` (`parts/training/`):
58,291 bytes, 100 % explained, its own listing, `facts.md` and sample.
The sample of 80 comments found 8 wrong (10 %, 5.2 % to 18.5 % at 95 %),
over the mark of 2 in 60; they and one repeat were corrected, and the
details are in `parts/training/facts.md`. An audit of every Training
comment by checkers that wrote none of them, then a new sample, is
recommended (`kit/skills/core/60-verify`), and the Adventure's listing
has had no sample at all. Every page is unorig's, so nothing on them
was changed but the About tab's links to the data, which now name both
parts. Found in Training and worth showing readers, for unorig to place;
addresses are Training's:

- **The two-player game differs from the manual.** The Mindscape manual
  promises "eight sixty-second rounds, two in each of four locations";
  the code plays four, one in each location (`two_player_game` `$1DA6`,
  the `CMP #$04` at `$1DEF`). The Gameplay tab repeats the manual's eight.
- **A knockdown scores twice in a two-player game.** The hit that floors
  a fighter scores as it lands, and the same points again when the other
  falls (`two_player_bout` `$1E18`). The time bonus (100 a second left)
  is for a one-player win only (`time_bonus` `$241A`).
- **The Exploding Fist's scoring is still inside.** Code that adds half
  and whole points and draws the yin-yang point symbols in rows 0-1 is
  left in and never called (`$1FEF`-`$2097`, `$23A4`); Training still
  colours those cells light blue and clears them before every bout. The
  status font keeps the symbols (characters `$21`-`$28`, `$E000`).
- **The sounds hide under the floor.** The four samples are stored in the
  bitmap's bottom rows (`$F580`-`$FFDC`), and the floor there is drawn in
  one colour for all four pixel values, so they never show.
- **A fifth sound nothing plays.** 512 bytes in the samples' form sit
  between samples 2 and 3 (`$FCD3`-`$FED2`) with no table entry pointing
  at them, and entry points for samples 4-7 (`$344D`-`$3462`) are never
  called. The Music tab's sample player (`reference/fist-samples.js`)
  could play it.
- **Tune 4 is never played.** Nothing sets the tune byte to 4 (patterns
  at `$08D6`, sequences at `$1055`). A Music tab player could.
- **Unused pictures.** 26 of Training's 256 packed body images belong to
  no pose, and 34 sprite images under the I/O area are shown by none
  (`parts/training/facts.md`, Unused and leftover); script steps for poses
  `$40`-`$4C` survive at `$7C16`, though Training has only poses
  `$00`-`$3B`. A Graphics tab viewer of Training's images would show them.
- **Small bugs.** In the demonstration both computer fighters play with
  the masks of whichever level was set last (`ai_set_level` `$27F2`
  stores without X), and plan 8 hands a plan to fighter 0 whichever
  fighter runs it (`$289D`). A bit mask that would clear two sprites'
  bits (`$1305` = `$DD`) is never read.
- **The computer's levels.** Levels 7 and up never make the flying kick
  their distance table offers (they walk forwards), levels 0 and 1 never
  sweep from it, and past 10TH DAN the game goes on for ever against
  levels 7-10 (`$2780`, `$278A`, `$1EFE`).
- **No loading picture.** The Adventure's loader shows the title picture
  while it loads (on the How it works tab); Training's blanks the screen
  and shows only a cyan border (`LOADIT`, `$C20D`), turning it red if a
  file fails to load, so there is no Training loading screen to show.
- **The About tab's load ends at `$FFF8`; both loaders stop at `$FFEF`.**
  `LOADALL` and `LOADIT` copy `$2FF0` bytes of `BNK4B`/`TNK4B` under the
  KERNAL, so each file's last nine bytes never reach memory
  (`orientation.md`). The About tab's first paragraph says `$FFF8`.
- **The hand-over holds location 1's picture.** At the moment Training
  starts, the band and its colours already hold the river picture, byte
  for byte as the game unpacks it, left in memory from the developers'
  machine; every mode starts at location 0, so it is unpacked over.

