# Infocom's source, used for its names

The listing on these pages is read from the game on the disk: the interpreter, and the story it runs, release 15 (serial number UG3AU5), 78,566 bytes of Z-machine code, tables, and text, decoded instruction by instruction and table by table. Every comment says what those bytes do.

Infocom's source for Zork I survives as well, but it is the source of a later release. The [historicalsource/zork1](https://github.com/historicalsource/zork1) repository holds the Zork I directory from Infocom's mainframe as the company left it, in ZIL, the Lisp-like language Infocom wrote its games in, under an MIT licence from Microsoft dated 2025. The story compiled from it, in the same repository, is release 119, serial number 880429, for version 3 of the Z-machine, where release 15 is a version 2 story. The repository's own notes warn that it "could represent years of difference from what was originally released".

So the listing takes only names from the source, and only where the code matches. A routine of release 15 takes the source's name where it is the same routine: it does the same job, for the same verb or object, in the same steps. Where the steps part, in a test left out or a value stored in the wrong place, the name stays and the comment says what release 15 does. Where release 15 has a routine the source does not, or the source's routine in that place does another job, the name is ours. The source writes its names in capitals with hyphens, `PERFORM` or `V-SHAKE`, and ours are in lower case with underscores, `v_again` or `fight_with`. The same rule names the global variables and the objects:

| | In release 15 | Named from the source |
|-|-|-|
| Routines | 359 | 347 |
| Global variables | 138 | 131 |
| Objects | 255 | 246 |

## What release 15 does that the source does not

Most of the differences are bugs that the later source has fixed. Those marked live were seen in play.

| Release 15 | The source |
|-|-|
| A knockout always ends in death. The count of extra rounds after a knockout is lowered through the wrong variable, so it never runs out, and the villain strikes until a blow kills (`DO-FIGHT`, live) | The villain gets one to three more rounds |
| Carrying a container into the Timber Room or the Drafty Room, with nothing big ahead of it in the inventory, makes `NO-OBJS` call itself without end, until the Z-machine's stack is full and the game [stops in the Monitor](discoveries.html#fatal) | `NO-OBJS` adds up what the player carries with `WEIGHT`, which looks inside each container once |
| Any verb used on the skeleton, `examine` included, brings the ghost's curse on the player's treasures (`SKELETON`, live) | Only `take`, `rub`, `move`, `push`, `raise`, `lower`, `attack`, `kick`, and `kiss` |
| Taking the water from an open bottle takes the bottle, without a word (`WATER-F`, live) | "It's in the bottle. Perhaps you should take that instead." |
| Throwing something at the spirits prints "How can you attack a spirit with material objects?" and then throws it (`GHOSTS-F`, live) | Only attacking the spirits gets that line, and anything else done to them gets "You seem unable to interact with these spirits." |
| Holding the garlic does not stop the bat carrying the player off when the player tries to take him (`BAT-F`, live) | "You can't reach him; he's on the ceiling." |
| A disarmed troll's new description is written into the game's text instead of his object, and every "narrow" in the game prints wrong from then on (`TROLL-FCN`, live) | `PUTP`, which sets the description |
| Shaking an open container with something in it hangs the game (`V-SHAKE`, live) | `SHAKE-LOOP` empties the container onto the floor |
| In the loud Loud Room, `save`, `restore`, and `quit` only echo (`LOUD-ROOM-FCN`, `save` and `quit` live) | Each does its job |
| Throwing anything at the bottle prints "The bottle hits the far wall and shatters.", and the bottle stays on the table, whole (`BOTTLE-FUNCTION`, live) | The bottle shatters only when it is the thing thrown |
| The thief takes his stiletto back from the player, invisibly (`THIEF-VS-ADVENTURER`) | The lines are there, commented out |
| Opening the grating from below drops the leaves on the player at every opening, until the leaves are moved from above (`GRATE-FUNCTION`) | The first opening sets `GRATE-REVEALED`, so the leaves fall once |

One bug is in both: the trophy case's sum looks inside the containers in the case and throws away what it finds there (`OTVAL-FROB`), so a treasure left in the sack in the case scores nothing ([the bug on Discoveries](discoveries.html#trophy)).

## What one has and the other lacks

The source understands six words that release 15's dictionary does not have: `kiss`, `say`, `play`, `answer`, `oops`, and `g`, the short form of `again`. Release 15 has `again` as a verb with a routine of its own (`v_again`), where the source's parser handles the word itself. The source's compiler record lists 440 routines, against release 15's 359.

The source's thief carries a large bag, an object of its own, and release 15's has none. Release 15 has objects the source lacks: a wall for each side of a room, from `eastern wall` to `southern wall`, besides the one `wall` both have, and a `nail` in the wooden door.

## Lines that were reworded

| Release 15 | The source |
|-|-|
| "As you pick up the rusty knife, your sword gives a single pulse of blinding blue light." | "As you touch the rusty knife, ..." |
| "You would herniate yourself if you did." (taking the mirror) | "The mirror is many times your size. Give up." |
| "The east wall, previously solid, now has a cyclops-sized hole in it." | "... a cyclops-sized opening in it." |
| "I hope you have more light than from the ..." | "You'd better have more light than from the ..." |
| "A ghost appears in the room and is appalled at your having desecrated the remains of a fellow adventurer." | "... appalled at your desecration of the remains of a fellow adventurer." |
