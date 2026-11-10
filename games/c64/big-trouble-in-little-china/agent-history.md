# Big Trouble In Little China — agent history

- Autostart showed `READY.` and `RUN` for about thirty seconds and looked hung. It was unpacking; the title appeared at about 35 seconds. The program's BASIC line names Trilogic, and a stopping checkpoint on `$009C` (the last `RTS` of the zero-page unpacker, found by searching the packed file for its closing `PHA`/`PHA`/`RTS` bytes) landed first in a small stage at `$0490`, which led to `$094B`, which restores the chips and runs the unpacker again. The second stop of the same checkpoint returned into the game at `$11FE`.
- The title waits for fire on joystick port 1, not port 2. Pressing port 2 first left the title up, which looked like a dead game.
- Input in play is on port 2. Random stick input on port 1 produced fights, so the port-2 conclusion rests on the code (`$1AE4` reads `$DC00`) and on one test where holding left on port 2 scrolled a lamppost in.
- Random play for 200 seconds recorded 5,014 bytes of code. The recording missed everything random input did not reach.
- A fetch agent read two web pages (Wikipedia and a Commodore User review). Its report said Wikipedia's quote of that review does not match the review's text; the page uses only the review's own words.
