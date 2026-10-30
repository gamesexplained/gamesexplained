# The Armageddon Man — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The image and the boot (30 October 2026)

The game came from the C64 Preservation Project's G64 collection on
archive.org: a bit-level image of Martech's protected PAL original. In VICE
3.10 (the vice-mcp release v3.14.0) the disk's protection check fails: the
drive sends back its "fail" verdict page and the loader never hands over.
Reading the loader showed that the verdict is a page the drive sends into
`$0330`-`$042F`, one of two sectors XORed with `$98`; `work/assist.py`
stops at `$1092` and writes the pass page over the fail page, and the fast
load then runs to the hand-over at `$4E96`. `orientation.md` has the
steps.

VICE's autostart saw the loader leave the ROM for `$0330`, gave up
("Autostart: aborting" in the log) and left the keyboard ignoring every key
until the emulator was restarted. Typing `LOAD"*",8,1` by hand avoided it.

## Annotation

The game is one image, `$0800`-`$FFFF`, and nothing loads after it, so it
is one part. Most of the code reads clearly once the conventions are known:
almost every routine takes inline bytes after its `jsr` (`inline_args`,
`$7125`), and the events, mail, letters and answers are scripts in a
byte-code of 77 commands (`script_commands`, `$4EB3`). Two scripts,
`work/tools/gen_scripts.py` and `gen_texts.py`, wrote the comments for the
script records and the texts from their bytes; they are the reason the
sample was taken in two strata.

Wrong turns, all corrected before the sample:

- Two of the eleven pictures were named from their position in the table
  (an envelope, the IN tray). Rendering them showed the filter panel and
  the satellite panel's eye.
- The title picture at `$2000` was first called the loading screen.
  Screenshots taken through the whole fast load showed a blank screen with
  stripes in the border, and a search for writes to `$D018` found only the
  developer's loader: the picture is never shown.
- Three bytes at `$827B` were typed as data and are executed;
  `check_listing.py` caught it.
- The year's end rating was first read as ×48/4. Week 51 poked in VICE
  gave 100, and the code is ×25/4.

## Verify

Live tests in VICE: the clock, a hostility of 0, the war that follows,
the year's end, Armageddon, the rating, and Neutral to terrorism
(`facts.md`, "Live tests"). In the war test, fire had to be pressed twice
for each memo (once for the memo, once to close it), and a radio message
in the way needed the joystick pushed up first; `work/tools/pokerun.py`
has the `UPFIRST` switch for it.

The sample of 80 comments (seed 20261030) went to one checker on the
same model, which found 13 wrong (16.3 %), all corrected with the comments
that said the same. The audit `kit/CHECKING.md` describes is recommended
in `TODO.md`.

## The minisite

Every widget that runs a mechanic is a port with a test beside the page
that runs the game's own routine in the kit's 6502: `test_frame.js`,
`test_sound.js`, `test_events.js`, `test_cover.js`, `test_radio.js` and
`test_libya.js`. Each was run once with a deliberate fault in the port to
see it fail. The sound players run the game's own driver from the listing.

Building the satellite widget showed that the listing's comment on
`in_cover` put the satellite's right-hand limit one pixel too far (x plus
width plus 5; the code gives plus 4); the comment and `facts.md` were
corrected.

Writing the Discoveries tab turned up a finding the annotation had not
drawn out: `relations_init` starts each hostility at the country's event
20 level, give or take 15, and Libya's level is 0, so its starting
hostilities wrap round to 241-255 about half the time. Snapshots of fresh
games in VICE show it (`week1-menu.vsf`: Libya to Israel 255), and
`test_libya.js` holds the page's port to the code over 500 games. To see
the attack itself, `work/tools/libya2.py` played on in VICE, closing every
window with fire and logging each event `run_event` started. Pressing fire
on every memo answered Neutral, so the terrorism answer kept ending games
and the game kept starting new ones, which suited the test: the fourth new
game opened with Libya's Total Missile Attack on Israel as its first event.

The game has one screen, the main screen with its windows, so there is no
Maps / levels tab. There is no Play tab.
