# Aztec Challenge — kit feedback

Written in the retrospective (`kit/skills/core/80-retro`). Which skill text
changed what the run did, what the skills and kit got wrong or left out,
what was changed, what needs a maintainer's decision, what cost the most
time, operating system and tool versions.

## Skill text that changed what I did

- `kit/skills/c64/tool-regen2000`: "add the opcode to `UNDOCUMENTED` with a case in `kit/scripts/test_listing_undocumented.py` instead": the two no-ops at `$7887` ran in play, so I added `$1A` and `$04` to the decoder instead of typing them as bytes.
- `kit/skills/core/50-coverage`: "Before calling 100 %, go through that list and say what each stretch is": the build listed 1.1 KB outside the count; one of them, `$5D00`, turned out to be an unused row of Hopaztec's tiles, now described.
- `kit/skills/core/10-orient`: "Map the disk's files onto memory.": the kit has no tool for a tape's files, so I decoded the TAP's KERNAL blocks with a script and found both files whole in memory.

## What was changed in the kit

- `kit/cpu/m6502.py`: `UNDOCUMENTED` now decodes `$1A` (NOOP, one byte) and `$04` (NOOP zero page, two bytes), which this game runs at `$7887`; `kit/scripts/test_listing_undocumented.py` has a case for them. The Goonies' listing was rebuilt with `listing.py --rebuild --write`: `$04` bytes in its stretch of zeros typed as code at `$2150` now decode as no-ops, which changed one cross-reference list there.

## Candidates

- **A one-byte end of a table left untyped, and nothing said so.** Hopaztec's table of the floor's nine rows (`$5BF8`-`$5C00`) was typed `$5800`-`$5BFF` with the room before it, so its ninth byte, `$C6` at `$5C00`, sat in an untyped gap of eight bytes. Coverage was 100 %, since untyped bytes are not counted, and `listing.py`'s list of uncounted loaded data did not name the gap, though it named a 9-byte one elsewhere. A page that drew the floor from the listing then put the front row at Y 0; the test against the game's own hop checks caught it. A skill or `listing.py` could say: list every untyped gap between two typed data blocks that holds a non-zero byte, however short. Only this game shows it so far.

## Maintainer asks

- **Add a tool that lists and extracts the KERNAL-format files on a TAP image.** The C64 `steps` skill's "media" row names tools for disks (`c1541`, `kit/c64/disk.py`) and cartridges, and `loads.py` for a game running, but nothing reads a tape image's files. On Aztec Challenge (8 November 2026, branch `game/c64/aztec-challenge`) a 70-line decoder in `work/tapdec.py` found both files and their addresses from the pulses in seconds, where the emulator took ten minutes in warp to load them, and it showed the boot program before it ran. A `kit/c64/tap.py` with `list` and `extract` (TAP versions 0 and 1, KERNAL blocks only, checksums checked, each file's first copy), named in the "media" row, would give every tape game the table `10-orient` step 7 asks for at the start.

- **Let test_kit.py run only the tests a branch can affect, and leave the full run to CI.** `AGENTS.md` asks for `python3 kit/scripts/test_kit.py` before any change under `kit/` is committed. On Aztec Challenge (9 November 2026, branch `game/c64/aztec-challenge`) the only kit change was two opcodes in `kit/cpu/m6502.py`, the Python decoder the listing tools use, yet the full run took more than half an hour, most of it in other games' Play-tab lockstep tests, which run on `kit/cpu/cpu6502.js` and cannot be affected by it. Suggested: a `--changed` option that takes the files from `git diff main...`, runs every test that loads one of them (a test's `require` and `import` lines name what it depends on) and every test in a game folder the branch changes, and prints what it left out; and a line in `AGENTS.md` ("Working on the kit or the site", and step 5) saying to run `test_kit.py --changed` before a commit, since CI runs the whole suite on the pull request. The contributor suggests going further: a game run that needs a kit change would carry it as a patch in the game's own folder (for example `games/<platform>/<slug>/kit.patch`), which that game's tools apply and only its tests run against; a maintainer decides whether to take the patch into the general kit, and the full suite runs then, once. This keeps contributors' runs from paying for tests of every other game, and puts a change that touches other games' pages (here, The Goonies' listing) in front of the maintainer, who is the one to judge it.

## What cost the most time

Waiting for the tape: a standard KERNAL load of 28 KB takes about ten minutes even in warp, twice (the first look and the hand-over); a TAP reader in the kit (the ask above) would have given the files and their addresses before the first boot.

## Notes on tools

- WSL2 on Windows 11 (Ubuntu 26.04.1, Linux 6.18, Intel Core i7-3770): `node` is not on the path in a `wsl.exe -e bash -lc` shell; the kit's own is at `tools/node/bin`, and `kit/c64/frame.py compare` fails with "drawing a frame needs a JavaScript runtime" until it is added.
- The Chrome extension was not connected, so the pages were checked with Windows' own Chrome headless (`--screenshot`) through a page in `_site/` that offsets an iframe, as earlier runs on this machine did.
