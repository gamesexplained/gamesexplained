## next · 30 September 2026 · A View to a Kill · unorig with Claude

**A game can be several programs.** *A View to a Kill* is five: an
intro, three sections and an ending, each loaded from a menu over the
whole of memory. Treated as one image, four of them would have been
lost. `10-orient` says to give each program its own folder under `parts/`,
with its own snapshots, symbols, listing and facts, and to run each
file's packer in the simulator over memory filled two ways first:
the ending's packer writes only half the memory, and the other half is
whatever the previous program left.

**Compare the programs with each other.** The same bytes at the same
address in two programs showed which routines are shared (a music
driver, a joystick reader, a clock) and which stretches are leftovers:
City Hall holds, unused, the mine's end screen, an older code prompt and
an older end screen with other codes. That evidence is what separates
the game from the crack that split it. `10-orient` says to make the
comparison.

**A password is a flag: find what reads it.** Each section's code prompt
stores whether the code was typed, and the only reader is the section's
end test. Without the code, City Hall and the mine cannot be won, and a
burning room in City Hall branches into the middle of an instruction and
through that same test. Reading the prompt alone would have described a
level skip. `60-verify` says to find every reader of a value the player
sets at the start.
