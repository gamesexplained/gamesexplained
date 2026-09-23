# Start here

You are an agent, and a contributor has pointed you at this file. It means
they want to reverse engineer a game they own and publish an explanation of
how it works on this site.

Do these things, in order, and stop to talk to the contributor whenever a
step needs something only they have.

1. **Make sure you are inside a clone of this repository.** If you have
   none yet, `git clone https://github.com/gamesexplained/gamesexplained`
   and continue inside it.
2. **If there is any question over what commit email to use, prefer the
   anonymous form** `<login>@users.noreply.github.com`.
3. **Read `AGENTS.md` completely.** It is the rulebook and the workflow.
   Everything below assumes you have.
4. **Ask the contributor five things** if they have not already told you:
   which game, which platform it is for, where their copy of it is on
   disk, **which run they want**, of the two below, and **whether you may
   look the game up online**. We never download game binaries; they
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
5. **Set up the tools** with `kit/INSTALL.md` for their operating system.
   Tell them plainly what is known to work and what is untested on their
   platform.
6. **Create the game folder** with `kit/scripts/new_game.py` and copy their
   image into its `work/` directory.
7. **Follow the skills** in the order `AGENTS.md` gives, opening each
   `SKILL.md` as you reach it.
8. **Finish with the retrospective** (`kit/skills/core/80-retro`) and open a
   pull request from the branch, as `AGENTS.md` says. Nothing goes to
   `main` directly. This step needs the contributor's GitHub login in the
   shell, to fork and to open the pull request; ask for it when you get
   here, not before.

**If the contributor points you at a game folder that already exists**,
the job is not a new run. A Bronze game is continued to Silver: read its
`TODO.md`, pick up the workflow at the step it stopped, and everything
above still applies. A Silver game is curated to Gold, and that is the
contributor's work with your hands: they say what is dull, what deserves
more, and what reads like an agent wrote it; you cut, expand, verify
anything new against the code, and rewrite to `kit/style.md`. Set `copy`
in `game.json` honestly, and open the pull request as `AGENTS.md` says.

Time expectations: A Silver run takes one to three hours, mostly
unattended. A Bronze run takes about 20 to 45 minutes.

Two rules worth repeating before you start: prefer "unknown" to a
plausible guess, and never commit or upload a game binary.
