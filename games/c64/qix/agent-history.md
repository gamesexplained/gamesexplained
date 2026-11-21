# Qix — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The loader (10 October 2026)

The image is a North East Crackers crack. Its directory looks like six
files, but every entry but the intro points at one 426-byte stub; the real
files start at the track and sector kept in each entry's side-sector field.
On PAL the intro's loader jammed the CPU at `$0154` (after a long SPACE
press) or waited for ever at `$0181`. Turning on the drive's own processor
(`Drive8TrueEmulation=1`, `TrapDevice8=0` in vicerc) did not help. Switching
the machine to NTSC did: the loader's two-bit transfer is timed for NTSC.
Decoding the files' stream format statically failed (the first bytes feed
self-modifying code), so the loads were mapped instead by logging each
segment's address at the loader's segment start (`$02B1`), which also
showed when the game loads `ALIEN`, `SCENE` and `TAITO` later.

## Choosing the image

The hand-over (`entry.vsf`, at `$8000`) lacks the music player, which the
start-up copies from `$4000` to `$E000`; play overwrites `$C000`-`$FFFF`
and `$6000`-`$7FFF`. A snapshot on the title, eight seconds after the
hand-over, holds everything at once, and was analysed and listed.

## The code map

The first code map, recorded through a boot, play, two- and one-player
games and the attract demonstration, held 307 addresses of the KERNAL's
LOAD and serial code: the game banks the KERNAL in for its loads, and the
memmap marks by address. A second map of the title music alone, and a
trace of the music player through its three 21-entry dispatch tables,
separated the player's code from the KERNAL's; the KERNAL addresses were
dropped from `codemap.json` (the raw dumps stay in `work/`).

## Annotation

One agent annotated all of it. The tracer twice ran from inline text into
`$4000` (the print routine's arguments decode as JSRs); typing the
arguments as bytes after every trace fixed it, and the arguments must be
typed again after any later trace. Several first readings were wrong and
were corrected before the checker saw them: the Sparx's diagonal movers
are the Spritz roamers; `$A4A9` animates sprites rather than moving the
marker; the level hints show on levels 2 and 4, not from level 9; the
flag `$23` marks a fast line, not a slow one; and the split doubling is a
bug. About 300 data and operand symbols were described by a script from
their cross-references, to finish the ledger; those comments are thin.

## Verify

Live tests: the music's frame skip, the pause, slow and fast draw speeds,
the lives and requirement at the start, and a level end with the
requirement poked to 1 %. The scoring port and the music player were
checked against the game's code in `kit/c64/cpu6502.js`. A second agent
checked 60 sampled comments: 6 of 45 hand-written ones were wrong, all
fixed (see `facts.md`).

## Interruption

The worker restarted part way through verify and the contributor's usage
limit paused the run; the files, snapshots and the exported symbols
survived, and work continued from `symbols.json` with the listing rebuilt
from the snapshot.

## The Qix's movement (10 October 2026, after Silver)

The contributor asked for a deep dive on how the Qix moves and a viewer
for it. Reading qix_step and the routines around it line by line found
six of their listing comments wrong: the fallback takes the oldest trail
line, not the newest; the line-length test has a maximum and no minimum;
erase_segment clears pixels rather than XORing them; a bounce's
new_turn_time writes `$0273`, which nothing reads, so it does not restart
the countdown as the comments said; the timer's turn reverses each speed
rather than re-randomising it; and qix_reset's speeds are overwritten
before use. The facts' summary of the Qix had the length and the pull
wrong too: the pull is added only at a bounce.

Each reading was then tested in VICE from `play-round1.vsf`. Poking `$6F`
did not hold, because level_params runs again at every round start after
a lost life; poking level 1's entries in the level table did. A colour-3
wall poked into the `$E000` plane kept the Qix on its side, but a convex
box gave no fallbacks, which need a concave field: a peninsula gave five,
each onto the line of eight steps before. A colour-1 pixel planted under
trail lines of different ages showed the erase kills (five of six). The
port, `work/page/qixmove.js`, was compared step by step with three
recordings that captured every random number qix_step drew (stopping on
the generator's return at `$A5F2`): 1,000 steps, all equal, on the first
attempt for the first 300. The disassembler project was not updated:
`symbols.json` was edited directly (`work/editsym.py`) and the listing
rebuilt from the snapshot, as for the checker's fixes.

Asked to continue, the run added Qix 2. Reading qix2_check_line beside
Qix 1's found one line that differs: at `$982F` it loads Qix 1's y2.
The two-Qix recording at first timed out on its first step and then
showed qix2_step never running: `$BB`, like `$6F`, comes back from the
level table at every round start, so level 1's entry at `$1210` had to
be poked as well. A second attempt recorded 400 steps; the port with the
slip matched all of them, and without it drifted at step 288.

## 4 November 2026: the Graphics tab

A later run, retrofitting older minisites with a Graphics tab, added
`graphics.html`. Its cards run the game's own sprite_anim on the kit's
6502 over the listing, in a round's colours picked from the game's
table, and its burst runs marker_burst and round_intro, timed by the
cycles their delay loops take. How it works keeps its table of enemies
and links to the tab.

`test_graphics.js` runs the attract demo on the kit's machine and checks
the tab against it. Two things it found that the run had wrong: the
burst from the marker's starting place takes 105 moves, not the 92 of a
trial from another place, so the captions' times became 1 and 1.1
seconds; and the real flight is about a tenth slower than the routines
alone, not a few per cent, since the interrupt takes its share as well
as the video chip. A first try also counted shape `$2C`'s padding byte
and found it not empty; the 63 bytes of the shape are.

## 20 November 2026: Overview, Controls, Music and Discoveries tabs

The contributor asked for the page to match the newer games: an Overview
before How it works, a Controls tab and a Music tab. The single page was
split, as Spy vs Spy and Gauntlet were split: How it works moved to
`mechanics.html`, with game.json redirects for each old section link. Its
secrets and bugs, and the loading section, went to a new Discoveries tab,
the controls section became a Controls tab, and the music section a Music
tab. `index.html` is the new Overview. The page's scripts were cut apart
by a script in the scratchpad, so each page carries only the data and
code its own widgets use.

The Overview's research found two contemporary reviews in the Internet
Archive's scans: Info 28 (Mark R. Brown, unimpressed by the speed) and
Computer Gaming World 64 (Russell Sipe, on strategy). MobyGames,
Lemon64, C64-Wiki and StrategyWiki refused or lacked the page; Lemon64's
score for the Info review comes from search results. One retro site
credits the C64 version to Threshold Research, against the loading
screen's Alien Technology Group; the page gives both.

The Controls tab runs read_stick on the kit's 6502, and its test found
that every port read in the program is the same exclusive OR of both
ports. The exclusive OR makes two sticks held the same way cancel. While
checking the drawing rules, the run found that the points follow the
fire button only at a line's last step (draw_advance at `$99BF`, the
check at `$9994`), so a line drawn fast and finished slow should score
double. A try on the kit's machine model went wrong (the marker left the
edge while walking it and died), and VICE was not installed in this
container, so the claim stays a lead in facts.md and TODO.md.

The Music tab gained the sound effects: the effect player at `$B800`
runs on the kit's 6502 from 1,080 bytes of the listing. Its reset clears
the SID's volume, which play sets once at its start, so the page's
driver writes `$4F` after it. Effect 2 is never asked for: every caller
of play_sfx loads its number directly, and no effect's script starts
another, which was checked by watching sfx_load. The Qix's hum switches
between effects 3 and 4 with the length of the turn timer, so a change
of hum means a long straight run.

