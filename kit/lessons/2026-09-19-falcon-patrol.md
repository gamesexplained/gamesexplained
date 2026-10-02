## 0.0.6 · 19 September 2026 · Falcon Patrol · air with Claude Opus 5

**A running interrupt does not prove the game is running.** A stopping
breakpoint opens VICE's monitor, and while the monitor is open the machine
is paused, but nothing says so: the emulator reports "running", screenshots
show the last frame, memory reads return steady plausible values, and every
breakpoint reports zero hits. A whole afternoon went into a confident,
published-then-retracted claim that this game's timer could not survive a
snapshot restore. The cheap test that settles it in one call is now in the
orient skill: **sample the program counter several times.** A live machine
returns a scatter of addresses; a parked one returns the same address
every time.

**Carry a control when you measure with breakpoints.** Later in the same
run the hit counts stopped recording altogether while still reporting the
breakpoint as enabled, which reads exactly like a routine that is never
called. Put a breakpoint on something you know runs, in the same batch as
the one you are measuring. If the control reads zero, the instrument is
dead and no number from that batch means anything. A dead instrument and a
true absence are indistinguishable without it, and only one of them is a
publishable claim.

**Watch which instruction does the forcing.** This game gates the pilot's
controls by rewriting the joystick byte, and two of those gates are one
instruction apart with opposite meanings. `ora #$FE` sets every bit except
the climb, so the player must still push up; `lda #$FD` sets the byte
outright and flies the aircraft into the ground. Read as "forces a climb",
the first one turns twenty minutes of a motionless aircraft into a hunt
for a bug that is not there.

**The cracker's trainers are a variable map.** A trainer is a single-byte
poke, and the cracker had to know what each address held to write it.
Turning `DEC $1D` into `LDA $1D` for unlimited lives identifies `$1D` as
the life counter as firmly as any trace. Where a release carries trainers,
read them first: six of this game's variables were confirmed that way, and
the group's own scroll text, still in memory unread, named which parts of
the image were theirs rather than the original author's.
