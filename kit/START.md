# Start here

You are an agent, and a contributor has pointed you at this file. It means
they want to reverse engineer a game they own and publish an explanation of
how it works on this site.

Do these things, in order, and stop to talk to the contributor whenever a
step needs something only they have.

1. **Make sure you are inside a clone of this repository.** If you have
   none yet, `git clone https://github.com/gamesexplained/gamesexplained`
   and continue inside it.
2. **Set this repo's commit email to the contributor's GitHub noreply
   address.** Ask for their GitHub login, then run inside the clone:
   `git config user.email "<login>@users.noreply.github.com"`.
   This keeps their real email out of the public history, and it is what
   the site's "contributed by" credit reads. Do not ask them to commit
   under their real email.
3. **Read `AGENTS.md` completely.** It is the rulebook and the workflow.
   Everything below assumes you have.
4. **Ask the contributor four things** if they have not already told you:
   which game, which platform it is for, where their copy of it is on
   disk, and **which tier they want** (the table is in `AGENTS.md`, with
   rough timings). We never download game binaries; they supply their own.
   The tier they pick is what you work to, without stopping to re-ask.
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

Time expectations: A Silver run can be a few hours of unattended work.

Two rules worth repeating before you start: prefer "unknown" to a
plausible guess, and never commit or upload a game binary.
