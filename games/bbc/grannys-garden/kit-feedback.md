# Granny's Garden — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `70-minisite`: "A widget that runs a mechanic is a claim too": held the answer box and the baby dragons to the game in jsbeeb, key by key and throw by throw, reading BASIC's variables, before either went on the page.
- `tool-jsbeeb`: "That log is what a page's tune player replays": recorded the three tunes at the chip, which showed the theme's flushed top part and the kingdom tune's silent one, neither of which the program's text shows.
- `60-verify`: "Read every comment it marks wrong or doubtful against": read all eleven of the checker's marks against the program; ten were wrong and the doubtful one held.
- `60-verify`: "Correct every comment the sample found": corrected the ten and six more comments that said the same things.
- `60-verify`: "Fresh checkers audit every comment, each in its own range, given the kinds of error the samples found": two checkers, a part each, one after the other, the second told the kinds the first had found; then a second sample on a checker told not to open the audits' verdicts.

## What was changed in the kit

- `kit/bbc/basic.py` (new): BBC BASIC as it sits in memory, listed a line to an item as BASIC's own LIST prints it, keywords from the ROM's table; `variable()` reads a running program's variables, arrays too. Why: the kit could not read a BASIC game at all, and a port of a BASIC routine had no way to be held to the game.
- `kit/bbc/test_basic.py` (new): the lister against what LIST printed, and the variable reader against the variable area the machine held, both from the kit's machine; `basic.py test` repeats both live.
- `kit/bbc/cpu.py`, `kit/bbc/project.py`, `kit/bbc/r2000.py`, `kit/bbc/test_project.py`: the `BASIC` text type, kept in regenerator2000 as its screencode text, which means nothing on the BBC. Why: regenerator2000 has no BASIC type.
- `kit/scripts/ledger.py`, `kit/scripts/coverage.py`: a BASIC block counts in the denominator and its spans cross the map's fixed edges, as code's do. Why: coverage counted only labelled lines, and cut a line in two at an edge.
- `kit/bbc/jsbeeb_server.mjs`: `output` returns every byte sent through WRCHV as `codes`. Why: LIST's output had to be compared byte for byte, control codes and top-bit bytes included.
- `kit/bbc/frame.py`, `kit/bbc/test_frame.py`, `kit/bbc/INSTALL.md`: `frame.py test` checks Mode 7 too, three random screens, one scrolled, against jsbeeb at every cell. Why: the site now draws teletext.
- `site/lib/bbc.js`: `BBC.screen7`, `BBC.cells`, `BBC.drawTeletext`: a Mode 7 screen read round its 1K and drawn by jsbeeb's teletext rules. Why: every picture in a teletext game.
- `site/lib/sn76489.js` and `kit/bbc/test_sn76489.js` (new): a player for a recording of the SN76489's writes, its model held to jsbeeb's chip. Why: a BBC game's tunes had no player.
- `kit/skills/bbc/bbc-reference`: SOUND's channel digits (flush, synchronise, the queue), BASIC II's zero page and variables, its nesting limits, `No room`, `ON ERROR RUN`, DEF met while running, the first DEF winning, `LEFT$` with a negative length, and how to drive a BASIC game from wait to wait. All measured.
- `kit/skills/bbc/tool-jsbeeb`, `kit/skills/bbc/tool-regen2000`: `output`'s codes; a BASIC program typed as screencode.
- `kit/scripts/build.py`, `site/lib/memmap.js`, `site/lib/site.css`, `kit/scripts/test_build_withheld.py` (new): `"publish_source": false` in `game.json` keeps the Source tab's line on the comments and replaces the listing with a sentence saying the annotations are not published; the site's copy of each `listing.json` keeps only the addresses, types, labels and bytes the other tabs load, and nothing links into the listing. Why: the contributor asked for it, for a game whose publisher still enforces its copyright.
- `kit/skills/bbc/bbc-reference`: `*FX15,0` empties the sound queues too, and an envelope is read while its note plays. Both measured in the audit, and both behind wrong comments.
- `kit/lessons/2026-10-14-grannys-garden.md`: record the chip, type DELETE first, and run a BASIC line before describing what it does.

## Candidates

- **Line addresses taken from a listing at another address.** The page's
  first draft cited five lines by addresses read from a text listing of
  the program as `LOAD` puts it, at &1900, while the committed listing has
  it at &0E00, where the analysis ran it. Every one was inside the program,
  so each link landed on some other line, and `build.py --addresses`,
  which reports links that land on no record, said nothing. A look at the
  built page caught it. A skill would say: take every address a page cites
  from the committed listing (its labels, or a line's record), never from
  a dump made at another load address. No other game folder shows it yet.

- **A correction is a claim too.** Part 1's audit corrected the Witch's
  sound from "rising through five pitches" to a reading of the code (five
  envelopes, each larger), and the run accepted it on reading the line.
  Part 2's checker recorded the chip and showed that reading wrong as well:
  the five notes are queued at once and play the envelope as it stands
  while they play. A skill would say: when a correction says what a
  statement does to the screen or the sound, settle it by running the
  statement, not by reading it. No other game folder shows it yet.

## Maintainer asks

- **Decide whether a BASIC game's listing may carry the whole program.**
  For a game written in BASIC, `listing.json` is the program: its records
  hold every byte, and the Source tab prints every line as LIST would, so
  the game can be typed back in from the page. `AGENTS.md` allows a
  listing to carry the game's bytes, and says a page never carries enough
  of the game to rebuild it; for a machine-code game the two agree, for a
  BASIC one they do not. Flax Cottage, an archive of BBC educational
  software, withholds Granny's Garden because 4Mation still enforces its
  copyright.
  The contributor asked for `game.json`'s `publish_source: false`, which
  this branch adds, and set it for this game: the Source tab no longer
  shows the listing. What is left to decide: whether a withheld game's
  program bytes stay in the site's copies of `listing.json`, which the
  other tabs load, and in the repository's. Where: `AGENTS.md`, "No
  binaries, ever", and `kit/scripts/build.py`.
- **Report a page's links that land inside a record of a BASIC listing.**
  `build.py --addresses` reports a `$` link that lands on no record. In a
  BASIC listing every address is inside some line, so a wrong address
  lands on the wrong line and nothing is reported (Candidates, above).
  What to change: for a record of type BASIC, report a link that is not
  the record's first byte. Where: `kit/scripts/build.py`.

## What cost the most time

A BBC BASIC lister and text type in the kit, now `kit/bbc/basic.py`, would have saved the most time: the run had to build and verify one before it could read either program.

## Operating system and tools

Linux 6.18 x86_64, a hosted cloud session with no display; Python 3.13.16,
Node 22.22.0; jsbeeb 2.4.0 from npm with MOS 1.20, DFS 1.20 and BASIC II;
regenerator2000 0.9.20 built with cargo. Nothing here that `kit/bbc/INSTALL.md`
does not already say.
