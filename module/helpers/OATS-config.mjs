export const OATS = {};

/**
 * The set of Ability Scores used within the sytem.
 * @type {Object}
 */

 OATS.abilities = {
  str: "OATS.abilities.str",
  foc: "OATS.abilities.foc",
  pow: "OATS.abilities.pow",
  dex: "OATS.abilities.dex",
  mrk: "OATS.abilities.mrk",
  agi: "OATS.abilities.agi",
  con: "OATS.abilities.con",
  int: "OATS.abilities.int",
  wis: "OATS.abilities.wis",
  cha: "OATS.abilities.cha"
};

OATS.abilityShort = {
  str: "OATS.abilityShort.str",
  foc: "OATS.abilityShort.foc",
  pow: "OATS.abilityShort.pow",
  dex: "OATS.abilityShort.dex",
  mrk: "OATS.abilityShort.mrk",
  agi: "OATS.abilityShort.agi",
  con: "OATS.abilityShort.con",
  int: "OATS.abilityShort.int",
  wis: "OATS.abilityShort.wis",
  cha: "OATS.abilityShort.cha"
};

OATS.saves = {
  fortitude: "OATS.saves.fortitude",
  reflex: "OATS.saves.reflex",
  will: "OATS.saves.will"
}

OATS.labels = {
  fortitude: "OATS.labels.fortitude",
  reflex: "OATS.labels.reflex",
  will: "OATS.labels.will",
  base: "OATS.labels.base",
  misc: "OATS.labels.misc",
  extendedHP: "OATS.labels.extendedHP",
  coreHP: "OATS.labels.coreHP",
  tempHP: "OATS.labels.tempHP",
  bleed: "OATS.labels.bleed",
  initiative: "OATS.labels.initiative",
  combatPoints: "OATS.labels.combatPoints",
  armor: "OATS.labels.armor",
  tempCP: "OATS.labels.tempCP",
  defense: "OATS.labels.defense",
  movement: "OATS.labels.movement",
  flat: "OATS.labels.flat",
  touch: "OATS.labels.touch",
  level: "OATS.labels.level",
  character: "OATS.labels.character",
  ability: "OATS.labels.ability"
}

OATS.skills = {
  ranks: "OATS.skills.ranks",
  equipment: "OATS.skills.equipment",
  synergy: "OATS.skills.synergy",
  occupation: "OATS.skills.occupation",
  focus: "OATS.skills.focus",
  unfocus: "OATS.skills.unfocus",
  double: "OATS.skills.double"
}

OATS.phrasing = {
  rolling: "OATS.phrasing.rolling",
  check: "OATS.phrasing.check",
  save: "OATS.phrasing.save",
  bleed: "OATS.phrasing.bleed"
}

OATS.characterActions = {
  walking: {name: 'Walking and Running (per 5ft)', cost: 1, quantity: 1},
  crouchmove: {name: 'Moving while Crouched (per 5ft)', cost: 2, quantity: 1},
  proneclimb: {name: 'Moving while Prone; Accelerated Climbing (per 5ft)', cost: 3, quantity: 1},
  fastclimb: {name: 'Climbing (per 5ft)', cost: 4, quantity: 1},
  swimming: {name: 'Swimming (per 5ft)', cost: 5, quantity: 1},
  unholster: {name: 'Draw a weapon from a holster or sheath', cost: 3, quantity: 1},
  unsling: {name: 'Unsling or resling a weapon', cost: 5, quantity: 1},
  waistband: {name: 'Draw a weapon from Waistband carry', cost: 6, quantity: 1},
  holster: {name: 'Holster a weapon', cost: 4, quantity: 1},
  bagging: {name: 'Retrieve or store an item in a pocket, bag, or pouch', cost: 4, quantity: 1},
  mollelbe: {name: 'Retrieve or store an item in MOLLE or LBE', cost: 3, quantity: 1},
  pickmanip: {name: 'Pick up or manipulate an object within reach', cost: 3, quantity: 1},
  dropdrop: {name: 'Drop an item or drop to kneeling, sitting, or prone', cost: 0, quantity: 0},
  cyclebow: {name: 'Cycle a weapon or reload a bow', cost: 1, quantity: 1},
  standup: {name: 'Stand up from kneeling, prone, or sitting', cost: 6, quantity: 1},
  clearjam: {name: 'Clear a jammed firearm', cost: 12, quantity: 1},
  crossbow: {name: 'Reload a crossbow or speargun', cost: 2, quantity: 1},
  slingtase: {name: 'Reload a slingshot, Taser, paintball hopper, or pistol crossbow', cost: 3, quantity: 1},
  tranqload: {name: 'Reload a tranquilizer gun', cost: 9, quantity: 1},
  handload: {name: 'Reload or unload a weapon, magazine, speedloader, or clip by hand (per round)', cost: 3, quantity: 1},
  magload: {name: 'Reload a firearm using a new magazine, speedloader, or clip', cost: 4, quantity: 1},
  beltfed: {name: 'Reload a link fed weapon with a new link', cost: 6, quantity: 1},
  clipazine: {name: 'Reload a magazine using a clip', cost: 3, quantity: 1},
  blackpowder: {name: 'Reload a black powder weapon (per barrel or chamber)', cost: 12, quantity: 1},
  plasdraw: {name: 'Draw a plasma blade or psiblade', cost: 6, quantity: 1},
  coolant: {name: 'Reload a plasarm, lasarm, elarm, or plasma blade', cost: 4, quantity: 1}
}

OATS.characterIcons = [
  'systems/opsandtactics/icons/svg/transparent/astronaut-helmet.svg',
  'systems/opsandtactics/icons/svg/transparent/balaclava.svg',
  'systems/opsandtactics/icons/svg/transparent/bandit.svg',
  'systems/opsandtactics/icons/svg/transparent/cowled.svg',
  'systems/opsandtactics/icons/svg/transparent/hoodie.svg',
  'systems/opsandtactics/icons/svg/transparent/mustache.svg',
  'systems/opsandtactics/icons/svg/transparent/police-officer-head.svg',
  'systems/opsandtactics/icons/svg/transparent/spy.svg'
]

OATS.spacecraftIcons = [
  'systems/opsandtactics/icons/svg/transparent/defense-satellite.svg',
  'systems/opsandtactics/icons/svg/transparent/interceptor-ship.svg',
  'systems/opsandtactics/icons/svg/transparent/rocket.svg',
  'systems/opsandtactics/icons/svg/transparent/scout-ship.svg',
  'systems/opsandtactics/icons/svg/transparent/spaceship.svg',  
  'systems/opsandtactics/icons/svg/transparent/space-shuttle.svg',
  'systems/opsandtactics/icons/svg/transparent/starfighter.svg',
  'systems/opsandtactics/icons/svg/transparent/ufo.svg'
];

OATS.weaponIcons = [
  'systems/opsandtactics/icons//svg/3d-hammer.svg',
  'systems/opsandtactics/icons//svg/ak47.svg',
  'systems/opsandtactics/icons//svg/baseball-bat.svg',
  'systems/opsandtactics/icons/svg/baton.svg',
  'systems/opsandtactics/icons/svg/battle-axe.svg',
  'systems/opsandtactics/icons/svg/bowie-knife.svg',
  'systems/opsandtactics/icons/svg/claw-hammer.svg',
  'systems/opsandtactics/icons/svg/colt-m1911.svg',
  'systems/opsandtactics/icons/svg/crossbow.svg',
  'systems/opsandtactics/icons/svg/desert-eagle.svg',
  'systems/opsandtactics/icons/svg/famas.svg',
  'systems/opsandtactics/icons/svg/fire-axe.svg',
  'systems/opsandtactics/icons/svg/fn-fal.svg',
  'systems/opsandtactics/icons/svg/fountain-pen.svg',
  'systems/opsandtactics/icons/svg/glock.svg',
  'systems/opsandtactics/icons/svg/hatchet.svg',
  'systems/opsandtactics/icons/svg/katana.svg',
  'systems/opsandtactics/icons/svg/laser-blast.svg',
  'systems/opsandtactics/icons/svg/lead-pipe.svg',
  'systems/opsandtactics/icons/svg/lee-enfield.svg',
  'systems/opsandtactics/icons/svg/mac-10.svg',
  'systems/opsandtactics/icons/svg/mp5.svg',
  'systems/opsandtactics/icons/svg/p90.svg',
  'systems/opsandtactics/icons/svg/pocket-bow.svg',
  'systems/opsandtactics/icons/svg/revolver.svg',
  'systems/opsandtactics/icons/svg/riot-shield.svg',
  'systems/opsandtactics/icons/svg/sabre.svg',
  'systems/opsandtactics/icons/svg/sawed-off-shotgun.svg',
  'systems/opsandtactics/icons/svg/shuriken.svg',
  'systems/opsandtactics/icons/svg/steyr-aug.svg',
  'systems/opsandtactics/icons/svg/switchblade.svg',
  'systems/opsandtactics/icons/svg/tec-9.svg',
  'systems/opsandtactics/icons/svg/telescopic-baton.svg',
  'systems/opsandtactics/icons/svg/thompson-m1928.svg',
  'systems/opsandtactics/icons/svg/two-handed-sword.svg',
  'systems/opsandtactics/icons/svg/walther-ppk.svg',
  'systems/opsandtactics/icons/svg/winchester-rifle.svg'
]

OATS.armorIcons = [
  'systems/opsandtactics/icons/svg/abdominal-armor.svg',
  'systems/opsandtactics/icons/svg/armor-vest.svg',
  'systems/opsandtactics/icons/svg/chain-mail.svg',
  'systems/opsandtactics/icons/svg/fish-scales.svg',
  'systems/opsandtactics/icons/svg/flat-platform.svg',
  'systems/opsandtactics/icons/svg/kevlar-vest.svg',
  'systems/opsandtactics/icons/svg/metal-scales.svg',
  'systems/opsandtactics/icons/svg/plastron.svg',
  'systems/opsandtactics/icons/svg/shieldcomb.svg',
  'systems/opsandtactics/icons/svg/sleeveless-jacket.svg',
  'systems/opsandtactics/icons/svg/space-suit.svg',
  'systems/opsandtactics/icons/svg/trench-body-armor.svg',
  'systems/opsandtactics/icons/svg/sparkles.svg',
  'systems/opsandtactics/icons/svg/static.svg'
];

OATS.objectIcons = [
  'systems/opsandtactics/icons/svg/dynamite.svg',
  'systems/opsandtactics/icons/svg/fertilizer-bag.svg',
  'systems/opsandtactics/icons/svg/flash-grenade.svg',
  'systems/opsandtactics/icons/svg/grenade.svg',
  'systems/opsandtactics/icons/svg/molotov.svg',
  'systems/opsandtactics/icons/svg/stun-grenade.svg',
  'systems/opsandtactics/icons/svg/backpack.svg',
  'systems/opsandtactics/icons/svg/cannister.svg',
  'systems/opsandtactics/icons/svg/cardboard-box-closed.svg',
  'systems/opsandtactics/icons/svg/compact-disc.svg',
  'systems/opsandtactics/icons/svg/disc.svg',
  'systems/opsandtactics/icons/svg/duffel-bag.svg',
  'systems/opsandtactics/icons/svg/gym-bag.svg',
  'systems/opsandtactics/icons/svg/jerrycan.svg',
  'systems/opsandtactics/icons/svg/rolling-suitcase.svg',
  'systems/opsandtactics/icons/svg/school-bag.svg',
  'systems/opsandtactics/icons/svg/suitcase.svg',
  'systems/opsandtactics/icons/svg/toolbox.svg',
  'systems/opsandtactics/icons/svg/usb-key.svg',
  'systems/opsandtactics/icons/svg/water-flask.svg',
  'systems/opsandtactics/icons/svg/batteries.svg',
  'systems/opsandtactics/icons/svg/bullets.svg',
  'systems/opsandtactics/icons/svg/cooler.svg',
  'systems/opsandtactics/icons/svg/cylinder.svg',
  'systems/opsandtactics/icons/svg/magazine.svg',
  'systems/opsandtactics/icons/svg/medicine-pills.svg',
  'systems/opsandtactics/icons/svg/quill-ink.svg',
  'systems/opsandtactics/icons/svg/quiver.svg',
  'systems/opsandtactics/icons/svg/shotgun-rounds.svg',
  'systems/opsandtactics/icons/svg/sticking-plaster.svg',
  'systems/opsandtactics/icons/svg/black-book.svg',
  'systems/opsandtactics/icons/svg/book-cover.svg',
  'systems/opsandtactics/icons/svg/cigar.svg',
  'systems/opsandtactics/icons/svg/cigarette.svg',
  'systems/opsandtactics/icons/svg/cube.svg',
  'systems/opsandtactics/icons/svg/flashlight.svg',
  'systems/opsandtactics/icons/svg/laptop.svg',
  'systems/opsandtactics/icons/svg/metal-bar.svg',
  'systems/opsandtactics/icons/svg/notebook.svg',
  'systems/opsandtactics/icons/svg/papers.svg',
  'systems/opsandtactics/icons/svg/passport.svg',
  'systems/opsandtactics/icons/svg/pc.svg',
  'systems/opsandtactics/icons/svg/screwdriver.svg',
  'systems/opsandtactics/icons/svg/smartphone.svg',
  'systems/opsandtactics/icons/svg/tablet.svg',
  'systems/opsandtactics/icons/svg/walkie-talkie.svg',
  'systems/opsandtactics/icons/svg/white-book.svg'
];

OATS.magicIcons = [
  'systems/opsandtactics/icons/svg/all-seeing-eye.svg',
  'systems/opsandtactics/icons/svg/chemical-bolt.svg',
  'systems/opsandtactics/icons/svg/crystalize.svg',
  'systems/opsandtactics/icons/svg/death-note.svg',
  'systems/opsandtactics/icons/svg/defilibrate.svg',
  'systems/opsandtactics/icons/svg/explosion-rays.svg',
  'systems/opsandtactics/icons/svg/flame.svg',
  'systems/opsandtactics/icons/svg/ice-cube.svg',
  'systems/opsandtactics/icons/svg/lightning-branches.svg',
  'systems/opsandtactics/icons/svg/shadow-follower.svg',
  'systems/opsandtactics/icons/svg/shadow-grasp.svg',
  'systems/opsandtactics/icons/svg/smoking-orb.svg',
  'systems/opsandtactics/icons/svg/sparkles.svg',
  'systems/opsandtactics/icons/svg/splashy-stream.svg',
  'systems/opsandtactics/icons/svg/static.svg',
  'systems/opsandtactics/icons/svg/metal-bar.svg',
  'systems/opsandtactics/icons/svg/dna2.svg',
  'systems/opsandtactics/icons/svg/cube.svg',
  'systems/opsandtactics/icons/svg/fountain-pen.svg',
  'systems/opsandtactics/icons/svg/flat-platform.svg',
  'systems/opsandtactics/icons/svg/sticking-plaster.svg'
]