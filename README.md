# Games Explained

How every game actually works. Code-first explanations of classic games,
one folder per game, built by contributors and their agents.
https://gamesexplained.com

**Contribute a game.** You need a copy of a game you own; we never host
or accept game binaries. Then paste one line into your agent:

```
Clone https://github.com/gamesexplained/gamesexplained and follow kit/START.md.
```

**In a cloud session** (Claude Code on the web and the like), the agent
works on the repository you pick when you start it and can push only
where you can. Fork this repository on GitHub first, start the session
on your fork, and paste the same line. The agent will give you a link to
open the pull request.

If you would rather see what the agent will do before it does it, clone
the repository yourself and read three short files: `kit/START.md` is what
the agent will do, `AGENTS.md` is the rules it works under, and
`kit/INSTALL.md` is what gets installed and where (everything goes inside
the repository folder; deleting it uninstalls). Then open your agent in
the clone and tell it to follow `kit/START.md`.

**Layout**

```
AGENTS.md        rules for agents (CLAUDE.md just points here)
kit/             everything a contributor's agent is given: start here, install, style, scripts, template;
                 skills/ is the workflow (core/ shared, <platform>/ per machine); <platform>/ is one machine's tools
games/           one folder per game under its platform
```

**Licence.** Write-ups, facts and symbol maps: CC BY-SA 4.0. Code, scripts
and skills: MIT, except the vendored Ghidra exporter in
`kit/c64/ghidra_export/`, which is Apache-2.0 (see its `LICENSE` and `NOTICE`). See `LICENSE` and `LICENSE-CONTENT.md`.
