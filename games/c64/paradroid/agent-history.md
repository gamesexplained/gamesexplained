# Paradroid — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## 2026-10-24, the Silver run (Claude Opus 5.5)

**The image.** The C64 Preservation Project 10th Anniversary
Collection holds Hewson's 1985 UK disk twice: a plain G64 and one marked
"(patched)". The plain one hangs in VICE 3.10 (vice-mcp v3.13.2) with
the drive's processor on: after the first stage the drive steps to track
38 and waits at `$07C1` for a byte that never comes, while the C64 waits
on the serial bus at `$0382`. Comparing the two images track by track
showed the loader's data blocks on tracks 1-8 byte for byte the same,
with only the gaps and the protection tracks (37-42) different, so the
patched one is the same game and the one analysed. Autostart does not
work on either: VICE's autostart reads the boot file through its virtual
drive, so the drive's RAM never holds the BAM sector whose code the boot
file runs with `M-E $07B0`, and the drive jams at `$07CE`. Typing
`LOAD"*",8,1` on a hard-reset machine loads it (`work/s/boot.py`).

**The other build.** Hewson's 1986 disk is in the same collection, in a
standard DOS file layout. Its memory in play agrees with the 1985 game's
except in the working areas and a handful of code bytes (`$1830` and
`$1841` among them), so it is a different build and was left alone.

**Annotation.** Most of the code is at `$0900`-`$3EF3`, with the sound
driver at `$0500` and the interrupts at `$6EC0`-`$6FE9`; most of the time went into the data: the `$6900` tables, the
sprite shapes, the dictionary at `$C000`, the title pages in the RAM
under the I/O at `$D000`, the droid records at `$EB00` and the deck
plans from `$F100`. The memory editor at `$0D63` (`abmon`) has no
caller; the references search found none, and a patched call in VICE
showed it working.

**Wrong turns the checks caught.**

- The deck comments called it multicolour, from a `$D016` value read
  from the code. Rebuilding a recorded frame of play from memory showed
  the deck in one colour per character (`$D016` = `$C4` in play), and
  `$6F04`, `$6F1C` and `$7800` were corrected; the rebuilt frame then
  matched all 104,448 pixels.
- The main loop was first described as waiting on the frame flag twice
  a pass, then four times. It waits five times (`$13DA`), and 66 passes
  in 200 frames is the pace measured in play; comments that said
  "frames" for a count kept in the loop now say passes.
- `$01` reads `$35` in play though the game writes `$25`: bit 4 is the
  cassette sense line read back, not a second banking value.
- The checker's sample of 60 comments found 14 wrong (`facts.md`). Each
  verdict was read against the code before it was accepted, and all 14
  held.
- The ports, tested against the game's own routines in the kit's 6502,
  found the ship names one word off (`W[$68 + n]`, not `n - 1`) and the
  enquiry's notes capitalised where the game keeps the first word small.
- The Discoveries page first said an energiser is free to a player with
  no points. Reading `score_tick` showed why: the debt is dropped when a
  tick would take the score below 0. The page now says that; it was not
  tested live.
- The C64-Wiki's POKE 8410,0 was written for another copy: in this build
  `$20DA` is the first byte of `countdown`, and the poke stops the
  transfer from ending at all.
