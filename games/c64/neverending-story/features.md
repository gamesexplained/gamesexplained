# The NeverEnding Story — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly), **differs** (the code does something else).
"Absent" is not a status.

Sources:

- Ocean's cassette instructions for the game, as transcribed for the
  Amstrad CPC release, https://ftp.nvg.ntnu.no/pub/cpc/ADATE/docs/instruct/neverending-story-cassette.txt,
  read 17 October 2026 (the C64 copy's own instructions were not found;
  the Lemon64 manual page refused the download). Kept privately as
  `work/research/ocean-cassette-instructions.txt`.
- Hints and solutions at the Classic Adventures Solution Archive,
  https://solutionarchive.com, read 17 October 2026 (`work/research/`).

## Features

| Feature | Status | Where |
|---|---|---|
| Three parts, played in order, each loaded when the one before is finished | live | `ACTION_NEXT_PART` $0FF1, `SWITCH_TO_NEXT_PART` $0415; played through both hand-overs (`facts.md`, "Live tests") |
| Objects carried at the end of a part are kept for the next | live | the object locations at $28BF are the engine's and no load touches them; live, Part 2's route starts by dropping the horn and the stone brought from Part 1 |
| Up to five objects carried | traced | TAKE refuses a sixth when counter 0 is 5 ($0F22, sentence $0B "You've got a full load already!"); not tried live |
| Every object has an icon, shown at the top right while carried | live | `RENDER_ROOM_GRAPHICS` $0570, icon records at $2943, icons at $A560; seen with Part 2's first room. Not every object: the crucifix (object 40) has no slot in the map of icon slots to objects at $22A4, and Falkor's and Artax's icons are shown by the scripts' action $17, which names a slot |
| A companion, Falkor or Artax, shown at the bottom of the icons | live | the sixth icon record, set by the scripts (`SCRIPT_SET_OBJECT_GRAPHIC` $113D, icons 23 and 24) |
| Pictures for locations and events at the top left | live | 57 picture records at $0BF9; rooms take theirs from $0D4F, events through action $10; every route screenshot |
| Commands need a verb; some take a noun | confirmed | `RESOLVE_VERB_NOUN` $1396: ids below $32 are verbs; a line with none prints sentence $01, "There is no verb in that sentence." |
| An unknown word is named back to the player | confirmed | $12F6 prints "I don't understand the word" and the word in quotes |
| Sentences joined with AND | traced | the stem "and" is id $FF, which runs the command so far and scans on ($13DC, $13F9) |
| Only the first three letters of a word count | confirmed | `VOCAB_LOOKUP` $12C4 compares three letters; NORTHEAST and the like are told apart by letters 4-6 ($1335) |
| GO before a direction makes no difference | confirmed | the stem "go" is id 0, which the parser skips ($13A8) |
| The 39 verbs the instructions list | confirmed | every one is a stem in the vocabulary at $1A2E, with QUIT, PUT, GIVE, KILL, PUNCH, STAB, KICK, SHOUT, WAIT and PAUSE besides |
| Time passes if the player waits too long, and what was typed is carried out | live | `IDLE_COUNTDOWN` $60-$62, "You wait!" at $08C4; 1,591 frames from the prompt with no key |
| WAIT lets time pass | confirmed | verb $1F prints "You wait!" (rule 50, $2D41), and the turn scripts run as after any command |
| PAUSE stops time | traced | verb $20 runs action $1A: "Paused - hit space to continue!" and a wait for Space ($117A), outside the line editor whose count is the game's only clock |
| SAVE and LOAD a game to tape | differs | the actions jump to one-byte returns ($1189, $118C), so neither does anything; the save and load code is still there, unreached ($0494, $0461), and names device 1, the cassette |
| Restore a saved game at the start (Y or N) | differs | `ASK_RESTORE_GAME` $14D9 asks it, but `INIT_GAME` $14D6 jumps over it and nothing else calls it |
| QUIT ends the game | confirmed | "Are you sure?", and Y restarts ($0FCC); live in Part 2 |
| Credits page with the theme tune; Space enters the game | differs | any key leaves it, not only Space (`WAIT_FOR_KEY` $0552, called at $15C4); the tune is Martin Galway's, `MUSIC_INIT` $96DA |
| A short introduction after Part 1 loads | live | each part's start script prints its events and pictures and pauses for Space ($2968, $296E, $297E) |
| Gmork chases Atreyu: "don't dawdle" | confirmed | counter 3 in Part 1 (`parts/part-1/facts.md`) |
| Falkor helps only the bearer of Auryn | confirmed | GET FALKOR ($2B6C) needs Auryn carried, else sentence $42, "Falkor will only help the bearer of Auryn !" |
| Morla in the Swamps of Sadness; Engywook and Urgl in the Southern Lands; Rockbiter, Teenyweeny and Nighthob on their way to the Ivory Tower | live | Part 1's rooms and scripts (`parts/part-1/facts.md`); Rockbiter is in the first room |
| The Empress at the top of the Ivory Tower | live | Part 3's last room, $7C (`parts/part-3/facts.md`) |

## Beyond the documentation

- Two verbs, with the stems "mus" and "nom", run actions $0B and $0C,
  which are empty, then print "Ok!" ($2B25, $2B29). The stems "t" and
  "tes" run action $0F, which does nothing at all ($2B2D). The stem
  "..." is verb $11, which no rule names.
- The parser counts NORTHEAST, NORTHWEST, SOUTHEAST and SOUTHWEST as one
  word each, by testing letters 4-6 ($1335, $1360).
- A crucifix icon and a picture no room or event shows (`parts/engine/facts.md`,
  "Code and data nothing reaches").
- The crack in this copy keeps Ocean's loading picture, shown before the
  game starts (`orientation.md`).
- In this copy a restart after Part 2 has loaded, by a death, QUIT and Y
  or the win, loads the next file by name instead of Part 1, and the game
  cannot be played from there (`facts.md`, "Restart"; live).
- "N E", the way the instructions write north-east, is two words, and the
  parser takes only the first direction as the verb and the second as
  its noun, a pair no rule matches: "You can't do that." (live).
- Objects 2 and 50, the two trees, have nouns ($34 and $64) that the
  word TREE never reaches, because an earlier TRE in the vocabulary
  gives $CB first (`VOCAB_LOOKUP` $12C4; live in rooms $11 and $23).

## Open questions

- What the verbs "mus", "nom" and "t" did in the version they were
  written for. Nothing in this copy says.
