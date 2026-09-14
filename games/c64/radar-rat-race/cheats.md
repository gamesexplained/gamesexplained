# Radar Rat Race — cheats

Candidate pokes derived from the named variables in `facts.md`. None has
been tested live yet; each is a candidate until it is.

| Effect | Poke | Status |
|---|---|---|
| Infinite lives | keep the lives counter (`zpa_9C`) topped up | candidate |
| Level select | set `round_number` and re-run the round setup routine | candidate |
| Slower or faster play | change `move_cycle_interval` | candidate |
| Invincibility | short-circuit `player_collision_check` (`$F344`) | candidate |
