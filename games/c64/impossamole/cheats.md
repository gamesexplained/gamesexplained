# Impossamole — name modifiers

Enter an exact eight-character high-score name. $5001 compares the name at the selected high-score offset and writes modifier $08BE. Live instruction traces confirm each accepted comparison. The letters are uppercase. HEINZ. needs one leading and one trailing space.

| Name | Modifier | Rule |
|---|---|---|
| `LUMBAJAK` | 0 | Capacity default 17 rather than 9 |
| ` HEINZ. ` | 1 | Strength default 3 |
| `COMMANDO` | 2 | Weapon lifetime preserved |
| `ANNFRANK` | 3 | One starting reserve |
| `OOCHOUCH` | 4 | Terrain class 9 damage skipped |
| `JUGGLERS` | 5 | Double food restoration |

A match first restores the three defaults to 9/1/0, then applies the selected modifier. Later readers at $3473, $3053, and $3690 implement IDs 2, 4, and 5. On 15 November 2026 a Klondike game in VICE ended at 1,649 points, OOCHOUCH was typed with the joystick, and $08BE became 4. The name entry starts as eight full stops.

Side effect: $5001 counts matched letters in $7126, which is also the first pitch step of one of the tune's instruments. A cheat name leaves 8 there and puts that instrument eight semitones high on voice 3; an ordinary name beginning with J leaves 1 to 7 (facts.md, "Name modifiers").

## Shop

While a bought item is paid for, a coin a frame, each frame whose left or right push differs from the previous push keeps its coin ($14B9). Alternating left and right on every frame buys anything for nothing (facts.md, "Shop").

The Dynamix crack also offers unlimited energy before game entry. This analysis answered N. That trainer is not an original name modifier.
