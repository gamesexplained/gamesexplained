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
- The Training program: a separate load (`LOADIT`, the `TNK` files).
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
- **The Training files are open in the ledger** (`LOADIT`, `TNK12A`,
  `TNK2B`, `TNK3`, `TNK4A`, `TNK4B`, `TOLOR`) until the Training program
  is listed as a part of its own.
- **Track 2, sectors 10 and 11** are marked used, belong to no file and
  hold 512 bytes with no pattern. The protection's drive program reads
  sector 0 of that track; whether it reads these two is not known.
