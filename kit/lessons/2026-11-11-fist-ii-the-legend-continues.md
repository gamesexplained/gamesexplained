## next · 2026-11-11 · Fist II: The Legend Continues (C64) · Aaron Bell with Claude

- **A comment carried from another part keeps what was true there.**
  `carry.py` rewrites the addresses of the code it pairs, but a comment
  also names tables outside that code, and says how its instruction is
  reached. Training's copy of the music driver kept 11 comments naming
  the Adventure's tune tables, which hold other bytes in Training, and
  two comments called an RTI unreachable because in the Adventure a jump
  comes before it; in Training the handler runs on into it. One of those
  two was found only by the listing's sample. `carry.py` now flags both
  kinds for rereading: an address outside the pairing where the copy
  holds other bytes, and an instruction or byte the copy's code runs
  into where the source's does not.
- **What a loader puts in memory is what its copy loop counts.** The
  first run wrote the end of a copy under the I/O area from the file's
  length; the loop moves `$2FF0` bytes, nine fewer than the file holds,
  so the last nine never reach the game. Read the count, or run the copy
  in the simulator, before writing down where a load ends.
