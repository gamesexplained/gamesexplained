"""A rejected or interrupted frame request must not look like elapsed game time."""
import json
import unittest
from unittest.mock import Mock

import vice


class FrameAdvanceTests(unittest.TestCase):
    def test_complete_count_is_returned(self):
        result = {"status": "ok", "frames": 120, "PC": 0x4000}
        rpc = Mock(return_value={"result": {"content": [{"text": json.dumps(result)}]}})
        self.assertEqual(vice.frames(rpc, 120), result)
        rpc.assert_called_once_with("tools/call", {"name": "vice_frame_advance", "arguments": {"frames": 120}})

    def test_rejection_or_partial_advance_raises(self):
        replies = [
            {"error": "frames must be between 1 and 1000"},
            {"error": {"code": -32602, "message": "Invalid params"}},
            {"status": "stopped", "frames": 4},
            {"status": "ok", "frames": 4},
            {"status": "ok"},
            None,
        ]
        for result in replies:
            with self.subTest(result=result):
                rpc = Mock(return_value={"result": {"content": [{"text": json.dumps(result)}]}})
                with self.assertRaisesRegex(RuntimeError, "did not complete 120 frames"):
                    vice.frames(rpc, 120)


if __name__ == "__main__":
    unittest.main()
