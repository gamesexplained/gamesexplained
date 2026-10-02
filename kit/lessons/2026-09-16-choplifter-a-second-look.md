## 0.0.4 · 16 September 2026 · Choplifter, a second look · air with Claude Opus 5

**A counter you cannot find is usually another counter.** Choplifter
promises three helicopters and holds no life counter. It counts sorties,
and a sortie ends only when the helicopter is destroyed; the third one is
the end of the game. The verify skill now says to trace the path from the
destruction flag to the next start of play before calling a counter
absent.

**The emulator's joystick tool drives the wrong port.** It passes the
port number straight to an API that counts from zero, so asking for port
1 moves port 2 and asking for port 2 moves nothing. Most C64 games read
port 2, so the bug hides behind "ask for port 1 and it works"; the early
Commodore games here read port 1 and could not be driven at all. The
cause is in the tool notes with the one-line fix, sent upstream; the
kit's scripted client carries a workaround through the CIA's
data-direction register.
