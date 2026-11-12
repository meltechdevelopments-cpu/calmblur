// ============================================================================
// CALMBLUR ENGINE v1.0 — DUAL LIVE-CAPTION [CC] + VERIFIED TIMESTAMP ENGINE
// Shared across Web App, Phone "Sofa TV Buzz" Mode, Firefox & Chrome Extensions
// ============================================================================
(function (root) {
  const TRIGGER_CATEGORIES = [
    {
      id: "emetophobia",
      label: "Vomit / Emetophobia",
      shortLabel: "Vomit",
      emoji: "🤢",
      freeDefault: true,
      defaultAction: "blur_mute",
      holdSeconds: 8,
      description: "Shields retching, gagging, vomiting sounds & sick scenes.",
      captionPatterns: [
        /\b(retch|retches|retching|gag|gags|gagging|vomit|vomits|vomiting|vomited|puke|pukes|puking|puked|hurl|hurling|heave|heaves|heaving|dry[- ]heav\w*|throw(?:s|ing)? up|threw up|spit(?:s|ting)? up|cough(?:s|ing)? up(?: blood| bile)?|barf|barfing)\b/i,
        /\b(gonna be sick|going to be sick|feel like i'?m gonna throw up|pull over.{0,18}sick)\b/i
      ]
    },
    {
      id: "misophonia",
      label: "Misophonia (Chewing / Slurping)",
      shortLabel: "Misophonia",
      emoji: "🔇",
      freeDefault: false,
      defaultAction: "mute_only",
      holdSeconds: 6,
      description: "Auto-mutes loud chewing, slurping, lip-smacking & gulping cues.",
      captionPatterns: [
        /[\[\(][^\]\)]*\b(chew|chews|chewing|chomp|chomping|slurp|slurps|slurping|smack(?:s|ing)? lips|lip[- ]smacking|gulp|gulps|gulping|crunch(?:es|ing) loudly|mouth full|sniffling loudly|sucking teeth)\b[^\]\)]*[\]\)]/i,
        /\b(slurping loudly|chewing loudly|smacking lips)\b/i
      ]
    },
    {
      id: "pet_harm",
      label: "Dog / Pet Harm",
      shortLabel: "Pet Harm",
      emoji: "🐕",
      freeDefault: false,
      defaultAction: "blur_mute",
      holdSeconds: 10,
      description: "Shields dog whimpering, yelping, crying or animal distress.",
      captionPatterns: [
        /[\[\(][^\]\)]*\b(dog|puppy|cat|kitten|horse|animal|pet)s?\s+(whimper\w*|yelp\w*|cry\w*|cries|screech\w*|yowl\w*|howl\w* in pain|groan\w*)\b[^\]\)]*[\]\)]/i,
        /\b(dog whimpers|dog yelps|puppy whimpers|cat yowls)\b/i
      ]
    },
    {
      id: "spiders",
      label: "Spiders / Arachnophobia",
      shortLabel: "Spiders",
      emoji: "🕷️",
      freeDefault: false,
      defaultAction: "blur_mute",
      holdSeconds: 9,
      description: "Shields spider skittering, swarms, tarantulas & web traps.",
      captionPatterns: [
        /[\[\(][^\]\)]*\b(spider\w*|arachnid\w*|tarantula\w*|skittering|chittering|insects swarming)\b[^\]\)]*[\]\)]/i,
        /\b(giant spider|covered in spiders|tarantula|spiders everywhere|spider on your)\b/i
      ]
    },
    {
      id: "needles",
      label: "Needles / Medical / Dental",
      shortLabel: "Needles",
      emoji: "💉",
      freeDefault: false,
      defaultAction: "blur_mute",
      holdSeconds: 8,
      description: "Shields syringes, IV injections, scalpels & dental drills.",
      captionPatterns: [
        /[\[\(][^\]\)]*\b(syringe|needle|injects|injecting|dental drill|drill whirring|scalpel slicing|flatlining|defibrillator)\b[^\]\)]*[\]\)]/i,
        /\b(stick the needle|insert the needle|push the syringe|draw some blood)\b/i
      ]
    },
    {
      id: "flashing",
      label: "Flashing / Strobe Lights",
      shortLabel: "Flashing",
      emoji: "⚡",
      freeDefault: false,
      defaultAction: "blur_mute",
      holdSeconds: 10,
      description: "Dims rapid strobe lights, camera flashes & photosensitive warnings.",
      captionPatterns: [
        /[\[\(][^\]\)]*\b(flashing lights|strobe lights?|strobing|rapid flashes|camera flashes rapidly)\b[^\]\)]*[\]\)]/i,
        /\b(photosensitive|flashing lights warning|strobe effect)\b/i
      ]
    },
    {
      id: "gore",
      label: "Severe Gore / Bone Snaps",
      shortLabel: "Gore",
      emoji: "🩸",
      freeDefault: false,
      defaultAction: "blur_mute",
      holdSeconds: 8,
      description: "Shields bone snaps, squelching, stabbing & graphic blood cues.",
      captionPatterns: [
        /[\[\(][^\]\)]*\b(bone(?:s)? snap\w*|bone(?:s)? crack\w*|flesh tear\w*|squelch\w*|blood splatter\w*|screams in agony|stabbing|decapitat\w*|choking on blood)\b[^\]\)]*[\]\)]/i
      ]
    },
    {
      id: "trauma",
      label: "SA / Self-Harm / Choking",
      shortLabel: "Trauma / SA",
      emoji: "💔",
      freeDefault: false,
      defaultAction: "blur_mute",
      holdSeconds: 10,
      description: "Shields assault struggle cues, strangling & self-harm dialogue.",
      captionPatterns: [
        /[\[\(][^\]\)]*\b(muffled screaming|gasping for air|strangling|choking sounds|sobbing hysterically)\b[^\]\)]*[\]\)]/i,
        /\b(kill myself|end my life|slit my wrists|stop touching me)\b/i
      ]
    },
    {
      id: "profanity",
      label: "Swearing / Profanity Mute",
      shortLabel: "Swearing",
      emoji: "🤬",
      freeDefault: false,
      defaultAction: "mute_only",
      holdSeconds: 3.5,
      description: "Cleanly mutes strong swear words using live captions.",
      captionPatterns: [
        /\b(fuck\w*|motherfuck\w*|shit|shitting|bullshit|bitch\w*|asshole\w*|bastard\w*|cunt\w*|goddamn\w*|prick)\b/i
      ]
    }
  ];

  // Helper to convert "MM:SS" or "H:MM:SS" into seconds
  function parseTimestamp(str) {
    if (typeof str === "number") return Math.max(0, Math.floor(str));
    const clean = String(str || "").trim();
    if (!clean) return 0;
    const parts = clean.split(":").map(function (p) { return parseInt(p, 10) || 0; });
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  function formatTimestamp(totalSec) {
    const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = function (n) { return n < 10 ? "0" + n : String(n); };
    if (h > 0) return h + ":" + pad(m) + ":" + pad(s);
    return pad(m) + ":" + pad(s);
  }

  // Curated Starter Library of High-Search Streaming Shows & Movies (with exact Sofa Buzz windows)
  // Includes both Trigger-Tagged hits AND Verified Comfort Safe titles!
  const CURATED_TITLES = [
    {
      id: "monster-lizzie-borden-s1e2",
      title: "Monster: Lizzie Borden — Ep 2",
      platform: "Netflix",
      year: 2026,
      runtimeMin: 52,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "18:40", end: "19:35", cue: "Dinner table spoiled oysters scene begins.", note: "Graphic food-poisoning sickness scene; safe again at 19:36." },
        { category: "emetophobia", start: "34:10", end: "34:42", cue: "Bedroom aftermath check-in.", note: "Brief follow-up retching sound cue." }
      ]
    },
    {
      id: "the-pitt-s1e1",
      title: "The Pitt — Season 1, Ep 1 & Hot-Dog Ep",
      platform: "Max / Sky",
      year: 2026,
      runtimeMin: 50,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "23:02", end: "23:18", cue: "Eating-contest patient brought into ER bay.", note: "Full visual and audio sickness; safe at 23:19." },
        { category: "emetophobia", start: "30:52", end: "31:08", cue: "Doctor returns to ER curtain.", note: "Second brief ER vomiting moment." },
        { category: "needles", start: "11:15", end: "11:38", cue: "Trauma bay IV line prep.", note: "Close-up IV needle insertion." }
      ]
    },
    {
      id: "something-really-bad-s1e1",
      title: "Something Really Bad Is Going to Happen — Ep 1",
      platform: "Netflix",
      year: 2026,
      runtimeMin: 55,
      safeOverall: false,
      scenes: [
        { category: "pet_harm", start: "47:10", end: "48:25", cue: "Character wakes with nosebleed and walks toward bathroom.", note: "Distressing dog scene in bathroom; skip to 48:26." },
        { category: "gore", start: "03:15", end: "03:45", cue: "Opening house flashback.", note: "Brief bloody flashback." }
      ]
    },
    {
      id: "dont-move-film",
      title: "Don't Move",
      platform: "Netflix",
      year: 2026,
      runtimeMin: 92,
      safeOverall: false,
      scenes: [
        { category: "needles", start: "09:40", end: "10:15", cue: "Forest clearing confrontation.", note: "Paralytic syringe injection scene." },
        { category: "spiders", start: "28:10", end: "29:05", cue: "Lying still on forest floor near fallen log.", note: "Crawling forest insects/arachnid close-up." }
      ]
    },
    {
      id: "adolescence-s1",
      title: "Adolescence — Limited Series (All 4 Eps)",
      platform: "Netflix",
      year: 2025,
      runtimeMin: 55,
      safeOverall: false,
      scenes: [
        { category: "needles", start: "21:10", end: "21:45", cue: "Ep 1 custody nurse medical check.", note: "Custody blood/medical needle anxiety moment (zero vomiting in series)." },
        { category: "trauma", start: "44:00", end: "45:20", cue: "Ep 1 police interview CCTV laptop playback.", note: "Distressing CCTV assault discussion." }
      ]
    },
    {
      id: "squid-game-s2e7",
      title: "Squid Game — Season 2, Ep 7",
      platform: "Netflix",
      year: 2025,
      runtimeMin: 60,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "04:48", end: "05:12", cue: "Cut to night boat search crew in rough waves.", note: "Crew member seasick over side of boat; safe at 05:13." },
        { category: "gore", start: "38:20", end: "39:40", cue: "Stairwell firefight intensifies.", note: "Heavy gunfire & coughing blood." }
      ]
    },
    {
      id: "knives-out",
      title: "Knives Out",
      platform: "Netflix / Prime",
      year: 2019,
      runtimeMin: 130,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "18:12", end: "18:28", cue: "Marta asked directly about family secret upstairs.", note: "Sudden stress gag/vomit reaction (recurring plot trait)." },
        { category: "emetophobia", start: "44:05", end: "44:25", cue: "Blanc questions Marta outside near car.", note: "Brief outdoor gag reaction." },
        { category: "needles", start: "33:40", end: "34:35", cue: "Evening medicine bag opened upstairs.", note: "Morphine vials and syringe close-up." },
        { category: "emetophobia", start: "1:59:10", end: "2:00:05", cue: "Final confrontation in library.", note: "Dramatic final vomiting moment; safe right after 2:00:06." }
      ]
    },
    {
      id: "pitch-perfect",
      title: "Pitch Perfect",
      platform: "Netflix / Prime",
      year: 2012,
      runtimeMin: 112,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "03:45", end: "04:30", cue: "Aubrey looks pale during opening finals solo.", note: "Notorious onstage projectile scene; skip cleanly to 04:32." },
        { category: "emetophobia", start: "1:18:15", end: "1:19:10", cue: "Rehearsal room argument heats up.", note: "Second floor sickness scene; safe at 1:19:12." }
      ]
    },
    {
      id: "triangle-of-sadness",
      title: "Triangle of Sadness",
      platform: "Prime Video / Netflix",
      year: 2022,
      runtimeMin: 147,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "1:11:00", end: "1:24:30", cue: "Captain's formal yacht dinner as storm waves start rocking.", note: "Extended 13-minute seasickness sequence — skip straight to 1:24:35!" }
      ]
    },
    {
      id: "bridesmaids",
      title: "Bridesmaids",
      platform: "Netflix / Prime",
      year: 2011,
      runtimeMin: 125,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "49:30", end: "55:10", cue: "Bridal salon fitting after Brazilian lunch.", note: "Full food-poisoning sequence in dress shop; safe at 55:15." }
      ]
    },
    {
      id: "stand-by-me",
      title: "Stand By Me",
      platform: "Netflix / Prime",
      year: 1986,
      runtimeMin: 89,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "38:10", end: "42:40", cue: "Campfire story begins ('Lardass Hogan' pie contest).", note: "Famous pie-eating contest scene; skip to 42:42." }
      ]
    },
    {
      id: "stranger-things-s4e1",
      title: "Stranger Things — Season 4, Ep 1",
      platform: "Netflix",
      year: 2022,
      runtimeMin: 78,
      safeOverall: false,
      scenes: [
        { category: "gore", start: "1:13:10", end: "1:15:40", cue: "Trailer ceiling clock chime & levitation.", note: "Intense bone-snapping horror finale." },
        { category: "flashing", start: "1:12:00", end: "1:15:30", cue: "Trailer lights begin flickering rapidly.", note: "Heavy strobe/flickering lights." },
        { category: "emetophobia", start: "29:15", end: "29:35", cue: "Bathroom stall morning scene.", note: "Brief gagging/sickness audio." }
      ]
    },
    {
      id: "stranger-things-s3",
      title: "Stranger Things — Season 3, Ep 6",
      platform: "Netflix",
      year: 2019,
      runtimeMin: 59,
      safeOverall: false,
      scenes: [
        { category: "flashing", start: "42:00", end: "44:30", cue: "Hospital hallway lights buzz wildly.", note: "Strong flashing neon lights in hospital chase." },
        { category: "gore", start: "45:10", end: "46:50", cue: "Monster forms in hospital corridor.", note: "Graphic body-horror melting scene." }
      ]
    },
    {
      id: "john-wick-1",
      title: "John Wick (Chapter 1)",
      platform: "Netflix / Prime",
      year: 2014,
      runtimeMin: 101,
      safeOverall: false,
      scenes: [
        { category: "pet_harm", start: "14:55", end: "17:15", cue: "Masked intruders break into house at night.", note: "Puppy Daisy harmed off-screen & aftermath found — skip from 14:55 to 17:20!" }
      ]
    },
    {
      id: "i-am-legend",
      title: "I Am Legend",
      platform: "Netflix / Max",
      year: 2007,
      runtimeMin: 101,
      safeOverall: false,
      scenes: [
        { category: "pet_harm", start: "54:20", end: "1:00:45", cue: "Sam chases deer into dark building.", note: "Heartbreaking German Shepherd infection & loss scene; skip to 1:00:50." }
      ]
    },
    {
      id: "marley-and-me",
      title: "Marley & Me",
      platform: "Disney+ / Prime",
      year: 2008,
      runtimeMin: 115,
      safeOverall: false,
      scenes: [
        { category: "pet_harm", start: "1:36:00", end: "1:46:30", cue: "Older Marley struggles on back steps.", note: "Extended vet clinic goodbye scene." }
      ]
    },
    {
      id: "harry-potter-chamber",
      title: "Harry Potter and the Chamber of Secrets",
      platform: "Netflix / Max",
      year: 2002,
      runtimeMin: 161,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "41:50", end: "43:45", cue: "Ron's broken wand backfires on courtyard grass.", note: "Slug-vomiting spell scene in Hagrid's hut; safe at 43:50." },
        { category: "spiders", start: "1:44:20", end: "1:51:15", cue: "Harry & Ron follow trail into Forbidden Forest hollow.", note: "Giant Aragog & hundreds of swarming spiders; skip to 1:51:20!" }
      ]
    },
    {
      id: "lotr-return-of-king",
      title: "The Lord of the Rings: The Return of the King",
      platform: "Prime Video / Max",
      year: 2003,
      runtimeMin: 201,
      safeOverall: false,
      scenes: [
        { category: "spiders", start: "1:46:10", end: "1:55:30", cue: "Frodo enters dark sticky tunnel of Cirith Ungol.", note: "Giant spider Shelob chase & web cocoon; safe at 1:55:35." },
        { category: "misophonia", start: "52:10", end: "53:25", cue: "Denethor eating tomatoes while Pippin sings.", note: "Famous loud chewing/juice dripping close-up." }
      ]
    },
    {
      id: "spaceman-2024",
      title: "Spaceman",
      platform: "Netflix",
      year: 2024,
      runtimeMin: 107,
      safeOverall: false,
      scenes: [
        { category: "spiders", start: "22:15", end: "25:40", cue: "Jakub hears movement inside spacecraft airlock.", note: "First sudden close-up appearance of giant alien spider Hanus." }
      ]
    },
    {
      id: "criminal-minds-s18e7",
      title: "Criminal Minds: Evolution — S18 Ep 7",
      platform: "Disney+ / Paramount+",
      year: 2025,
      runtimeMin: 51,
      safeOverall: false,
      scenes: [
        { category: "spiders", start: "06:10", end: "08:40", cue: "Victim trapped inside dark room.", note: "Heavy live spider/arachnophobia sequence." },
        { category: "spiders", start: "29:15", end: "31:50", cue: "Team investigates basement enclosure.", note: "Second graphic spider hallucination/swarm." }
      ]
    },
    {
      id: "yellowjackets-s2e3",
      title: "Yellowjackets — Season 2, Ep 3 ('Digestif')",
      platform: "Netflix / Paramount+",
      year: 2023,
      runtimeMin: 58,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "04:10", end: "05:12", cue: "Morning cabin aftermath before opening credits.", note: "Two characters sick outside cabin; safe once credits roll at 05:15." }
      ]
    },
    {
      id: "the-bear-s2e6",
      title: "The Bear — Season 2, Ep 6 ('Fishes')",
      platform: "Disney+ / Hulu",
      year: 2023,
      runtimeMin: 66,
      safeOverall: false,
      scenes: [
        { category: "misophonia", start: "12:00", end: "15:20", cue: "Chaotic kitchen prep & loud overlapping timers/tasting.", note: "High sensory noise + loud kitchen eating." },
        { category: "trauma", start: "57:30", end: "1:02:10", cue: "Dinner table fork confrontation escalates.", note: "Extreme family shouting & car crash into living room." }
      ]
    },
    {
      id: "severance-s1e2",
      title: "Severance — Season 1, Ep 2",
      platform: "Apple TV+ / Prime",
      year: 2022,
      runtimeMin: 57,
      safeOverall: false,
      scenes: [
        { category: "needles", start: "38:10", end: "41:20", cue: "Flashback to surgical severance procedure table.", note: "Skull/brain implant needle & drill procedure." },
        { category: "emetophobia", start: "08:15", end: "08:45", cue: "Post-procedure hallway disorientation.", note: "Brief sick reaction in bin." }
      ]
    },
    {
      id: "saltburn",
      title: "Saltburn",
      platform: "Prime Video",
      year: 2023,
      runtimeMin: 131,
      safeOverall: false,
      scenes: [
        { category: "misophonia", start: "47:15", end: "49:30", cue: "Bathtub drain scene upstairs.", note: "Graphic slurping sound cue — auto-mute recommended!" },
        { category: "gore", start: "1:46:10", end: "1:48:20", cue: "Hospital bedside tube scene.", note: "Medical tube pull." }
      ]
    },
    {
      id: "the-substance",
      title: "The Substance",
      platform: "Prime Video / MUBI",
      year: 2024,
      runtimeMin: 141,
      safeOverall: false,
      scenes: [
        { category: "misophonia", start: "14:20", end: "16:15", cue: "Restaurant shrimp lunch close-up with Harvey.", note: "Extreme amplified shrimp chewing & slurping." },
        { category: "needles", start: "24:30", end: "28:10", cue: "Bathroom green vial packet opened.", note: "Close-up needle injection & spinal tap." },
        { category: "emetophobia", start: "1:52:00", end: "1:55:30", cue: "Backstage mirror transformation.", note: "Graphic body-horror gagging/coughing." }
      ]
    },
    {
      id: "sweetpea-s1e1",
      title: "Sweetpea — Season 1, Ep 1",
      platform: "Sky / Starz",
      year: 2024,
      runtimeMin: 46,
      safeOverall: false,
      scenes: [
        { category: "pet_harm", start: "26:40", end: "28:05", cue: "Walking small dog along busy roadside.", note: "Sudden dog traffic accident; skip from 26:35 to 28:10." }
      ]
    },
    {
      id: "baby-reindeer-s1e4",
      title: "Baby Reindeer — Ep 4",
      platform: "Netflix",
      year: 2024,
      runtimeMin: 45,
      safeOverall: false,
      scenes: [
        { category: "trauma", start: "24:10", end: "33:40", cue: "Edinburgh flat late-night drinks scene.", note: "Heavy sexual assault & drug trauma sequence — skip to 33:45." },
        { category: "emetophobia", start: "34:05", end: "34:40", cue: "Bathroom sink immediately afterward.", note: "Post-trauma vomiting in sink." }
      ]
    },
    {
      id: "breaking-bad-s2e12",
      title: "Breaking Bad — Season 2, Ep 12 ('Phoenix')",
      platform: "Netflix",
      year: 2009,
      runtimeMin: 47,
      safeOverall: false,
      scenes: [
        { category: "needles", start: "29:10", end: "30:30", cue: "Bedroom drawer opened at night.", note: "IV syringe injection scene." },
        { category: "emetophobia", start: "43:20", end: "45:35", cue: "Walt enters darkened apartment bedroom.", note: "Distressing overdose choking/vomiting scene; skip to credits." }
      ]
    },
    {
      id: "the-last-of-us-s1e5",
      title: "The Last of Us — Season 1, Ep 5",
      platform: "Max / Sky",
      year: 2023,
      runtimeMin: 59,
      safeOverall: false,
      scenes: [
        { category: "trauma", start: "52:40", end: "55:30", cue: "Morning motel room quiet conversation.", note: "Sudden tragic self-harm gunshot moment." }
      ]
    },
    {
      id: "evil-dead-rise",
      title: "Evil Dead Rise",
      platform: "Netflix / Max",
      year: 2023,
      runtimeMin: 96,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "07:20", end: "08:15", cue: "Cabin dock lake opening scene.", note: "Graphic black-bile projectile horror cue." },
        { category: "gore", start: "58:10", end: "1:00:20", cue: "Kitchen cheese-grater fight.", note: "Extreme gore." }
      ]
    },
    {
      id: "twin-peaks-return-e3",
      title: "Twin Peaks: The Return — Part 3",
      platform: "Paramount+ / MUBI",
      year: 2017,
      runtimeMin: 58,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "24:05", end: "25:20", cue: "Dougie Jones feels dizzy inside car.", note: "Extended graphic car sickness scene." },
        { category: "flashing", start: "09:10", end: "11:40", cue: "Purple sea room electrical outlet.", note: "Rapid stuttering strobe edits." }
      ]
    },
    {
      id: "black-mirror-s6e1",
      title: "Black Mirror — 'Joan Is Awful' (S6 Ep 1)",
      platform: "Netflix",
      year: 2023,
      runtimeMin: 56,
      safeOverall: false,
      scenes: [
        { category: "emetophobia", start: "37:20", end: "39:30", cue: "Joan eats burgers before walking into church wedding.", note: "Gross-out church aisle stomach scene." }
      ]
    },
    // Verified 100% Safe Comfort Titles (Great for anxious nights!)
    {
      id: "paddington-2",
      title: "Paddington 2",
      platform: "Netflix / BBC iPlayer",
      year: 2017,
      runtimeMin: 103,
      safeOverall: true,
      scenes: []
    },
    {
      id: "great-british-bake-off",
      title: "The Great British Bake Off",
      platform: "Netflix / Channel 4",
      year: 2025,
      runtimeMin: 58,
      safeOverall: true,
      scenes: []
    },
    {
      id: "heartstopper-s1",
      title: "Heartstopper — Season 1",
      platform: "Netflix",
      year: 2022,
      runtimeMin: 30,
      safeOverall: true,
      scenes: []
    },
    {
      id: "the-good-place-s1",
      title: "The Good Place — Season 1",
      platform: "Netflix",
      year: 2016,
      runtimeMin: 22,
      safeOverall: true,
      scenes: []
    },
    {
      id: "ted-lasso-s1",
      title: "Ted Lasso — Season 1",
      platform: "Apple TV+",
      year: 2020,
      runtimeMin: 32,
      safeOverall: true,
      scenes: []
    },
    {
      id: "schitts-creek-s2",
      title: "Schitt's Creek — Seasons 2–6",
      platform: "Netflix / Prime",
      year: 2020,
      runtimeMin: 22,
      safeOverall: true,
      scenes: []
    }
  ];

  const CATEGORY_MAP = {};
  TRIGGER_CATEGORIES.forEach(function (c) {
    CATEGORY_MAP[c.id] = c;
  });

  function getCategory(id) {
    return CATEGORY_MAP[id] || null;
  }

  // Scan a closed-caption / subtitle string against active categories + optional custom words
  function scanCaptionText(text, activeCategoryIds, customWords) {
    const clean = String(text || "").trim();
    if (!clean || clean.length < 2) return null;

    const enabled = Array.isArray(activeCategoryIds) ? activeCategoryIds : ["emetophobia"];

    for (let i = 0; i < enabled.length; i++) {
      const cat = CATEGORY_MAP[enabled[i]];
      if (!cat) continue;
      for (let p = 0; p < cat.captionPatterns.length; p++) {
        const match = clean.match(cat.captionPatterns[p]);
        if (match) {
          return {
            categoryId: cat.id,
            label: cat.label,
            shortLabel: cat.shortLabel,
            emoji: cat.emoji,
            defaultAction: cat.defaultAction,
            holdSeconds: cat.holdSeconds,
            matchedWord: match[0]
          };
        }
      }
    }

    if (Array.isArray(customWords) && customWords.length > 0) {
      const lower = clean.toLowerCase();
      for (let w = 0; w < customWords.length; w++) {
        const word = String(customWords[w] || "").trim().toLowerCase();
        if (word.length >= 2 && lower.indexOf(word) !== -1) {
          return {
            categoryId: "custom",
            label: "Custom Trigger (" + word + ")",
            shortLabel: "Custom",
            emoji: "🛡️",
            defaultAction: "blur_mute",
            holdSeconds: 8,
            matchedWord: word
          };
        }
      }
    }

    return null;
  }

  // Evaluate current playback second against a title's scene list (with 15s pre-warning for Sofa TV Buzz!)
  function evaluatePlaybackSecond(titleObj, currentSec, activeCategoryIds, leadWarningSec) {
    if (!titleObj || !Array.isArray(titleObj.scenes) || titleObj.scenes.length === 0) {
      return { state: "clear", scene: null, secondsUntil: null, secondsRemaining: null };
    }
    const lead = typeof leadWarningSec === "number" ? leadWarningSec : 15;
    const enabled = Array.isArray(activeCategoryIds) && activeCategoryIds.length > 0
      ? activeCategoryIds
      : null;

    let nearestUpcoming = null;
    let nearestDelta = Infinity;

    for (let i = 0; i < titleObj.scenes.length; i++) {
      const sc = titleObj.scenes[i];
      if (enabled && enabled.indexOf(sc.category) === -1) continue;
      const startSec = parseTimestamp(sc.start);
      const endSec = Math.max(startSec + 4, parseTimestamp(sc.end));
      const cat = getCategory(sc.category);

      // Currently inside trigger window (with 1.5s early cushion)
      if (currentSec >= Math.max(0, startSec - 1.5) && currentSec <= endSec) {
        return {
          state: "active",
          scene: sc,
          category: cat,
          startSec: startSec,
          endSec: endSec,
          secondsRemaining: Math.max(0, Math.ceil(endSec - currentSec)),
          secondsUntil: 0
        };
      }

      // Upcoming within leadWarningSec (e.g. 15s heads-up buzz on phone!)
      if (currentSec < startSec && startSec - currentSec <= lead) {
        return {
          state: "heads_up",
          scene: sc,
          category: cat,
          startSec: startSec,
          endSec: endSec,
          secondsUntil: Math.max(1, Math.ceil(startSec - currentSec)),
          secondsRemaining: Math.ceil(endSec - startSec)
        };
      }

      if (currentSec < startSec && startSec - currentSec < nearestDelta) {
        nearestDelta = startSec - currentSec;
        nearestUpcoming = {
          scene: sc,
          category: cat,
          startSec: startSec,
          endSec: endSec,
          secondsUntil: Math.ceil(startSec - currentSec)
        };
      }
    }

    return {
      state: "clear",
      scene: null,
      nextScene: nearestUpcoming
    };
  }

  function searchTitles(query, extraTitles) {
    const all = (Array.isArray(extraTitles) ? extraTitles : []).concat(CURATED_TITLES);
    const q = String(query || "").trim().toLowerCase();
    if (!q) return all;

    return all.filter(function (item) {
      if (item.title.toLowerCase().indexOf(q) !== -1) return true;
      if (item.platform.toLowerCase().indexOf(q) !== -1) return true;
      if (q === "safe" && item.safeOverall) return true;
      for (let i = 0; i < item.scenes.length; i++) {
        const cat = getCategory(item.scenes[i].category);
        if (cat && (cat.label.toLowerCase().indexOf(q) !== -1 || cat.id.indexOf(q) !== -1)) {
          return true;
        }
      }
      return false;
    });
  }

  // Try matching a browser page title (e.g. "Knives Out | Netflix") against curated titles
  function matchTitleFromPageString(pageTitleStr, extraTitles) {
    const clean = String(pageTitleStr || "").toLowerCase();
    if (!clean) return null;
    const all = (Array.isArray(extraTitles) ? extraTitles : []).concat(CURATED_TITLES);
    for (let i = 0; i < all.length; i++) {
      const baseTitle = all[i].title.split("—")[0].trim().toLowerCase();
      if (baseTitle.length >= 4 && clean.indexOf(baseTitle) !== -1) {
        return all[i];
      }
    }
    return null;
  }

  root.CALMBLUR_ENGINE = {
    TRIGGER_CATEGORIES: TRIGGER_CATEGORIES,
    CURATED_TITLES: CURATED_TITLES,
    getCategory: getCategory,
    parseTimestamp: parseTimestamp,
    formatTimestamp: formatTimestamp,
    scanCaptionText: scanCaptionText,
    evaluatePlaybackSecond: evaluatePlaybackSecond,
    searchTitles: searchTitles,
    matchTitleFromPageString: matchTitleFromPageString
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.CALMBLUR_ENGINE;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : window));
