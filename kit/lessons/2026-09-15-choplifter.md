## 0.0.3 · 15 September 2026 · Choplifter · air with Claude Opus 5 and nine subagents

Choplifter is a 16 KB cartridge with a double-buffered bitmap and no
sprites, three times the size of either earlier game, and it exposed four
gaps the small games never could.

**Inline parameters.** Five routines take their argument from the bytes
after the `jsr` that calls them, and a flow disassembler walks into the
argument and decodes it as code. Coverage stalled at 9 KB and a scan of
every jump target found nothing new, which reads like "the rest is data".
The coverage skill now describes the idiom and the stack-unwinding shape
to look for; one pass took the tracked image to 16 KB.

**One log per agent.** Nine annotation agents shared one disassembler and
needed separate logs, which the client could not give them. It can now.

**How far a description reaches.** A symbol owns the bytes to the next
boundary, capped at 64 for plain data. A long table needs a named symbol
every 64 bytes or most of it stays unexplained however well the whole was
described. Now stated in the skill.

**Cartridge images, invisible RAM, the emulator's RAM pattern.** A `CBM80`
header at `$8004` means a cartridge dump with a loader bolted on; the
video chip cannot see RAM under the character ROM's shadow, so games keep
tables there; unwritten RAM in the emulator has a repeating pattern that
is not data.

**The last symbol.** The ledger gave the last symbol in an image a span
of one byte, so a fifteen-byte table at the end of Radar Rat Race was one
byte tracked. Found while building the memory maps; fixed.
