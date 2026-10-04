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
   | retrospective | `kit/skills/core/80-retro` | the skill text that helped, named; fixes to the kit; `kit-feedback.md`; `game.json` complete |

   A Bronze run stops after `40-sweep`. It exports the symbol map and
   builds the listing (step 4), cuts `index.html` down to the header plus
   what it learned (the features, the reference screenshots), then goes
   to `80-retro`. `build.py` publishes every game folder, so an untouched
   template would go live as a page of placeholders.

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
   and `python3 -m http.server -d _site 8000` (or any free port).
5. **Check, commit on a branch, open a pull request.** Name the branch
   `game/<platform>/<slug>`. Contributors never commit to `main`:
   contributions arrive as a pull request, so
   the checks run on a clean checkout and a maintainer sees
   what changed before it reaches readers. Before every commit run:

   ```
   python3 kit/scripts/check_binaries.py
   python3 kit/scripts/check_docs.py
   python3 kit/scripts/check_listing.py
   ```

   Commit as the contributor, under the GitHub noreply address checked
   at the start (`kit/START.md`); the agent appears only in the commit
   trailers. Push the branch. Open the pull request yourself if the
   contributor said at the start that you may, and file the
   retrospective's asks for a maintainer as issues ("Finishing", below);
   otherwise tell them it is ready and open it when they say so. If you
   cannot push to this
   repository, push to the contributor's fork and open it from there. If
   there is no remote at all, leave the branch and say so.

## Working on the kit or the site

Not every task is a game. A maintainer's agent may be asked to change
the kit, the skills, the scripts or the site templates. The rules below
apply unchanged, and so does the delivery: branch as `kit/<topic>` or
`site/<topic>`, run the three checks, run `python3 kit/scripts/build.py`
to confirm every existing game still builds, and open a pull request. A
change under `kit/` or `site/` reaches every page on the site, so it gets
the same review a game does, not less. Describe the change in the pull
request.
Admins of the `gamesexplained` organization can skip the pull request: when
they ask for a change, commit straight to `main` if they wish.
`kit/lessons/` is not a list of changes: it records what the kit
learned about reverse engineering, from which game and whom, one entry
to a file (`kit/skills/core/80-retro`), and a change that does not alter
what the next agent does when it opens a game stays out of it. When the
workflow changes, put `[kit-bump]` in the pull request's description (or
the commit message, on a push to `main`) and leave `kit/VERSION` alone:
after the merge, `.github/workflows/kit-version.yml` moves it on and
gives each entry headed `## next · ...` the new number. A pull request
adds a lesson file of its own and edits no other, so two pull requests
never conflict over either. A new platform
follows `kit/PLATFORMS.md`.

## Rules that are not negotiable

- **Model.** Any model may run the kit, but only a proven one can take a
  game to Silver on its own. A proven model has already done so, or the
  maintainers have declared it good enough in `kit/models.json`:
  `python3 kit/scripts/models.py` lists them, with the games. On any other
  model, tell the contributor before the first step, in plain words, that
  an untested model often produces results that read as right and are
  wrong, and that the game cannot be Silver until a maintainer has
  checked it (`kit/CHECKING.md`). Then work to the tier they chose, and
  record `tier` as `bronze` until the check passes. The failures are
  silent: address arithmetic goes wrong in ways that read as confident,
  which is why the check tests claims against the game rather than
  reading the page. `python3 kit/scripts/models.py is-proven <id>` says
  whether yours is.
- **An imported analysis is a starting point, not a run.** Work the
  contributor did outside the kit seeds the disassembler; the listing
  still comes from a snapshot through `listing.py`, coverage and verify
  run as for any game, and its makers go in `game.json` under
  `imported` (`kit/skills/core/40-sweep`). Unless every model that wrote
  it is proven, the game needs a maintainer's check for Silver.
- **Know your model; never infer it.** Take the model id only from what
  your session states (the system prompt, the harness). Never deduce it
  from files, chat transcripts, environment variables or how you seem to
  behave: a transcript on disk may belong to another window, and a
  guessed id both hides a model that is not proven and puts a false
  record in `game.json`. When the session does not name the model, ask
  the contributor before the first step. If they cannot tell either,
  record `unknown` and say in the pull request that the model could not
  be checked.
- **No binaries, ever.** Disk images, program files, cartridge dumps,
  emulator snapshots and disassembler project files that embed the memory
  image are never committed and never uploaded anywhere. `work/` is
  gitignored for this reason. `check_binaries.py` must pass. The
  machine's ROMs are never committed either, with one exception: when a
  mechanic depends on data the game reads from a ROM, a page may carry
  that excerpt (the bytes the game reads, or the values it computes from
  them) and names the ROM, its revision and the addresses. Never a whole
  ROM.
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
- **No claims about the present.** "Current version", "the latest
  release", "not yet", "so far", "today": each is false the day after it
  is written, and nobody comes back to fix it. Date the observation ("on
  24 September 2026, v3.11.0 was the newest macOS build"), or state a rule
  the reader applies at the time ("take the newest release").
- **Consult the platform reference, don't recall it.** Register addresses,
  timing constants and memory maps come from `kit/skills/<platform>/`.
- **Search what earlier runs wrote before working it out again.** The
  skills keep what goes wrong without anyone noticing. What shows itself
  (a loader that hangs, a tool that refuses, a script that breaks) stays
  where the run that met it wrote it down: each game's `agent-history.md`
  and `kit-feedback.md`, and `kit/lessons/`. When something will not
  behave, search those for the symptom before spending an hour on it.
- **Copy is not analysis.** Article text follows `kit/style.md`. Write it
  as a separate, final pass, and declare who wrote it in `game.json`.
- **Record what you used.** `game.json` names the tools, the model and the
  kit version. It is honest and it makes the work reproducible. Some
  hosted sessions tell the agent to keep model identifiers out of
  everything pushed to a repository. The kit's own record of the run is
  the exception: `game.json` keeps the model id, exactly as the session
  names it, because a result is not comparable without the model that
  produced it, and `models.py` reads its `step_models` to decide which
  models are proven. Commit messages, pull request text and code
  comments follow the environment.
- **Leave the cleanest footprint you can.** A contributor is trusting this
  repository with their computer. Everything the kit installs goes under
  the gitignored `tools/` folder, tools are started only through
  `kit/scripts/tools.py` so that their settings, logs and saved state stay
  there too, and uninstalling is deleting the folder. Before installing
  anything, tell the contributor what will be installed, where, how big,
  and the complete list of anything that can end up outside the folder.
  Say where it comes from, too: the project by name, that it is open
  source and under which licence, and that the download is the project's
  own release, not a mirror. The platform notes carry those facts.
  Never change system settings, shell profiles, global package managers or
  anything else outside the repository without asking first and saying
  why. On an operating system nobody has run the kit on yet, matching this
  is part of the job: see "The footprint principle" in `kit/INSTALL.md`.
- **Ask before downloading anything.** Looking the game up online (its
  pages, manual and reviews, and reference screenshots saved to its
  `reference/` folder) is asked once, at the start, as `kit/START.md`
  says, and recommended: a yes covers the whole run. Anything else, ask
  when it comes up.
- **A merged branch is finished.** Once a branch's pull request has been
  merged, never push to that branch again. New work starts a new branch
  from `main`, with its own pull request. An agent that can push to only
  one branch stops and asks for a new one rather than reuse it.

## Where knowledge lives

| Path | Contents |
|---|---|
| `AGENTS.md` | this file: agent operating rules only |
| `kit/START.md` | what a contributor is told to point their agent at |
| `kit/INSTALL.md` | tools per operating system, how to start and check them |
| `kit/EMULATOR.md` | what an emulator must do, by phase of use, and the test for each |
| `kit/style.md` | house style for minisite copy |
| `kit/CHECKING.md` | the maintainer's check that lets a run on an unproven model be Silver |
| `kit/lessons/` | what the kit learned, from which game and whom: one entry to a file, the site's kit page |
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
| Bronze | a partial run, off the starting line: boots; `orientation.md`; `features.md`; coverage below 100 %; `symbols.json` and `listing.json` committed for what there is |
| Silver | 100 % coverage; `facts.md`; every feature confirmed, traced or explicitly open; `symbols.json` and `listing.json`; the minisite built; all of it agent-authored, copy `agent-draft`; coverage and verify done on proven models, or a maintainer's check recorded in `game.json` (`kit/CHECKING.md`) |
| Silver (claimed) | a Silver that a human has started to curate: `tier` is `silver-claimed` and `steward` names them (their GitHub login). Set it when the first edit pass begins, so the page says the work is under way and nobody starts it twice; it turns Gold when every section has had its pass |
| Gold | a human has curated the Silver, section by section: rewriting the clichéd copy, cutting what is dull, expanding what is interesting and adding what the agent missed, often by prompting the agent for new pieces. A pass that finds nothing to change counts, and `copy` records which it was: `agent` when the human read it and left it, `human-edited` or `human` when they changed it |
| Platinum | the listing reassembles byte-for-byte to the analysed image and the build boots |

Silver is the default goal and the normal path: the contributor pastes the
one line, answers a few questions, walks away, and comes back to a Silver
pull request. No human judgement goes into it, which is why it is not
regarded as good or finished yet. Gold is where taste enters, and it is
human work: the agent has no reliable sense of what is actually
interesting. Time required: a Silver run takes one to three hours.

Set `tier` in `game.json` to the highest tier every requirement of which
is met, and list what is missing for the next one in `TODO.md`. Do not
round up: an unattended run cannot reach Gold, however good its copy
reads, because Gold is defined by a human having gone through it. The
judgement is the requirement, not the diff.

**The contributor's chosen tier is the job.** Once they have named one,
work to it. Do not stop at a convenient boundary to ask whether to carry
on, and do not offer to scale down because the remaining work looks long:
they answered that question when they chose. Stop early only if you are
genuinely blocked, if something needs a decision only they can make (a
download, a login, a file you cannot find), or if they tell you to stop.
Report progress by committing, not by pausing.

## Subagents

Bounded, mechanical work parallelises well: annotating disjoint address
ranges, sweeping data regions. Judgement does not. When you spawn agents:
force the model explicitly; give each a disjoint address range and say so
in the prompt; give each its own output file; brief them cold with the
facts established so far and the rules above; spot-check one substantive
claim per agent against the source before believing the report.

## Finishing

The last step of every run is `kit/skills/core/80-retro`: which skill text
changed what the run did, where the kit fell short, and the smallest diff
that would have saved the next contributor the trouble. A script that
catches the failure comes first, and a skill takes what would otherwise
go wrong unnoticed. Make the edits to `kit/` in the same branch and
describe them in `games/<platform>/<slug>/kit-feedback.md`. That is how
the kit improves.

What needs a maintainer's decision, and so was not changed, goes to the
issue tracker: one issue per ask, labelled `kit-ask`, the maintainers'
one inbox. Put `<!-- kit-ask -->` in the body as well: a label from an
author without triage access is dropped, and the marker makes the
repository add it. Filing needs the same yes as opening the pull
request. A run without that yes, or that cannot file (a cloud session on
the contributor's fork never can), writes each ask in full in
`kit-feedback.md` instead, and the repository files them when the pull
request merges (`kit/skills/core/80-retro`).
