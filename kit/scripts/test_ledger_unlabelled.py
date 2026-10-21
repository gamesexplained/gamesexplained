#!/usr/bin/env python3
"""The ledger counts typed data that no label reaches, and a line comment on bytes no
label reaches explains them (#442). Before, both were left out: coverage read 100 % and
the listing held a gap where a call's inline arguments or a table's tail were."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ledger import MAX_SPAN, compute   # noqa: E402


def block(start, end, kind):
    return {"start": start, "end": end, "type": kind}


def sym(address, name, kind="Field", made="auto"):
    return {"address": address, "name": name, "type": kind, "kind": made}


def line(address, text):
    return {"address": address, "type": "line", "text": text}


def ledger(blocks, syms=(), comments=(), exclude=()):
    return compute(list(blocks), list(syms), list(comments), {"exclude": list(exclude)})


class TypedData(unittest.TestCase):
    def test_typed_data_no_label_reaches_is_bare(self):
        # a call at $1000 and three bytes of argument after it, typed and unlabelled
        L = ledger([block(0x1000, 0x1002, "Code"), block(0x1003, 0x1005, "Byte"),
                    block(0x1006, 0x1006, "Code")])
        self.assertEqual(list(L["state"][0x1003:0x1006]), [1, 1, 1])

    def test_the_tail_past_a_labels_reach_is_bare(self):
        L = ledger([block(0x2000, 0x20FF, "Byte")], [sym(0x2000, "f_2000")],
                   [line(0x2000, "The first 64 bytes of a table.")])
        state = L["state"]
        self.assertEqual(state[0x2000 + MAX_SPAN - 1], 2)
        self.assertEqual(state[0x2000 + MAX_SPAN], 1)
        self.assertEqual(state[0x20FF], 1)

    def test_untyped_bytes_stay_out(self):
        L = ledger([block(0x3000, 0x30FF, "Undefined")])
        self.assertEqual(sum(L["state"][0x3000:0x3100]), 0)

    def test_excluded_typed_data_stays_out(self):
        L = ledger([block(0x0400, 0x07FF, "Byte")], exclude=[(0x0400, 0x07E7, "screen")])
        self.assertEqual(L["state"][0x0400], 0)
        self.assertEqual(L["state"][0x07E8], 1)


class CommentsWithNoLabel(unittest.TestCase):
    def test_a_comment_explains_typed_bytes_to_the_next_label(self):
        L = ledger([block(0x4000, 0x40FF, "Byte")], [sym(0x4080, "t_4080", "UserDefined", "user")],
                   [line(0x4000, "Inline arguments of the first call."), line(0x4080, "Another table.")])
        self.assertEqual(set(L["state"][0x4000:0x4080]), {2})
        self.assertEqual(L["owner"][0x407F], ("the comment at $4000", 0x4000))
        self.assertEqual(L["owner"][0x4080], ("t_4080", 0x4080))

    def test_a_comment_on_untyped_bytes_reaches_as_a_data_label_would(self):
        L = ledger([block(0x5000, 0x50FF, "Undefined")], comments=[line(0x5000, "Never reached.")])
        state = L["state"]
        self.assertEqual(state[0x5000 + MAX_SPAN - 1], 2)
        self.assertEqual(state[0x5000 + MAX_SPAN], 0)

    def test_a_comment_inside_a_span_changes_nothing(self):
        blocks = [block(0x6000, 0x601F, "Code")]
        syms = [sym(0x6000, "routine", "Subroutine", "user")]
        bare = ledger(blocks, syms, [line(0x6010, "The loop.")])
        self.assertEqual(set(bare["state"][0x6000:0x6020]), {1})
        self.assertEqual(bare["owner"][0x6010], ("routine", 0x6000))

    def test_a_repeated_comment_explains_nothing(self):
        L = ledger([block(0x7000, 0x701F, "Byte"), block(0x7020, 0x703F, "Byte")],
                   comments=[line(0x7000, "A table."), line(0x7020, "A table.")])
        self.assertEqual(L["state"][0x7000], 2)
        self.assertEqual(L["state"][0x7020], 1)


if __name__ == "__main__":
    unittest.main()
