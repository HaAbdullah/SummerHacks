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

COROLLA_NA = "Cold air intake, 4-2-1 header, ECU tune"
COROLLA_TURBO = "2ZR-FE, Garrett GT2860 turbo, 8psi, front-mount intercooler"
COROLLA_BUILT = "Built bottom end, forged rods and pistons, GT3071R at 18psi"

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
         {"engine": COROLLA_NA, "exhaust": "Fully resonated catback, stock tips"}),
        ("c-turbo-3in", "Turbo · 3in Catback", ["c-turbo"],
         "3in downpipe and catback. Loud under load, civil at cruise.",
         "ahmed", 540, 0.78,
         {"engine": COROLLA_TURBO, "exhaust": "3in downpipe, catless, 3in catback"}),
        ("c-built-straight", "Built · Straight Through", ["c-built"],
         "3.5in turbo-back, no silencing. Track use only.",
         "ahmed", 520, 0.80,
         {"engine": COROLLA_BUILT, "exhaust": "3.5in turbo-back, straight through"}),
        ("c-built-clearance", "Built · High Clearance", ["c-built"],
         "3.5in routed high for stage use. Survives ruts.",
         "shoaib", 500, 0.70,
         {"engine": COROLLA_BUILT, "exhaust": "3.5in high-clearance turbo-back"}),

        ("c-turbo-street", "Turbo · Street Wheels", ["c-turbo-3in"],
         "17in cast on a road tyre. Daily proportions.",
         "abdullah", 460, 0.55,
         {"engine": COROLLA_TURBO, "exhaust": "3in downpipe, catless, 3in catback",
          "wheels": "17in cast, 215/45"}),
        ("c-built-track", "Built · Track Wheels", ["c-built-straight"],
         "17in forged on semi-slicks. Unsprung weight over looks.",
         "ahmed", 440, 0.82,
         {"engine": COROLLA_BUILT, "exhaust": "3.5in turbo-back, straight through",
          "wheels": "17in lightweight forged, 235/40 semi-slick"}),
        ("c-built-gravel", "Built · Gravel Wheels", ["c-built-clearance"],
         "16in steel on all-terrain. Sidewall is the whole point.",
         "kshitij", 420, 0.75,
         {"engine": COROLLA_BUILT, "exhaust": "3.5in high-clearance turbo-back",
          "wheels": "16in gravel-spec, 215/65 all-terrain"}),

        ("c-turbo-daily", "Turbo Daily", ["c-turbo-street"],
         "OEM+ pads and stainless lines. Finished street car.",
         "abdullah", 380, 0.60,
         {"engine": COROLLA_TURBO, "exhaust": "3in downpipe, catless, 3in catback",
          "wheels": "17in cast, 215/45", "brakes": "OEM+ pads, stainless lines"}),
        ("c-track-weapon", "Track Weapon", ["c-built-track"],
         "4-pot front on 320mm rotors. Survives a full session.",
         "ahmed", 300, 0.88,
         {"engine": COROLLA_BUILT, "exhaust": "3.5in turbo-back, straight through",
          "wheels": "17in lightweight forged, 235/40 semi-slick",
          "brakes": "4-pot front calipers, 320mm rotors"}),
        ("c-gravel-rally", "Gravel Rally", ["c-built-gravel"],
         "Rally pads and a hydraulic handbrake. Stops on loose surface.",
         "shoaib", 260, 0.80,
         {"engine": COROLLA_BUILT, "exhaust": "3.5in high-clearance turbo-back",
          "wheels": "16in gravel-spec, 215/65 all-terrain",
          "brakes": "Vented front discs, rally pads, hydraulic handbrake"}),

        ("c-rally", "Turbo Rally Build", ["c-track-weapon", "c-gravel-rally"],
         "Fusion: track brakes on gravel wheels, detuned to 14psi for reliability.",
         "kshitij", 96, 0.95,
         {"engine": "Built bottom end, forged rods and pistons, GT3071R at 14psi for reliability",
          "exhaust": "3.5in high-clearance turbo-back",
          "wheels": "16in gravel-spec, 215/65 all-terrain",
          "brakes": "4-pot front, rally pads, hydraulic handbrake"}),
    ],
    "posts": {
        "c-root": [
            ("kshitij", "text", "Why start here",
             "Every build on this page grew from a bone-stock 1.8L. Worth knowing the "
             "baseline is 132hp before you read anyone's dyno claim.", 700, {}),
            ("abdullah", "image", "Stock engine bay, 2016",
             "Reference shot before anything was touched. Useful for spotting what has "
             "actually changed in the photos further down the tree.", 690, {"media": True}),
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
        ],
        "c-built": [
            ("ahmed", "text", "What forged actually costs",
             "Rods, pistons, bearings, machining and gaskets came to about $3,400 before "
             "labour. The turbo was the cheap part of this step.", 590, {}),
            ("kshitij", "sketch", "Bearing clearance notes",
             "Sketch of the clearances we ended up at after machining. Slightly loose on "
             "the mains for the boost target.", 580, {"media": True}),
        ],
        "c-na-quiet": [
            ("abdullah", "text", "Resonator placement matters",
             "First catback droned badly at 70mph. Moving the resonator 200mm further "
             "back killed it completely. Same pipe, same muffler.", 550, {}),
            ("abdullah", "image", "Tip alignment after the swap",
             "Tips sit 8mm proud of the bumper cut. Looks intentional rather than like "
             "something fell off.", 11, {"media": True}),
        ],
        "c-turbo-3in": [
            ("kshitij", "sketch", "Downpipe clearance sketch",
             "Where the 3in downpipe fouls the steering rack. Needs a dimple or you will "
             "feel it through the wheel at idle.", 530, {"media": True}),
            ("shoaib", "text", "Catless on a daily",
             "Fine until inspection. If your state tests, budget for a high-flow cat now "
             "rather than redoing the whole mid-pipe later.", 525, {}),
        ],
        "c-built-straight": [
            ("ahmed", "voice", "Corolla revving — big turbo, 18psi",
             "Transcript: much later spool than the GT2860, nothing until about 4000rpm, "
             "then it comes in hard. Straight-through is loud enough that the intake "
             "noise disappears above 5000.", 515, {"duration": 34}),
            ("ahmed", "text", "Not road legal, and not pleasant",
             "Drone between 2500 and 3000 is genuinely painful on a highway. This is a "
             "trailer-it-to-the-track setup.", 510, {}),
        ],
        "c-built-clearance": [
            ("shoaib", "image", "Routing over the rear subframe",
             "Photo of the high-clearance section. Roughly 90mm higher than the stock "
             "path at its lowest point.", 495, {"media": True}),
            ("shoaib", "text", "Heat shielding is not optional",
             "Routing it that high puts the pipe near the fuel line. Wrap it or move "
             "the line — do not skip this.", 490, {}),
        ],
        "c-turbo-street": [
            ("abdullah", "text", "215/45 on a 17 is the sweet spot",
             "Wider looked better but tramlined badly on grooved highway. Went back to "
             "215 and the car is much calmer.", 455, {}),
            ("kshitij", "image", "Fitment at stock height",
             "No rubbing, no spacers. Roughly a finger of gap at the front arch.", 450,
             {"media": True}),
        ],
        "c-built-track": [
            ("ahmed", "text", "Semi-slicks need heat",
             "First two laps on cold R-comps are genuinely worse than the street tyre. "
             "Do not judge them on an out-lap.", 435, {}),
            ("ahmed", "image", "Wheel weight comparison",
             "Forged 17s next to the stock 16s on a scale — 3.1kg lighter per corner.",
             430, {"media": True}),
        ],
        "c-built-gravel": [
            ("kshitij", "text", "Cheapest way to real sidewall",
             "215/65 on a 16in steel is the cheapest sidewall on this chassis. Whole "
             "setup under $600 used, and steels bend instead of cracking.", 415, {}),
            ("shoaib", "image", "Spacer fitment at full lock",
             "+30mm spacers, no rubbing at full lock after rolling the front lip. Photo "
             "is at full steering deflection.", 410, {"media": True}),
        ],
        "c-turbo-daily": [
            ("abdullah", "text", "Stainless lines are the cheap win",
             "Pedal feel changed more from $60 of lines than from the pads. Do lines "
             "first if you are on a budget.", 370, {}),
            ("abdullah", "voice", "Exhaust note at cruise",
             "Transcript: 70mph highway pull with the window down. Almost no drone — "
             "this is the resonated setup doing its job.", 365, {"duration": 19}),
        ],
        "c-track-weapon": [
            ("ahmed", "text", "Pad choice over caliper size",
             "The 4-pots looked great but the real change was going to a proper track "
             "pad. Stock calipers with good pads would have got 80% of this.", 290, {}),
            ("ahmed", "video", "Session at Mosport, lap 6",
             "", 285, {"media": True, "duration": 64, "transcribed": False}),
        ],
        "c-gravel-rally": [
            ("shoaib", "voice", "Handbrake feel after the swap",
             "Transcript: walking through the hydraulic handbrake install and how much "
             "lever travel there is before it bites. Much shorter throw than the cable "
             "setup.", 250, {"duration": 41}),
            ("shoaib", "text", "Rally pads are terrible cold",
             "Almost no bite for the first minute. Fine on a stage, genuinely dangerous "
             "on a school run.", 245, {}),
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
        ],
    },
    "replies": [
        ("c-turbo", 1, "ahmed", "Seconding this. I went to 11psi for a summer and it cost me a rebuild.", 608),
        ("c-turbo", 1, "abdullah", "What tune were you on? Wondering if timing was the real culprit.", 606),
        ("c-turbo", 0, "kshitij", "That spool sounds way earlier than mine. Twin-scroll manifold?", 612),
        ("c-rally", 0, "shoaib", "Smart call. Everyone chases peak numbers then cooks the motor on stage 3.", 4),
        ("c-built-gravel", 0, "abdullah", "Any speedo error on the taller tyre?", 412),
        ("c-turbo", 0, "kshitij", "That spool is earlier than mine. Are you on the twin-scroll manifold?", 600),
    ],
}


# --- Honda Civic FC/FK (10th gen) ---------------------------------------------------

CIVIC_15T = "L15B7 1.5T, intake, intercooler, Hondata FlashPro stage 1"
CIVIC_SI = "K20C2 Si, tune, upgraded intercooler, 25psi"
CIVIC_K24 = "K24 swap, Skunk2 cams, individual throttle bodies"

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
         {"engine": CIVIC_15T, "exhaust": "Resonated catback, 2.5in, quiet tips"}),
        ("h-si-3in", "Si · 3in Turbo-Back", ["h-si"],
         "Downpipe and catback. Wakes the K20 up above 4000.",
         "ahmed", 480, 0.78,
         {"engine": CIVIC_SI, "exhaust": "3in downpipe, high-flow cat, 3in catback"}),
        ("h-k24-header", "K24 · Header-Back", ["h-k24"],
         "4-1 header on an NA motor. All of it is above 5000rpm.",
         "shoaib", 460, 0.70,
         {"engine": CIVIC_K24, "exhaust": "4-1 race header, 2.5in header-back"}),

        ("h-15t-18", "1.5T · 18in Street", ["h-15t-quiet"],
         "18in on a 235. Fills the arch without wrecking the ride.",
         "abdullah", 420, 0.60,
         {"engine": CIVIC_15T, "exhaust": "Resonated catback, 2.5in, quiet tips",
          "wheels": "18in flow-formed, 235/40"}),
        ("h-si-track", "Si · Track Wheels", ["h-si-3in"],
         "18in forged on 200TW. Same size, three kilos lighter.",
         "ahmed", 400, 0.84,
         {"engine": CIVIC_SI, "exhaust": "3in downpipe, high-flow cat, 3in catback",
          "wheels": "18in forged, 245/40 200TW"}),
        ("h-k24-light", "K24 · Lightweight 17s", ["h-k24-header"],
         "17s to keep the gearing usable on an NA motor.",
         "shoaib", 380, 0.68,
         {"engine": CIVIC_K24, "exhaust": "4-1 race header, 2.5in header-back",
          "wheels": "17in forged, 225/45"}),

        ("h-15t-street", "1.5T Street", ["h-15t-18"],
         "Pads and lines. A complete, quiet, quick daily.",
         "abdullah", 320, 0.66,
         {"engine": CIVIC_15T, "exhaust": "Resonated catback, 2.5in, quiet tips",
          "wheels": "18in flow-formed, 235/40",
          "brakes": "Street performance pads, stainless lines"}),
        ("h-si-bbk", "Si · Big Brakes", ["h-si-track"],
         "4-pot 330mm. The Si's weak point solved.",
         "ahmed", 280, 0.90,
         {"engine": CIVIC_SI, "exhaust": "3in downpipe, high-flow cat, 3in catback",
          "wheels": "18in forged, 245/40 200TW",
          "brakes": "4-pot front, 330mm two-piece rotors, track pads"}),

        ("h-hybrid", "Si Chassis, K24 Heart", ["h-si-bbk", "h-k24-light"],
         "Fusion: the Si's brakes and wheels under a naturally aspirated K24.",
         "kshitij", 60, 0.92,
         {"engine": "K24 swap, Skunk2 cams, individual throttle bodies, Si drivetrain",
          "exhaust": "4-1 race header, 3in header-back",
          "wheels": "18in forged, 245/40 200TW",
          "brakes": "4-pot front, 330mm two-piece rotors, track pads"}),
    ],
    "posts": {
        "h-root": [
            ("abdullah", "text", "Which 10th gen you have matters",
             "The 2.0 NA and the 1.5T are completely different platforms to mod. Almost "
             "nothing on this tree applies to the base 2.0.", 570, {}),
            ("ahmed", "image", "Trim comparison, LX vs Si",
             "Side by side. The Si brake and wheel package is worth buying into up "
             "front rather than retrofitting.", 565, {"media": True}),
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
        ],
        "h-15t-quiet": [
            ("abdullah", "text", "The 1.5T drone is real",
             "Any non-resonated catback on the 1.5T booms at 2200rpm, which is exactly "
             "highway cruise. Do not skip the resonator on this engine.", 495, {}),
            ("abdullah", "image", "Resonator position",
             "Where the second resonator sits. This position was quiet; 300mm forward "
             "was not.", 490, {"media": True}),
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
        ],
        "h-k24-header": [
            ("shoaib", "text", "Nothing happens below 5000",
             "The 4-1 moved the whole powerband up. Great on track, genuinely worse in "
             "traffic than stock.", 455, {}),
            ("kshitij", "image", "Header clearance to the rack",
             "Tight but no contact. Photo taken with the engine at full load lean.",
             450, {"media": True}),
        ],
        "h-15t-18": [
            ("abdullah", "text", "18s ride worse than you expect",
             "Going from 17 to 18 on a 40-series noticeably firmed up the ride on bad "
             "roads. Worth it visually, not mechanically.", 415, {}),
            ("abdullah", "image", "235/40 fitment, no spacers",
             "Sits flush with the arch. No rubbing at full lock or over speed bumps.",
             410, {"media": True}),
        ],
        "h-si-track": [
            ("ahmed", "text", "200TW is the sweet spot for street-track",
             "Full R-comps were faster but useless in rain and lasted four events. "
             "200TW does most of it and survives the drive home.", 395, {}),
            ("ahmed", "image", "Wheel weight on the scale",
             "Forged 18s at 8.4kg against the 11.6kg stockers.", 390, {"media": True}),
        ],
        "h-k24-light": [
            ("shoaib", "text", "17s keep the gearing alive",
             "The NA K24 does not have the torque to pull tall gearing. Going down to "
             "17s made it feel considerably quicker without changing power.", 375, {}),
            ("shoaib", "sketch", "Offset comparison sketch",
             "What +45 versus +35 does to the arch gap on an FC.", 370, {"media": True}),
        ],
        "h-15t-street": [
            ("abdullah", "text", "This is the one to copy",
             "Quiet, quick, comfortable, passes inspection. If you want one build off "
             "this whole tree, it is this one.", 315, {}),
            ("kshitij", "text", "Pad dust warning",
             "The street performance pads dust heavily on light wheels. Budget for "
             "cleaning them weekly or go to a low-dust compound.", 310, {}),
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
    ],
}


# --- Subaru WRX VA -------------------------------------------------------------------

WRX_STAGE1 = "FA20DIT, Cobb stage 1 OTS map, 93 octane"
WRX_STAGE2 = "FA20DIT, stage 2, upgraded TMIC, protune at 19psi"
WRX_BIGTURBO = "FA20DIT, VF52 hybrid turbo, built short block, E85 protune"

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
         {"engine": WRX_STAGE1, "exhaust": "Resonated 3in catback, stock downpipe"}),
        ("w-stage2-tb", "Stage 2 · Turbo-Back", ["w-stage2"],
         "Catted downpipe and 3in back. The stage 2 map assumes this.",
         "ahmed", 420, 0.86,
         {"engine": WRX_STAGE2, "exhaust": "3in catted downpipe, 3in turbo-back"}),
        ("w-big-open", "Big Turbo · Open Downpipe",
         ["w-bigturbo"],
         "Catless 3.5in. Loud enough to be a problem.",
         "kshitij", 400, 0.72,
         {"engine": WRX_BIGTURBO, "exhaust": "3.5in catless downpipe, straight through"}),

        ("w-stage1-oem", "Stage 1 · OEM+ Wheels", ["w-stage1-quiet"],
         "18in on a 245. Stock look, better rubber.",
         "abdullah", 360, 0.60,
         {"engine": WRX_STAGE1, "exhaust": "Resonated 3in catback, stock downpipe",
          "wheels": "18in cast, 245/40 summer"}),
        ("w-stage2-track", "Stage 2 · Track Wheels", ["w-stage2-tb"],
         "17in forged on 255 200TW. Smaller wheel, more tyre.",
         "ahmed", 340, 0.88,
         {"engine": WRX_STAGE2, "exhaust": "3in catted downpipe, 3in turbo-back",
          "wheels": "17in forged, 255/40 200TW"}),
        ("w-big-gravel", "Big Turbo · Gravel", ["w-big-open"],
         "15in gravel spec. The rally setup this car was designed around.",
         "shoaib", 320, 0.82,
         {"engine": WRX_BIGTURBO, "exhaust": "3.5in catless downpipe, straight through",
          "wheels": "15in gravel, 205/65 all-terrain"}),

        ("w-stage1-street", "Stage 1 Street", ["w-stage1-oem"],
         "Pads and lines. A quick, quiet, completely usable WRX.",
         "abdullah", 240, 0.68,
         {"engine": WRX_STAGE1, "exhaust": "Resonated 3in catback, stock downpipe",
          "wheels": "18in cast, 245/40 summer",
          "brakes": "Street performance pads, stainless lines"}),
        ("w-stage2-bbk", "Stage 2 · Big Brakes", ["w-stage2-track"],
         "6-pot 355mm. The VA's brakes are its weakest link on track.",
         "ahmed", 200, 0.92,
         {"engine": WRX_STAGE2, "exhaust": "3in catted downpipe, 3in turbo-back",
          "wheels": "17in forged, 255/40 200TW",
          "brakes": "6-pot front, 355mm rotors, endurance pads"}),

        ("w-stage-rally", "Gravel Stage Car", ["w-stage2-bbk", "w-big-gravel"],
         "Fusion: the track car's brake package on the gravel build.",
         "shoaib", 30, 0.94,
         {"engine": "FA20DIT, VF52 hybrid turbo, built short block, E85, detuned for gravel",
          "exhaust": "3.5in catless downpipe, straight through",
          "wheels": "15in gravel, 205/65 all-terrain",
          "brakes": "4-pot front, 320mm rotors, rally pads, hydraulic handbrake"}),
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
