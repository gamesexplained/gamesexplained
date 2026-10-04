---
name: 80-retro
description: The last step of every run. Name the skill text that changed what you did, record where the kit fell short, and change in the same branch only what the next run would not catch by itself, so the next contributor starts from a better kit. Complete game.json.
---

# Retrospective: improve the kit

You have just used the kit on a real game. Nobody knows better than you,
right now, where it was wrong, missing or unclear, and which of it
helped. This step turns that into the diff that saves the next
contributor the trouble.

A rule in a skill is read once, at the start of its step, and competes
with every other rule there for attention an hour later. So a lesson goes
where it will be found when it matters: in a script, which speaks up at
that moment; in the notes this run leaves, which the next agent stuck on
the same thing searches; and in a skill when it would otherwise go wrong
unnoticed.

## Do

1. **Name the skill text that changed what you did**, in `kit-feedback.md`
   under "Skill text that changed what I did": up to five passages, the
   one that mattered most first, a line each.

   ```
   - `50-coverage`: "Resolve every pointer table before excluding a region": two tables pointed into the block I was about to exclude, and it held the shape scripts.
   ```

   The skill's folder name; words copied exactly from the passage (its
   heading or the start of the rule, four words or more); then what you
   did, or did not do, because of it. Only text that changed an action
   counts: a check you would not have made, a mistake it stopped.
   Following the steps of the workflow does not. If nothing did, write
   `None.`, which is worth knowing too.
   `python3 kit/scripts/skill_usage.py --game games/<platform>/<slug>`
   checks the lines, and `python3 kit/scripts/skill_usage.py` counts them
   over every game.
2. **List where the kit cost you time or nearly cost you a fact**: a
   skill that misled you, a gap that took more than about fifteen minutes
   to get round, a claim you nearly published wrong, steps in the wrong
   order, tool behaviour that surprised you. Working something out is the
   job, not a gap in the kit: list it when it cost that much, or would
   have gone wrong without your noticing.
3. **Decide where each one goes**, by whether the next agent would notice
   the failure by itself. Take the first that fits.
   - **A script could stop it or catch it.** Change the script on this
     branch, or file the ask (step 5) when it is a maintainer's call. If
     the next run needs words before the script changes, put them in the
     skill as a paragraph or bullet of their own, ending
     `<!-- until #<issue> -->`. When the issue closes, the `stopgaps`
     workflow lists the passage on it for deletion.
   - **The failure shows itself**: an error, a hang, a page that breaks, a
     check that fails, an agent that knows it is stuck. No skill edit.
     Write it in `agent-history.md` and `kit-feedback.md`, where the next
     agent stuck on it searches (`AGENTS.md`, "Search what earlier runs
     wrote").
   - **The failure is silent**: a claim that reads as right and is wrong,
     a coverage figure that is not what it says, a test that passes
     without testing anything. These are what the skills are for. Edit a
     skill when all three hold:
     - You can name another game in `games/` where it would have mattered
       (search their `agent-history.md` and `kit-feedback.md`), or a kind
       of game you can describe in a phrase: every game whose start-up
       moves its data, every game with a split screen. If you can name
       only this one, write it in `kit-feedback.md` under "Candidates":
       the next run that meets it finds it there and makes the edit.
     - No rule covers it already. If one does, sharpen that rule or add
       the case to it rather than writing a second.
     - It goes where the moment comes: in the step where it happens,
       written as when this, do that. Detail that only some games need
       (a Play tab, a protected disk) goes in a file beside the skill,
       which the skill points to for that case, as `workarounds.md` and
       `play.md` are.

   Make the edits to `kit/` on this branch, so they arrive in the same
   pull request as the game and are reviewed together. Keep them general:
   a core skill describes a step of the workflow for every game, a
   platform skill describes the machine, never this one game. A fact
   about this game belongs in its `facts.md`. `check_docs.py` enforces
   the separation.
4. **Write `kit-feedback.md`** in the game folder: what you changed in
   the kit, what cost the most time, anything about your operating system
   or tool versions that the install notes should say, and your asks for
   a maintainer (step 5). List each change in one line: the file and what
   it now says. Where the reason is a lesson (step 6), name the lesson's
   file and stop there: a lesson is written once, in that file. A change
   that teaches nothing of the kind (a script, a path, the site) gives
   its reason here. Under "What cost the most time", one sentence naming
   the single change to the kit that would have saved the most; that
   sentence is usually a lesson, because it changes what the next agent
   does.
5. **Send each ask for a maintainer to the issue tracker.** An ask is a
   change you would make but did not, because it is a maintainer's call:
   a rule to loosen, a bug in a tool upstream, a change to the site, to
   the delivery or to another game. An ask written only into
   `kit-feedback.md` waits there until someone happens to read it, so each
   one becomes an issue on the repository, labelled `kit-ask`: the
   maintainers' one inbox. A limitation the kit already records (the
   platform's `workarounds.md`, its `INSTALL.md` table of tested
   releases) is not an ask: your run met it, and `kit-feedback.md` says
   so.
   - **Title**: the ask, in one line.
   - **Body**: the problem and what it cost this run; what you suggest,
     and where in the kit it would go; the game, the date and the branch;
     and a link to the game's `kit-feedback.md`
     (`https://github.com/gamesexplained/gamesexplained/blob/main/games/<platform>/<slug>/kit-feedback.md`,
     live once the pull request is merged), and
     last, on a line of its own, the marker `<!-- kit-ask -->`.
   - **The label comes from the marker.** GitHub silently drops a label
     asked for by an author without triage access to the repository, so
     `--label kit-ask` alone may leave the issue unlabelled and out of the
     inbox. The marker makes the repository's `kit-ask` workflow
     (`.github/workflows/kit-ask.yml`) add the label for anyone. Pass both.
     A title starting `kit-ask:` works too, where a body cannot be set.
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

   Then list them in `kit-feedback.md` under `## Maintainer asks`, one
   bullet each, `- #123: the ask in one line`. Filing an issue publishes,
   so it takes the contributor's yes, and the one they gave at the start
   to your opening the pull request yourself (`kit/START.md`) covers it.

   **When you cannot file**, because they said no, because a cloud
   session on their fork cannot reach this repository (`kit/START.md`,
   step 1), or because filing is refused, write each ask there in full
   instead, and the repository files it when the pull request merges
   (`.github/workflows/maintainer-asks.yml`):

   ```
   - **<the ask, in one line>.** <the problem and what it cost this run;
     what you suggest, and where in the kit it would go>
   ```

   The bold opening becomes the issue's title and the bullet its body.
   Every bullet in the section takes one of the two forms, and
   `check_docs.py` fails one in neither; prose around them is free. Where
   you can read the issues, search first, as above: an ask another issue
   already holds gets that issue's number, not a second copy. Where you
   cannot, the repository skips an ask whose title an issue already has.
6. **Write to `kit/lessons/` only what the next game will do
   differently.** That folder is the record of what the kit learned about
   reverse engineering, from which game and whom, not of what changed. If
   a lesson from this game changes how an agent reads, traces, measures
   or verifies, write it in plain words in a new file,
   `kit/lessons/<YYYY-MM-DD>-<slug>.md` (today's date, the game folder's
   slug, and `-2` on the end if that name is taken). The file is this
   run's one entry, however many lessons it holds, under one heading that
   names the game and who worked it, as its first line:
   `## next · <date> · <game> · <who>`. Edit no other file there, and
   never `kit/VERSION`: each pull request adds only its own file, so no
   two conflict. `next` becomes the version number when the pull request
   is merged; put `[kit-bump]` in its description. A fix to a script, a
   path, the site or the prose style goes in `kit-feedback.md` and the
   pull request instead.
7. **Complete `game.json`**: tier reached (only if every requirement is
   met; an unattended run stops at Silver, since Gold is human curation;
   a run whose coverage or verify step ran on a model that is not proven
   stops at `bronze`, and `TODO.md` and the pull request say it waits on
   the maintainer's check in `kit/CHECKING.md`), tools and versions,
   with `tools.host` naming the operating system and the processor (the
   status page counts the games made on each kind of computer from it), model (every model the run used,
   and the subagents' model if different), `step_models` (the models that
   ran `50-coverage` and `60-verify`, which `models.py` reads), copy
   provenance, kit version, coverage figure. `credits` is for the game's
   original makers, each as `by` and `role`; never put yourself or your
   model there. The site's contributor list comes from git, humans only.
8. **Update `TODO.md`** with what is missing for the next tier.
9. **If you were the first on your operating system**, the install notes
   are part of your retrospective: run
   `python3 kit/scripts/tools.py --platform <platform> verify-footprint`, contain or list
   whatever it finds, and write your platform's section in
   `kit/INSTALL.md` to the standard of "The footprint principle" there,
   and your system's cell in `site/status.json`.

## Do not

- Put game-specific facts in a skill.
- Loosen a rule because it was inconvenient. Say why it was inconvenient
  in a maintainer ask (step 5) and let a maintainer decide.
- Bump skill versions silently: note each change in `kit-feedback.md`.

## Outputs

Skill and kit edits committed on the branch and included in the pull
request; the run's entry in `kit/lessons/`, if it taught one;
`kit-feedback.md` naming the skill text that changed what you did; each
ask for a maintainer filed as a `kit-ask` issue, or written in full in
`kit-feedback.md` for the repository to file on merge; `game.json`
complete; `TODO.md` current.
