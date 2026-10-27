// The kit's instruction trace for Bocfel. One line an instruction:
//
//   <count> <depth> <address> a:<operand values> [t:"<text>"] [w:<writes>] n:<next> [in:"<typed>"]
//
// count numbers the instructions from 0; depth is the number of routine frames; the
// address and next, where the Z-machine went on to, are five hex digits; the operand
// values are the ones the instruction was given, after reading variables, four hex
// digits each and comma-separated ("-" for none); writes are the variables it stored
// to, as sp, L01-L0F or G00-GEF = value, where a call's result shows on the return that
// stores it. t is the text print, print_ret, print_paddr and print_addr print, and in
// the line a read took. Names, operand kinds, stores and branches are the story's, and
// kit/zmachine/ztrace.py takes them from the story file, so this file knows no opcode
// table and serves every version.
//
// SPDX-License-Identifier: MIT

#include <cstdio>
#include <cstdlib>
#include <string>

#include "trace.h"
#include "memory.h"
#include "process.h"
#include "screen.h"
#include "stack.h"
#include "zterp.h"

bool trace_enabled = false;

static std::FILE *trace_file = nullptr;
static unsigned long long trace_count = 0;
static std::string line;
static std::string head;
static std::string writes;
static int kind;   // 1 print/print_ret, 2 print_paddr, 3 print_addr, 4 read, 0 none
static uint16_t first_arg;

static void hex(std::string &s, unsigned long v, int digits)
{
    char buf[16];
    std::snprintf(buf, sizeof buf, "%0*lX", digits, v);
    s += buf;
}

static std::string captured;
static void capture(uint8_t c)
{
    if (c == '"' || c == '\\') {
        captured += '\\';
        captured += static_cast<char>(c);
    } else if (c == 13 || c == 10) {
        captured += "\\n";
    } else if (c < 32 || c > 126) {
        char buf[8];
        std::snprintf(buf, sizeof buf, "\\x%02X", c);
        captured += buf;
    } else {
        captured += static_cast<char>(c);
    }
}

static void text_at(uint32_t addr)
{
    captured.clear();
    print_handler(addr, capture);
    line += " t:\"" + captured + "\"";
}

void trace_init()
{
    const char *path = std::getenv("BOCFEL_TRACE");
    if (path != nullptr && *path != 0) {
        trace_file = std::fopen(path, "w");
        trace_enabled = trace_file != nullptr;
    }
}

// The line so far, with the operands as they are now.
static void operands()
{
    line = head + " a:";
    for (int i = 0; i < znargs; i++) {
        if (i > 0) {
            line += ",";
        }
        hex(line, zargs[i], 4);
    }
    if (znargs == 0) {
        line += "-";
    }
}

// The operands are decoded (zargs, znargs) and pc is past them; the handler has not run.
void trace_before()
{
    uint8_t opcode = byte(current_instruction);

    writes.clear();
    head = std::to_string(trace_count++) + " " + std::to_string(call_depth()) + " ";
    hex(head, current_instruction, 5);
    operands();

    // The few opcodes whose text the line carries are the same bytes in every version.
    kind = 0;
    first_arg = znargs > 0 ? zargs[0] : 0;
    if (opcode == 0xb2 || opcode == 0xb3) {
        kind = 1;
        text_at(pc);
    } else if (opcode == 0x8d || opcode == 0x9d || opcode == 0xad) {
        kind = 2;
        text_at(unpack_string(zargs[0]));
    } else if (opcode == 0x87 || opcode == 0x97 || opcode == 0xa7) {
        kind = 3;
        text_at(zargs[0]);
    } else if (opcode == 0xe4) {
        kind = 4;
    }
}

// An extended instruction's operands are decoded by its own handler, after trace_before.
void trace_extended()
{
    operands();
}

void trace_write(uint16_t var, uint16_t value)
{
    if (!trace_enabled) {
        return;
    }
    writes += writes.empty() ? " w:" : ",";
    if (var == 0) {
        writes += "sp";
    } else if (var < 0x10) {
        writes += "L";
        hex(writes, var, 2);
    } else {
        writes += "G";
        hex(writes, var - 0x10, 2);
    }
    writes += "=";
    hex(writes, value, 4);
}

void trace_after()
{
    std::string out = line + writes + " n:";
    hex(out, pc, 5);

    if (kind == 4) {
        // The line read: from byte 1 to a zero to version 4, after a count in byte 1 from 5.
        std::string typed;
        uint16_t tb = first_arg;
        if (zversion <= 4) {
            for (int i = 1; i <= byte(tb) && byte(tb + i) != 0; i++) {
                typed += static_cast<char>(byte(tb + i));
            }
        } else {
            for (int i = 0; i < byte(tb + 1); i++) {
                typed += static_cast<char>(byte(tb + 2 + i));
            }
        }
        captured.clear();
        for (char c : typed) {
            capture(static_cast<uint8_t>(c));
        }
        out += " in:\"" + captured + "\"";
    }

    std::fprintf(trace_file, "%s\n", out.c_str());
    if (kind == 4 || byte(current_instruction) == 0xba) {
        std::fflush(trace_file);
    }
}
