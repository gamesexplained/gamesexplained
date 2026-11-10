# Kit feedback

## Skill text that changed what I did

- `60-verify`: "give them to a checker for a sample check as the draw wrote them, before you change any of them": I held every correction until the checker's verdicts were in, which showed the 43 % rate.
- `60-verify`: "Before writing one, list them all": it sent me back to every place a flag is set, which corrected which places are dark and what `H8` means.

## What went wrong or cost time

From the first game in the kit that is a plain BASIC program.

- `kit/skills/core/50-coverage` assumes assembly. For a BASIC game, declare the program as a `"basic"` block in `game.json` and write the symbols and comments by script; a comment's reach is limited to 1,024 bytes, so a long group has to be split. A short note in the C64 steps skill would have saved a pass.
- Keys typed into a game that reads its line through the KERNAL editor must be sent as PETSCII bytes (`vice_keyboard_petscii`, RETURN as 13). `vice_keyboard_type` with a carriage return does not reach it.
- INSTALL.md: VICE needed shared libraries that were missing in the container; they were fetched with `apt-get download` and unpacked under `tools/`, with the proxy's CA file passed to the tools that needed it.
- A first sample of comments written one per group of lines came back 43 % wrong. Comments on groups carry many details each, and each detail is a chance to be wrong; the skill could suggest one claim per comment for BASIC listings.
