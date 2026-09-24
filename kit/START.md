# Start here

You are an agent, and a contributor has pointed you at this file. It means
they want to reverse engineer a game they own and publish an explanation of
how it works on this site.

Do these things, in order, and stop to talk to the contributor whenever a
step needs something only they have.

1. **Make sure you are inside a clone of this repository.** If you have
   none yet, `git clone https://github.com/gamesexplained/gamesexplained`
   and continue inside it.
2. **Read `AGENTS.md` completely.** It is the rulebook and the workflow.
   Everything below assumes you have.
3. **Ask the contributor six things** if they have not already told you:
   which game, which platform it is for, where their copy of it is on
   disk, **which run they want**, of the two below, **whether you may
   look the game up online**, and **whether you may open the pull request
   yourself when the run is done**. We never download game binaries; they
   supply their own.

   - **Silver** (recommended) aims to explain 100 % of the program and
     builds the minisite. Recent runs took one to three hours, mostly
     unattended.
   - **Bronze** gets the game running, lists its features and sweeps the
     code, then stops. Most of the code is left unexplained for a later
     run to pick up. About 20 to 45 minutes.

   The run they pick is what you work to, without stopping to re-ask.

   **Recommend a yes to the web, strongly**, and say why: knowing what
   the game is actually about before reading its code is what makes the
   results good, and a feature nobody told the run about is the one it
   misreads. Looking it up means reading the game's wiki page, manual and
   reviews, and saving reference screenshots into the game's `reference/`
   folder. One yes covers the whole run. With a no, the game's own
   screens and text are the only documentation, and `features.md` says
   so.

   **The pull request can wait for them or not.** By default the run
   ends with the branch pushed, tells the contributor it is ready, and
   opens the pull request when they say so, so they can look first. If
   they say you may open it yourself, the run ends with the pull request
   open and a link to it. Either answer holds for the whole run; do not
   ask again at the end.

   **Last, make sure the commits will be theirs.** The site credits a
   game to the GitHub accounts that authored its commits, so commits made
   under the agent's identity credit nobody. Ask for their GitHub login
   and the name they want shown, and set both for this repository only,
   never globally:

   ```
   git config user.name "<their name>"
   git config user.email "<login>@users.noreply.github.com"
   ```

   The noreply address keeps their real one private and still links each
   commit to their account. GitHub's email settings page shows it,
   sometimes with a number in front (`<id>+<login>@users.noreply.github.com`);
   either form works. Then prove it with a commit that goes nowhere:

   ```
   git switch -c identity-check
   git commit --allow-empty -m "Identity check"
   git log -1 --format='%an <%ae>'
   git switch -
   git branch -D identity-check
   ```

   The author line must show their name and the noreply address. If the
   commit is refused (some agent environments will not commit under
   another person's name) or shows anyone else, say so now, while it is
   cheap to fix, and agree with the contributor how the commits will be
   authored before the first real one. If they said you may open the pull
   request, check now that you can: `gh auth status` should show their
   login, or your environment should have its own way to open one.

   **The branch is usually yours to name; ask only if it is not.** Where
   you create the branch yourself, call it `game/<platform>/<slug>` as
   `AGENTS.md` says and ask nothing. Some environments, hosted cloud
   sessions among them, start you on a branch they named (`claude/…`)
   and refuse pushes anywhere else without the contributor's say-so. If
   yours does, and the contributor has not already named a branch, ask
   with the questions above whether you may push to
   `game/<platform>/<slug>` instead. On a yes, create it and push it at
   once, before any work is on it, so a refusal shows now and not at the
   end. If the push is refused, stay on the environment's branch and say
   in the pull request why the name differs.
4. **Set up the tools** with `kit/INSTALL.md` for their operating system.
   Tell them plainly what has a recorded run on their platform and what
   has none.
5. **Create the game folder** with `kit/scripts/new_game.py` and copy their
   image into its `work/` directory.
6. **Follow the skills** in the order `AGENTS.md` gives, opening each
   `SKILL.md` as you reach it.
7. **Finish with the retrospective** (`kit/skills/core/80-retro`) and the
   pull request, as `AGENTS.md` says. Nothing goes to `main` directly. If
   the contributor said at the start that you may open it, open it and
   give them the link; otherwise push the branch, tell them it is ready,
   and open it when they say so. If you cannot push or open it (no fork,
   no login), leave the branch where it is and say exactly what is
   missing.

**If the contributor points you at a game folder that already exists**,
the job is not a new run. A Bronze game is continued to Silver: read its
`TODO.md`, pick up the workflow at the step it stopped, and everything
above still applies. A Silver game is curated to Gold, and that is the
contributor's work with your hands: they say what is dull, what deserves
more, and what reads like an agent wrote it; you cut, expand, verify
anything new against the code, and rewrite to `kit/style.md`. When the
first edit pass begins, set `tier` in `game.json` to `silver-claimed`
and `steward` to their GitHub login: the page then says who is editing
it. Set `gold` when every section has had its pass. Set `copy` in
`game.json` honestly, and open the pull request as `AGENTS.md` says. The
two questions about the pull request and the commit identity in step 3
come first in this job too.

Time expectations: A Silver run takes one to three hours, mostly
unattended. A Bronze run takes about 20 to 45 minutes.

Two rules worth repeating before you start: prefer "unknown" to a
plausible guess, and never commit or upload a game binary.
