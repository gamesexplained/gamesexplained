#!/usr/bin/env python3
"""Test world.py on the kit's test game (kit/scumm/testgame.py): that it finds the game's verbs,
actors, pseudo rooms, ways between rooms, lines of text and uses of a variable or an object where
the test game's scripts put them, and that two verbs sharing one script are one handler.

Run as a script; it needs nothing installed.
"""
import contextlib, io, os, shutil, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import testgame  # noqa: E402
import world  # noqa: E402


class World(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.work = tempfile.mkdtemp(prefix="test-world-")
        cls.w = world.World(testgame.write(os.path.join(cls.work, "game")))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.work, ignore_errors=True)

    def test_verbs(self):
        self.assertEqual(self.w.verbs(), {1: ["LOOK"], 2: ["USE"]})

    def test_actors(self):
        kit = self.w.actors()[1]
        self.assertEqual(list(kit.names), ["KIT"])
        self.assertEqual(list(kit.costumes), [1])
        self.assertEqual(list(kit.talk), [3])

    def test_pseudo(self):
        self.assertEqual(self.w.pseudo(), {0x80 | 60: 1})

    def test_exits(self):
        self.assertEqual({to for _, _, to in self.w.exits()}, {1, 2})

    def test_texts(self):
        said = {(who, text) for _, who, text in self.w.texts()}
        for line in (("actor 1", "HELLO"), ("the kid the player moves", "BYE"),
                     (f"new name of object {testgame.BOX}", "CRATE")):
            self.assertIn(line, said)

    def test_shared_script(self):
        """BOX's LOOK and USE share one script: one handler, labelled with both verbs."""
        box = [h for h in self.w.handlers if h.where == "r" and h.number == testgame.BOX]
        self.assertEqual([h.verbs for h in box], [[1, 2]])
        self.assertIn("LOOK (1) / USE (2)", box[0].label(self.w))

    def test_uses(self):
        texts = [i.text for _, i in self.w.uses("var", 130)]
        self.assertIn("Var[130] = 7", texts)
        self.assertIn("Var[14] = 130", texts, "pointing Var[14] at 130 uses the array there")
        self.assertNotIn("Var[14] += 1", [i.text for _, i in self.w.uses("var", 131)])
        names = {i.name for _, i in self.w.uses("object", testgame.LAMP)}
        self.assertTrue({"walkActorToObject", "faceActor", "getObjectOwner"} <= names, names)

    def test_commands(self):
        for args in (["verbs"], ["actors"], ["rooms"], ["pseudo"], ["text", "HEL"],
                     ["objects", "1"], ["object", "1", str(testgame.LAMP)], ["uses", "var", "130"]):
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                self.assertEqual(world.main([self.w.game.folder] + args), 0, args)
            self.assertTrue(out.getvalue().strip(), f"world.py {' '.join(args)} printed nothing")


if __name__ == "__main__":
    unittest.main()
