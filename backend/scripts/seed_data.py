"""Demo content for the seeded build graphs.

Three cars with genuinely different mod cultures, so the demo does not look like the same
graph three times:

  Corolla E170   budget daily — bolt-ons, mild turbo, gravel
  Civic FC/FK    the tuner platform — 1.5T, Si, Type R, K-swap
  WRX VA         rally and AWD — boost, stage tunes, gravel

Every node carries at least two posts. Posts are real, specific build knowledge — boost
limits, fitment, what rubs at full lock — because generic filler reads as fake the moment
a judge opens a node.

Layer order is fixed: level 1 engine → 2 exhaust → 3 wheels → 4 brakes. A child repeats
its parent's mods verbatim and adds exactly one. scripts/seed.py asserts that.
"""

from __future__ import annotations

# --- Toyota Corolla E170 ------------------------------------------------------------

# Slot values must be exact catalogue part names (comma-separated when a slot
# holds more than one priced item) so POST /ai/compare can resolve prices.
COROLLA_NA = "Injen SP Cold Air Intake, DC Sports 4-2-1 Ceramic Header, EcuTek ECU Tune"
COROLLA_TURBO = "Garrett GT2860RS Turbo Kit, Mishimoto Front-Mount Intercooler Kit, EcuTek ECU Tune"
COROLLA_BUILT = "Brian Crower Forged Rod & Piston Kit, Garrett GT3071R Turbo, EcuTek ECU Tune"
COROLLA_EX_NA = "TRD Resonated Cat-Back Exhaust"
COROLLA_EX_TURBO = "Remark 3in Catless Downpipe, Remark 3in Cat-Back Exhaust"
COROLLA_EX_BUILT = "Tomei Expreme Ti Turbo-Back"
COROLLA_EX_CLEARANCE = "Tomei High-Clearance Turbo-Back"
COROLLA_WH_STREET = "Konig Dekagram 17x8 +40"
COROLLA_WH_TRACK = "Enkei RPF1 17x9 +45"
COROLLA_WH_GRAVEL = "Method Race Wheels MR502 16x7"
COROLLA_BR_STREET = "StopTech Street Pads and Stainless Lines"
COROLLA_BR_TRACK = "Wilwood 4-Piston Front Brake Kit 320mm"
COROLLA_BR_RALLY = "Rally Pads with Hydraulic Handbrake Kit"

COROLLA = {
    "id": "toyota-corolla-e170",
    "make": "Toyota", "model": "Corolla", "generation": "E170",
    "yearStart": 2014, "yearEnd": 2019, "yearRange": "2014–2019",
    "rootTitle": "Stock Corolla",
    "nodes": [
        # (id, title, parents, summary, author, hours, heat, mods)
        ("c-na", "Naturally Aspirated", ["c-root"],
         "Intake, header and a conservative tune. The cheapest real power.",
         "ahmed", 640, 0.72, {"engine": COROLLA_NA}),
        ("c-turbo", "Turbo", ["c-root"],
         "GT2860 at 8psi on the stock bottom end. Daily-able.",
         "ahmed", 620, 0.90, {"engine": COROLLA_TURBO}),
        ("c-built", "Built Block", ["c-root"],
         "Forged internals, GT3071R at 18psi. No longer a commuter.",
         "ahmed", 600, 0.85, {"engine": COROLLA_BUILT}),

        ("c-na-quiet", "NA · Resonated", ["c-na"],
         "Fully resonated. Power without the drone on a long commute.",
         "abdullah", 560, 0.50,
         {"engine": COROLLA_NA, "exhaust": COROLLA_EX_NA}),
        ("c-turbo-3in", "Turbo · 3in Catback", ["c-turbo"],
         "3in downpipe and catback. Loud under load, civil at cruise.",
         "ahmed", 540, 0.78,
         {"engine": COROLLA_TURBO, "exhaust": COROLLA_EX_TURBO}),
        ("c-built-straight", "Built · Straight Through", ["c-built"],
         "3.5in turbo-back, no silencing. Track use only.",
         "ahmed", 520, 0.80,
         {"engine": COROLLA_BUILT, "exhaust": COROLLA_EX_BUILT}),
        ("c-built-clearance", "Built · High Clearance", ["c-built"],
         "3.5in routed high for stage use. Survives ruts.",
         "shoaib", 500, 0.70,
         {"engine": COROLLA_BUILT, "exhaust": COROLLA_EX_CLEARANCE}),

        ("c-turbo-street", "Turbo · Street Wheels", ["c-turbo-3in"],
         "17in cast on a road tyre. Daily proportions.",
         "abdullah", 460, 0.55,
         {"engine": COROLLA_TURBO, "exhaust": COROLLA_EX_TURBO,
          "wheels": COROLLA_WH_STREET}),
        ("c-built-track", "Built · Track Wheels", ["c-built-straight"],
         "17in forged on semi-slicks. Unsprung weight over looks.",
         "ahmed", 440, 0.82,
         {"engine": COROLLA_BUILT, "exhaust": COROLLA_EX_BUILT,
          "wheels": COROLLA_WH_TRACK}),
        ("c-built-gravel", "Built · Gravel Wheels", ["c-built-clearance"],
         "16in steel on all-terrain. Sidewall is the whole point.",
         "kshitij", 420, 0.75,
         {"engine": COROLLA_BUILT, "exhaust": COROLLA_EX_CLEARANCE,
          "wheels": COROLLA_WH_GRAVEL}),

        ("c-turbo-daily", "Turbo Daily", ["c-turbo-street"],
         "OEM+ pads and stainless lines. Finished street car.",
         "abdullah", 380, 0.60,
         {"engine": COROLLA_TURBO, "exhaust": COROLLA_EX_TURBO,
          "wheels": COROLLA_WH_STREET, "brakes": COROLLA_BR_STREET}),
        ("c-track-weapon", "Track Weapon", ["c-built-track"],
         "4-pot front on 320mm rotors. Survives a full session.",
         "ahmed", 300, 0.88,
         {"engine": COROLLA_BUILT, "exhaust": COROLLA_EX_BUILT,
          "wheels": COROLLA_WH_TRACK, "brakes": COROLLA_BR_TRACK}),
        ("c-gravel-rally", "Gravel Rally", ["c-built-gravel"],
         "Rally pads and a hydraulic handbrake. Stops on loose surface.",
         "shoaib", 260, 0.80,
         {"engine": COROLLA_BUILT, "exhaust": COROLLA_EX_CLEARANCE,
          "wheels": COROLLA_WH_GRAVEL, "brakes": COROLLA_BR_RALLY}),

        ("c-rally", "Turbo Rally Build", ["c-track-weapon", "c-gravel-rally"],
         "Fusion: track brakes on gravel wheels, detuned to 14psi for reliability.",
         "kshitij", 96, 0.95,
         {"engine": COROLLA_BUILT,
          "exhaust": COROLLA_EX_CLEARANCE,
          "wheels": COROLLA_WH_GRAVEL,
          "brakes": f"{COROLLA_BR_TRACK}, {COROLLA_BR_RALLY}"}),
    ],
    "posts": {
        "c-root": [
            ("kshitij", "text", "Why start here",
             "Every build on this page grew from a bone-stock 1.8L. Worth knowing the "
             "baseline is 132hp before you read anyone's dyno claim.", 700, {}),
            ("abdullah", "image", "Stock engine bay, 2016",
             "Reference shot before anything was touched. Useful for spotting what has "
             "actually changed in the photos further down the tree.", 690, {"media": True}),
            ("shoaib", "image", "The car that started this page",
             "Bought it for $4,200 with 140k on the clock because it was the only manual "
             "left in the classifieds. Everything below traces back to this exact car.",
             680, {"media": True}),
            ("kshitij", "text", "The 2ZR block is tougher than people give it credit for",
             "140k miles before anyone touched the head. Whatever else you hear about "
             "these, the bottom end holds up.", 665, {}),
        ],
        "c-na": [
            ("ahmed", "blueprint", "Header routing diagram",
             "Blueprint of the 4-2-1 primaries and where they clear the steering shaft. "
             "Useful if you are fabricating rather than buying.", 630, {"media": True}),
            ("shoaib", "text", "Tune before you spend on hardware",
             "The intake alone did almost nothing measurable. Same intake with a proper "
             "tune was worth about 14whp. Order matters more than parts here.", 620, {}),
            ("abdullah", "text", "Header fitment on a 2016",
             "The 4-2-1 fouls the OEM heat shield. Ten minutes with tin snips or you "
             "will hear it rattling at every light.", 610, {}),
            ("kshitij", "image", "Finished bay, four months in",
             "Every bracket that could be cleaned up, was. Still just an NA 1.8 "
             "underneath, but it doesn't look like it anymore.", 600, {"media": True}),
            ("shoaib", "text", "Ceramic coat the header or regret it",
             "Uncoated one on mine discolored within a month. The coated header two "
             "builds later still looks new.", 580, {}),
            ("ahmed", "text", "This is still the build I recommend first",
             "Cheapest entry, least that can go wrong, and it is still noticeably "
             "quicker than stock. Start here before you talk yourself into a turbo.",
             40, {}),
        ],
        "c-turbo": [
            ("ahmed", "voice", "Corolla revving — 8psi spool",
             "Cold start then three pulls to redline. Spool comes in around 3200 and "
             "you can hear the blow-off between shifts. No rattle on overrun, so the "
             "wastegate is holding.", 615, {"duration": 27}),
            ("shoaib", "text", "Boost ceiling on a stock block",
             "8psi has held for 20k miles on mine. Everyone I know who pushed past 10 on "
             "a stock bottom end lost ringlands within a season.", 610, {}),
            ("ahmed", "image", "Intercooler piping routing",
             "Piping runs behind the bumper support rather than through it — no cutting, "
             "and it comes out again in twenty minutes.", 605, {"media": True}),
            ("ahmed", "voice", "Stock baseline before the downpipe",
             "Recording this before the 3in setup goes on so there is an actual "
             "before-and-after instead of just claims. GT2860 at 8psi, stock downpipe "
             "and catback, everything else untouched.",
             560, {"duration": 24, "audio": "stock.mp3", "as": "boosted_2zr"}),
            ("shoaib", "image", "Engine bay after the intercooler swap",
             "Front-mount replaced the side-mount from the kit. Charge pipe routing got "
             "a lot simpler.", 480, {"media": True}),
            ("kshitij", "text", "Fuel is the part people forget to budget",
             "Stock injectors held to about 9psi on my car before the logs showed lean "
             "spikes. Budget for injectors if you are pushing past 8.", 300, {}),
        ],
        "c-built": [
            ("ahmed", "text", "What forged actually costs",
             "Rods, pistons, bearings, machining and gaskets came to about $3,400 before "
             "labour. The turbo was the cheap part of this step.", 590, {}),
            ("kshitij", "sketch", "Bearing clearance notes",
             "Sketch of the clearances we ended up at after machining. Slightly loose on "
             "the mains for the boost target.", 580, {"media": True}),
            ("ahmed", "image", "Block on the bench before assembly",
             "Bored 0.5mm over, forged rods and pistons staged next to it. This is the "
             "point of no return on cost.", 570, {"media": True}),
            ("kshitij", "text", "Machine shop choice matters more than parts choice",
             "Went with a shop that specializes in these blocks specifically. Clearances "
             "came back tighter than a generalist shop quoted.", 555, {}),
        ],
        "c-na-quiet": [
            ("abdullah", "text", "Resonator placement matters",
             "First catback droned badly at 70mph. Moving the resonator 200mm further "
             "back killed it completely. Same pipe, same muffler.", 550, {}),
            ("abdullah", "image", "Tip alignment after the swap",
             "Tips sit 8mm proud of the bumper cut. Looks intentional rather than like "
             "something fell off.", 11, {"media": True}),
            ("ahmed", "text", "Resonator brand actually makes a difference here",
             "Tried two before landing on one that killed the drone without choking "
             "flow. The cheapest option made it worse, not better.", 200, {}),
            ("abdullah", "image", "Muffler shop welds, close up",
             "Paid the extra $40 for someone who does this daily instead of a general "
             "shop. Seams are half the thickness of my last car's.", 8, {"media": True}),
        ],
        "c-turbo-3in": [
            ("kshitij", "sketch", "Downpipe clearance sketch",
             "Where the 3in downpipe fouls the steering rack. Needs a dimple or you will "
             "feel it through the wheel at idle.", 530, {"media": True}),
            ("shoaib", "text", "Catless on a daily",
             "Fine until inspection. If your state tests, budget for a high-flow cat now "
             "rather than redoing the whole mid-pipe later.", 525, {}),
            ("ahmed", "voice", "Same car, downpipe and catback both on now",
             "Same road, same gear as the stock clip up on the Turbo node. Turn it up — "
             "you can actually hear the wastegate now instead of it getting swallowed by "
             "the stock system.",
             475, {"duration": 26, "audio": "modded.mp3", "as": "boosted_2zr"}),
            ("ahmed", "text", "Downpipe alone was most of the sound change",
             "Catback added maybe 10% more on top of that. If you are doing this in "
             "stages, the downpipe is the one that actually changes the character.",
             470, {}),
        ],
        "c-built-straight": [
            ("ahmed", "voice", "Corolla revving — big turbo, 18psi",
             "Transcript: much later spool than the GT2860, nothing until about 4000rpm, "
             "then it comes in hard. Straight-through is loud enough that the intake "
             "noise disappears above 5000.", 515, {"duration": 34}),
            ("ahmed", "text", "Not road legal, and not pleasant",
             "Drone between 2500 and 3000 is genuinely painful on a highway. This is a "
             "trailer-it-to-the-track setup.", 510, {}),
            ("ahmed", "image", "Turbo-back laid out before install",
             "3.5in mandrel bent, no resonator, no muffler. This is what 'not road "
             "legal' actually looks like in parts form.", 505, {"media": True}),
            ("kshitij", "text", "Wear earplugs, seriously",
             "Did a two-hour track day without them once. Ears rang the whole drive "
             "home. Learn from me.", 100, {}),
        ],
        "c-built-clearance": [
            ("shoaib", "image", "Routing over the rear subframe",
             "Photo of the high-clearance section. Roughly 90mm higher than the stock "
             "path at its lowest point.", 495, {"media": True}),
            ("shoaib", "text", "Heat shielding is not optional",
             "Routing it that high puts the pipe near the fuel line. Wrap it or move "
             "the line — do not skip this.", 490, {}),
            ("shoaib", "text", "Ground clearance number, measured",
             "About 90mm more than the street routing at the lowest point. Cleared "
             "every rut on the stage roads I tested it on.", 480, {}),
            ("kshitij", "image", "Skid plate added after the first rock strike",
             "First stage put a dent straight into the pipe. Skid plate ever since, "
             "zero issues.", 60, {"media": True}),
        ],
        "c-turbo-street": [
            ("abdullah", "text", "215/45 on a 17 is the sweet spot",
             "Wider looked better but tramlined badly on grooved highway. Went back to "
             "215 and the car is much calmer.", 455, {}),
            ("kshitij", "image", "Fitment at stock height",
             "No rubbing, no spacers. Roughly a finger of gap at the front arch.", 450,
             {"media": True}),
            ("kshitij", "text", "Ride height matters more than the wheel choice",
             "Dropped 20mm and the 17s finally looked proportional. Stock height with "
             "these wheels looked off to me.", 300, {}),
            ("abdullah", "image", "One year later, still on the same set",
             "No curb rash, no bent barrels. These have survived a daily commute better "
             "than I expected.", 30, {"media": True}),
        ],
        "c-built-track": [
            ("ahmed", "text", "Semi-slicks need heat",
             "First two laps on cold R-comps are genuinely worse than the street tyre. "
             "Do not judge them on an out-lap.", 435, {}),
            ("ahmed", "image", "Wheel weight comparison",
             "Forged 17s next to the stock 16s on a scale — 3.1kg lighter per corner.",
             430, {"media": True}),
            ("ahmed", "text", "Alignment specs that actually worked",
             "-2.5 front camber, stock toe. Anything more aggressive just chewed the "
             "inside edge faster without a lap time gain I could measure.", 420, {}),
            ("kshitij", "video", "First session on the semi-slicks",
             "", 50, {"media": True, "duration": 55, "transcribed": False}),
        ],
        "c-built-gravel": [
            ("kshitij", "text", "Cheapest way to real sidewall",
             "215/65 on a 16in steel is the cheapest sidewall on this chassis. Whole "
             "setup under $600 used, and steels bend instead of cracking.", 415, {}),
            ("shoaib", "image", "Spacer fitment at full lock",
             "+30mm spacers, no rubbing at full lock after rolling the front lip. Photo "
             "is at full steering deflection.", 410, {"media": True}),
            ("shoaib", "text", "Steel wheels bend instead of cracking, exactly as advertised",
             "Curbed one hard on a rally stage. Popped back with a hammer instead of "
             "needing a whole new wheel. Would have been a DNF on the forged set.",
             100, {}),
            ("kshitij", "image", "Full set after a season of stages",
             "Dents everywhere but none of them cracked. This is what 'cheap sidewall' "
             "actually buys you.", 15, {"media": True}),
        ],
        "c-turbo-daily": [
            ("abdullah", "text", "Stainless lines are the cheap win",
             "Pedal feel changed more from $60 of lines than from the pads. Do lines "
             "first if you are on a budget.", 370, {}),
            ("abdullah", "voice", "Exhaust note at cruise",
             "Transcript: 70mph highway pull with the window down. Almost no drone — "
             "this is the resonated setup doing its job.", 365, {"duration": 19}),
            ("abdullah", "image", "Finished daily, two years in",
             "Nothing left on the list. Every part on this build has a reason, and it "
             "still passes inspection every year without issue.", 20, {"media": True}),
            ("kshitij", "text", "This is the one I point people to",
             "Newcomers always ask which build to copy. It's this one — quick enough "
             "to be fun, boring enough to not think about.", 10, {}),
        ],
        "c-track-weapon": [
            ("ahmed", "text", "Pad choice over caliper size",
             "The 4-pots looked great but the real change was going to a proper track "
             "pad. Stock calipers with good pads would have got 80% of this.", 290, {}),
            ("ahmed", "video", "Session at Mosport, lap 6",
             "", 285, {"media": True, "duration": 64, "transcribed": False}),
            ("ahmed", "image", "Rotor wear after a full season",
             "Even wear, no cracking, no warping. The 320mm setup is doing exactly what "
             "it is supposed to.", 60, {"media": True}),
            ("kshitij", "text", "Bleeding these properly takes two people",
             "Long lines to the front means air pockets are easy to miss solo. Get a "
             "second set of hands or a pressure bleeder.", 5, {}),
        ],
        "c-gravel-rally": [
            ("shoaib", "voice", "Handbrake feel after the swap",
             "Transcript: walking through the hydraulic handbrake install and how much "
             "lever travel there is before it bites. Much shorter throw than the cable "
             "setup.", 250, {"duration": 41}),
            ("shoaib", "text", "Rally pads are terrible cold",
             "Almost no bite for the first minute. Fine on a stage, genuinely dangerous "
             "on a school run.", 245, {}),
            ("shoaib", "image", "Handbrake lever, after the swap",
             "Shorter throw than stock, mounted about 20mm further back to clear the "
             "seat in a full-lock pull.", 80, {"media": True}),
            ("kshitij", "text", "Warm the pads before you need them",
             "Learned this the hard way pulling the handbrake cold into a hairpin. Do a "
             "couple of test pulls before the stage starts.", 15, {}),
        ],
        "c-rally": [
            ("kshitij", "text", "Why 14psi instead of 18",
             "Dropped from 18 to 14 for gravel. Losing about 40hp, but heat soak on a "
             "long stage was killing it and I would rather finish.", 6, {}),
            ("kshitij", "video", "Gravel test run — second gear pulls",
             "", 3, {"media": True, "duration": 52, "transcribed": False}),
            ("ahmed", "text", "The fusion actually works",
             "Track brakes on gravel wheels sounds wrong but the 4-pots cope with the "
             "heat far better than the vented discs did.", 4, {}),
            ("kshitij", "image", "Finished rally build, morning of the first event",
             "Two years of parts sitting in a garage and it is finally a running, "
             "entered car. Still cannot quite believe it.", 2, {"media": True}),
            ("shoaib", "text", "This is what the whole tree was building toward",
             "Every branch above fed into this one decision or another. Feels less "
             "like a build now and more like a conclusion.", 1, {}),
        ],
    },
    "replies": [
        ("c-turbo", 1, "ahmed", "Seconding this. I went to 11psi for a summer and it cost me a rebuild.", 608),
        ("c-turbo", 1, "abdullah", "What tune were you on? Wondering if timing was the real culprit.", 606),
        ("c-turbo", 0, "kshitij", "That spool sounds way earlier than mine. Twin-scroll manifold?", 612),
        ("c-rally", 0, "shoaib", "Smart call. Everyone chases peak numbers then cooks the motor on stage 3.", 4),
        ("c-built-gravel", 0, "abdullah", "Any speedo error on the taller tyre?", 412),
        ("c-turbo", 0, "kshitij", "That spool is earlier than mine. Are you on the twin-scroll manifold?", 600),
        ("c-root", 0, "shoaib", "This baseline is the whole reason the rest of the tree makes sense.", 695),
        ("c-root", 1, "ahmed", "Clean bay. Makes it easy to spot what changed later.", 685),
        ("c-na", 0, "kshitij", "Saved this diagram for my own build. Super clean.", 625),
        ("c-na", 2, "shoaib", "Same rattle on mine until I did this exact fix.", 605),
        ("c-built", 1, "abdullah", "Bookmarking this sketch, exactly what I needed.", 575),
        ("c-na-quiet", 1, "kshitij", "Tip alignment looks factory. Nice work.", 9),
        ("c-turbo-3in", 0, "ahmed", "This clearance issue got me too. Wish I'd seen this first.", 528),
        ("c-built-straight", 1, "shoaib", "Loud is an understatement from what I've heard in person.", 508),
        ("c-built-clearance", 1, "kshitij", "Good call on the heat shielding, saw a melted line once from skipping this.", 488),
        ("c-turbo-street", 1, "ahmed", "Clean fitment, no rubbing is the dream.", 448),
        ("c-built-track", 1, "shoaib", "That weight saving is huge for unsprung mass.", 428),
        ("c-built-gravel", 1, "abdullah", "Steel wheels are underrated for this exact reason.", 408),
        ("c-turbo-daily", 0, "kshitij", "Lines are always overlooked. Good tip.", 368),
        ("c-track-weapon", 0, "ahmed", "Pads over calipers is underrated advice.", 288),
        ("c-gravel-rally", 1, "shoaib", "Cold bite scared me too on my first stage.", 243),
        ("c-root", 2, "abdullah", "That price for a manual is wild now. They basically don't show up used anymore.", 675),
        ("c-root", 2, "kshitij", "Same story here. Grabbed mine off a fleet auction, would not find that again.", 670),
        ("c-na", 1, "kshitij", "Tune before hardware is underrated advice. Wish someone told me that on my first build.", 615),
        ("c-na", 5, "shoaib", "Seconding this. Everyone wants to jump straight to boost.", 35),
        ("c-na", 5, "ahmed", "Also just cheaper to insure if that matters where you live.", 32),
        ("c-turbo", 3, "kshitij", "Which tuner? Curious if this is a shop map or a canned one.", 557),
        ("c-turbo", 3, "shoaib", "Setting a baseline before you touch the exhaust is the right call. More people should do this.", 555),
        ("c-turbo", 5, "ahmed", "Injectors are always the thing nobody mentions until it's already lean.", 295),
        ("c-built", 0, "shoaib", "3400 seems almost reasonable compared to what I've seen built LS motors go for.", 585),
        ("c-built", 3, "abdullah", "Worth naming the shop? Looking for one in the same region.", 550),
        ("c-na-quiet", 0, "kshitij", "Which one ended up working? About to do this exact swap.", 545),
        ("c-na-quiet", 3, "shoaib", "Those welds are clean. Worth the drive if the shop isn't local.", 6),
        ("c-turbo-3in", 2, "shoaib", "Played both clips back to back. Night and day.", 468),
        ("c-turbo-3in", 2, "kshitij", "That's basically what everyone says about the downpipe on every platform.", 465),
        ("c-turbo-3in", 1, "abdullah", "Any inspection issues in states that check for cats?", 522),
        ("c-built-straight", 0, "shoaib", "That spool point is way later than the small turbo build. Makes sense given the size difference.", 512),
        ("c-built-straight", 2, "ahmed", "Genuinely good advice, people underrate hearing damage from these builds.", 95),
        ("c-built-clearance", 0, "abdullah", "How does ground clearance compare to the straight-through setup?", 485),
        ("c-built-clearance", 3, "shoaib", "That first strike is basically a rite of passage on gravel. Glad you added the plate.", 55),
        ("c-turbo-street", 0, "ahmed", "215 being the sweet spot matches what I found on a totally different platform.", 452),
        ("c-turbo-street", 3, "kshitij", "That's the real test of a wheel, honestly. A year of daily driving beats any spec sheet.", 25),
        ("c-built-track", 0, "shoaib", "Good data point. Was about to go more aggressive than that.", 415),
        ("c-built-track", 3, "ahmed", "How did the tires hold up by the end of the day?", 45),
        ("c-built-track", 3, "kshitij", "Still had tread left, surprisingly. Heat cycling seems to matter more than mileage on these.", 42),
        ("c-built-gravel", 2, "abdullah", "This is exactly why I went steel on my gravel car too. Forged looks better parked, this looks better finished.", 95),
        ("c-built-gravel", 3, "shoaib", "That's a lot of abuse for one season. Holding up better than I expected honestly.", 12),
        ("c-turbo-daily", 0, "shoaib", "Lines first is solid advice on basically every car, not just this one.", 368),
        ("c-turbo-daily", 3, "ahmed", "Genuinely the most useful post on this whole page for someone starting out.", 8),
        ("c-track-weapon", 0, "shoaib", "This matches what I found going to good pads before spending on calipers on the Civic side.", 285),
        ("c-track-weapon", 3, "abdullah", "Pressure bleeder paid for itself after the second brake job for me.", 3),
        ("c-gravel-rally", 0, "ahmed", "That travel difference sounds significant. How long did the swap take?", 248),
        ("c-gravel-rally", 3, "shoaib", "Painfully learned, unfortunately. Glad you're passing it on.", 10),
        ("c-rally", 0, "abdullah", "Wish more people understood detuning for reliability instead of chasing a number.", 5),
        ("c-rally", 3, "ahmed", "That last photo says more than the whole build log honestly.", 1),
        ("c-rally", 4, "kshitij", "Feels that way to me too. Onto the next one already though.", 0.5),
    ],
}


# --- Honda Civic FC/FK (10th gen) ---------------------------------------------------

CIVIC_15T = "PRL Motorsports High Volume Intake System, Mishimoto Performance Intercooler Kit, Hondata FlashPro (2016-2021 Civic 1.5T)"
CIVIC_SI = "Mishimoto Performance Intercooler Kit, Hondata FlashPro (2016-2021 Civic 1.5T)"
CIVIC_K24 = "Skunk2 Alpha Series Camshafts K24"
CIVIC_EX_15T = "MagnaFlow Resonated Cat-Back"
CIVIC_EX_SI = "PRL Motorsports Front Pipe (Catted), Borla S-Type Cat-Back Exhaust 140742"
CIVIC_EX_K24 = "Skunk2 MegaPower RR Exhaust"
CIVIC_WH_15T = "Konig Hypergram 18x8 +40"
CIVIC_WH_SI = "Enkei RPF1 18x9.5 +38 5x114.3"
CIVIC_WH_K24 = "Enkei RPF1 18x9.5 +38 5x114.3"
CIVIC_BR_STREET = "StopTech Street Performance Pads (Front), Goodridge G-Stop Stainless Brake Line Kit"
CIVIC_BR_TRACK = "StopTech 4-Piston BBK 330mm (Front), Hawk HP Plus Track Pads (Front)"
CIVIC_TYPER = "K20C1 Type R Swap Kit (FK8 Complete Engine/Trans), Hondata FlashPro (2017-2021 Civic Type R)"
CIVIC_EX_TYPER = "HKS Legamax Premium Cat-Back Exhaust (FK8-Adapted)"
CIVIC_WH_TYPER = "FK8 Type R OEM 19x8.5 Wheels (Direct Fit)"
CIVIC_BR_TYPER = "FK8 Type R Brembo 4-Piston BBK 350mm (Direct Fit)"

CIVIC = {
    "id": "honda-civic-fc-fk-10th-gen",
    "make": "Honda", "model": "Civic", "generation": "FC/FK (10th gen)",
    "yearStart": 2016, "yearEnd": 2021, "yearRange": "2016–2021",
    "rootTitle": "Stock Civic",
    "nodes": [
        ("h-15t", "1.5T Tuned", ["h-root"],
         "FlashPro stage 1 on the base turbo motor. Cheapest real gain on this chassis.",
         "abdullah", 580, 0.86, {"engine": CIVIC_15T}),
        ("h-si", "Si Build", ["h-root"],
         "K20C2 turned up. Factory LSD does the rest.",
         "ahmed", 560, 0.80, {"engine": CIVIC_SI}),
        ("h-k24", "K24 Swap", ["h-root"],
         "NA K-series with cams and ITBs. Old-school Honda, revs forever.",
         "shoaib", 540, 0.75, {"engine": CIVIC_K24}),

        ("h-15t-quiet", "1.5T · Quiet Catback", ["h-15t"],
         "Resonated. The 1.5T drones badly otherwise.",
         "abdullah", 500, 0.62,
         {"engine": CIVIC_15T, "exhaust": CIVIC_EX_15T}),
        ("h-si-3in", "Si · 3in Turbo-Back", ["h-si"],
         "Downpipe and catback. Wakes the K20 up above 4000.",
         "ahmed", 480, 0.78,
         {"engine": CIVIC_SI, "exhaust": CIVIC_EX_SI}),
        ("h-k24-header", "K24 · Header-Back", ["h-k24"],
         "4-1 header on an NA motor. All of it is above 5000rpm.",
         "shoaib", 460, 0.70,
         {"engine": CIVIC_K24, "exhaust": CIVIC_EX_K24}),

        ("h-15t-18", "1.5T · 18in Street", ["h-15t-quiet"],
         "18in on a 235. Fills the arch without wrecking the ride.",
         "abdullah", 420, 0.60,
         {"engine": CIVIC_15T, "exhaust": CIVIC_EX_15T,
          "wheels": CIVIC_WH_15T}),
        ("h-si-track", "Si · Track Wheels", ["h-si-3in"],
         "18in forged on 200TW. Same size, three kilos lighter.",
         "ahmed", 400, 0.84,
         {"engine": CIVIC_SI, "exhaust": CIVIC_EX_SI,
          "wheels": CIVIC_WH_SI}),
        ("h-k24-light", "K24 · Lightweight 17s", ["h-k24-header"],
         "17s to keep the gearing usable on an NA motor.",
         "shoaib", 380, 0.68,
         {"engine": CIVIC_K24, "exhaust": CIVIC_EX_K24,
          "wheels": CIVIC_WH_K24}),

        ("h-15t-street", "1.5T Street", ["h-15t-18"],
         "Pads and lines. A complete, quiet, quick daily.",
         "abdullah", 320, 0.66,
         {"engine": CIVIC_15T, "exhaust": CIVIC_EX_15T,
          "wheels": CIVIC_WH_15T,
          "brakes": CIVIC_BR_STREET}),
        ("h-si-bbk", "Si · Big Brakes", ["h-si-track"],
         "4-pot 330mm. The Si's weak point solved.",
         "ahmed", 280, 0.90,
         {"engine": CIVIC_SI, "exhaust": CIVIC_EX_SI,
          "wheels": CIVIC_WH_SI,
          "brakes": CIVIC_BR_TRACK}),

        ("h-hybrid", "Si Chassis, K24 Heart", ["h-si-bbk", "h-k24-light"],
         "Fusion: the Si's brakes and wheels under a naturally aspirated K24.",
         "kshitij", 60, 0.92,
         {"engine": CIVIC_K24,
          "exhaust": CIVIC_EX_K24,
          "wheels": CIVIC_WH_SI,
          "brakes": CIVIC_BR_TRACK}),

        ("h-typer", "Type R Swap", ["h-root"],
         "K20C1 out of a wrecked FK8, complete with its own trans and ECU. The swap nobody "
         "budgets for correctly.",
         "kshitij", 300, 0.89, {"engine": CIVIC_TYPER}),
        ("h-typer-hks", "Type R · HKS Cat-Back", ["h-typer"],
         "Legamax cat-back adapted to the FK8 turbo-back. Keeps the OEM downpipe and cat.",
         "shoaib", 260, 0.82,
         {"engine": CIVIC_TYPER, "exhaust": CIVIC_EX_TYPER}),
        ("h-typer-19", "Type R · 19in OEM", ["h-typer-hks"],
         "Direct-fit FK8 wheels onto the FC/FK bolt pattern. No adapters, no spacers.",
         "abdullah", 220, 0.80,
         {"engine": CIVIC_TYPER, "exhaust": CIVIC_EX_TYPER,
          "wheels": CIVIC_WH_TYPER}),
        ("h-typer-brembo", "Type R · Brembo Swap", ["h-typer-19"],
         "FK8's own 4-pot Brembos, direct fit under the 19s. The brakes the swap should have "
         "come with.",
         "kshitij", 150, 0.93,
         {"engine": CIVIC_TYPER, "exhaust": CIVIC_EX_TYPER,
          "wheels": CIVIC_WH_TYPER, "brakes": CIVIC_BR_TYPER}),
    ],
    "posts": {
        "h-root": [
            ("abdullah", "text", "Which 10th gen you have matters",
             "The 2.0 NA and the 1.5T are completely different platforms to mod. Almost "
             "nothing on this tree applies to the base 2.0.", 570, {}),
            ("ahmed", "image", "Trim comparison, LX vs Si",
             "Side by side. The Si brake and wheel package is worth buying into up "
             "front rather than retrofitting.", 565, {"media": True}),
            ("shoaib", "text", "Buy the trim you actually want to end up with",
             "Started on an LX planning to swap everything. Ended up selling it and "
             "buying an Si instead — cheaper in the end than chasing parity part by "
             "part.", 555, {}),
            ("kshitij", "image", "Three trims side by side at a meet",
             "LX, Si and a K24-swapped car parked together by accident. Good visual "
             "for how differently this platform splits.", 20, {"media": True}),
        ],
        "h-15t": [
            ("abdullah", "text", "FlashPro is the whole mod",
             "Stage 1 on 91 was worth about 40whp and 60lb-ft over stock. Nothing else "
             "on this list comes close per dollar.", 575, {}),
            ("abdullah", "voice", "1.5T before and after the flash",
             "Transcript: two pulls, stock map then stage 1. The difference is mostly "
             "in how early it pulls rather than the top end.", 570, {"duration": 31}),
            ("shoaib", "text", "Watch your intake air temps",
             "Stock intercooler heat-soaks in about three pulls. The tune will pull "
             "timing and you will wonder where the power went.", 566, {}),
            ("abdullah", "image", "Boost gauge added post-tune",
             "Cheap add, but knowing peak boost on every pull caught a leaking "
             "coupler before it became a real problem.", 480, {"media": True}),
            ("kshitij", "text", "This is the mod that actually changes daily driving",
             "Everything after this on the tree is nice to have. The FlashPro is the "
             "one that changes how the car feels every single drive.", 3, {}),
        ],
        "h-si": [
            ("ahmed", "voice", "Stock Si exhaust, for reference",
             "Recording this before anything goes on the exhaust so there's a baseline "
             "to compare against. K20C2, stock everything from the turbo back. It is "
             "quiet — almost disappointingly so for what the engine actually is.",
             558, {"duration": 55, "audio": "stock.mp3", "as": "k20c2_si"}),
            ("ahmed", "text", "The factory LSD changes everything",
             "Coming from the 1.5T, the Si putting power down out of a corner is the "
             "real upgrade. The extra 25hp is almost incidental.", 555, {}),
            ("ahmed", "image", "25psi on the stock K20C2",
             "Boost log screenshot. Held flat to redline once the intercooler was "
             "sorted.", 550, {"media": True}),
            ("kshitij", "image", "Si next to the 1.5T it replaced",
             "Traded a tuned 1.5T for this stock Si and I'm still not sure I made the "
             "right call. Ask me again once the exhaust goes on.", 200, {"media": True}),
            ("ahmed", "text", "The LSD alone is worth cross-shopping used",
             "Found a clean used Si for barely more than a tuned 1.5T would've cost. "
             "If you can find one, the diff changes the math on the whole build.",
             10, {}),
        ],
        "h-k24": [
            ("shoaib", "voice", "K24 with ITBs at 8000rpm",
             "Transcript: individual throttle bodies on an NA K24. The induction noise "
             "above 6000 is the entire reason people do this swap.", 535, {"duration": 38}),
            ("shoaib", "sketch", "ITB linkage clearance",
             "Sketch of where the linkage fouls the strut tower on an FC. Needs a "
             "spacer or a shortened arm.", 530, {"media": True}),
            ("kshitij", "text", "Swap cost reality check",
             "Motor, mounts, harness, ECU and tune came to about $8,500 done properly. "
             "A tuned Si is faster for half that.", 525, {}),
            ("shoaib", "voice", "Cold start, idle only",
             "Recorded before any driving, just letting the ITBs settle at idle. That "
             "slight lope is the cams, not a tuning issue — took me a week to stop "
             "worrying about it.",
             500, {"duration": 26, "audio": "stockx2.mp3", "as": "swapped_not_stock"}),
            ("kshitij", "image", "ITB linkage after the fix",
             "Shortened arm cleared the strut tower with about 4mm to spare. Ugly "
             "fix, works perfectly.", 350, {"media": True}),
            ("ahmed", "text", "Nobody does this swap for the numbers",
             "Objectively worse power-to-dollar than either turbo option. Do it "
             "because you want an NA Honda that revs to 8500, not because it's "
             "efficient.", 5, {}),
        ],
        "h-15t-quiet": [
            ("abdullah", "text", "The 1.5T drone is real",
             "Any non-resonated catback on the 1.5T booms at 2200rpm, which is exactly "
             "highway cruise. Do not skip the resonator on this engine.", 495, {}),
            ("abdullah", "image", "Resonator position",
             "Where the second resonator sits. This position was quiet; 300mm forward "
             "was not.", 490, {"media": True}),
            ("shoaib", "text", "Highway drone gone completely after the resonator",
             "Went from genuinely annoying to not noticing the exhaust exists on a "
             "3-hour drive. Should've done this on install day one.", 100, {}),
            ("kshitij", "image", "Underside shot showing both resonators",
             "Two in series, not one bigger one. This is what actually kills the 1.5T "
             "drone.", 15, {"media": True}),
        ],
        "h-si-3in": [
            ("ahmed", "voice", "Check this out — 3in turbo-back on",
             "Same car, same road, same gear as the clip up on the Si node. Downpipe "
             "and catback both done. Turn it up. You can finally hear the turbo doing "
             "something instead of the muffler eating all of it.",
             476, {"duration": 56, "audio": "modded.mp3", "as": "k20c2_si"}),
            ("ahmed", "text", "Downpipe is worth more than the catback",
             "Most of the gain was the downpipe. The catback was mostly noise — worth "
             "doing in that order if you are spreading the cost.", 475, {}),
            ("ahmed", "voice", "Si turbo-back, third gear pull",
             "Transcript: full pull in third with the 3in system. Turbo spool is "
             "audible over the exhaust, which it was not with the stock downpipe.",
             470, {"duration": 24}),
            ("shoaib", "image", "Downpipe on the bench before install",
             "3in catted, ceramic coated. Coating alone was worth it after seeing how "
             "the uncoated test pipe discolored.", 300, {"media": True}),
            ("kshitij", "text", "This exhaust turned heads at a gas station for the first time",
             "Never happened on the stock system. People assumed it was already an Si "
             "with how it sounded, now they can hear it too.", 5, {}),
        ],
        "h-k24-header": [
            ("shoaib", "text", "Nothing happens below 5000",
             "The 4-1 moved the whole powerband up. Great on track, genuinely worse in "
             "traffic than stock.", 455, {}),
            ("kshitij", "image", "Header clearance to the rack",
             "Tight but no contact. Photo taken with the engine at full load lean.",
             450, {"media": True}),
            ("kshitij", "text", "Traffic is genuinely worse now, and I'd still do it again",
             "Nothing below 5000 is not an exaggeration. Stop-and-go commute is worse "
             "than stock. Sound and top end are worth it to me anyway.", 100, {}),
            ("shoaib", "image", "Header ceramic coat after a season",
             "Zero discoloration after a full summer of heat cycles. Worth the extra "
             "cost on a header that runs this hot.", 20, {"media": True}),
        ],
        "h-15t-18": [
            ("abdullah", "text", "18s ride worse than you expect",
             "Going from 17 to 18 on a 40-series noticeably firmed up the ride on bad "
             "roads. Worth it visually, not mechanically.", 415, {}),
            ("abdullah", "image", "235/40 fitment, no spacers",
             "Sits flush with the arch. No rubbing at full lock or over speed bumps.",
             410, {"media": True}),
            ("kshitij", "text", "Went back to 17s after a season on 18s",
             "Wanted the look, but potholes on my commute made me regret it within "
             "six months. Traded back down and don't miss it.", 60, {}),
            ("shoaib", "image", "18s next to the stock 16s",
             "Size difference is bigger in person than in photos. Fills the arch "
             "completely at this offset.", 10, {"media": True}),
        ],
        "h-si-track": [
            ("ahmed", "text", "200TW is the sweet spot for street-track",
             "Full R-comps were faster but useless in rain and lasted four events. "
             "200TW does most of it and survives the drive home.", 395, {}),
            ("ahmed", "image", "Wheel weight on the scale",
             "Forged 18s at 8.4kg against the 11.6kg stockers.", 390, {"media": True}),
            ("ahmed", "text", "200TW held up for two full seasons",
             "Longer than I expected honestly. Rotate them and you'll get real "
             "mileage even tracking semi-regularly.", 150, {}),
            ("shoaib", "video", "Track day, first session on the new wheels",
             "", 5, {"media": True, "duration": 40, "transcribed": False}),
        ],
        "h-k24-light": [
            ("shoaib", "text", "17s keep the gearing alive",
             "The NA K24 does not have the torque to pull tall gearing. Going down to "
             "17s made it feel considerably quicker without changing power.", 375, {}),
            ("shoaib", "sketch", "Offset comparison sketch",
             "What +45 versus +35 does to the arch gap on an FC.", 370, {"media": True}),
            ("shoaib", "image", "17s at ride height on the K24 car",
             "Smaller diameter, more sidewall. Rides noticeably better than the 18s "
             "did on the same suspension.", 200, {"media": True}),
            ("kshitij", "text", "Gearing math actually checks out",
             "Did the calculation before buying — effective final drive works out "
             "close enough to stock that acceleration feel barely changed despite "
             "the smaller wheel.", 30, {}),
        ],
        "h-15t-street": [
            ("abdullah", "text", "This is the one to copy",
             "Quiet, quick, comfortable, passes inspection. If you want one build off "
             "this whole tree, it is this one.", 315, {}),
            ("kshitij", "text", "Pad dust warning",
             "The street performance pads dust heavily on light wheels. Budget for "
             "cleaning them weekly or go to a low-dust compound.", 310, {}),
            ("abdullah", "image", "Finished daily, a year on",
             "Nothing changed since this build finished. That's the whole point — it "
             "does everything I need and I stopped tinkering.", 5, {"media": True}),
            ("kshitij", "text", "Recommend this build to anyone asking where to start",
             "Quiet, quick, reliable. If someone shows me this tree and asks what to "
             "build first, it's this one every time.", 2, {}),
        ],
        "h-si-bbk": [
            ("ahmed", "text", "The Si's real weak point",
             "Stock Si brakes fade on lap three of any real session. The 330mm setup "
             "held for a full 20-minute run without a wobble.", 275, {}),
            ("ahmed", "video", "Brake temps after a session",
             "", 270, {"media": True, "duration": 41, "transcribed": False}),
            ("shoaib", "text", "Two-piece rotors are worth it here",
             "Cracked a one-piece within two events. The two-piece has done a season.",
             265, {}),
            ("ahmed", "image", "Rotor and pad after a track weekend",
             "Even wear across both. No cracking, no glazing. Worth every bit of the "
             "upfront cost.", 30, {"media": True}),
            ("shoaib", "text", "Pedal feel took a session to get used to",
             "Bite point moved noticeably closer to the floor compared to stock. Felt "
             "wrong for one session, then became normal.", 10, {}),
        ],
        "h-hybrid": [
            ("kshitij", "text", "Why NA on a chassis built for boost",
             "Throttle response. The K24 gives up 60hp to the tuned Si but does exactly "
             "what your right foot asks, instantly.", 9, {}),
            ("kshitij", "voice", "K24 in the Si chassis, first drive",
             "Transcript: first proper drive after the swap. You can hear the ITBs over "
             "the exhaust at part throttle, which never happened in the FC shell.",
             5, {"duration": 44}),
            ("ahmed", "text", "The brakes are overkill now",
             "330mm on a car that lost 80kg of turbo plumbing. Not complaining, but "
             "you could run a smaller setup and save weight.", 2, {}),
            ("kshitij", "image", "Finished build, first proper photo",
             "Every part on this car came from somewhere else on this tree. Feels "
             "less like a build and more like an argument I finally won.", 1,
             {"media": True}),
            ("ahmed", "text", "This is the one everyone asks about at meets",
             "Nobody expects the NA engine note out of what looks like a boosted Si. "
             "Explaining it takes longer than showing them.", 0.5, {}),
        ],
        "h-typer": [
            ("kshitij", "text", "Why a full engine, not just a head swap",
             "Trans comes with it either way, so keep the ECU and diff and skip the "
             "adapter-plate compromises. Total swap kit ran $9,400 including tax on the "
             "donor engine.", 295, {}),
            ("kshitij", "image", "Donor engine on the stand",
             "FK8 had 11k miles. Should've been an easy sell for someone, but insurance "
             "wrote the whole car off for a bent subframe.", 280, {"media": True}),
            ("shoaib", "text", "Wiring is the actual project",
             "Bolting the motor in took a weekend. Getting the FK8 harness talking to an "
             "FC dash took three.", 250, {}),
            ("abdullah", "voice", "First start after the swap",
             "Transcript: cranks for a beat longer than expected, then catches. Idle "
             "settles fast — whatever they retuned about idle control on the Type R is "
             "noticeably smoother than the old 1.5T.", 245, {"duration": 22}),
            ("kshitij", "video", "Cold start, first drive around the block",
             "", 240, {"media": True, "duration": 48, "transcribed": False}),
            ("kshitij", "text", "Still not registered and I don't care",
             "Paperwork on a swapped VIN is its own project. Drove it around the "
             "neighborhood anyway. Worth it.", 235, {}),
        ],
        "h-typer-hks": [
            ("shoaib", "text", "Keeping the OEM downpipe was the right call",
             "HKS catback bolts straight to the factory turbo-back. No fabrication, no "
             "rubbing on the crossmember.", 210, {}),
            ("shoaib", "image", "Legamax fitment at the rear",
             "Tucks tighter than the OEM FK8 tips did. No trimming needed on this bumper.",
             205, {"media": True}),
            ("abdullah", "text", "Quieter than I expected for the badge",
             "Legamax at idle is almost civil. It's the mid-range where it actually "
             "opens up.", 195, {}),
            ("kshitij", "voice", "Cabin note at 4000rpm",
             "Transcript: pull in third gear, windows up. Drone is minimal for a straight "
             "swap onto a smaller chassis than it was designed for.", 190, {"duration": 20}),
        ],
        "h-typer-19": [
            ("abdullah", "text", "Bolt pattern matches, offset does not quite",
             "5x114.3 carries over but you're running about 3mm more poke than stock FK8 "
             "fitment on this chassis. Fine on the street, watch it on speed bumps.",
             215, {}),
            ("abdullah", "image", "19s tucked at ride height",
             "No spacers. Slight lip rub at full compression, otherwise clean.", 210,
             {"media": True}),
            ("kshitij", "text", "Weight penalty nobody mentions",
             "OEM Type R wheels are not light. Went up almost a kilo a corner over the "
             "forged 18s on the Si tree.", 200, {}),
        ],
        "h-typer-brembo": [
            ("kshitij", "text", "Direct fit, genuinely no adapter needed",
             "Same bolt pattern as the FC subframe. Ten minutes longer than a pad swap "
             "once the calipers were on the bench.", 145, {}),
            ("kshitij", "image", "Brembo calipers before paint",
             "Left them factory red. Wanted the FK8 badge to actually mean something "
             "under the wheel.", 140, {"media": True}),
            ("ahmed", "text", "This is the build to copy if you have the budget",
             "Type R everything under an FC shell that still looks stock in traffic. "
             "Best of both.", 130, {}),
            ("kshitij", "video", "First track day on the finished build",
             "", 100, {"media": True, "duration": 61, "transcribed": False}),
            ("kshitij", "text", "Damn, this thing finally exists",
             "Eighteen months from the first parts bin to a finished car. Sat in the "
             "driveway for ten minutes just looking at it before I even opened the door.",
             95, {}),
        ],
    },
    "replies": [
        ("h-15t", 0, "ahmed", "Confirmed on mine. Stage 1 felt like a different car.", 572),
        ("h-15t", 2, "abdullah", "Front-mount fixed this completely for me. Worth the $600.", 560),
        ("h-k24", 0, "kshitij", "Those ITBs sound incredible. What throttle bodies?", 530),
        ("h-si-bbk", 0, "shoaib", "How are they on the street? Worried about cold bite.", 270),
        ("h-hybrid", 0, "abdullah", "This is the most interesting build on the whole site.", 7),
        ("h-si-3in", 0, "shoaib", "Okay that actually sounds mean. How is it at 70 on the highway?", 470),
        ("h-si-3in", 0, "abdullah", "Played the stock clip right after this one. Not even the same car.", 466),
        ("h-si", 0, "kshitij", "Appreciate you posting the before. Nobody ever does.", 552),
        ("h-root", 2, "abdullah", "Learned this one the hard way too. Should've just bought the Si from the start.", 550),
        ("h-root", 3, "ahmed", "That's a good lineup. Did the K24 car draw more attention than the Si?", 15),
        ("h-15t", 3, "shoaib", "Boost gauges catch so many problems before they get expensive. Should be mandatory honestly.", 475),
        ("h-15t", 4, "ahmed", "Hard agree. Told a friend this exact thing yesterday.", 2),
        ("h-si", 2, "shoaib", "Cross-shopping used is smart. LSD is genuinely the underrated part of this whole platform.", 8),
        ("h-si", 1, "kshitij", "Real question is whether you'd go back. My money's on no.", 195),
        ("h-k24", 3, "abdullah", "That lope had me worried the first week on mine too. Glad it's normal.", 495),
        ("h-k24", 5, "shoaib", "This is exactly the right way to think about this build. Nobody's doing the math on this one.", 3),
        ("h-15t-quiet", 0, "ahmed", "The 1.5T drone is genuinely one of the worst stock exhaust notes on any turbo four I've owned.", 490),
        ("h-15t-quiet", 3, "shoaib", "Two smaller ones in series was the trick for me too. One big resonator alone didn't do it.", 12),
        ("h-si-3in", 3, "abdullah", "Ceramic coating the downpipe is such an underrated call. Bare metal ones look rough within a year.", 295),
        ("h-si-3in", 4, "ahmed", "Love hearing this. Worth every bit of the install headache.", 3),
        ("h-k24-header", 0, "ahmed", "This is the honest tradeoff nobody mentions before doing NA headers on a daily.", 95),
        ("h-k24-header", 3, "kshitij", "Ceramic coating headers is one of those mods that pays for itself in how it looks a year later.", 15),
        ("h-15t-18", 0, "abdullah", "This matches what I've heard from a few people on this exact wheel size. Ride comfort really does suffer.", 55),
        ("h-15t-18", 3, "kshitij", "Yeah the difference in person surprised me too when I saw mine installed.", 8),
        ("h-si-track", 0, "kshitij", "Two seasons is way better than I expected from a 200TW compound.", 145),
        ("h-si-track", 3, "abdullah", "How's the grip compare to the old wheel and tire combo?", 4),
        ("h-k24-light", 0, "ahmed", "Smart move keeping the torque curve usable on an NA motor like this.", 195),
        ("h-k24-light", 3, "shoaib", "That's the kind of math more people should actually do before picking wheel size.", 25),
        ("h-15t-street", 0, "shoaib", "This is genuinely the build I point people to as well. Best value on the whole tree.", 3),
        ("h-15t-street", 3, "ahmed", "Same. Nothing flashy but nothing to complain about either.", 1),
        ("h-si-bbk", 0, "kshitij", "This confirms it. The Si's stock brakes are the clear weak link on this whole platform.", 270),
        ("h-si-bbk", 4, "abdullah", "That adjustment period is real. Took me about the same, one full session.", 8),
        ("h-hybrid", 3, "shoaib", "That's a great way to put it. This build is basically a thesis statement.", 0.8),
        ("h-hybrid", 4, "kshitij", "Ha, exactly the reaction I get too. Nobody guesses right on the first try.", 0.3),
        ("h-typer", 0, "abdullah", "9400 for the kit alone or all-in with labor?", 290),
        ("h-typer", 0, "kshitij", "Kit and paint-code panels. Labor was all mine, so free if you don't count the weekends.", 285),
        ("h-typer", 2, "ahmed", "This is why I stopped at bolt-ons. Respect though.", 240),
        ("h-typer", 3, "shoaib", "Idle control on the Type R ECU is genuinely underrated. Same reason mine doesn't hunt at cold start anymore.", 240),
        ("h-typer-hks", 0, "abdullah", "Any check engine light from the O2 sensor placement being different?", 208),
        ("h-typer-hks", 0, "shoaib", "None so far. FK8 harness carried its own bung so it's in the stock spot.", 206),
        ("h-typer-hks", 2, "kshitij", "Mid-range is the whole point of that motor. Glad the exhaust doesn't choke it.", 193),
        ("h-typer-19", 1, "shoaib", "How bad is the lip rub, cosmetic or actually catching?", 208),
        ("h-typer-19", 1, "abdullah", "Cosmetic so far. Rolled the lip after this photo and it stopped entirely.", 206),
        ("h-typer-brembo", 2, "abdullah", "Budget check — realistic all-in number for someone starting today?", 128),
        ("h-typer-brembo", 2, "kshitij", "About $14k if you do the labor yourself and get lucky on the donor car. Double that if you don't.", 125),
        ("h-typer-brembo", 4, "shoaib", "Eighteen months well spent. This is the one build on here I'd actually trade for.", 90),
        ("h-typer-brembo", 4, "ahmed", "Congrats man. Watched this whole thread since the first donor engine photo.", 88),
        ("h-root", 0, "shoaib", "This distinction trips up every newcomer. Good pin.", 568),
        ("h-root", 1, "kshitij", "Wish I'd seen this before I bought my LX.", 562),
        ("h-15t", 1, "ahmed", "Played this back to back with my own pulls. Same story.", 568),
        ("h-si", 2, "shoaib", "That boost log is clean. Mine was way spikier at first.", 548),
        ("h-k24", 2, "abdullah", "8500 is wild for a K-series without forged internals.", 522),
        ("h-15t-quiet", 1, "kshitij", "Resonator position sketch saved me a wasted install.", 488),
        ("h-si-3in", 2, "ahmed", "That third gear pull is exactly why I did this exhaust.", 468),
        ("h-k24-header", 0, "shoaib", "The tradeoff is real but worth it for the sound alone.", 453),
        ("h-15t-18", 1, "abdullah", "Flush fitment like that is hard to get right without spacers.", 408),
        ("h-si-track", 1, "ahmed", "Weight saving on wheels always feels bigger than the number suggests.", 388),
        ("h-k24-light", 1, "shoaib", "Offset sketch is exactly what I needed before ordering mine.", 368),
        ("h-15t-street", 0, "kshitij", "Dust warning saved my wheels. Went low-dust after reading this.", 308),
        ("h-si-bbk", 1, "ahmed", "Brake temps after a session tell you everything you need to know.", 268),
        ("h-typer", 1, "shoaib", "That's a clean donor for 11k miles. Insurance write-offs are wild sometimes.", 278),
        ("h-typer-hks", 1, "kshitij", "Tucked tighter than OEM is impressive for an adapted fitment.", 203),
    ],
}


# --- Subaru WRX VA -------------------------------------------------------------------

WRX_STAGE1 = "Cobb Accessport V3 AP3-SUB-004"
WRX_STAGE2 = "Cobb Accessport V3 AP3-SUB-004, Mishimoto Performance Top-Mount Intercooler, Grimmspeed Top Mount Intercooler Y-Pipe"
WRX_BIGTURBO = "IAG Street Series Short Block FA20, Cobb Accessport V3 AP3-SUB-004, Killer B Motorsport Oil Pickup"
WRX_EX_STAGE1 = "Invidia Q300 Cat-Back Exhaust"
WRX_EX_STAGE2 = "Invidia Catted Downpipe (VA WRX), Cobb Stainless Cat-Back Exhaust"
WRX_EX_BIG = "Grimmspeed Catted J-Pipe, Cobb Stainless Cat-Back Exhaust"
WRX_WH_STREET = "Sparco Terra 17x8 +48"
WRX_WH_TRACK = "Enkei RPF1 17x9 +45 5x114.3"
WRX_WH_GRAVEL = "Method Race Wheels MR502 15x7 (Gravel)"
WRX_BR_STREET = "Hawk DTC-60 Endurance Pads (Front), Goodridge Stainless Brake Line Kit (VA)"
WRX_BR_TRACK = "StopTech ST-60 6-Piston BBK 355mm (Front), Hawk DTC-60 Endurance Pads (Front)"
WRX_BR_RALLY = "Carbotech XP12 Rally Pads (Front), Goodridge Stainless Brake Line Kit (VA)"

WRX = {
    "id": "subaru-wrx-va",
    "make": "Subaru", "model": "WRX", "generation": "VA",
    "yearStart": 2015, "yearEnd": 2021, "yearRange": "2015–2021",
    "rootTitle": "Stock WRX",
    "nodes": [
        ("w-stage1", "Stage 1", ["w-root"],
         "Off-the-shelf map on the stock everything. Twenty minutes of work.",
         "shoaib", 520, 0.88, {"engine": WRX_STAGE1}),
        ("w-stage2", "Stage 2", ["w-root"],
         "Protune at 19psi with a bigger intercooler. Where most people stop.",
         "ahmed", 500, 0.85, {"engine": WRX_STAGE2}),
        ("w-bigturbo", "Hybrid Turbo, Built Block", ["w-root"],
         "VF52 on E85 with a built short block. Serious money.",
         "kshitij", 480, 0.78, {"engine": WRX_BIGTURBO}),

        ("w-stage1-quiet", "Stage 1 · Quiet", ["w-stage1"],
         "Resonated catback. Keeps the rumble without the headache.",
         "abdullah", 440, 0.64,
         {"engine": WRX_STAGE1, "exhaust": WRX_EX_STAGE1}),
        ("w-stage2-tb", "Stage 2 · Turbo-Back", ["w-stage2"],
         "Catted downpipe and 3in back. The stage 2 map assumes this.",
         "ahmed", 420, 0.86,
         {"engine": WRX_STAGE2, "exhaust": WRX_EX_STAGE2}),
        ("w-big-open", "Big Turbo · Open Downpipe",
         ["w-bigturbo"],
         "Catless 3.5in. Loud enough to be a problem.",
         "kshitij", 400, 0.72,
         {"engine": WRX_BIGTURBO, "exhaust": WRX_EX_BIG}),

        ("w-stage1-oem", "Stage 1 · OEM+ Wheels", ["w-stage1-quiet"],
         "18in on a 245. Stock look, better rubber.",
         "abdullah", 360, 0.60,
         {"engine": WRX_STAGE1, "exhaust": WRX_EX_STAGE1,
          "wheels": WRX_WH_STREET}),
        ("w-stage2-track", "Stage 2 · Track Wheels", ["w-stage2-tb"],
         "17in forged on 255 200TW. Smaller wheel, more tyre.",
         "ahmed", 340, 0.88,
         {"engine": WRX_STAGE2, "exhaust": WRX_EX_STAGE2,
          "wheels": WRX_WH_TRACK}),
        ("w-big-gravel", "Big Turbo · Gravel", ["w-big-open"],
         "15in gravel spec. The rally setup this car was designed around.",
         "shoaib", 320, 0.82,
         {"engine": WRX_BIGTURBO, "exhaust": WRX_EX_BIG,
          "wheels": WRX_WH_GRAVEL}),

        ("w-stage1-street", "Stage 1 Street", ["w-stage1-oem"],
         "Pads and lines. A quick, quiet, completely usable WRX.",
         "abdullah", 240, 0.68,
         {"engine": WRX_STAGE1, "exhaust": WRX_EX_STAGE1,
          "wheels": WRX_WH_STREET,
          "brakes": WRX_BR_STREET}),
        ("w-stage2-bbk", "Stage 2 · Big Brakes", ["w-stage2-track"],
         "6-pot 355mm. The VA's brakes are its weakest link on track.",
         "ahmed", 200, 0.92,
         {"engine": WRX_STAGE2, "exhaust": WRX_EX_STAGE2,
          "wheels": WRX_WH_TRACK,
          "brakes": WRX_BR_TRACK}),

        ("w-stage-rally", "Gravel Stage Car", ["w-stage2-bbk", "w-big-gravel"],
         "Fusion: the track car's brake package on the gravel build.",
         "shoaib", 30, 0.94,
         {"engine": WRX_BIGTURBO,
          "exhaust": WRX_EX_BIG,
          "wheels": WRX_WH_GRAVEL,
          "brakes": WRX_BR_RALLY}),
    ],
    "posts": {
        "w-root": [
            ("shoaib", "text", "The VA is the best value chassis here",
             "AWD, a real gearbox and a factory turbo. Everything on this tree is "
             "cheaper than getting a FWD car to the same place.", 510, {}),
            ("kshitij", "image", "Stock VA before anything",
             "Baseline photo. Useful for spotting ride height changes further down.",
             505, {"media": True}),
        ],
        "w-stage1": [
            ("shoaib", "voice", "Stock VA, before anything",
             "Baseline recording. Stage 1 map, everything else factory. That boxer "
             "offbeat is there but the stock muffler is doing its job a bit too well. "
             "Posting it so the turbo-back clip further down has something to sit "
             "against.", 515, {"duration": 29, "audio": "stockx2.mp3", "as": "stage_car_sam"}),
            ("shoaib", "text", "OTS maps are genuinely safe here",
             "Cobb's stage 1 has been run on thousands of these. If you are nervous "
             "about tuning, this is the one to start on.", 512, {}),
            ("abdullah", "text", "Gains are modest but free-feeling",
             "About 25whp. What you actually notice is the throttle response and how "
             "much earlier boost arrives.", 508, {}),
        ],
        "w-stage2": [
            ("ahmed", "text", "Protune, not an OTS map",
             "Stage 2 on an off-the-shelf map with a bigger intercooler ran lean at "
             "the top. Pay for the protune, it is $500 well spent.", 495, {}),
            ("ahmed", "image", "TMIC versus the stock unit",
             "Size comparison. Intake temps dropped about 18°C on a hot lap.", 490,
             {"media": True}),
        ],
        "w-bigturbo": [
            ("kshitij", "text", "E85 availability decides this build",
             "The whole tune depends on E85. If your area does not have it reliably, "
             "this build becomes a very expensive stage 2.", 475, {}),
            ("kshitij", "voice", "VF52 spool on E85",
             "Transcript: cold start then a pull. Spool is noticeably later than the "
             "stock turbo but the top end keeps going where stage 2 flattens.", 470,
             {"duration": 36}),
            ("ahmed", "text", "Rod bearings are the known failure",
             "Built short block is not optional at this power. The FA20 drops bearings "
             "on stock rods surprisingly reliably above 400whp.", 465, {}),
        ],
        "w-stage1-quiet": [
            ("abdullah", "text", "Keep the stock downpipe",
             "The catback alone with the stock downpipe is the quietest way to get the "
             "boxer sound. Any downpipe change makes it drone.", 435, {}),
            ("abdullah", "voice", "Cabin noise at 75mph",
             "Transcript: highway cruise recording. Conversation-level — this is a "
             "setup you can road trip in.", 430, {"duration": 21}),
        ],
        "w-stage2-tb": [
            ("ahmed", "text", "The map assumes the downpipe",
             "Do not run a stage 2 map on a stock downpipe. It will knock, and the "
             "logs will show it immediately.", 415, {}),
            ("shoaib", "voice", "Turbo-back on — listen to this",
             "Same stretch of road, same gear, right after the downpipe and catback "
             "went on. Compare it to the stock clip up on the Stage 1 node. This is "
             "what everyone means when they say the downpipe is the mod that matters.",
             408, {"duration": 54, "audio": "moddedx2.mp3", "as": "stage_car_sam"}),
            ("kshitij", "image", "Catted downpipe fitment",
             "Photo of the catted section. Passes inspection and only costs about 5whp "
             "against catless.", 410, {"media": True}),
        ],
        "w-big-open": [
            ("kshitij", "text", "Genuinely antisocial",
             "Catless and straight through on a boxer is loud in a way that gets you "
             "noticed by the wrong people. Fine for a stage car.", 395, {}),
            ("shoaib", "sketch", "Downpipe routing sketch",
             "Where the 3.5in sits relative to the steering shaft. Tight, needs "
             "wrapping.", 390, {"media": True}),
        ],
        "w-stage1-oem": [
            ("abdullah", "text", "Stock look, much better grip",
             "Same size as OEM so nothing rubs, but a proper summer tyre transformed "
             "the car more than the tune did.", 355, {}),
            ("abdullah", "image", "245/40 on the stock arch",
             "Flush, no spacers, no rubbing.", 350, {"media": True}),
        ],
        "w-stage2-track": [
            ("ahmed", "text", "Smaller wheel, more tyre",
             "Went down to 17s specifically to run a taller sidewall on track. Better "
             "over kerbs and cheaper to replace.", 335, {}),
            ("ahmed", "image", "255 on a 17x9",
             "Fitment photo at ride height. Needed a 5mm spacer at the rear.", 330,
             {"media": True}),
        ],
        "w-big-gravel": [
            ("shoaib", "text", "15s or nothing on gravel",
             "205/65 on a 15 gives you sidewall to absorb rocks. Anything bigger and "
             "you will bend a rim on the first stage.", 315, {}),
            ("shoaib", "image", "Gravel setup at ride height",
             "Photo with the taller tyre. Roughly 30mm more ground clearance than the "
             "18in street setup.", 310, {"media": True}),
        ],
        "w-stage1-street": [
            ("abdullah", "text", "The sensible WRX",
             "Quick, quiet, reliable, passes inspection. Almost everyone should build "
             "this and stop.", 235, {}),
            ("kshitij", "text", "Stainless lines first",
             "Same as on the Corolla — lines changed pedal feel more than the pads "
             "did, and they cost a third as much.", 230, {}),
        ],
        "w-stage2-bbk": [
            ("ahmed", "text", "355mm is the fix",
             "Stock VA brakes fade on lap two with any real pace. The 6-pot setup held "
             "a full session without judder.", 195, {}),
            ("ahmed", "voice", "Brake feel after the upgrade",
             "Transcript: talking through pedal travel and initial bite compared to "
             "stock. Much firmer, needs more leg but far more predictable.", 190,
             {"duration": 33}),
            ("shoaib", "text", "Endurance pads squeal cold",
             "First five minutes of every drive is embarrassing. Fine once warm.",
             185, {}),
        ],
        "w-stage-rally": [
            ("shoaib", "text", "Detuned on purpose",
             "Same VF52 but pulled back for gravel. Peak power is worthless if you "
             "cannot put it down on loose surface.", 25, {}),
            ("shoaib", "video", "Gravel stage, onboard",
             "", 20, {"media": True, "duration": 78, "transcribed": False}),
            ("kshitij", "text", "Smaller brakes than the track car",
             "Dropped from 355 to 320mm. On gravel you are limited by grip, not by "
             "brake capacity, and the smaller setup clears a 15in wheel.", 18, {}),
        ],
    },
    "replies": [
        ("w-stage1", 0, "abdullah", "This is what sold me on the platform. So easy.", 512),
        ("w-bigturbo", 2, "shoaib", "Can confirm. Lost a set of bearings at 420whp on stock rods.", 462),
        ("w-stage2-bbk", 0, "kshitij", "What pads are you running for endurance?", 192),
        ("w-stage-rally", 0, "ahmed", "Detuning for grip is the most underrated call in this whole site.", 22),
        ("w-big-gravel", 0, "abdullah", "Where do you even find 15in gravel wheels for a VA?", 312),
        ("w-stage2-tb", 1, "kshitij", "That rumble is exactly why I bought one of these. Sold.", 400),
        ("w-stage1", 0, "kshitij", "Good shout posting the baseline. Makes the comparison actually mean something.", 505),
    ],
}


# Civic leads: it carries the exhaust before/after pair and the most voice notes, so any
# UI that shows "a car" without being told which should show that one.
ALL_CARS = [CIVIC, COROLLA, WRX]


# --- who the community is -----------------------------------------------------------
#
# Placeholder names in the specs above (ahmed, abdullah, shoaib, kshitij) are ROLES, not
# people. seed.py maps each role to a real handle per car, so the same role on the
# Corolla and the Civic is a different person — otherwise one name appears on 47 posts
# across three unrelated platforms and the whole thing reads as seeded.
#
# Handles are how people actually name themselves on car forums: platform, engine code,
# or what they did to it. First names are rare and stand out.
#
# A few handles appear in more than one cast on purpose. People genuinely do follow two
# platforms, and a community where nobody overlaps looks as artificial as one where
# everybody does.

CASTS = {
    "toyota-corolla-e170": {
        "ahmed":    "boosted_2zr",
        "abdullah": "dailydriven_e170",
        "shoaib":   "gravelspec",
        "kshitij":  "rallybrain",
        "extras":   ["torque_curve", "e170_owner", "slowcarfast", "nine_psi", "wrenchmonkey"],
    },
    "honda-civic-fc-fk-10th-gen": {
        "ahmed":    "k20c2_si",
        "abdullah": "flashpro_fc",
        "shoaib":   "itb_addict",
        "kshitij":  "swapped_not_stock",
        "extras":   ["vtec_yo", "fk8envy", "civic_daily", "torque_curve", "boostleak"],
    },
    "subaru-wrx-va": {
        "ahmed":    "fa20_stage2",
        "abdullah": "va_commuter",
        "shoaib":   "stage_car_sam",
        "kshitij":  "e85_only",
        "extras":   ["boxer_rumble", "awd_bias", "gravelspec", "protuned", "rodbearing"],
    },
}

# The account that plants each car's stock root. Deliberately not a person.
SYSTEM_AUTHOR = "modbranch"
