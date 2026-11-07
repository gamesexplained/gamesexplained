# Exploring a SCUMM game

What a reader wants from an adventure is not its instructions: it is who
is in it, where it happens, what stands in the way, how it is solved,
and what most players never saw. A SCUMM game's scripts hold all of it,
so every claim on the page can name the script that makes it true, and
the solution can be played in ScummVM from the start to the end screen,
so it is checked rather than copied from a walkthrough. Work through the
steps in order: each uses what the one before found.

`kit/scumm/world.py` gathers what the steps need from every script
(`world.py -h`). Keep what each step finds in the game's `work/` as it
goes, and each claim that reaches a page in `facts.md` with its script.

## Read every word

```
python3 kit/scumm/world.py work/scummvm text > work/text.txt
```

Every line the game can print, with the script that prints it and who
says it. Read it all before anything else: it is the quickest map of the
game there is, and it names the characters, the places, the puzzles'
hints, the deaths and the jokes. A line in a script that nothing seems
to start is not dead on that account ([reference.md](reference.md),
"What the interpreter starts").

## Characters

`world.py actors` lists each actor's names, costumes, rooms and talk
colours, and the script that set each. One actor with several names or
costumes is one character who changes (a disguise, a swap of minds),
and several actors that share a costume can be one crowd. For each
character, say who they are in the game's own words, where they are
met, what they do for or against the player, and the script that brings
them in. The characters the player moves are the values the scripts
give `VAR_EGO`.

## Places

`world.py rooms` lists each room, its objects and the rooms it leads to;
`world.py pseudo` the rooms numbered 128 and up that are one picture
used as several places (a maze, the same airport in several cities).
Map a pseudo room from the entry script that loads it: it picks the
ways out, often from variables. Name each place by the game's words (its
objects, what is said on arriving), never by its number. A way between
two places that the game picks at random, a maze that changes from game
to game, is a rule to explain, with one game's map as the example.

## Puzzles

`world.py objects ROOM` gives each object's verbs and, for each, what
its script tests, what it changes and what it says. A puzzle is a test
that fails (an object's state, its owner, a variable) and the handler
somewhere else that makes it pass: `world.py uses var N` finds every
place a variable is set and read, `uses object N` every place an object
is named. Write each puzzle as what the player wants, what stops them,
and what clears the way, with the scripts. Then order the puzzles by
what each one unlocks: that order is the solution's outline.

Look for `getRandomNr` early. A game that picks codes, tunes or routes at
the start has a rule the page explains, and the values one game picked
are only the example; `show var N COUNT` in an input file records them
in the trace (`scummvm.py -h`).

## The solution, played

Write the solution as an input file for the kit's ScummVM and play it
from the start to the end screen, with `--seed`, and with
`--no-copy-protection` when the game asks for a code printed in its box.
Click things by their numbers (`verb`, `object`, `actor`, `walkto`) and
wait with `until` on the game's own state (an owner, a state, a
variable, the room), not on the clock: the run then stops at the step
that went wrong, and each wait says what the step was for. A way out
that changes on every visit is clicked as `object 572|573|574`, or the
stretch is played a step at a time, reading the room's state from the
trace before writing the next step.

Every step of the published walkthrough names a script that
`strace.py story` shows ran. When the end screen shows, run
`strace.py check` on the whole trace: the listing rests on the decoder
for every place the solution reached. Keep the input and the trace in
`work/`.

A recording rests on the exact points the kit clicks. A change to how
`walkto` or `object` picks its point walks the character another way,
which changes the timing and so every random choice after it, and a
recorded route through a random maze stops matching. After such a
change, play every recording again and fix the steps that drift.

Each way to lose belongs with the solution: the deaths, the game over,
the dead end. Find them from the text (a line that ends the game, a
script that calls `restart`), and name the cause of each.

## Secrets

The secrets are what a player rarely sees: a line for a verb nobody
tries, a joke about another game, the branches of a random choice, what
the fifth wrong code does, a counter that changes what is said after
the third time. Compare what the solution printed (`strace.py story`)
with every line the game has (`work/text.txt`): what the solution never
printed is where to look, and `world.py uses` finds what it takes. A
bug, a line no route reaches or a test that can never hold, is a claim
about every route, so play the route that should reach it before saying
none does.

## Numbers into names

A page made from the scripts fills with numbers: sound 36, tune 95,
costume 12, room 44, `Var[113]`. A reader knows none of them. Name each
by what it is in the game: a sound by the moment that plays it
(`world.py sounds` gives the scripts, the text around them the moment),
a costume by who wears it, a room by its place, a variable by what it
holds. The numbers stay in the Source tab, `symbols.json` and
`facts.md`, where a reader who wants them looks.

## The box

These games were sold with printed things the game expects the player
to have: a manual, a code card for the copy protection, sometimes a
newspaper or a map whose stories are clues. With the contributor's yes
to look the game up (`kit/START.md`), find scans of what came in the
box, and link to them where they are kept. Then tie each piece to the
scripts that use it: which puzzle each story hints at, and what the game
does with the code it asks for.

## On the site

The characters, places, puzzles and the walkthrough go on a tab of
their own, the solution behind a fold the reader opens, so that a
reader who wants to play first is not told the answer. Give the tab its
place in `game.json` `"tabs"` (`kit/skills/core/70-minisite`). The
secrets go on Discoveries, and the names replace the numbers on every
tab the game has.
