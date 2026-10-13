Fixes #ISSUE.

- `savemem` now takes a length up to and including `10000`.
- The length is 32 bits in `debug_save_raw()` and `bbc_set_memory_block()`, so a 64K file loads in full.
- `loadmem` stops at `FFFF`, as `savemem` already does, instead of wrapping round into zero page.

**Test:** a new check at the end of `run_functional_tests.sh` writes two bytes, saves all 64K, and checks that the file is 65,536 bytes. Then it loads the file into a fresh machine and checks both bytes. `./build.sh` passes.
