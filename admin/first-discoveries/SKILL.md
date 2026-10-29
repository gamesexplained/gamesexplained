---
name: first-discoveries
description: Search the web for an earlier record of each section on the games' Discoveries tabs, and log the result in a ledger, so the findings nobody published before stand out and no section is looked up twice. Run by hand, e.g. /first-discoveries games/c64/into-the-eagles-nest.
argument-hint: [games/<platform>/<slug> ...]
disable-model-invocation: true
---

# Finding first-time discoveries

This lives in `admin/` because `.claude/skills` is the contributor kit.

Report only. Change no game page; the maintainer decides what to do with
a first.

## Setup

```
python3 admin/first-discoveries/todo.py $ARGUMENTS
```

lists the sections `ledger.md` has no entry for: the link a reader
follows to each, and its heading. With no games named it lists every
game's. Take a game at a time, all of its sections together.

## Looking a game up

1. **Read each section first**, so you search for what a player saw or
   typed (the word, the room, the effect), not for our addresses.
2. **Read the game's own pages once.** `features.md` in the game folder
   names the sources its run read. Search the game with "cheat", "bug",
   "glitch" and "secret", and read what the magazines of the day printed
   (scans on archive.org and the platform's archives), the platform's fan
   sites and wikis, The Cutting Room Floor, GameFAQs, MobyGames' trivia,
   speedrun pages and YouTube. A port to another machine often has its own
   page that says what it kept from the original.
3. **Then search each section** with the game's title and the finding's
   own words, in two or three wordings. A cheat was often printed as a
   POKE, so search the decimal address too (`POKE 24639,1` for `$603F`).
   A cracked release may carry it in its trainer or notes (CSDb, text
   files from the scene).
4. **Weigh what you find.** A record counts when it states the same
   finding and is older than our page. A page that cites ours, or appeared
   after it, does not.

A search that finds nothing says nothing about the world, only about the
searches, so the ledger lists them and a later look can try others.

## The ledger

`ledger.md` holds one bullet per section, under its verdict:

| Verdict | When | The bullet gives |
|---|---|---|
| None found | no earlier record turned up | the searches run |
| Partly known | an earlier record states part of it | the record, linked, and the part it lacks |
| Known | an earlier record states it | the earliest record found, linked and dated |
| Not a finding | the section holds none, such as a list of open questions | nothing more |

Each bullet starts with the game and its platform, the section's heading
linked by the link `todo.py` printed, and the date looked up. A section of
several findings goes under the verdict of its least known one, and its
bullet says which that is. Under None found and Partly known, put what a
player could see or do without tools above what only the code shows.

Commit the ledger and open a pull request titled
`admin: Add <game> to the first-discoveries ledger`.

## Report

The None found and Partly known entries this run added, player-visible
first, each with its link, and how many sections `todo.py` has left.
