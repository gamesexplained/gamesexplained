---
name: first-discoveries
description: Search the web for an earlier record of each section on the games' Discoveries tabs, and record the result with the game, so the findings nobody published before stand out and no section is looked up twice. Run by hand, e.g. /first-discoveries games/c64/into-the-eagles-nest.
argument-hint: [games/<platform>/<slug> ...]
disable-model-invocation: true
---

# Finding first-time discoveries

This lives in `admin/` because `.claude/skills` is the contributor kit.

Leave the game's pages as they are; the maintainer decides what to do
with a first.

## Setup

```
python3 admin/first-discoveries/todo.py $ARGUMENTS
```

lists the sections that their game's `facts.md` has no entry for yet:
the link a reader follows to each, and its heading. With no games named it lists
every game's. Take a game at a time, all of its sections together.

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
searches, so the entry lists them and a later look can try others.

## The record

Each game's `facts.md` ends with a section `## Known before`, one bullet
per Discoveries section in page order. A bullet starts with its verdict
in bold, then the section's heading linked by the link `todo.py` printed,
and the date looked up:

| Verdict | When | The bullet goes on to give |
|---|---|---|
| None found | no earlier record turned up | the searches run |
| Partly known | an earlier record states part of it | the record, linked, and the part it lacks |
| Known | an earlier record states it | the earliest record found, linked and dated |
| Not a finding | the section holds none, such as a list of open questions | nothing more |

A section of several findings takes the verdict of its least known one,
and its bullet says which that is. `todo.py --firsts` gathers the None
found and Partly known bullets of every game.

Commit and open a pull request titled `<game> (<platform>): Record which
discoveries were known before`, or `games:` and the list for several.

## Report

The None found and Partly known entries this run added, player-visible
first, each with its link, and how many sections `todo.py` has left.
