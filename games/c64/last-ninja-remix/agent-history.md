# Publication history

30 September 2026: contributor authorized publication directly from the existing exhaustive disassembly, online research, and a separate PR for each game. Imported annotations without claiming a new reverse-engineering run. Measured the repository’s own prose coverage and retained Bronze pending completion and maintainer review.

30 September 2026: replaced the non-running composition with a booted Central Park snapshot. Traced overwritten startup to double-buffered sprite output. Kept the article Bronze pending coverage/verification; later loads remain open under RFC #124.

### Packed resources and indexed aliases

Validated 162 main and 80 auxiliary sprite records independently against the fresh capture; all expansion lengths and boundaries agree. Checked all 118 scene record boundaries and child indices. Added record-specific annotations and restored the sprite browser after comparing its arrays with fresh RAM. Corrected the decoder description: `$68` escapes a literal, while `$69-$6F` encode zero runs. Retyped `$0000-$0FFF` as data, removing false code cross-references produced by decoding runtime sprite buffers. Traced `$159D` as a negative-index base alias for masks at `$1695`, and documented frame read windows whose storage boundaries depend on actor paths. Coverage is 89.9%; this is progress toward Silver, not completed feature verification.

### Live boundary checks and complete resource ranges

Executed the native sprite decoder on ten records and checked its exact output. Player-damage tests corrected the imported claim that every damaging result writes a reaction: this routine preserves action while health remains positive. Projectile tests check both accepted and rejected boundaries. Parsed all 32 animation sequences and observed one command reaching the expected composition entry. Captured the level-loader EOF return `$10F8`; its comparison exposed pointer-table/resource tails outside capped symbol spans. Added only validated complete resource ranges; the remaining loaded ranges stay in TODO. Shared importer fix #125 prevents omitted ranges from defaulting to code.

Traced the condition, collision, interaction and sound directories. Independent collision compilation matched all 18 areas. Eleven unexplained spans between frame records proved to be animation streams, and native first commands matched every stream. Corrected the imported world-height interpretation at $B3D6 to elapsed-tick enemy-meter regeneration after sixteen native boundary cases. A first scratch decoder mishandled the compiler flags and backward chain endpoint; corrected it against the instructions and reran every area. Verified the undocumented object-display span in four paths and typed it as code. Added and browser-checked collision and meter controls. Upper-memory tail, residual annotations and full gameplay verification stay open.

### 1 October 2026 — source alignment correction

Backport review found that the Source writer split the native-checked C096 LAX into one byte and a spurious operand-derived ROL. The opcode-aware export now keeps all three bytes together; an integration fixture verifies the following RTS boundary. The native semantics checks remain the same four recorded cases.


## 1 October 2026 — annotation review correction

Qualified the enemy-meter slot comment: $B5C3 writes the hit-processing result and can clear it; it does not clear the slot on every hit. The native calculation and article remain unchanged.

## 4 October 2026 — the game in parts

The kit gained a layout for a game that loads in parts, and this game was the case that asked for it: the page showed 99.6 % for one level of seven, with the other six in a to-do line. The analysed image became the part `central-park` as it stood, with no rebuild: its listing still matches its symbol map. The six later levels were given folders that hold their names and nothing else, so the page counts them. Nothing new was analysed. The image still holds the engine and Central Park together, and telling them apart is the next step, in `TODO.md`.
