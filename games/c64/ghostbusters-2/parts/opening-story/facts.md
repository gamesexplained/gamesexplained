# Opening story facts

The snapshot `work/story.vsf` shows the first story at its fire prompt. Its route from power-on is in the game's `orientation.md`.

The hardware IRQ vector in the saved RAM points to `$17D7`. That handler calls `$1916`, sets the border and background to black, configures VIC memory and display registers, increments `$0E`, and passes `$05`, `$18` and `$7A` in X, Y and A to `$1907` before jumping to `$191D`. Other handlers and the two helpers remain open.

An executed-address capture at the fire prompt recorded 547 instruction starts. It covers the waiting state, not the complete story sequence.
