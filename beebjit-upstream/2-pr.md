Fixes #ISSUE.

`keydown` and `keyup` now read the key queue straight away, rather than leaving it for the next cycles timer tick. That's safe because the debugger runs on the BBC thread, which is the thread that reads the queue.

**One existing test changes.** The NuLA test presses Z from the debugger at cycle 22,000,000. The key now lands at that cycle instead of at the next timer tick. So Frogger starts a little earlier, and its sprites have moved a couple of pixels by the time the test takes its CRC. The rest of the screen is the same, NuLA palette included, so the expected CRC changes from `0x46e9a111` to `0xbccf4422`. It would be worth a look at that frame to be sure.

**Test:** "Checking debugger keydown." presses Z at the BASIC prompt and checks that the system VIA's CA2 flag is set before the next instruction runs. `./build.sh` passes.
