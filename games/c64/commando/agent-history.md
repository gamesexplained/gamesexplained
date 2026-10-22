# Commando — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The first run, 6 October 2026

RealSnoddas ran the kit at 0.0.93 on an Ubuntu 26.04.1 desktop, on a model
the session did not name. The VICE release zip would not start there
(`libFLAC.so.12` missing); unpacking Ubuntu 24.04's `libflac12t64` into
`tools/vice-libs` and having the launcher add it to the emulator's library
path got the release to pass 57 of 57. That run booted the game, wrote the
orientation and the features, and annotated 52.8 % of the image before
opening the pull request at Bronze.

## The second run, 10 October 2026

Aaron asked for the pull request to be taken to Silver, answering yes to
every question, in a cloud container (Ubuntu 24.04.5, VICE 3.13.2 release).
The image is REMEMBER's "Commando +5HD" (CSDb 40672). The route to the
game's hand-over at `$0850` goes through the crack's menu (H, then L, to
load the saved high scores); a checkpoint armed at `$0850` before L gave
`work/entry.vsf`, the snapshot behind the listing.

Every comment from the first run was rewritten from the bytes rather than
kept, since its model could not be checked, and coverage went to 100 %.
The ledger's rules cost the most time here: a table needs a comment at
every symbol inside it, an auto symbol inside a typed block has to be
renamed to reach further than 64 bytes, and data spans stop at fixed
memory-map edges. The work queue in `coverage.py` and the "data the ledger
does not count" list in `listing.py --entry` together found the last
stretches.

The first sample of the comments (seed 20261010, 70 drawn) found 12 wrong,
17 %. The errors were the usual kind: a caller list missing members, a
condition stated one-sided, a register value given as one nibble, a count
off by one. Four fresh agents then audited every comment in four disjoint
ranges, and changed 137 of 897. Their notes stay in `work/reports/`. A
second sample by another fresh checker (seed 20261011) found 1 of 70
wrong: the enemy loop described as running every frame, the same slip
the first sample caught in the frame counter. A search for the phrase
found fifteen more routines called from the logic pass with the same
claim, and all sixteen were corrected.

Live tests overturned three claims that read well. The attract mode was
written up as eight views; stopping at each view's set-up showed seven,
because the eighth is drawn and wiped by the title in the same pass. Area 2
was said to copy area 3's tables; it takes area 1's map and restart rows
and area 3's spawn list and terrain. And the first area's map drawn from
the hand-over differed from play at the gate and at area 1's bunkers,
which every life's start stamps into the map; drawing the stamps made all
three maps match play memory byte for byte (the comparison for area 1
needed a capture in area 1, since `play.vsf` is in area 0).

Two bugs came out of the reading. The aim test (`$310A`, `$33C7`) adds 30
to an 8-bit x and drops the carry; a soldier held at x 232 faced and fired
away from a player at 100. The box audit noticed that `$5F56` returns with
X = 0, which makes a box that brings an extra life free enemy slot 0 and
pay twice; a box in slot 2 at 9,500 points gave 2,000 points, six grenades
and the life.

The page's ports (the music driver, the aim test, the score line and the
box) were each checked against the game's own code in `kit/c64/cpu6502.js`
over their whole input space before going on the page. The copy pass, read
claim by claim against the code, caught three more: the score line does not
set the area counter to 2 (the name entry does), the bass and drums of the
title tune are on the voice an effect leaves alone, not the ones it takes,
and the points table has 200 for a foxhole that `facts.md` had left out.

A Playwright click on a canvas below the fold reported an empty readout;
the click had landed outside the viewport. Scrolling the element into view
first fixed it.

## The third run, 10-11 October 2026

After the merge, Aaron asked for three follow-ups: the comparison with the
1985 release, a stepper for the box's double payout, and the unused fourth
spawn list drawn on a map. Elite's 1985 PAL disk came from the C64
Preservation Project on archive.org, and a snapshot of it at the hand-over
(`$0850`) diffed against `entry.vsf` left 29 bytes in the program, which
answered both open questions at once: the bug fix is the high-score walk's
start (6 to 7 at `$09A5` and `$0A0D`), and the eight NOPs replaced the end
of a loop copying a CBM80 signature to `$8000`.

The first live test of the fix stopped at once with no game run: the score
had been passed as `2500` in the script's high-byte-first order, which put
`$25` in the high byte. The second loop exited at once too, because the
kit's `frames()` leaves the machine paused; non-stopping checkpoints read
after each batch of frames worked.

The reset trap took three tries to read right. The first reset test showed
a black screen and was put down to the emulator resetting the video chip;
reading `$D011` at the restart showed it still `$17`, and a store
checkpoint caught the gunsight copy writing `$20` into it. Then a run
"into area 3" with the display put back turned out to be the attract mode
cycling through its views: the restarted game ignores fire, because the
title waits for `$6F` on a CIA port the reset had left all inputs. Setting
the port as the KERNAL leaves it made fire work again, which settled the
cause. The first page draft had said the restarted game "played on a black
screen"; it never plays.

The fourth list's overlay first used one y for every entry; reading the
door, box and trench handlers gave each its own starting y, and with them
the trench soldier and the mortar man landed in area 3's fortress windows.
One door, at row 157, falls on area 3's gate, which the first draft of the
page had missed by saying all nine stood in open ground.

The box stepper's test first failed on soldiers firing bullets into free
slots during the pass; setting the fire mask to `$3F` and each soldier's
timer to 1 kept the slots still, and comparing only the enemies the port
keeps left one random spawn (`$2D63`) out of the comparison.

## Typed data no label reached (22 October 2026)

The ledger began counting typed data that no label's reach covers. One
byte of this game's was bare, missing from the listing: `$1000`, the last
of the logo's seven sprite blocks, cut off from `title_logo_blocks` at
`$0FFA` by the memory-map edge at `$1000`. It has a line comment now. Six
more bytes, the two unreachable jumps at `$5080` and `$50A7`, already had
comments and needed only the rebuild.

The contributor's image was not to hand. The Internet Archive's
`Commando_1985_Elite_cr_REM_t_5_REM_Docs_035` holds a D64 with the same
header, ID and two files; stopped at the hand-over (`$0850`) by the route
in `orientation.md`, it agreed with every byte the listing held but six
that the KERNAL and the loader leave behind: `$0001`, `$000E`-`$000F`,
`$00A1`-`$00A2` (the jiffy clock) and `$00FB`. Those six were written back,
so the rebuilt listing keeps every byte it had and adds these seven. The
raw snapshot is kept as `work/entry-raw.vsf`.
