# Repeating the Wizard audit

These checks compare committed data and the functions actually used by the
article with private copies of the original program. They do not download or publish game binaries. The live disk suite writes only
new disposable private images. Results and limits of the 3 October 2026 pass
are in [audit.md](../audit.md).

## Inputs

Use the supplied PP&S G64 edition identified in [orientation.md](../orientation.md):
SHA-256 `040b0615ab6dc3d741ee7bb85b59352a7c4c1a6fca0276672b9ab71ffa398c81`.
Follow its loader-assist and snapshot instructions. A different edition or
snapshot phase can legitimately fail these edition-specific checks; investigate
the difference rather than changing the expected results to make it pass.

Keep the following files in an ignored private directory, defaulting to
`games/c64/wizard/work/`:

| Private file | Origin |
|---|---|
| `entry.vsf` | VICE snapshot at GAME's `$0819` entry, before initialization, following orientation.md |
| `play-round1.vsf` | Initialized Playground snapshot, following orientation.md |
| `game.prg`, `bldr.prg`, `ml.prg`, `chrw.prg`, `sprw.prg` | GAME, BLDR, M.L., CHRW and SPRW extracted from the supplied disk, retaining each two-byte PRG load address |
| `l00t.prg` through `l39t.prg` | All forty corresponding disk files, also retaining their PRG headers |

Extract the disk's files locally with the emulator/disk tools from the kit.
Do not substitute a generated page dataset for a disk input. The data and
mechanic-widget checks need no ROM file. The accounting check also needs the
local emulator’s BASIC and KERNAL ROMs, as described below. The snapshots and
extracted programs remain private.

## Commands

From the repository root, with Python 3 and Node.js:

```sh
python3 games/c64/wizard/validation/audit_data.py
node games/c64/wizard/validation/audit_mechanics.js
node games/c64/wizard/validation/audit_accounting.js
node games/c64/wizard/validation/audit_score_paths.js
node games/c64/wizard/validation/audit_pickups.js
node games/c64/wizard/validation/audit_actor_motion.js
node games/c64/wizard/validation/audit_movement.js
node games/c64/wizard/validation/audit_room_rules.js
node games/c64/wizard/validation/audit_native_details.js
```

Each accepts a private-directory path as its optional first argument. Do not
run Python with `-O`, which disables assertions. A missing input or failed
comparison exits unsuccessfully; success prints a small JSON result without
game bytes. None of these offline scripts needs a running emulator, browser or server.

`audit_data.py` parses the snapshot's C64MEM module and checks the resident
listing, loaded assets and known loader mutations; all forty saved playfields,
actor slots and selected header fields; both pages' maps and fonts; and all
58 published actor shapes. It also reads all twelve spell names from the
resident table and all 21 behavior names plus twenty default shape/animation/
color triples from BLDR’s packed DATA records, comparing them with the article.
The 9,188 mnemonic/length checks use the kit's
opcode tables, which are also used by the listing generator. They check
consistency, not an independent disassembler's agreement or the meaning of
every annotation.

`audit_mechanics.js` executes original instructions in the kit's CPU harness
and compares them with the scoring, SID-write and Simon Says functions
extracted from `index.html`. It also checks the speed-key predicate, the three
text-entry API setups, and the original object-index scan for all forty rooms.
Expected counts are 80 scoring cases, 60 SID cases, 256 key values, three
text-entry setups, forty level scans and 4,096 Simon cases.

The harness supplies I/O values and hooks selected system calls. It is useful
for arithmetic, dispatch and state changes; it does not emulate the whole
machine or establish that a forced collision can occur during play. These
tests share the kit's CPU implementation and must be paired with emulator
observations. SID-write agreement does not establish analog audio fidelity.

## Accounting and an independent decoder

`audit_accounting.js` executes the original GAME interpreter and bytecode.
It checks 303 prepared cases: account initialization, 150 bonus payouts,
30 account save/restore pairs, 70 turn-selection states, seven milestone
calculations, seven ranking cases, eleven save-gate cases and 27 level choices.
It uses `basic-901226-01.bin` and `kernal-901227-03.bin` from the private
`tools/vice-mcp/share/vice/C64/` installation; its second optional argument
selects another local ROM directory. Do not commit or download ROMs to run it.
The scalar-record reader respects the original integer/float type flag.

Printing is suppressed and the disk call is stubbed only when testing whether
saving is requested. This script does not establish successful physical I/O.
The milestone cases at bases 128 and 167 deliberately force the routine: they
check arithmetic, not whether ordinary Mystery play reaches that milestone.
Real VICE save/reload, account transitions and milestone observations are
recorded separately in `audit.md`.

For a decoder check that does not share the listing generator's opcode table,
restore the canonical entry snapshot in this clone's running VICE, pause it,
and run:

```sh
python3 games/c64/wizard/validation/audit_vice_listing.py
```

It verifies the entire listed image before asking VICE to disassemble all
9,188 native instructions in 117 batches. It checks bytes, instruction
boundaries and mnemonics; it neither writes memory nor resumes execution.
The bytecode side comments and the meaning of routine labels are outside this
check. VICE decoder agreement is independent of the kit's opcode table, but
it is still a tool result collected by this analysis's author.

## Ranking attribution and error paths

`audit_score_paths.js` adds thirty original-code cases: eight attribution cases,
twelve score-save retry outcomes, six level-load/wait cases and four checks of
the native saver’s use of transfer status. It uses the same private snapshot
and ROM inputs as `audit_accounting.js`; both share `compiled_harness.js`.
The existing 303 accounting cases still run separately.

The ranking tests execute both numeric insertion and player attribution. They
supply name/initial fields at the input routines, then check which player owns
each rank and whether saving is requested. Cases include tied champions, tied
last place, six equal players, mixed scores and nonqualifying controls. Live
keyboard entry and actual files from three such scenarios are separate evidence.

Save/load control tests supply return statuses rather than perform physical
I/O. They cover recovery, exhausted retries, no-FIRE waiting and the different
success values used by LOAD and SAVE. The native-saver cases run `$8B1E`, with
KERNAL transport, disk commands and the delay hooked: the original code chooses
READST over SAVE’s accumulator/carry. A level-error test observes 10,000 polls
with a constant counter, then supplies FIRE as a positive exit control. The
bytecode back edge explains the non-expiring wait; the test count is not used
to infer an unlimited duration by itself.

## Other evidence and independent review

### Portable pickup, motion and semantic checks

The five added offline checks use `engine_harness.js`, whose setup reads the
private snapshot, CHRW and forty original level files. It checks each PRG's
load address and size. It does not initialize the machine from published maps
or fonts. Run `audit_data.py` as well to check edition identity and the entire
resident image. These are controlled routine fixtures, with interrupts, other
actors and elapsed time omitted unless a test explicitly supplies them.

- `audit_pickups.js`: all forty baselines, 606 selectable pickups and 700
  published states, using the atlas's actual reconstruction function. Checks
  screen/font/color data, actor positions/types/colors, header changes,
  expansion and death. Fixed random bytes are `$12`; Simon starts after its
  independently observed automatic pearl. This does not prove routes.
- `audit_actor_motion.js`: all 960 states of the four published actor traces,
  including raw-RAM sprite images. Target shifts, phase and random values
  follow the stated prepared demonstration; other actors and IRQs are omitted.
- `audit_movement.js`: 25 synthetic-terrain scenes and 494 controller states;
  84 protection and 48 contact cases; 33 published protection display states,
  99 safe passes, 32 protected reports and subsequent death. Needs the same
  private BASIC/KERNAL ROMs as accounting; its second optional argument is the
  ROM directory. The default demonstration-input override is disabled. The full
  death animation's 264 subsequent VICE samples are **not replayed** by this
  check; only its initial and fatal-update controller states are checked.
- `audit_room_rules.js`: forty callback entries, 608 indexed saved treasure
  cells through each of the two actual callers, and 1,931 prepared callback
  cases. The callback body is hooked only for the caller-contract tests; its
  behavior runs in the separate cases. Simon's exhaustive acceptance check
  remains in `audit_mechanics.js`. See [semantic-audit.md](../semantic-audit.md).
- `audit_native_details.js`: display/SID setup and all 256 inputs to packed-note
  adjustment. The key-sound delay and renderer continuation are omitted.

`player_harness.js` shares movement setup and runs the original compiled spell
instructions with the private ROMs. None of these offline scripts writes files,
generates replacement expectations or imports a module from `work/`.

### Repeatable live checks

With this clone's qualified VICE paused and no existing checkpoints:

```sh
python3 games/c64/wizard/validation/audit_live_rooms.py
```

Its optional first argument selects the private-input directory. The kit uses
`KIT_VICE_PORT` or `tools/vice-port`; for this run the isolated instance is on
6511, so the command was prefixed with `KIT_VICE_PORT=6511`. Verify that the
selected instance belongs to this checkout before running it.

The script invokes the committed `live_room_fixtures.js`, then compares five
prepared pickup cases and a filled-screen Madhouse boundary case in VICE. Three additional room controls check For Your Ice Only at early/later indices
and with an exhausted counter. It also runs display/SID setup and four packed-note controls: sixteen cases total.
It writes fixture JSON containing **private game memory** and a small results
file only to the selected private directory. Keep that directory ignored; do
not publish the fixture JSON. No ROMs are needed for these native-code probes.

The test saves and restores the paused emulator state, refuses existing
checkpoints, checks execution state and return PC, suppresses IRQs, and uses a
scratch call trampoline. It executes no game disk I/O. These prepared routines
do not establish physical sprite collisions or full gameplay routes. Snapshot
import and backup files stay in the kit's ignored tool storage. It does not
replay the full death animation or regenerate the article's artwork.

The broader audit also reran the session's private emulator and browser
fixtures. Their commands and limits are recorded in [audit.md](../audit.md);
older scripts and binary-dependent captures not replaced by the portable checks
above are not a portable checkout test suite. A reviewer can repeat the public checks above using their own inputs,
then choose fresh claims to test in the emulator.

### Resident source-comment sample

[The sixty-comment review](semantic-review-20261004.md) and its
[JSON evidence record](semantic-review-20261004.json) preserve the exact
baseline comments, fixed-seed selection method, per-address evidence,
scope qualifications and input hashes. They contain no private game files.
All sixty verdicts are complete: 56 supported, four incorrect, zero unresolved
against baseline `a2c3192`. The four revised descriptions in `50dbcec` have
targeted rechecks; these are not a second independent random sample. The sample
covers eligible resident comments at `$5800–$9FFF`, not the whole listing.

The repository checks remain necessary:

```sh
python3 kit/scripts/check_binaries.py
python3 kit/scripts/check_docs.py
python3 kit/scripts/check_listing.py
python3 kit/scripts/build.py
```

They check packaging and structure, not factual truth. For independent review,
follow [kit/CHECKING.md](../../../../kit/CHECKING.md): reviewer-selected facts,
named routines/tables and orientation claims, traced and observed live. The
author's own passing test list is not a substitute for that sample.


## Shared interpreter, GAME and construction source

The 4 October compiler/overlay reports and their frozen samples are indexed in
[compiled-disk-audit.md](../compiled-disk-audit.md). Run the original-instruction
probes with the same optional private-directory and ROM-directory arguments:

```sh
node games/c64/wizard/validation/audit_interpreter.js
node games/c64/wizard/validation/audit_game_script.js
node games/c64/wizard/validation/audit_editor_script.js
```

The interpreter validator needs `entry.vsf`, `game.prg`, and `bldr.prg`; GAME
also needs `play-round1.vsf`; the editor needs `editor-menu.vsf` and `bldr.prg`.
Create `editor-menu.vsf` after choosing Construction, pressing FIRE at its title,
and loading screen 0 to reach the main editor menu, as recorded in `facts.md`.
Use the same private BASIC/KERNAL ROM files listed above. The editor harness
restores original BLDR runtime bytes over initialized RAM before each probe.
The validators write no files and require no emulator. They preserve the
original selection/report evidence rather than resampling it.

The interpreter suite has 22 groups and 66,810 prepared cases (65,536 exhaust
signed integer values). GAME has fifteen groups. BLDR covers all 256 input
characters, eight complete numeric inputs, 230 initialized DATA destinations,
seven portal occupancy and seven full-placement controls, six shapes,
26 erasure glyphs, ten cursor cases, 76 numeric bounds, all 256 load/save status
values, five callbacks, and title/save-reset controls. Neither the number of
cases nor decoder agreement proves every source claim.

## Live compiled-code and disk checks

Point `KIT_VICE_PORT` at this clone's qualified VICE instance; do not use another
project's emulator. Both scripts require it to be paused with no checkpoints.
They save the machine/disks and warp setting, then restore them even when a
check fails. Scratch trampolines and prepared data are written, but original
game instructions are unchanged. Run these serially, not alongside other
emulator work. Do not use Python `-O`.

```sh
KIT_VICE_PORT=6511 python3 games/c64/wizard/validation/audit_live_compiled.py
KIT_VICE_PORT=6511 python3 games/c64/wizard/validation/audit_disk_failures.py
```

`audit_live_compiled.py [private-dir]` needs `play-round1.vsf` and
`editor-menu.vsf`. Twenty cases cover portal placement and numeric filtering,
GAME glyph restoration and IRQ setup, a Slow boundary, checked-fetch dispatch,
and BASIC NEW. Results go only to `live-compiled-audit-result.json` in the
private directory.

`audit_disk_failures.py [private-dir] --original PATH --c1541 PATH` needs
`play-round1.vsf`, the supplied original G64 for a before/after hash check,
and the kit's installed `c1541`. Defaults find `wizard.g64` beside the checkout
and `c1541` under `tools/vice-mcp/bin/`. The original is never attached or written.
The script creates/replaces its own `disk-audit-*.d64`/`.prg` fixtures in the
private directory. Full fixtures have zero free data blocks and checked sector
chains; protected fixtures are read-only while attached. Successful score files
are separately extracted and compared with all 128 prepared bytes.

Five SAVE conditions cover writable/full/protected disks with and without SCOR.
Two failure conditions are then retried to three-SAVE exhaustion, and a missing
level is retried to four-LOAD exhaustion. The external DOS-channel diagnostic
runs after the game's decision and starts by clearing selected KERNAL channels;
it is evidence about the drive, not an action the game performs. Results go to
`disk-failures-result.json` in the private directory. The eight-case report dated
4 October is retained in `disk-failures-20261004.json`. DOS codes are bounded to
this emulator/edition/fixture, and successful-fourth-LOAD handling remains a
controlled-code test.
