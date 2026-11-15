# Fantasy World Dizzy — features

## Sources

Read on 14 November 2026:

- [The Codemasters Archive](https://thecodemastersarchive.co.uk/games/fantasy-world-dizzy/), including its C64 screenshot (`reference/archive-c64.png`).
- [Dizzy Collection manual](https://worldofspectrum.net/pub/sinclair/games-info/d/DizzyCollection.pdf), search extract; exact controls require checking in this C64 image.
- [CSDb Dunex release](https://csdb.dk/release/?id=200158), the analysed disk.
- [World of Longplays description](https://www.youtube.com/watch?v=hD1hRj63NdQ), leads for C64 differences; no playthrough undertaken.

Read on 15 November 2026:

- [Retro Sanctuary's Spectrum, C64 and Amstrad comparison](https://retro-sanctuary.com/Comparisons-Fantasy-World-Dizzy.html): in the Spectrum and Amstrad games Australia is upside down with reversed controls; on the C64 the screen is the right way up and the controls are still reversed.
- [UHS hints for the game](https://www.uhs-hints.com/uhsweb/hints/dizzy3/0), through a search summary: one coin in Daisy's prison must be taken before she is rescued, or the game can't be won.
- [Lemon64's cheat page](https://www.lemon64.com/cheat/dizzy-fantasy-world/732) refused an automated read (HTTP 403), so whether it lists ESPILCE is unknown.

## Features

| Feature | Status | Where |
|---|---|---|
| Walk and jump with joystick port 2 | confirmed | $33AA inverts $DC00 and merges keyboard input; an instruction trace with right held stored $08 at $03C0. Movement and jump paths are $1B68-$1E1D. |
| Pick up, drop and use objects through an inventory | traced | $1F33-$249D and $374F-$37CF. Room four marks carried items, $FF removed. Individual late item exchanges were not played through. |
| Three lives; water, fire and wildlife hazards | confirmed | New-game spare count two; fire checkpoint $2572 returned reason $2F. Single stepping $25B4 changed spare lives from two to one. Water and creature reasons are traced at $24A0-$2570. |
| Rescue Daisy from the wizard's tower | traced | $2A2E requires object $67 overlap; room $5E selects rescue messages and cage-object changes. The branch was read and sampled; no full playthrough was used. |
| Further mission after rescuing Daisy; collect 30 coins | confirmed | Messages $0C-$0E request thirty; collector $3997 accepts IDs $1A-$37. A forced instruction trace changed decimal count 29 to 30. Final completion compares tens with three at $2A68. |
| Coins hidden behind scenery | traced | Initial IDs $30-$36 are paired with scenery IDs $38-$3E (railings, leaves, a window frame) at the same positions; picking scenery up at $2161-$2174 places its coin in the room. How it works shows each one. |
| Conversations and item exchanges | traced | Action overlap dispatch $1FB3-$20E5, item-use cases $222E-$242D and messages at $D7AF-$EFFB. Late conversations were decoded and traced without a playthrough. |
| Large round hole empties the inventory | traced | Object $0A takes $2113-$2149, moving carried IDs 1-$3E into the room before message $27 and hole removal. This isolated branch was read, rather than reached through a route. |
| Bean stalk, cloud castle, dragon and dungeon puzzles | traced | Bean $2343, full bucket $2365, rope $2295, water $2275, and dragon items in $23C8/$2417; decoded messages describe the effects. |
| Australia turns Dizzy over and swaps the stick, but not the rooms | confirmed | Rooms below $19 rotate the chosen frame 180 degrees through $2A7F and swap the horizontal control bits at $1AA5; random hops and steps at $1AB4. Seen live in rooms $16-$18: rooms drawn upright, Dizzy upside down and facing against his walk. Known before: Retro Sanctuary. Discoveries. |
| Lowering the cage too soon makes the game unwinnable | confirmed | $2084-$20CB lowers the cage once (lever attribute $87) until object $66 is at Y $8B; nothing raises it. Live: before the lever, Dizzy reached coin $2F from the right and the count rose; after it, the cage floor stopped him at the table's end, and from the left the daggers (or, with the rug, the table) stop him. Known before: UHS hints. Discoveries. |
| Whisky can only be drunk and leaves Dizzy drunk | confirmed | Dropping object $13 shows message $28 and removes it ($2449); $1A80 then swaps left and right for 32 of every 64 passes for the rest of the game. Seen live. Nothing else uses the bottle. Discoveries. |
| The thirtieth coin appears after meeting the troll | traced | $1EE8-$1F2D: entering the mines ($29) past X $34 moves the troll there, shows message $1F and puts coin $37 in the dungeon ($24). How it works. |
| Music and sound effects | confirmed | Selectors 1-4 at $0B00 and footstep routine $2AB7: selector 3 on a coin ($39BC), 4 on losing a life ($258A, $34F5) and at the rescue ($3851). Key M (matrix code $24) at $1A45 turns the music off and footsteps on. The players run the driver; test_music.js compares its writes. |

## Beyond the documentation

The ESPILCE sequence reached the room-browser path through genuine keyboard matrix events and instruction checkpoints, and the browser was driven live with the joystick: left and right step one room, up and down sixteen, fire enters the room. The browser's accepted ID range ($15-$A7) exceeds the drawing directory; effects outside that directory remain open. Whether the cheat was published is unknown (see Sources).

The whisky's permanent drunkenness and the C64's half-turned Australia are not in the manual extract read.

## Open questions

The consequences of the browser's out-of-directory IDs and the original roles of retained, unreferenced sprite pieces remain open. No full playthrough or replay was needed for this Silver analysis.
