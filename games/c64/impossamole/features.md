# Impossamole — features

Sources read on 15 November 2026: [Gremlin instructions transcribed by Viva Games](https://viva-games.ru/game/impossamole), including C64 controls; [Dynamix release](https://csdb.dk/release/?id=200006). The instructions cover several computers. Traced means checked against C64 instructions and data; live means exercised in VICE. Open means the stated limitation remains.

| Feature | Status | Evidence |
|---|---|---|
| Five levels, first four in any order, final requires four | traced | Completion masks $0F/$1F at $260E and selector; five payload IDs checked live at $16AE |
| Joystick port 2 controls Monty | live | Neutral/fire route reached actual Klondike gameplay; joystick polling in $0973 chain |
| Jumping, ladders, platforms, enemies | traced | $2C53 movement dispatch, jump deltas $7F45, terrain probes $2881; actor slots $86B8 |
| Food restores energy | traced | Contact dispatch $3673/$3690; exact ordinary-play pickup route open |
| Shopkeeper and money purchases | traced | Five shop entry/return records $809D and shop logic; ordinary purchase route open |
| Collectable weapons and strength | live | CPU instruction traces through pickup type 4 and $1B11; weapon templates and type $7F7C traced |
| Weapons have a time limit | live | $4FE4 trace at divider 49 reduces lifetime 2→1; timer units reported as calls |
| Hidden rooms in each level | open | Exit records and full map allocations decoded; which exits count as each documented hidden room is unassigned |
| SPACE activates a super weapon | traced | $0FA4 conditions and charge/state $89CC/$89CD; ordinary activation route open |
| P pauses; RUN/STOP quits while paused | traced | Keyboard scanner $0E9A and command handler $0FA4 |
| Title joystick selects music/effects | traced | $08BF selection gates music/effect calls |
| Five guardians and stolen scroll objective | traced/open | Five guardian activation IDs at $3B57-$3B69 and completion logic; each guardian's ordinary defeat/scroll sequence remains open |
| High-score names select six modifiers | live | All six names compared instruction by instruction at $5001; resulting defaults recorded in facts.md |
| Music and effects | confirmed | One tune and 16 records run through CPU model; page write comparison and browser sound checks |

## Beyond the documentation

The six name modifiers, resource boundaries, animation stream markers, block format, and exact exit-record fields are described in facts.md and the pages. The forced zero-energy underflow has unproved reachability and is kept out of Discoveries.
