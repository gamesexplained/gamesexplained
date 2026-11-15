# Resident engine — technical facts

The listing uses `work/play-level1.vsf`. The loaded-data comparison uses
the level's pre-initialization `entry.vsf`. The upper overlays own their
code and assets separately. Live checks are identified below; the other
facts follow the named instruction paths.

## Scheduler and map drawing

`$0A2F` saves registers, acknowledges the VIC and jumps through `$06D1`.
Raster handlers replace this pointer between playfield, sprite and panel
bands. Main stage zero waits at `$0A49`; other stages reset, reload or
return to the title. The captured handler-pointer sequence and frame
comparison are recorded in the game's root facts.

`$1924` exchanges character buffers `$C800/$CC00`, selects sixteen
character-copy routines and eight colour-copy routines, and schedules
exposed-edge drawing. Each copy's load/store pairs and row/column limits
were checked mechanically. The row/column renderers at `$2AE2/$2BAA`
select four-by-four character definitions through the map byte's exchanged
nibbles. `$5356` constructs the colour-column copy instructions.

## Player and weapons

Player X `$1E` uses half pixels; Y `$1F` uses pixels. `$1063` reads the
joystick, terrain properties and movement state. Down with Space selects
wheel mode; `$0F33` composes the player from hardware sprites. The active
weapon handler is the mutable JMP at `$0702`.

Scatter allocation/update is `$3182/$3281`, laser `$35CD/$3623`, bounce
`$4471/$44A2`. Their upgrade counters are `$07EE/$07EF/$07F0`. Wheel fire
selects the four-slot bomb allocator at `$2E05`; its placement uses six
joystick-mask/offset records at `$2F83-$2F94`.

Held fire charges through `$3931` to `$13`. The flash uses twenty records
and thirty-two angle programs. The five-byte copy programs at `$3DA4`
construct angle glyphs from the fragments at `$4044`; signed copy lengths
select normal or reversed source order. Trajectory patterns hold parallel
glyph, companion-cell, horizontal-step and vertical-step arrays.

Flash activation saves 144 bitmap bytes at `$C6E8-$C777` and eighteen
damage bytes at `$06AE-$06BF`, replaces those damage entries with two,
and restores both allocations when its records end. Range upgrades add
two up to `$28`. Super activation at `$42B1` consumes availability `$0739`,
saves the player's position and weapon upgrades, and installs temporary
maximum upgrades. Reset `$5206` restores availability for the next life.

Power-line activation at `$2F95` consumes BCD ammunition `$0738` and
sets `$017E`. **Live:** a 71-instruction Space trace recorded ammunition
three to two and active flag `$D3`. Its updater saves/restores covered
characters and colours behind two outward-moving fronts.

## Damage, rewards and panel

`$09D9` finds a projectile character overlapping an actor and returns its
index relative to the cutoff, normally `$C8`. `$0699-$06D0` has 56 damage
bytes. Bomb `$DD` gives 100; laser `$DE-$E0` gives eight; power-line
`$EF/$F0` gives twenty. **Live:** a stopping read watchpoint on `$06AE`
reached the SBC at `$6CBF`, with bomb index 21 and damage 100. Staged
health fifty produced `$CE` with borrow, matching subtraction by 100.

The seventeen-entry actor directory overlaps its low/high arrays in one
byte at `$08BE`. **Live:** six instructions of dispatch with type sixteen
reached the projectile handler `$5B27`. Type zero skips the lookup.

Scores and pending awards are four packed-decimal bytes each.
`$4AF9` adds and clears the pending award, and `$4B0F` draws seven digits.
Lives at `$FFFC` are also packed decimal. The diamond counter `$0737`
awards a continue at fifty; continues use colour RAM `$DBFF`'s low nibble.
The seven energy cells use glyphs `$C4-$C8`; `$4BE0/$4BF2` refill them
incrementally and `$4C0C` applies gated damage.

The timer uses three decimal digits `$080F-$0811` and a prescaler that
reloads fifty. No wall-clock duration is claimed without a timing count.
Ten reward handlers at `$5B09/$5B13` implement weapon/range upgrades,
flash, invulnerability, energy, ammunition, lives and diamonds. The panel
font, colour lookup and loading alphabet are documented in the root facts.

## Resident sound effects

`$6293` resets the SID/effect state. `$62BC` interprets voice requests at
`$FFC0/$FFC7/$FFCE` using 35 directory entries, with zero taking the silent
path. Commands select envelopes, relative pitch/wave streams, pulse
modulation and voice-one filter settings. With `$03EE` nonzero it updates
voice three and leaves the other voices for the overlaid music driver.

The effect patterns are `$647E-$67E5`; thirty-four request IDs select
thirty-one distinct allocations because IDs 28 through 31 share a pattern.
Split-address tables are represented as bytes with named halves: the
installed disassembler can misinterpret adjacent or internally labelled
split tables. Targets were decoded from their actual low/high reader pairs.
