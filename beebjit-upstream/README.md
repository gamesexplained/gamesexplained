# beebjit fixes for upstream

Five fixes to [beebjit](https://github.com/scarybeasts/beebjit), the BBC Micro emulator,
found while adding the BBC Micro to Games Explained, with the issue and pull request text
for each. They are written against beebjit's master at `2ff70a0`, and each passes
beebjit's own `./build.sh` with a new test of its own.

| Patch | What it fixes |
|---|---|
| `1-savemem-64k.patch` | `savemem` refuses all 64K, and `loadmem` of a 64K file loads nothing |
| `2-debug-keys.patch` | a key pressed in the debugger arrives up to 40,000 cycles late |
| `3-savecounts.patch` | no way to save the count of every executed address (adds `savecounts`) |
| `4-debug-set-pc.patch` | setting PC from the debugger runs the old opcode (interpreter) |
| `5-state-load-exact.patch` | a loaded state doesn't carry on as the saved machine would |

`N-issue.md` and `N-pr.md` are the texts. `post.sh` forks beebjit into the gamesexplained
organisation, pushes a branch for each patch, and opens each issue and pull request from
Aaron's account; `DRY_RUN=1 bash post.sh` checks that every patch applies and gives the
tree that was tested, and posts nothing.
