// The kit's instruction trace for Bocfel (kit/zmachine/bocfel.py builds it in).
// When the environment variable BOCFEL_TRACE names a file, every instruction the
// Z-machine runs is written to it, one line each: kit/zmachine/ztrace.py reads it.
//
// SPDX-License-Identifier: MIT

#ifndef ZTERP_TRACE_H
#define ZTERP_TRACE_H

#include <cstdint>

extern bool trace_enabled;

void trace_init();
void trace_before();
void trace_after();
void trace_extended();
void trace_write(uint16_t var, uint16_t value);

// Writes the line when the instruction has run, also when it leaves by an exception
// (quit, restart, restore).
struct TraceGuard {
    ~TraceGuard() {
        if (trace_enabled) {
            trace_after();
        }
    }
};

#endif
