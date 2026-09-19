# Games Explained

How every game actually works. Code-first explanations of classic games,
one folder per game, built by contributors and their agents.
https://gamesexplained.com

**Contribute a game.** You need a copy of a game you own; we never host
or accept game binaries. Then paste one line into your agent:

```
Clone https://github.com/gamesexplained/gamesexplained and follow kit/START.md.
```

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
and skills: MIT. See `LICENSE` and `LICENSE-CONTENT.md`.
