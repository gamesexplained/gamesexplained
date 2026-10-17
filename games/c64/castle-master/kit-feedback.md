# Castle Master — kit feedback

This run, 16 October 2026, took the game to Silver from the original disk.

## Skill text that changed what I did

- `60-verify`: "For each wrong comment, whether the sample is bad or not, say what it believed": the first sample's 14 wrong comments led to 83 others that said the same things, corrected with them before the audit.
- `60-verify`: "An audit, in a run asked for one, gives its ranges to fresh checkers one at a time": the audit ran as four ranges, each a new checker, and each range's corrections went into the listing before the next began.
- `70-minisite`: "A widget that runs a mechanic is a claim too. Port the routine, then test the port against the game itself": the spirit meter widget, the alarm's player mode and the Maps tab's reading of the database each got a test against the game's own routines (`test_meter.js`, `test_music.js`, `test_world.js`) before going on the page.
- `70-minisite`: "The How it works page keeps the format, shown on one level, and links here for the rest": the database section shows one object's bytes, and the 34 areas went to a Maps tab of their own.
- `70-minisite`: "Head each one `Secret:` or `Bug:` with the finding in the heading": every Discoveries section says what it found in its heading.

## What was changed in the kit

- `kit/lessons/2026-10-16-castle-master.md`: three lessons, on sweeping a gauge's arithmetic through the game's own routines, on decoding every script of a data-driven game before writing the page, and on a start call made every frame.
- `kit/skills/core/70-minisite/play.md`, "Native resolution and smooth motion", from the Play tab's switches (17 October): read and never write, read the scene where the game builds it, take the game's own choices, pace the glide by when the next picture is known and shown, and test it against the game's drawing. `games/c64/space-rogue` met the pacing rule (its agent-history.md: paced by the flips, its view stalled about a frame at every picture) and holds its view with the same two machines; `games/c64/mercenary` has the same two switches. The lesson is `kit/lessons/2026-10-17-castle-master-modern.md`.

## What cost the most time

The audit: four ranges of about 200 comments and the claims in `facts.md`, one checker at a time; the last three took 28 to 44 minutes each. Writing the pages took about as long, and ran beside it.
A script that applies a checker's corrections file to the disassembler would have saved the most: this run wrote its own (`work/fixes/apply_audit.py`) and put every range's corrections through it, and every audited run needs the same step.

## Candidates

- The spirit meter's overflow was found by sweeping the game's own multiply and divide over every input. No other game folder shows the same miss yet; a skill line in `60-verify`, "What a test lets through", would belong there if one does.
- An initialiser called every frame under a standing condition restarts what it starts. Same: one game so far.

## Maintainer asks

- #386: a kit script that applies an audit checker's corrections (`fixes.json`) to the disassembler, and `checker.md` naming that format.
- #387: a `port_check.js` helper that checks a code block is the same on every page of a game that carries it.

## Tools

VICE MCP release v3.13.2 passed all 54 of the kit's emulator checks on 16 October 2026 in the cloud container; regenerator2000 0.9.20 built from crates.io.

## The Play port

The Play tab, 16 and 17 October 2026, after Silver: the whole game ported to JavaScript and run on the page.

- `70-minisite/play.md`, "Check the fit on sessions it was not fitted on, and on every kind of play the page offers: a scene the fit never saw can run fast by a routine it never costed": play kept time from the first fit, and the title's opening still ran 23.5 % fast. The viewport's opening step runs only inside loops that wait for the clock, which the fit leaves out, so it had no cost. It is now timed alone (`port/scripts/time-routines.js`) and the menus and the title are timed against the game key by key (`port/test/t-page.js`). The lesson is in `kit/lessons/2026-10-17-castle-master-play.md`.
- `play.md`, "Read what the interrupt writes through one function": the clock's tick, the lightning's countdown and the strength are read through `irqByte`, so the lockstep hands the port every value the game read in a stretch.
- `kit/c64/lockstep.js` takes `hooks`, which it puts on the machine and on the copies it runs ahead on, and those copies keep the machine's ROMs. The game saves and loads through the KERNAL with interrupts on, so the copy needs the KERNAL's interrupt entry and the hooks that stand in for its disk routines; without them it stopped at `$FFF0`. Test: section 1c of `kit/c64/test_lockstep.js`.
- What cost the most time: the menus' pace, after play's was right. Three things had to be found one at a time: the opening step with no cost, a waiting loop priced at nothing that stopped the page's clock (now a floor of 10 cycles a stretch, `port/page/runtime.js`), and stops recorded at the frame shown rather than the frame the program had reached.
- Candidate: a key the game reads once a pass is missed by a test that taps it for less than a pass, as it is on the C64. `test_play.js` holds I until the information screen is up. One game so far.

## Native resolution and smooth motion

The Play tab's two switches, 17 October 2026, as Space Rogue's and Mercenary's.

- What helped most was Space Rogue's own test (`games/c64/space-rogue/test_play.js`): two machines side by side, one with the view watching, and the view held to the port's own drawing at every pass. Its counts showed every problem below, each from the moments rather than from the walk the page's own test can make.
- `play.md` has a section on the switches now ("What was changed in the kit", above). Space Rogue's run left it as a candidate for a maintainer; with a third game it meets the bar for a skill line.
- What cost the most time: views wrong as a whole, from reading the scene at the draw, and the order of a few views, from objects the game had left out. Neither showed in the Wilderness walk the page's test makes from the loader; both showed in the moments.
- Not known: 60 faces of 11,521, each cut by an edge of the view, have a corner up to 35 pixels from the game's. The page cuts where the edge meets the side of the view; why the game's cut lands elsewhere was not traced.

## Earlier runs

### Lesson and correction

An imported analysis seeds a run. The original publishing pass treated inherited descriptions as traced claims and bypassed the required disassembler/snapshot listing route. Review exposed that mistake. This revision boots the recovered disk from a hard reset, reaches WILDERNESS, compares menu and play, loads the symbol map into regenerator 2000 on the disk-boot menu snapshot, exports through `symbols_export.py`, and builds through `listing.py`.

The external text export is private and identified by `game.json.imported`. Its models are unknown. Runtime screen, bitmap, viewport and zero-page backing store are excluded from coverage; the remaining gaps are in `TODO.md`. The interactive article uses the independently checked contracts, and unresolved behavior remains explicit. Loaded artwork is included; only demonstrated runtime outputs and scratch are excluded.

### Follow-up verification

Independent record parsing must follow the consumer, not just a size table: local type-0 allowlists and short type-2 records are different occupants from FCL residuals. Controlled native fixtures also caught a loop-entry qualification in the zero-depth projection shortcut. Both corrections are in `symbols.json`, the canonical listing and `facts.md`; remaining checks are explicit in `TODO.md`.

### Graphics accounting and frame capture

The cold hand-over distinguishes loaded HUD artwork from the generated viewport. Excluding the entire bitmap hid authored data; the replacement declares the bitmap and colour planes and excludes only traced output spans. `coverage.include` overrides exclusions, so a broad include of the screen matrix also restores runtime cells: include only the authored gaps. A no-write frame made beam-phase inference miss a full wrap when start and end raster lines were equal. `frame.py` now unwraps raster samples using elapsed cycles, including multiple wraps between samples. Five regression tests run in CI; a native zero-write frame captures successfully with phase known to a cycle. The coverage skill now explains include precedence and calls for another allocation audit after recovering code.

### Shared tooling

The importer, footprint correction and contained Firefox launcher have moved to [PR #125](https://github.com/gamesexplained/gamesexplained/pull/125), including eight regression tests in CI. The importer writes only symbols and uses the disassembler’s accepted branch-label type. `kit/VERSION` is unchanged; the game’s lesson is under `next` in its lesson file.

### Checks and timing

VICE MCP 3.13.1 passed 55/57 emulator checks on 30 September 2026; `pause-at-instruction` and `unpaced-calls` failed. The documented pause workaround and paced calls are used. The three repository checks and complete site build are run before commits.

`timings.json` retains actual work from the original publishing pass and the correction sessions. Import conversion and article drafting are not claimed as full coverage or verification, and the original outside analysis is not timed here. Imported games are excluded from the site’s runs table by provenance metadata.

### Maintainer asks

The imported-analysis policy in #113 was resolved by #123. The imported models are unknown and the run model is unproven; Silver needs the maintainer check in `kit/CHECKING.md`. Coverage is 52,770/52,770 bytes with no loaded-data audit stretches. The article’s widgets pass browser checks; all 104,448 initialized-display colour-index pixels match. Behavior marked open is not represented as exhaustively verified.

### Recorded step times

| Step | Minutes | Model | Sessions | What dominated |
|---|---:|---|---:|---|
| 10-orient | 11 | gpt-6.1-sol | 2 | Recovered matching snapshot and disk from contributor repository history; reached playable castle view. Switched to publication from the exhaustive listing at contributor request. |
| 50-coverage | 89 | gpt-6.1-sol | 5 | Rebuilt the imported annotations in regenerator 2000 and the canonical listing; corrected coverage scope. Full burn-down remains open. Independent database and SID parsers; 34 native area-loader calls and fourteen projection vertices; one agent; Cold hand-over and HUD footprint audit; exact frame comparison; glyph/instrument fixtures and text layout; one agent; One agent; completed authored-allocation audit and operand aliases, separated demonstrated runtime scratch from tables; 52770/52770 ledger bytes, with semantic open items retained. |
| 60-verify | 12 | gpt-6.1-sol | 2 | Native 652-byte save/restore, disk round trip and 1024-entry colour startup copy; operand/table continuation annotations; one agent. One agent; 17 native SID requests,25 ticks each, exact final-voice roots; sustained audio remains open. |
| 70-minisite | 22 | gpt-6.1-sol | 2 | Interactive article and final copy pass; browser exercised 34 areas/546 objects,14 projections,59 glyphs,8 instruments and save controls; initialized display has zero colour-index pixel differences. |
| 80-retro | 9 | gpt-6.1-sol | 2 | Publication from the existing disassembly; one agent alternated between five contributions. No new full reverse-engineering run. Fixed sparse beam-phase unwrapping; five CI regressions and native zero-write frame pass; documented mixed authored/output plane scope. |
| total | 144 | gpt-6.1-sol | | 2.4 h of work, over 31.8 h |


A correct import-and-verify path, with whole-allocation accounting before article work, would have saved the most time. The clock includes the abandoned first publication pass; its historical notes do not describe completed scope.
