# The Armageddon Man — cheats

Pokes that change the game within its own parameters. Each one names the
variable it changes and whether it has been tested live. Untested pokes are
labelled as candidates.

The game has no cheat a player enters in the game itself: no key, word or
code is read outside the menus, the radio's keypad and the controls
(`read_keys`, `radio_keypad`).

| Effect | Poke | Status |
|---|---|---|
| Every country trusts the Commander fully: the communique rates "Excellent" | `$5DAD` + 12 × n = 255 for n = 0 to 15 (byte 9 of each country's record, confidence) | live: the week's end rated Excellent |
| End the year at the next week's end, with the year's rating | `$5B51` = 51 (week) | live: "Your year as Supreme Commander is over. Your rating is 100" |
| Armageddon at the next week's end | `$5B53` = 255 (radiation) | live |
| Make country A start an event on B on the next tick | `$5C5C` + 16 × A + B = A's level for the event (`event_levels`, `$958C` + 32 × A + event) | live: China (13) on Israel (8), `$5D34` = 0 gave a Total Missile Attack, 117 aid to the opposition |
| Bring the next tick close | `$5B54` = 191 (clock_count), with `$5B55` (clock_ticks) = 7 for a week's end | live |
| No radiation at all | `$5B53` = 0 | candidate: the communique then reads "Background." (`week_end`) |
