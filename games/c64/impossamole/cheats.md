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

A match first restores the three defaults to 9/1/0, then applies the selected modifier. Later readers at $3473, $3053, and $3690 implement IDs 2, 4, and 5. The comparison was tested directly; reaching a high score was outside the verification route.

The Dynamix crack also offers unlimited energy before game entry. This analysis answered N. That trainer is not an original name modifier.
