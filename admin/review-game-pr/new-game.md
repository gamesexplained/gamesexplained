# Checklist: a pull request that adds a game

Work every item (`SKILL.md`, section 2). The pull request numbers say
where each rule came from.

## State

1. **Merges with `main`.** If not, which files conflict, and whether
   each conflict is mechanical.
2. **The checks pass on the merged tree** (`SKILL.md`, section 1). For
   each failure, say whether it is the run's mistake or a rule `main`
   gained after the branch, and which change added it.
3. **No standing block.** A "changes requested" review, the
   maintainer's own above all, keeps the merge button grey. Check each
   ask of every earlier review against the head: done, partly, not done.

## Size and layout

4. **The lines are the usual shape.** In `pr_shape.py`'s areas,
   `symbols.json` is normally 80 to 95 % of a new game's added lines.
   Explain any other area that is large. Compare the folder's size with
   the games on `main` (`du -sh --exclude=work games/*/*/`). (#193, #196)
5. **No audit evidence is committed.** Ledgers, inventories, verdict
   files, audit reports and the scripts that made them stay in `work/`;
   the result of a check is one paragraph in `facts.md`. Code is
   committed only when a page depends on it (a port behind a Play tab,
   a solver), with a README naming the private inputs it needs.
   (kit #201; `kit/skills/core/60-verify`, "What the repository keeps")
6. **Everything outside the template has a reason.** Each entry under
   `pr_shape.py`'s "not in the template's layout" needs a page that
   depends on it, or it goes. `timings.json` went from the kit in #186.
7. **`reference/` holds only what a page shows or loads.** It is
   published as it stands.
8. **No binaries, now or in the branch's history.** `check_binaries.py`
   passes, and nothing under `pr_shape.py`'s history is an image,
   snapshot or project file. Files there that are not binaries only
   mean it must be squash merged. (#115)

## game.json and the tier

9. **Models are recorded, not guessed.** `model` and `step_models` name
   the models exactly as the session named them; `unknown` only when
   the contributor could not tell. `python3 kit/scripts/models.py
   is-proven <id>` for the models that ran `50-coverage` and
   `60-verify`. Work done outside the kit is under `imported`, with its
   makers. (AGENTS.md, "Model")
10. **The tier is honest.** Silver needs 100 % coverage, `facts.md` and
    proven models or a recorded `verification` (`check_docs.py` checks
    the last). A run that stopped after `40-sweep` is Bronze with
    `index.html` cut to the header and what it learned (#115). A run on
    an unproven model builds the whole minisite and stays Bronze until
    checked. `TODO.md` says what the next tier needs, every reason in
    order: coverage below 100 % first, then the maintainer's check for
    an unproven model (`kit/skills/core/80-retro`, step 7).
11. **`coverage_percent` is what `coverage.py` prints** on the merged
    tree, with `main`'s version of the script when the pull request
    changes how coverage counts (item 17). `null` shows as 0 % on the
    page, and nothing in CI compares the two (#227); 100 on a Bronze
    game is wrong (#115).
12. **Every link has its page's title** (#223, `check_docs.py`).
13. **Credits are right.** Names and roles, and everyone `facts.md`
    credits, such as the composer (#227).
14. **`kit_version` and `tools` are filled in, and `copy` is
    `agent-draft`.**

## A game of several loads

15. **It uses `parts/<id>/`.** A game that is more than one load keeps
    each load in its own part (`kit/scripts/parts.py`,
    `kit/skills/core/10-orient`, "A game of several parts"), not a
    layout of its own (#196's `source_images`, #138). `check_listing.py`
    checks the layout. Parts with no analysis keep the game at Bronze,
    and the page says how many are done. (kit #202)
16. **Plans point at parts.** `TODO.md` or `kit-feedback.md` sending
    later loads or game states to RFC #124 or #148 should name
    `parts/` instead. (#132)

## Kit and site changes in a game's pull request

17. **Each file outside the game folder has a reason that belongs in a
    game's pull request.** `AGENTS.md` ("Finishing") tells a run to put
    its kit fixes in its own branch, so these arrive in good faith. Go
    through `pr_shape.py`'s "outside" list and put each change in one
    of three kinds:
    - *A fix the run needed to work on its computer* (a missing
      library, a launcher option, a port). It can stay if it follows
      the footprint principle (everything under `tools/`, nothing
      changed outside the repository), has a test, and the install
      notes give the steps. (#227's `libFLAC`)
    - *A change to the workflow or to a measure* (how coverage counts,
      what a check accepts). It does not belong here. Run the affected
      script for every game with `main`'s version and with the merged
      tree's, and compare: keep a worktree of `main` beside the merged
      one, run `for g in games/*/*/; do echo "== $g"; python3
      kit/scripts/coverage.py "$g"; done` in each over the merged
      tree's games, and `diff` the two outputs. A change that moves
      mostly this game's figure is suspect. Recommend dropping it, or a
      kit pull request of its own.
      (#227's `coverage.extra`: Commando 32.8 to 52.8 %, the others
      barely moved)
    - *Something `main` has since replaced.* Drop it. (#196's
      `source_images`, replaced by `parts/`)
18. **Core skill additions pass the bar.** Each is named in
    `kit-feedback.md` under "What was changed in the kit", with another
    game folder where it would have mattered (`kit/skills/core/80-retro`,
    step 3; `skill_edits.py`, run by `check_docs.py`; 4be5202). When the
    check passes, still read the text: one game's debugging with its
    nouns swapped for general ones ("moving supports" for ladders)
    belongs in the game's `kit/lessons/` file. (#196)
19. **Platform skills hold facts about the machine only**, with no game
    names (`check_docs.py`).
20. **One new lessons file, and no edit to any other.** Its entry
    changes what the next agent does when it opens a game
    (`kit/lessons/README.md`).
21. **Install notes are corrected, not appended to.** In `kit/INSTALL.md`,
    `kit/<platform>/INSTALL.md` and `site/status.json`, a run updates
    the row or section that is there. A new table row only for a build
    on a computer type not yet listed; a new section only for a system
    `site/status.json` marks untested. A repeat measurement with the
    same result changes nothing. (#228)
22. **A workflow change says `[kit-bump]`** in the description and
    leaves `kit/VERSION` alone (AGENTS.md).
23. **Maintainer asks are filed or fileable** (`check_docs.py`), and any
    that need the maintainer's decision are listed in the report.

## Content

24. **Features belong to the game, not the release.** A crack's
    trainer, high-score saver or intro is the cracker's, and the page
    says so. `game.json`'s `build` names the release. (#227: the disk
    high-score save in a high-score-saver crack)
25. **Each feature is confirmed, traced or explicitly open** in
    `features.md` (Silver).
26. **The copy follows `kit/style.md`.** No section heading built as a
    list (#222). No claims about the present. Unknown where unknown.
    The story of corrections only in `agent-history.md`.
27. **The pages load cleanly.** `smoke.js` reports no script errors and
    no missing files. Look at the screenshots (the header, the tabs, no
    template placeholders), and open `title_image`, which only the home
    page's card shows.

## The contributor

28. **First pull request here?** Then the comment welcomes them and
    explains each rule it cites. Otherwise, check whether earlier
    reviews of their work asked for something this run repeats.

## Merging

29. **The title says what changed.** It follows `AGENTS.md`, "Titling
    a pull request"; if not, suggest one for the squash merge.
