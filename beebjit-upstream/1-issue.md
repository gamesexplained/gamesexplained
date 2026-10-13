Hi Chris, thanks for beebjit. We run [Games Explained](https://gamesexplained.com), a site that shows how classic games work by taking their code apart, with contributors and their AI agents writing up each game. We're adding the BBC Micro, and beebjit's speed and scriptable debugger make it a great fit.

While scripting it we hit five small gaps. Each has its own issue and a pull request with a tested fix, so you can take or leave each one. The fixes were written by Claude, the AI agent we work with, and each passes `./build.sh` with a new test. This is the first.

## What goes wrong

We want to save all 64K of memory in one go, and load it back later.

- `savemem` won't take a length of `10000` (all 64K). It prints `???` and saves nothing.
- `loadmem` of a 64K file loads nothing. The length goes to `bbc_set_memory_block()` as 16 bits, so 65536 becomes 0.
- A shorter file that runs past `FFFF` wraps round and writes over zero page.

## How to see it

```
./beebjit -headless -debug -commands "savemem mem.bin 0 10000;q"
```

This prints `???` and writes no file. Saving the two halves works, but loading them back as one file doesn't:

```
./beebjit -headless -debug -commands "writem 2000 5a;savemem lo.bin 0 8000;savemem hi.bin 8000 8000;q"
cat lo.bin hi.bin > mem.bin
./beebjit -headless -debug -commands "loadmem mem.bin 0;m 2000;q"
```

This shows `2000: FF FF ...` where it should show `5A`.

## The fix

Let `savemem` take a length up to `10000`, make the length 32 bits, and stop `loadmem` at `FFFF`, the way `savemem` already does. A pull request with this follows.
