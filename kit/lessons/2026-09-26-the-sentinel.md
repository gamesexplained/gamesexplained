## 0.0.25 · 26 September 2026 · The Sentinel · air with Claude

**When another version of the game is documented, map it before reading
any code.** The Commodore 64 Sentinel is its author's BBC Micro program
carried across, and Mark Moxon's reconstruction of the BBC version is
published. Ten-byte windows of the BBC code, kept where each was found
exactly once in the C64 image, placed 10,751 of its 23,534 code bytes;
556 of its 885 labels landed on an instruction; and the offsets fell into
a handful of blocks (most of the program at the same address, whole
blocks at +`$5300`, +`$3D20` and +`$2800`). With that map in the brief,
eight annotation agents took the image to 100 % in an hour, and what did
not map (the screen, the sound, the keyboard, a copy of the BBC's
operating-system entry points) was exactly the C64's own work, the list
worth reading first. The sweep skill now has the method: unique windows,
blocks by offset, labels only where they land on an instruction, and the
other version's words never copied, since its account of the hardware is
never true of this machine.

**A freezer backup is the game as it stood, not as it loaded.** The copy
supplied was a cartridge backup that crashed on resume: the RAM holding
its interrupt vectors had not been saved. Restarting at the game's own
entry, found as the only caller of its machine set-up, made it play,
because the start-up code rebuilds what it needs. A second hole looked
like the emulator's power-up fill and nothing touched it on the way to
play, but a checkpoint on it caught the first pan calling into it: 1.5 KB
of missing code. The platform reference now describes such backups, how
to restart them, and how to tell a spare range from missing code with a
store and an execute checkpoint, and the orientation step asks for that
check on the first view, before the run rests on the image.
