# A Nightmare on Elm Street — features

What the game is documented to do, with verification status against the
binary. Statuses: **open** (documented, not found yet), **traced** (in the
code, could not be exercised; say what was tried), **confirmed** (in the
code, consistent with the emulator), **live** (observed directly),
**differs** (the code does something else).

Sources:

- MobyGames, "A Nightmare on Elm Street", https://www.mobygames.com/game/1791/a-nightmare-on-elm-street/, read 16 November 2026 (its description is labelled as the DOS version's)
- TV Tropes, "A Nightmare on Elm Street (PC)", https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/ANightmareOnElmStreetPC, read 16 November 2026
- Wikipedia, "A Nightmare on Elm Street (video game)", read 16 November 2026: the article is about the 1990 NES game, and names the 1989 Commodore 64 and PC game as unrelated
- The game's own screens: the credits picture (CRD.SRT) and the title picture (TTL.SRT)
- No review of the Commodore 64 version was found (ZZAP!64 55, November 1989, has none)

## Features

| Feature | Status | Where |
|---|---|---|
| Pick one of five Dream Warriors (Kincaid, Kristen, Will, Nancy, Taryn) to rescue the others; Joey cannot be chosen | live | street `character_select` $225E, `select_loop` $2286 |
| Each character's special power: power punch, karate kick, lightning, freeze time, magic knives | confirmed | street $23A9 (names), house `special_power` $4C0B |
| Soul (health) and power meters; power pays for the special power | confirmed | house `change_health` $440E, `spend_power` $402C, tables $7359, $735E, $7363 |
| A top-down walk through Springwood to find Freddy's house, chased by a giant Freddy | live | street `street_new_game` $378B, `street_freddy` $2862 |
| Freddy's house is at one of nine places, picked at random each game | traced (the table and the random pick read; one game played) | street $3882, $388B |
| Inside the house, ladders lead down through ten dream levels | live (levels 1 and 2) | house `change_level` $572F, `ladder_touch` $56E0 |
| The other friends are hidden on the levels, their souls drained by Freddy over time | confirmed | house `init_party` $1843 (ten hiding places), `freddy_attacks_friend` $152B |
| Weapons, ammunition, batteries, coins, and healing items lie in the levels | confirmed | house `pick_up` $2CEA, `weapon_handlers` $2FD0 |
| A vending machine sells items for coins | confirmed | house `vending_machine` $52CC, prices $7A19 |
| Chests hold items, or monsters, or Freddy | traced | house `open_chest` $519F |
| The CHAIN SAW, PICK, and TASER cut tunnels through walls, and break with use | traced | house `use_chain_saw` $4A41, `use_pick` $49D3, `bolt_tunnel` $50DB |
| A copy-protection question from the manual | traced (on the way into level 4) | house `manual_question` $5AF4 |
| The final fight with Freddy | traced | house `final_fight` $60EC, `game_won` $4604 |
| Saving and loading the game on side 2 | live (loading) | house `save_game` $42EF, `load_game` $4398 |
| The game-over picture of Freddy | traced | house `player_died` $46F7, `death_animation` $47D3 |

## Beyond the documentation

- Level 10 has a clock: from 120 wraps of the game clock to an hour, "IT'S NOW n O'CLOCK", and at 12 the final fight starts by itself (house `game_clock` $1495).
- Freddy's HAT and GLOVE attack the player who carries them, unless the CRUCIFIX is carried too (house `haunted_items` $1439).
- The MAGNET swaps itself for a random carried item when walked into (house `magnet_touch` $5155).
- Some floors hurt, and one kind holds the player still; the JUMP ROPE halves the damage of two kinds (house `hurt_floor` $38F3, `sticky_floor` $3917).
- On level 1 every door opened adds a new room beyond it, picked from 34 pieces (house `add_room` $35AA, `room_pieces` $338A).
- Each level remembers its changes in a file of its own, `Dn.CUR`, written when the player leaves (house `save_level` $4167).
- The street knows F3, which fills the player's soul (street `street_player_turn` $267A).
- The vending machine has texts for a theft and a lucky win that nothing prints (house `vend_texts` $5506).
- The street has a text "YOU'VE BEEN GRABBED. CONTINUING." that nothing prints (street $2EBF).
- A second wrong answer to the manual question hangs the game for good (house $5B65).

## Open questions

- Who programmed, drew, and scored the Commodore 64 version: no credit is stored in the game, and the sources read name only the companies.
- Whether level 10's clock can reach 12 o'clock before the player reaches Freddy in normal play (not played that far).
