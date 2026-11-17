# Galactic Games — agent history

Narrative of how the analysis went, including wrong turns, for the next
agent's benefit. This is the only file that narrates; `facts.md` and
`features.md` state current truth only.

## The run, 10 to 17 November 2026

One agent did the whole run, apart from the checker for the sample and the
reader for the review, in a Claude cloud container on Linux x86_64, on the
contributor's two G64 images of the Activision disk.

**Orient and parts.** The disk boots with true drive emulation on. The game is seven loads: a resident that
stays from the boot (`$0800`-`$08FF`, `$B800`-`$FFFF`), the menu HARRY,
and the five event files PROG0 to PROG4, which load over `$0900`-`$B73F`.
Each became a part over the resident (`kit/skills/core/15-parts`). The
events on side 2 need the second image attached at the menu's prompt.
Each event's code map was recorded from its entry through title, prompts,
play and RUN/STOP back to the menu, which found the code quickly and left
the data to annotation.

**Annotation.** 100m Slither went first and set the vocabulary (state
machines in a jump table, a sound driver with instrument records, raster
bands). Space Hockey, Psychic Judo, Head Throwing, the Marathon, the menu
and the resident followed, each to 100 %. Large stretches of four files
turned out to be leftovers: an earlier Psychic Judo build from `$3718` in
Slither and Hockey (and `$35D5` in Head Throwing), Slither's program in
Hockey, Hockey's player shapes and Judo's bolts in later files. They were
matched to their source by comparing bytes with an offset, Judo's own file
twelve bytes higher, and described as leftovers rather than annotated line
by line as if they ran.

Wrong turns worth knowing:

- Head Throwing's head was first taken for 36 turning frames; it is 32
  angles, then 5 nose frames and 4 ear frames (41 in all).
- Psychic Judo's bolt height was read upside down until `judge_bolt1`
  showed height 0 is the floor (`($40 − height) / 4`).
- The worm animation scripts 7, 9 and 10 were mislabelled until the code
  that starts them was traced: 9 is the worm put out at the time limit,
  10 overheated, 7 what follows either.
- A symbol the menu export added, `cpu_port_ddr` at `$0000`, belonged to
  no part's range and was removed from `symbols.json`.

**Verify.** The sample of 60 comments (seed 2617) went to one checker on
the same model. It found 9 wrong (15 %, interval 8 % to 26 %), all fixed:
a two-byte "nothing reads it" that is message 12's address, a thirteenth
table entry (head `$2A1E`); every instrument's slide said "every N ticks"
where the step comes every N + 1 (the count is reloaded and the step taken
when DEC goes below zero), so all five events' instrument comments were
rewritten as a rate; a Jumper flag said to clear on landing that nothing
clears; `check_behind` called the same as `check_ahead` when it tests the
morph's own column; an energy test misread as "run over"; the menu's FIRE
and UP/DOWN return values swapped; resident shape 0 at `$C000` called
unused when the Psychic Judo title draws its U with it; and a Slither end
test read as burn-out when it matches the time-limit put-out. The rate is
over the mark, so `TODO.md` recommends an audit.

**Findings that reached the pages.** The pause key in Space Hockey; the
manual's swapped H and K; the quit prompt written and never shown; Head
Throwing's draw bug (it tests only the metres of the difference, so a
player one ahead by under a metre gets a draw whenever those metres are
zero, including 13.10 against 12.80, which a first draft of the table got
wrong); the Marathon's lost player-two best (`CMP #$FF` for `#$99`);
Psychic Judo's records losing their minutes; the volume read from a
write-only register with a missing `#`; the misplaced stars; two identical
pill lists; unused GALACTIC GAMES tiles; the U drawn from the font; the
sixth title, THE END.

**Pages.** Built in the contributor's story-first layout: Overview (story,
makers, C64 reception, what's hidden), Gameplay, Controls, Maps, Graphics,
Discoveries, with numbered sources on About. Every picture is drawn from the
listings in the browser. Sections off screen are not painted in a
full-page screenshot, so each section was shot on its own.
`build.py --addresses` found 19 addresses in code spans that would have opened
the wrong listing; each now links to its own part or is plain text.

**Reader review.** One fresh reader on claude-opus-5-5 read every tab at
desktop and phone width (`work/reports/reader-review.md`). It found five
claims wrong, each checked against the listing and fixed on the pages and
in the notes: the computer plays player one in Slither, Hockey and Judo,
not player two (Head Throwing's takes player two after 256 frames with no
fire); those three events refuse the keyboard with joystick two; the
Marathon's two players take turns; all five events carry the unused quit
prompt, not three; and the Marathon's player-two test differs from player
one's in both the number and the branch, which the page now says (the
listing's comment at `$7451`, which said `$9999` was passed, was wrong
too). Also changed: the draw bug stated as one rule (any win by player
one of under a metre); the Judo minutes bug shown to be unable to show;
a guess about a planned second pill layout cut; the leftover links
relabelled; the Judo shield cost added; counts in Gameplay and Maps
written in decimal; records given in their units; 13 missing Oxford
commas. Left for the Gold pass, with reasons: pictures on Discoveries
(the U, the two tiles) and side-by-side animations on Graphics, which are
design choices for the contributor; Slither's full heat rule and the
championship points rule, which the notes do not state and were not
traced in this run; headings that read as inventories, and routine names
used as sentence subjects, which are a matter of the contributor's taste.
No leads list went with the brief; the reader built one from the notes.
