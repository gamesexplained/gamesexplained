"""The squares worth knowing about, for the Maps tab's list of highlights.

Each entry names a map, the script that runs it (a map that two scripts use
shows both), a piece of the script's own text that finds the squares, a kind
(story, secret, trap, joke or bug) and two sentences for the reader. events.py
finds the squares from the text and fails when the text matches no event, so
an entry cannot point at a square that the extraction does not show.
"""

H = [
    # New Phlan and its halls
    ('00', '08', "CLERK'S OFFICE", 'story', 'The clerk hands out the commissions',
     "The council's clerk lists up to three commissions a visit and pays for each one finished. "
     "When the list runs out the story moves on to Cadorna."),
    ('00', '0B', 'DUELING PAIRS', 'secret', 'The training hall duel is against a copy of your own fighter',
     "The arena opponent is a copy of the member you choose, renamed ROLF. "
     "The others sit out, and a win is worth 50 experience points for each of the copy's levels, with no treasure."),
    # Cadorna Textile House
    ('02', '02', 'DUPLICATE THE SEAL', 'bug', "The thieves' price for resealing Cadorna's box is paid to the party",
     "Restal's guild offers to duplicate the seal on the iron box for half the treasure. Say yes and the script gives the party "
     "200 platinum, 4 gems, 2 pieces of jewelry and items, and the box counts as unopened again. "
     "The offer comes again on every visit until the council has paid for the box."),
    ('02', '02', 'BRASS KEY', 'story', 'Skullcrusher, chained up',
     'A brass key unlocks his chains, and he joins the party until it reaches the city hall.'),
    # Valjevo Castle
    ('03', '03', 'GIVE THE PASSWORD', 'secret', 'The gate password is RHODIA',
     "The guard on the hedge maze's gate asks for it and drops boulders on a wrong answer. "
     "The slips of paper in the barracks spell it in the dwarvish runes of the sign in Yarash's pyramid."),
    ('03', '03', 'LATRINE', 'joke', 'The latrine',
     'The lack of bad smell gives the party a general idea of how well the giants keep house.'),
    ('03', '03', 'BUCKET OF SAND', 'trap', 'A bucket of sand over a door',
     'With Search on the party sees it and kicks the door open first.'),
    ('05', '03', 'PORPHYRYS CADORNA', 'story', 'Porphyrys Cadorna, chained in a cell',
     "He is in the cell only once the council has called him a traitor. Release him and he admits he only thought the pool was here. "
     "Kill him and the council pays for it, and leave him and he raises the alarm."),
    ('05', '03', 'WELL FILLED WITH WATER', 'secret', 'A sword at the bottom of the well',
     'A member who dives deep enough, by a roll against a figure of their own, comes up with a sword. Running out of air costs 1 to 6 hit points.'),
    ('04', '04', 'BEAT IT', 'joke', "'Beat it, beat them! Get it?!'",
     "Talk haughtily to the giants in the pigsty barracks and they bring out the paper with the passwords. Talk slyly and they bring it out "
     "to prove they know them. A nice or meek party gets only this joke."),
    ('04', '04', 'PEACE OF PAPER', 'secret', 'A piece of paper on the ground',
     "With Search on, the party finds today's password and the gate password, both in runes."),
    ('04', '04', 'DO YOU WANT TO TAKE ANYTHING', 'secret', 'The armory never runs out',
     'Every yes loads the same set of arms and armour again, and the script asks again. Nothing marks the armory as emptied.'),
    ('04', '04', 'HARD EVIDENCE', 'story', 'Proof that Cadorna is using the party',
     "When the scribes are gone, searching their building can turn up evidence that Cadorna is seeking the Pool of Radiance for himself, "
     "and a note signed by Tyranthraxus: know me by my flaming aura."),
    ('05', '05', "I'M NOT TYRANTHRAXUS", 'secret', 'The Tyranthraxus on the throne is an impostor',
     "A party that impresses him enough in parlay hears that he was hired to impersonate the boss, and he runs. "
     "Otherwise he complains that the crown is heavy, and attacks."),
    ('05', '05', 'FROGS AND TOADS', 'joke', 'Four giants arguing about frogs and toads',
     'Agree with one of them and the others attack; disagree and the one called Herdrek wants to smash you.'),
    ('03', '05', 'NO PASSWORD', 'joke', 'There is no password',
     "These giants keep saying 'wrong, guess again' to any word, until one time in five they admit there is no password and attack."),
    ('06', '06', 'WASHING CLOTHES', 'secret', 'The washerwomen lend a disguise',
     "Parley and they hand over their clothes and promise to keep quiet. Tie them up or kill them and the screams may be heard."),
    ('06', '06', 'SMOKEHOUSE', 'joke', 'A not quite standard smokehouse', 'The party feels a little sick.'),
    ('06', '06', 'ACCEPT BLESSING', 'trap', "Lord Bane's blessing",
     'Members of some alignments double up in agony at the blessing, and the giants then call the party blasphemers. '
     'Robbing the altar makes every giant in the castle shout thief.'),
    ('07', '07', 'TRAP DOOR', 'trap', 'The trap door to the medusa',
     'Whoever opens it may turn to stone. Jumping down costs everyone 3 to 18 hit points.'),
    ('07', '07', 'PHASE 2', 'secret', 'Genheeris joins the party and quietly leaves it',
     'Frightened, he offers to make the party generals and joins it, then leaves without a word at the audience hall.'),
    ('07', '07', 'AUDIENCE HALL', 'story', 'Tyranthraxus, the bronze dragon by the pool',
     'Twelve fighters first, then the dragon. Before the fight he asks each member to join him, and a member who votes yes fights for him.'),
    # The rest of Phlan
    ('09', '09', 'WAGON', 'secret', "A trader's wagon for the gate",
     "He sells it for 250 gold, or the party kills him for it. He warns that the bugbears at the gate hate the job and fear the ettins."),
    ('0A', '0A', 'SANCTIFY', 'secret', "Sanctify the vampire's coffin",
     'Sanctify the coffin before beating the vampire in his pit. When he floats here as a cloud of vapour and is fought again, '
     'he then has 15 hit points instead of 43, and comes without his 15 wolves.'),
    ('0A', '0A', 'VAPOR', 'story', 'The efreeti fights the vampire',
     'A party that carries the brass bottle from the kobold caves gets the efreeti on its side for this one fight.'),
    ('0A', '0A', '9000', 'secret', "The vampire's treasure", "With Search on after the vampire is gone: 9,000 gold, 12 gems and items."),
    ('0D', '0D', 'SAMIR AHWAHL', 'secret', 'A brass bottle with an efreeti in it',
     "With Search on. He asks whether you are vampires: say no and you keep the bottle, say yes and you fight him."),
    ('0D', '0D', 'SPIKED PIT', 'story', 'The kobold king falls into his own spiked pit',
     'He runs from the fight to his quarters, and the commission counts as done.'),
    ('0E', '0E', 'SUCKERS', 'joke', "The guild master's 'Suckers!'",
     'Let the man you caught go, and he thanks you, walks off, shouts it and sprints away.'),
    ('0E', '0E', 'NW CASTLE', 'secret', 'A map of the castle maze', 'Copied from a slate into the journal.'),
    ('0F', '0F', 'MAD MAN', 'secret', 'Where the Mad Man comes from',
     'Invite the cowering fighter to join and he is the MAD MAN who later screams and attacks in New Phlan, one step in twenty.'),
    ('12', '12', 'WAND OF FEAR', 'secret', 'The auction is for a wand of fear',
     "Outbid the man in plain clothes and he wraps the block in darkness and escapes, while the auctioneer cries 'Garwin, I'll get you!' "
     'Move in close and the prize turns out to be only a wand of fear.'),
    ('12', '12', 'TEMPLE OF ILMATER', 'secret', 'A hidden temple of Ilmater',
     'It heals for nothing, and the party can rest here as long as it likes.'),
    ('12', '12', 'DRINK HEAVILY', 'joke', 'Drinking heavily in the Pitt',
     'A great time until everyone passes out, and the purse is missing.'),
    ('14', '14', 'OHLO', 'secret', "Ohlo's errand",
     'Fetch a potion from a booth in the old rope guild by saying his name, OHLO. He drinks it, grows younger, and pays 150 platinum.'),
    ('14', '14', 'RAGGED OLD WOMAN', 'bug', 'The murdered fortune teller is back at her table',
     "Murder her and the slums forget every fight the party has won there, so the patrols that had stopped come back. "
     "The murder is forgotten too: on the party's next visit to the slums she is sitting at her table again."),
    ('14', '14', '1000 electrum', 'secret', 'The secret treasure room in the north-west corner',
     'A rumour at the hemp market says it is there, and it is: 1,000 electrum, 92 gold, 50 platinum, 2 gems, a piece of jewelry and items.'),
    ('15', '15', 'LONG-DEAD ELF', 'secret', 'A scroll in runes on a dead elf',
     'With Search on, the dead elf by the gate has a parchment with three words in runes: LUX, SAMOSUD and SHESTNI.'),
    ('15', '15', 'WOE, WOOOE', 'secret', 'LUX quiets the haunts',
     'Say it to the weeping figures and they tell their story and give up a diary and five gems.'),
    ('15', '15', 'FERRAN MARTINEZ', 'story', 'Ferran Martinez, the ghost in the chapel',
     'Say LUX, tell him the truth about the city, and he sends the dead to rest and tells you about the illusionary wall in the armory.'),
    ('15', '15', 'PASSING THROUGH AN ILLUSIONARY WALL', 'secret', 'Behind the illusionary wall', 'A shield, a mace, a sword and a small suit of chainmail.'),
    ('15', '15', 'CROAK', 'joke', 'Parley with frogs', "They say 'CROAK!'."),
    ('16', '16', 'THROW A ROCK', 'secret', 'Throw a rock to find a teleporter',
     'With Search on the party feels a tingle near a bare patch of floor. A thrown rock disappears with a flash.'),
    ('16', '16', 'TYRMOR', 'story', 'The journal of Tyrmor', 'On a stripped corpse, with Search on.'),
    ('17', '17', 'KIAIAI', 'trap', "The password that kills: NOTNOW",
     "A sign says 'don't forget the password' in dwarvish runes. Answer anything but NOTNOW and a monster's scream costs every member 201 hit points, with no saving throw."),
    ('17', '17', 'PUMPING ROOM', 'story', 'Three lizard men slaves in the pumping room',
     "Free them and they explain Yarash's plan and how their tribe can help. Attack them and they throw barrels of the black oil."),
    ('17', '17', 'SPECIMENS', 'story', 'Yarash', "'Ah, good, I need more specimens as controls.' Killing him cleans the river."),
    ('17', '17', 'SAHUAGIN', 'joke', 'A bounty for a real sahuagin', "One of the letters on Yarash's desk, to the buccaneers."),
    ('1D', '1D', 'UNHOLY POOL', 'secret', 'The woman on the rug',
     "'An evil spirit from an unholy pool guides your enemies. It hides behind a fair countenance.' Then she vanishes."),
    ('20', '1D', 'NORRIS', 'story', 'Norris the Gray', 'Surrender and the gang strips the party; win and the hideout is yours to rest in.'),
    ('1F', '18', 'NORTH WALL', 'secret', 'A scratched message in a cell', "'NORTH WALL. RI  T FRONT GLAS . SE' points to hidden treasure."),
    ('18', '18', 'HOLY SYMBOL', 'story', 'The way into the Temple of Bane', 'The freed goblins say a holy symbol of Bane gets you in.'),
]
