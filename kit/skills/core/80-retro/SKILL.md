---
name: 80-retro
description: The last step of every run. Record where the skills and kit fell short and fix them in the same branch, so the next contributor starts from a better kit. Complete game.json.
---

# Retrospective: improve the kit

Start the clock: `python3 kit/scripts/clock.py start 80-retro --model <your model id> games/<platform>/<slug>`.

You have just used the kit on a real game. Nobody knows better than you,
right now, where it was wrong, missing or unclear. This step turns that
into the diff that saves the next contributor the trouble.

## Do

1. **List every point where a skill misled you, was silent, or you had to
   work something out yourself.** Include platform facts you needed and
   had to derive, tool behaviour that surprised you, and steps in the
   workflow that were in the wrong order.
2. **Make the edits** to `kit/` on the same branch, so
   they arrive in the same pull request as the game and are reviewed
   together. Keep them general: a core skill describes a step of the workflow for every game,
   a platform skill describes the machine, never this one game. If a fact is about
   this game, it belongs in the game's `facts.md`, not in a skill.
   `check_docs.py` enforces the separation.
3. **Write `kit-feedback.md`** in the game folder: what you changed and
   why, what took longest, anything about your operating system or tool
   versions that the install notes should say, and your asks for a
   maintainer (step 4). For "what took longest",
   run `python3 kit/scripts/clock.py stop` and then `clock.py report`, and
   paste the table. Under it, one sentence naming the single change to
   the kit that would have saved the most minutes. A run takes hours, so
   a saved half hour compounds across every game after yours; that
   sentence is usually a changelog entry, because it changes what the
   next agent does. `timings.json` is committed with the game.
4. **Send each ask for a maintainer to the issue tracker.** An ask is a
   change you would make but did not, because it is a maintainer's call:
   a rule to loosen, a bug in a tool upstream, a change to the site, to
   the delivery or to another game. An ask written only into
   `kit-feedback.md` waits there until someone happens to read it, so each
   one becomes an issue on the repository, labelled `kit-ask`: the
   maintainers' one inbox.
   - **Title**: the ask, in one line.
   - **Body**: the problem and what it cost this run; what you suggest,
     and where in the kit it would go; the game, the date and the branch;
     and a link to the game's `kit-feedback.md`
     (`https://github.com/gamesexplained/gamesexplained/blob/main/games/<platform>/<slug>/kit-feedback.md`,
     live once the pull request is merged).
   - **Search first**, open and closed:
     `gh issue list --repo gamesexplained/gamesexplained --label kit-ask --state all --search "<words>"`.
     An ask someone already filed gets a comment with this run's case,
     not a second issue. Without `gh`, list every issue that carries the
     label and read the titles: a search tool is not a listing, and on
     26 September 2026 one found none of the four `kit-ask` issues there
     were.

   ```
   gh issue create --repo gamesexplained/gamesexplained --label kit-ask --title "<the ask>" --body-file <file>
   ```

   Then list them in `kit-feedback.md` under "Maintainer asks", one line
   each with its number. Filing an issue publishes, so it takes the
   contributor's yes, and the one they gave at the start to your opening
   the pull request yourself (`kit/START.md`) covers it. With a no, or
   when this environment cannot reach the GitHub API (some hosted
   sessions' networks refuse it), file nothing: put the asks in the pull
   request's description under the heading **Maintainer asks**, one
   paragraph each, and say in `kit-feedback.md` that they are there.
   Whoever merges the pull request files them.
5. **Add to `kit/CHANGELOG.md` only what the next game will do
   differently.** That file is the record of what the kit learned about
   reverse engineering, from which game and whom, not of what changed. If
   a lesson from this game changes how an agent reads, traces, measures
   or verifies, write it there in plain words, under a heading that names
   the game and who worked it. A fix to a script, a path, the site or the
   prose style goes in `kit-feedback.md` and the pull request instead.
6. **Complete `game.json`**: tier reached (only if every requirement is
   met; an unattended run stops at Silver, since Gold is human curation), tools and versions,
   with `tools.host` naming the operating system and the processor (the
   status page counts the games made on each kind of computer from it), model (every model that appears in
   `timings.json`, and the subagents' model if different), copy
   provenance, kit version, coverage figure. `credits` is for the game's
   original makers, each as `by` and `role`; never put yourself or your
   model there. The site's contributor list comes from git, humans only.
7. **Update `TODO.md`** with what is missing for the next tier.
8. **If you were the first on your operating system**, the install notes
   are part of your retrospective: run
   `python3 kit/scripts/tools.py verify-footprint`, contain or list
   whatever it finds, and write your platform's section in
   `kit/INSTALL.md` to the standard of "The footprint principle" there,
   and your system's cell in `site/status.json`.

## Do not

- Put game-specific facts in a skill.
- Loosen a rule because it was inconvenient. Say why it was inconvenient
  in a maintainer ask (step 4) and let a maintainer decide.
- Bump skill versions silently: note each change in `kit-feedback.md`.

## Outputs

Skill and kit edits committed on the branch and included in the pull
request; `kit-feedback.md` with the timings table; each ask for a
maintainer filed as a `kit-ask` issue, or in the pull request's
description; `timings.json`; `game.json` complete; `TODO.md` current.
