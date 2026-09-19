# How agents work in this repository

This repository is the source of a site that explains how games actually
work, code first, one folder per game, written by contributors and their
agents. Read this file completely before doing anything else. It is short
on purpose: the detail lives in `kit/`, and you are expected
to open those files when the workflow points at them rather than working
from memory.

## What you are here to do

A contributor has a game they own (a disk image or program file) and wants
a complete, verified, published explanation of how it works. The workflow,
in order:

1. **Set up the tools.** Follow `kit/INSTALL.md`. Confirm the emulator and
   the disassembler answer before going further.
2. **Create the game folder.** `python3 kit/scripts/new_game.py <platform> <slug>`
   creates `games/<platform>/<slug>/` from the template. Copy the
   contributor's image into its `work/` folder; `work/` is gitignored.
3. **Run the skills in this order.** Each is a folder under `kit/skills/` with a
   `SKILL.md`; open the file when you reach that step.

   | Step | Skill | Produces |
   |---|---|---|
   | orient | `kit/skills/core/10-orient` | boots, reaches steady-state play, snapshot, `orientation.md`, disassembler running |
   | features | `kit/skills/core/20-features` | `features.md` and `reference/` before any code is read |
   | text | `kit/skills/core/30-text` | the game's alphabets decoded, when it has a custom charset |
   | sweep | `kit/skills/core/40-sweep` | register census and string sweep |
   | annotate and measure | `kit/skills/core/50-coverage` | the burn-down loop until coverage is where the tier needs it |
   | verify | `kit/skills/core/60-verify` | every fact traced or observed live; `facts.md` |
   | minisite | `kit/skills/core/70-minisite` | `index.html` (How it works), `listing.json` (Source code), optional `levels.html` and `play.html` |
   | retrospective | `kit/skills/core/80-retro` | fixes to the skills, `kit-feedback.md`, `game.json` complete |

   Platform knowledge is in `kit/skills/<platform>/`. For the C64:
   `kit/skills/c64/c64-reference` (facts about the machine — consult it, do not
   recall from training), `kit/skills/c64/tool-vice-mcp` and
   `kit/skills/c64/tool-regen2000` (how to drive the recommended tools).
4. **Export the symbol map** after every annotation session:
   `python3 kit/scripts/symbols_export.py games/<platform>/<slug>`. This
   file, `symbols.json`, is the canonical technical result. Then build the
   listing the Source tab renders from it and your snapshot:
   `python3 kit/scripts/listing.py games/<platform>/<slug> <snapshot.vsf>`.
   Both are committed; the snapshot and disassembler project stay in
   `work/`. Preview the whole minisite with `python3 kit/scripts/build.py`
   and `python3 -m http.server -d _site 8000`.
5. **Check, commit on a branch, open a pull request.** Name the branch
   `game/<platform>/<slug>`. Never commit to `main`, whatever access you
   have: every change to this repository arrives as a pull request, so
   the checks run once more on a clean checkout and a maintainer sees
   what changed before it reaches readers. Before every commit run:

   ```
   python3 kit/scripts/check_binaries.py
   python3 kit/scripts/check_docs.py
   python3 kit/scripts/check_listing.py
   ```

   Push the branch and open the pull request. If you cannot push to this
   repository, push to the contributor's fork and open it from there. If
   there is no remote at all, leave the branch and say so.

## Working on the kit or the site

Not every task is a game. A maintainer's agent may be asked to change
the kit, the skills, the scripts or the site templates. The rules below
apply unchanged, and so does the delivery: branch as `kit/<topic>` or
`site/<topic>`, run the three checks, run `python3 kit/scripts/build.py`
to confirm every existing game still builds, and open a pull request. A
change under `kit/` or `site/` reaches every page on the site, so it gets
the same review a game does, not less. Record what changed in
`kit/CHANGELOG.md`, and bump `kit/VERSION` when the method changes. A new
platform follows `kit/PLATFORMS.md`.

## Rules that are not negotiable

- **Model.** Reverse-engineering work runs on an Opus-class model or
  better. On a weaker model, stop and say so. The failures are silent:
  address arithmetic goes wrong in ways that read as confident.
- **No binaries, ever.** Disk images, program files, cartridge dumps,
  emulator snapshots and disassembler project files that embed the memory
  image are never committed and never uploaded anywhere. `work/` is
  gitignored for this reason. `check_binaries.py` must pass.
- **Prefer "unknown" to a plausible guess.** An admitted gap costs nothing.
  A wrong claim is copied into every downstream document.
- **Distrust your own negative results.** "It isn't there" is a claim about
  your search, not about the game. Before reporting absence, ask what
  encoding, indirection or aliasing could hide it.
- **Verify before publishing.** Anything that reaches a reader rests on
  something checked. When a claim can be tested cheaply, test it.
- **Correct in place.** Reference files (`facts.md`, `features.md`,
  `symbols.json`) state what is true now. The story of how understanding
  developed goes in `agent-history.md`, nowhere else.
- **Consult the platform reference, don't recall it.** Register addresses,
  timing constants and memory maps come from `kit/skills/<platform>/`.
- **Copy is not analysis.** Article text follows `kit/style.md`. Write it
  as a separate, final pass, and declare who wrote it in `game.json`.
- **Record what you used.** `game.json` names the tools, the model and the
  kit version. It is honest and it makes the work reproducible.
- **Leave the cleanest footprint you can.** A contributor is trusting this
  repository with their computer. Everything the kit installs goes under
  the gitignored `tools/` folder, tools are started only through
  `kit/scripts/tools.py` so that their settings, logs and saved state stay
  there too, and uninstalling is deleting the folder. Before installing
  anything, tell the contributor what will be installed, where, how big,
  and the complete list of anything that can end up outside the folder.
  Never change system settings, shell profiles, global package managers or
  anything else outside the repository without asking first and saying
  why. On an operating system nobody has run the kit on yet, matching this
  is part of the job: see "The footprint principle" in `kit/INSTALL.md`.
- **Ask before downloading anything.** Reference screenshots and manuals
  from the web are welcome; confirm with the contributor first.

## Where knowledge lives

| Path | Contents |
|---|---|
| `AGENTS.md` | this file: agent operating rules only |
| `kit/START.md` | what a contributor is told to point their agent at |
| `kit/INSTALL.md` | tools per operating system, how to start and check them |
| `kit/style.md` | house style for minisite copy |
| `kit/scripts/` | shared tooling; every script prints usage with `-h` |
| `kit/<platform>/` | one machine's tools: install notes, launcher, scripting clients |
| `kit/PLATFORMS.md` | what a platform owns, and how to add one |
| `kit/template/` | the game folder, stubbed and commented |
| `kit/skills/core/` | the workflow, platform-independent |
| `kit/skills/<platform>/` | platform facts and tool notes |
| `games/<platform>/<slug>/` | one game: article, symbols, listing, facts, features, orientation, cheats, agent history, reference images, gitignored `work/` |
| `site/` | the shared page templates and `site/lib/` css and js; `kit/scripts/build.py` assembles `_site/` from them |

Nothing about a particular game belongs in `AGENTS.md` or `kit/skills/`.
`check_docs.py` enforces that.

## Definition of done

| Tier | Requires |
|---|---|
| Bronze | boots; `orientation.md` recipe; `features.md` drafted from external documentation; reference screenshots |
| Silver | coverage ≥ 80 % (`coverage.py`); `facts.md`; every feature confirmed or explicitly open; `symbols.json` exported and `listing.json` built from it |
| Gold | 100 % coverage; interactive article; at least one finding beyond the documentation verified live; a human has read the copy |
| Platinum | the listing reassembles byte-for-byte to the analysed image and the build boots |

Stop where you like. Set `tier` in `game.json` to the highest tier every
requirement of which is met, and list what is missing for the next one in
`TODO.md`.

## Subagents

Bounded, mechanical work parallelises well: annotating disjoint address
ranges, sweeping data regions. Judgement does not. When you spawn agents:
force the model explicitly; give each a disjoint address range and say so
in the prompt; give each its own output file; brief them cold with the
facts established so far and the rules above; spot-check one substantive
claim per agent against the source before believing the report.

## Finishing

The last step of every run is `kit/skills/core/80-retro`: where did the skills
fall short, and what is the diff that would have saved the next
contributor the trouble. Make the edits to `kit/` in the same
branch and describe them in `games/<platform>/<slug>/kit-feedback.md`.
That is how the kit improves.
