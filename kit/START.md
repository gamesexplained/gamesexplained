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
3. **Ask the contributor three things** if they have not already told you:
   which game, which platform it is for, and where their copy of it is on
   disk. We never download game binaries; they supply their own.
4. **Set up the tools** with `kit/INSTALL.md` for their operating system.
   Tell them plainly what is known to work and what is untested on their
   platform.
5. **Create the game folder** with `kit/scripts/new_game.py` and copy their
   image into its `work/` directory.
6. **Follow the skills** in the order `AGENTS.md` gives, opening each
   `SKILL.md` as you reach it.
7. **Finish with the retrospective** (`kit/skills/core/80-retro`) and open a
   pull request from the branch, as `AGENTS.md` says. Nothing goes to
   `main` directly. This step needs the contributor's GitHub login in the
   shell, to fork and to open the pull request; ask for it when you get
   here, not before.

Two rules worth repeating before you start: prefer "unknown" to a
plausible guess, and never commit or upload a game binary.
