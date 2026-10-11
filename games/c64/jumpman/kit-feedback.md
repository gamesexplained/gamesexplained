# Jumpman: kit feedback

Run: 2–4 October 2026, JankFoundry, GPT-6 Astra Extra High (`gpt-6-astra`). Silver, claimed by jankfoundry for curation; human copy editing has begun. After reviewing the pushed candidate, the contributor approved submission on 4 October 2026. Original analysis used kit 0.0.54; the submission integrates upstream kit 0.0.102. `agent-history.md` retains the investigations and corrections; detailed working reports are private under `work/reports/`.

## Skill text that changed what I did

- `70-minisite`: "Draw from the memory the game draws from.": the atlas uses native initialized level captures; disk drawing data alone does not include every private initialization change.
- `70-minisite`: "Sweep the whole input space, not a few plausible values.": exhaustive Randomizer inputs found three nonzero seeds missed by the earlier sample; the page now handles all four zero-state traps.
- `60-verify`: "A live test in one room tests one room.": the evidence distinguishes selected-level ordinary-input interactions, controlled setups and complete campaign routes, including in the submission description.

## What was changed in the kit

- `games/c64/jumpman/parts/`: uses upstream's standard multiload format, with one resident/startup part and 32 level parts over it. Each part holds its ledger, listing and facts. The custom source-image module and tests are removed; coverage, listing checks and site building use upstream's implementations. Address links select `source-<id>.html`; `data-part` gives dynamic atlas addresses the selected level's scope.
- `site/source.html`, `site/lib/site.css`: an explicit `#facts` link opens the technical-reference disclosure below the fixed tabs, so existing evidence captions reach their explanation directly.
- `kit/scripts/listing.py`, `test_listing_snapshot.py`: an explicit entry snapshot may be the same file as the listing snapshot, allowing a stopped loader capture without inventing an entry image. CLI tests cover that case and refusal of a missing explicit snapshot. Upstream's decoding, snapshot provenance and rebuild checks are retained.
- `kit/c64/ports.py`, `tools.py`, `vice.py`, `r2000.py`: launcher and clients share environment, saved-file, legacy JSON and default port resolution; invalid or colliding settings fail explicitly. This permits separate active checkouts without connecting to the wrong session.
- `kit/c64/stdio_bridge.py`: upstream's alternate-port bridge retains snapshot module-boundary checks, unique converted projects, notification handling, serialized reply matching, and refusal after a timeout or broken stream. The older duplicate bridge is removed. Occupied ports fail before spawning the backend.
- `kit/c64/tools.py`, `test_tool_isolation.py`: retain actual process-argument/source checks and clone-scoped stop patterns while using upstream's shared launcher and XDG containment. Tests exercise paths with spaces and shell metacharacters, process ownership, ports and snapshot boundaries.
- `kit/c64/vice.py`, `test_vice_client.py`: a frame request rejects a failed, partial or malformed completion; an RPC reply alone is not evidence that game time advanced.
- `kit/c64/test_tool_isolation.py`, `kit/c64/test_vice_client.py`: upstream's unified test runner discovers these checks automatically. CI uses the upstream workflow without a separate game-specific test step.
- `kit/lessons/2026-10-04-jumpman.md`: holds the worked Jumpman cases; the core skills match upstream, with possible shared rules left under Candidates until another game establishes the need.
- `kit/skills/c64/tool-vice-mcp`: see `kit/lessons/2026-10-04-jumpman.md`, "A requested frame count is not elapsed time."
- `kit/c64/INSTALL.md`: documents consolidated port precedence and the contained Linux tool launch; upstream's single row per build/host and XDG footprint notes are retained. `game.json.step_models` records coverage and verification provenance.

- `games/c64/jumpman/orientation.md`, `features.md`: present the disk hash in a scrollable code block and split private directory/filename references so the About tab fits mobile screens without shortening the evidence.
- `games/c64/jumpman/game.json`: external references use upstream's titled-link format, with the linked pages' own titles checked on 7 October 2026 and their original URLs retained.

## Candidates

These are possible additions to shared guidance, pending a second game's evidence and a check that existing advice does not already cover it. The worked cases are recorded once in `kit/lessons/2026-10-04-jumpman.md`.

- Check the final paraphrase against initialization, reset, last-life branches and the measured clock.
- Recheck comments when the listing's source image changes; verify exact callback entries and replacements.
- Distinguish drawing-record fields from pixels, and test erasers against a filled background.
- Include retained probes and pose masks in collision checks before interpreting a lookup anomaly as a route failure.
- Derive table boundaries from the consumer's sentinel and index behavior, separately from completion counts.
- Verify callback order, private dividers, history sample age and every producer/consumer assumption behind a queue bound.
- Distinguish writable-register readback models with native CPU probes before trusting a port's comparisons.

## What cost the most time

Inventorying every independently loaded image before assigning annotation ranges would have avoided the largest recovery: reconstructing separate native projects, ledgers and evidence for 32 programs sharing one address range (see `kit/lessons/2026-10-04-jumpman.md`).

## Validation and host behavior

VICE-MCP v3.13.2 Linux x86_64 GUI release runs under the existing Xvfb in a Codex desktop session without an X display. regenerator2000 0.9.20 was reused from an existing installation and copied into `tools/cargo/bin/`; existing Chromium and Playwright were also reused. For upstream CI compatibility checks, the contributor approved SkoolKit 10.1 from its own PyPI release (GPLv3); its virtual environment occupies 40 MB under ignored `tools/skoolkit/`, including Python packaging tools. Download, cache and temporary paths were confined to `tools/`. No Rust or system package installation was needed. Raw disk files, snapshots, projects, traces and scratch tests remain gitignored.

The original capability suite passed 56 of 57 checks: only its host warp speed comparison failed (46 versus 45 loop passes/second). Upstream has since changed those host-speed measurements to information rather than capability failures (issues #176/#178, commit `cdd6381`), so this is no longer an unresolved ask. Instruction stopping, frame advance and determinism passed in that run; gameplay measurements use frames/cycles rather than host elapsed time.

Original-code, native and browser evidence is summarized in `facts.md`; the detailed reports and scratch scripts are private working records. It includes exact included-byte checks, all initial level renderings, bomb changes, robot decisions, exhaustive score/maze/Randomizer inputs, ordinary Dragon Slayer completion, Gunfighter hit/no-fire control, puzzle transformation/death completion, score save/reboot and bounded anomaly checks. Corrections are recorded rather than hidden. The audio model still approximates bus decay and within-frame write timing; selected-level routes do not establish a full legal campaign.

The migration follows the maintainer's request to use the parts support introduced in #202. Official ownership removes 320 bytes in the startup sprite slots from the resident ledger; their provenance and limits remain documented. The 90,263 retained bytes, 9,498 instruction boundaries, retained labels/comments and widget logic/data match the pre-migration candidate. Listings are regenerated from the saved native snapshots; their references into the resident engine now use its symbols. All 32 level captures have the same 244 expected resident-code differences from the original startup state, explained in the orientation. Detailed working reports stay private. These are self-checks, not independent certification.

The 6 October integration passed all 39 discovered/self-test commands with tools required and no skips; all 74 Python modules imported. All 28 games reproduced coverage and built, producing 250 pages. Binary, documentation, listing and skill-quotation checks passed; all 33 listings regenerated identically from the saved snapshots.

The 7 October review revision integrates kit 0.0.102 and leaves every core skill identical to upstream. All 48 kit test commands pass with tools required and no skips, all 85 Python modules import, all 128 listings pass, and all 29 games reproduce coverage. The build produces 254 pages. Binary, documentation and skill-quotation checks pass. All 66 Jumpman symbol/listing files, every part ledger and fact, and the article/atlas remain unchanged. Browser checks pass for all 33 source pages, 32 shared-engine links and layer toggles, 96 atlas links, facts and missing-address navigation, reference titles, desktop/mobile layouts and the main interactive controls, with no script or local HTTP errors. Temporary browser/server processes are stopped; the emulator and disassembler were not needed. No new game interpretation, native gameplay replay or independent review is claimed.

## Maintainer asks

The contributor approved publication on 4 October 2026. Open and closed kit asks were searched before filing; the issue carries the `kit-ask` label and marker.

- #194: Consider shared SID bus-read verification: a timing/readback contract for the shared synth and a recorded hardware comparison fixture, building on this run's native probes and explicit last-write/no-decay approximation.
