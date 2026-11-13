# Level 3-1 — technical facts

Source traces use the handover snapshot at `$551B`. The listing covers 34706 authored bytes, including 8745 code bytes. Generated colour storage `$AC00-$AF1F`, cleared workspace `$BD00-$BD90` and generated edge-colour buffers are excluded with their producers named.

## Flight strip and scrolling

The active terrain strip is 480 columns by five rows of four-by-four-character blocks: 2400 bytes at `$9000-$995F`. Every exchanged-nibble map index is within its 208 definitions. The retained header height is six and retained count is 6000; neither is used as the active rectangular map size. The right-column renderer at `$9CE8` generates twenty character rows and adds the 480-byte stride after every four. A stopping read watchpoint on `$978A` stopped immediately after `$9D00 LDA ($0D),Y`, with four character rows remaining. The map pointer was $978A, the fifth source row at initial column ten. Private evidence is `work/trace_flight_map.json` at the game root.

Eight conditional screen-copy routines scroll thirty-nine columns left in groups of five rows. They preserve negative foreground character codes and substitute nonnegative background characters through patched address operands. Forty background source addresses advance through a separate character stream. Each copy also produces the twenty-row colour buffer; a deferred routine writes it into colour RAM. Four character banks at $C000, $E000, $E800 and $F000 provide phase-selected background animation.

The spawn directory has sixty active horizontal cells and one row. Its sixty distinct record streams occupy five separate allocations, including reserved glyph slots $64-$7F in the four character banks and `$AF20-$AFFF`. Those bytes are spawn records, not character pictures.

## Player and weapons

The dedicated player hook at `$FB80` replaces normal platform movement. Eight joystick masks dispatch four cardinal and four diagonal direction helpers. Horizontal steps are two half-pixels and vertical steps three pixels; helpers clamp the corresponding bounds. Their common cancellation path explicitly removes a return address before resuming neutral tilt. The outer player callback likewise removes its caller return address and jumps to the shared interrupt exit after scrolling and music.

Flight has dedicated scatter, laser and enlarged beam paths. Scatter uses ten character-projectile records; the upgraded group allocates three. Laser uses seven records, restores the underlying background, reflects selected variants at terrain and can create two secondary continuations. The enlarged beam uses a generated sprite, one/three/five active vertical segments and five stored bitmap templates. Terrain blanks individual segments; actor contact records damage index eleven in the eleven-slot hit array. Flight actor handlers consume that array alongside terrain-character damage through the twelve-entry table at `$A1A2`.

## Actors and boss

Types three through seven implement a five-member formation, a fixed firing actor, six motion variants, a two-part emitter and a three-part boss. Other positive level actor hooks select the resident no-op. Formation members have health three, four, five, four or three, copied from their respective X-step values; the fixed firing actor has ten; the two-part emitter has fifty-five. The boss starts at $0333, or 819 damage units, and protects its middle controller outside the selected phase. It opens, changes vulnerable poses and emits reflecting shots. Death explodes all three body slots, awards 10000 points, starts music fading and selects the automatic player exit state.

## Music format

This load supplies two eight-byte song headers, six stored order streams and nineteen pattern pointers. Initialization selects song zero; the boss selects song one after its local delay. The local playback loop updates SID voices one and zero; the resident effect player retains the third voice. The stored third order pointer and its bookkeeping remain in the format.

The driver at `$6C87-$73E0` interprets note patterns, order loops, transposition, timing, fourteen eleven-byte instruments, waveform/pitch streams, target slides, vibrato, arpeggio and shared pulse/filter modulation. The listing names each state array and parameter allocation. Four arpeggio streams use overlapping pointer bases with unused index zero. Death shape and colour sequences also share storage: the second eight-entry sequences begin six bytes into the respective fourteen-entry first sequences.

Instruction hooks at the original instrument, pattern and modulation readers exercised both songs for 3000 calls each on the kit CPU. Their private read sets are `work/music-reads.json`; this helps bound the stored records and is separate from the later published-player write comparison. No tune player is claimed verified until that comparison is recorded.

## Open questions

The visible identities of the six motion variants remain open. The retained zero gap after `$8BDF` and several header fields have no established direct consumer. The final background stream includes zero padding; no extra level or terrain-map interpretation is inferred from it. No combined-mechanics playthrough was recorded.
