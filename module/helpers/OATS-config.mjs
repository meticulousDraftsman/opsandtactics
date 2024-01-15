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

OATS.sizes = {
  fine: "OATS.sizes.fine",
  diminutive: "OATS.sizes.diminutive",
  tiny: "OATS.sizes.tiny",
  small: "OATS.sizes.small",
  medium: "OATS.sizes.medium",
  large: "OATS.sizes.large",
  huge: "OATS.sizes.huge",
  gargantuan: "OATS.sizes.gargantuan",
  colossal: "OATS.sizes.colossal",
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

OATS.vehicleActions = {
  retain: {name: 'Retain Control', source: 'generic', check:{type: 'skill',flavor:'If the check fails the vehicle goes into a spin. If it fails by 10 or more, the vehicle rolls.'}}
}

OATS.characterIcons = [
  'systems/opsandtactics/icons/svg/characters/astronaut-helmet.svg',
  'systems/opsandtactics/icons/svg/characters/balaclava.svg',
  'systems/opsandtactics/icons/svg/characters/bandit.svg',
  'systems/opsandtactics/icons/svg/characters/cowled.svg',
  'systems/opsandtactics/icons/svg/characters/hoodie.svg',
  'systems/opsandtactics/icons/svg/characters/mustache.svg',
  'systems/opsandtactics/icons/svg/characters/police-officer-head.svg',
  'systems/opsandtactics/icons/svg/characters/spy.svg'
]

OATS.vehicleIcons = [
  'systems/opsandtactics/icons/svg/vehicles/airplane.svg',
  'systems/opsandtactics/icons/svg/vehicles/ambulance.svg',
  'systems/opsandtactics/icons/svg/vehicles/apc.svg',
  'systems/opsandtactics/icons/svg/vehicles/bus.svg',
  'systems/opsandtactics/icons/svg/vehicles/caravan.svg',
  'systems/opsandtactics/icons/svg/vehicles/city-car.svg',
  'systems/opsandtactics/icons/svg/vehicles/bike.svg',
  'systems/opsandtactics/icons/svg/vehicles/flatbed.svg',
  'systems/opsandtactics/icons/svg/vehicles/flatbed-covered.svg',
  'systems/opsandtactics/icons/svg/vehicles/helicopter.svg',
  'systems/opsandtactics/icons/svg/vehicles/jeep.svg',
  'systems/opsandtactics/icons/svg/vehicles/jet-fighter.svg',
  'systems/opsandtactics/icons/svg/vehicles/race-car.svg',
  'systems/opsandtactics/icons/svg/vehicles/scooter.svg',
  'systems/opsandtactics/icons/svg/vehicles/surfer-van.svg',
  'systems/opsandtactics/icons/svg/vehicles/tank.svg',
  'systems/opsandtactics/icons/svg/vehicles/truck.svg'
]

OATS.spacecraftIcons = [
  'systems/opsandtactics/icons/svg/spacecraft/defense-satellite.svg',
  'systems/opsandtactics/icons/svg/spacecraft/interceptor-ship.svg',
  'systems/opsandtactics/icons/svg/spacecraft/rocket.svg',
  'systems/opsandtactics/icons/svg/spacecraft/scout-ship.svg',
  'systems/opsandtactics/icons/svg/spacecraft/spaceship.svg',  
  'systems/opsandtactics/icons/svg/spacecraft/space-shuttle.svg',
  'systems/opsandtactics/icons/svg/spacecraft/starfighter.svg',
  'systems/opsandtactics/icons/svg/spacecraft/ufo.svg'
];

OATS.weaponIcons = [
  'systems/opsandtactics/icons/weapons/simple/baseball-bat.webp',
  'systems/opsandtactics/icons/weapons/simple/baton.webp',
  'systems/opsandtactics/icons/weapons/simple/bowie-knife.webp',
  'systems/opsandtactics/icons/weapons/simple/claw-hammer.webp',
  'systems/opsandtactics/icons/weapons/simple/lead-pipe.webp',
  'systems/opsandtactics/icons/weapons/simple/riot-shield.webp',
  'systems/opsandtactics/icons/weapons/simple/sledge-hammer.webp',
  'systems/opsandtactics/icons/weapons/simple/switchblade.webp',
  'systems/opsandtactics/icons/weapons/simple/telescopic-baton.webp',
  'systems/opsandtactics/icons/weapons/guns/ak47.webp',
  'systems/opsandtactics/icons/weapons/guns/colt-m1911.webp',
  'systems/opsandtactics/icons/weapons/guns/desert-eagle.webp',
  'systems/opsandtactics/icons/weapons/guns/famas.webp',
  'systems/opsandtactics/icons/weapons/guns/fn-fal.webp',
  'systems/opsandtactics/icons/weapons/guns/glock.webp',
  'systems/opsandtactics/icons/weapons/guns/lee-enfield.webp',
  'systems/opsandtactics/icons/weapons/guns/mac-10.webp',
  'systems/opsandtactics/icons/weapons/guns/mp5.webp',
  'systems/opsandtactics/icons/weapons/guns/p90.webp',
  'systems/opsandtactics/icons/weapons/guns/revolver.webp',
  'systems/opsandtactics/icons/weapons/guns/sawed-off-shotgun.webp',
  'systems/opsandtactics/icons/weapons/guns/steyr-aug.webp',
  'systems/opsandtactics/icons/weapons/guns/tec-9.webp',
  'systems/opsandtactics/icons/weapons/guns/thompson-m1928.webp',
  'systems/opsandtactics/icons/weapons/guns/uzi.webp',
  'systems/opsandtactics/icons/weapons/guns/walther-ppk.webp',
  'systems/opsandtactics/icons/weapons/guns/winchester-rifle.webp',
  'systems/opsandtactics/icons/weapons/archaic/battle-axe.webp',
  'systems/opsandtactics/icons/weapons/archaic/bo.webp',
  'systems/opsandtactics/icons/weapons/archaic/fire-axe.webp',
  'systems/opsandtactics/icons/weapons/archaic/hatchet.webp',
  'systems/opsandtactics/icons/weapons/archaic/katana.webp',
  'systems/opsandtactics/icons/weapons/archaic/sabre.webp',
  'systems/opsandtactics/icons/weapons/archaic/two-handed-sword.webp',
  'systems/opsandtactics/icons/weapons/other/boomerang.webp',
  'systems/opsandtactics/icons/weapons/other/chainsaw.webp',
  'systems/opsandtactics/icons/weapons/other/crossbow.webp',
  'systems/opsandtactics/icons/weapons/other/fountain-pen.webp',
  'systems/opsandtactics/icons/weapons/other/pocket-bow.webp',
  'systems/opsandtactics/icons/weapons/other/shuriken.webp',
  'systems/opsandtactics/icons/abstract/cannon-ball.webp',
  'systems/opsandtactics/icons/abstract/gunshot.webp',
  'systems/opsandtactics/icons/abstract/laser-blast.webp'
]

OATS.armorIcons = [
  'systems/opsandtactics/icons/wearables/armor/abdominal-armor.webp',
  'systems/opsandtactics/icons/wearables/armor/armor-vest.webp',
  'systems/opsandtactics/icons/wearables/armor/chain-mail.webp',
  'systems/opsandtactics/icons/wearables/armor/fish-scales.webp',
  'systems/opsandtactics/icons/wearables/armor/kevlar-vest.webp',
  'systems/opsandtactics/icons/wearables/armor/metal-scales.webp',
  'systems/opsandtactics/icons/wearables/armor/plastron.webp',
  'systems/opsandtactics/icons/wearables/armor/sleeveless-jacket.webp',
  'systems/opsandtactics/icons/wearables/armor/space-suit.webp',
  'systems/opsandtactics/icons/wearables/armor/trench-body-armor.webp',
  'systems/opsandtactics/icons/abstract/flat-platform.webp',
  'systems/opsandtactics/icons/abstract/shieldcomb.webp',
  'systems/opsandtactics/icons/abstract/sparkles.webp',
  'systems/opsandtactics/icons/abstract/static.webp'
];

OATS.objectIcons = [
  'systems/opsandtactics/icons/weapons/explosives/dynamite.webp',
  'systems/opsandtactics/icons/weapons/explosives/flash-grenade.webp',
  'systems/opsandtactics/icons/weapons/explosives/grenade.webp',
  'systems/opsandtactics/icons/weapons/explosives/molotov.webp',
  'systems/opsandtactics/icons/weapons/explosives/stun-grenade.webp',
  'systems/opsandtactics/icons/containers/bags/backpack.webp',
  'systems/opsandtactics/icons/containers/bags/duffel-bag.webp',
  'systems/opsandtactics/icons/containers/bags/gym-bag.webp',
  'systems/opsandtactics/icons/containers/bags/rolling-suitcase.webp',
  'systems/opsandtactics/icons/containers/bags/school-bag.webp',
  'systems/opsandtactics/icons/containers/bags/suitcase.webp',
  'systems/opsandtactics/icons/containers/boxes/cardboard-box-closed.webp',
  'systems/opsandtactics/icons/containers/boxes/cooler.webp',
  'systems/opsandtactics/icons/containers/boxes/toolbox.webp',
  'systems/opsandtactics/icons/containers/data/compact-disc.webp',
  'systems/opsandtactics/icons/containers/data/disc.webp',
  'systems/opsandtactics/icons/containers/data/usb-key.webp',
  'systems/opsandtactics/icons/containers/liquids/barrel.webp',
  'systems/opsandtactics/icons/containers/liquids/canister.webp',
  'systems/opsandtactics/icons/containers/liquids/jerrycan.webp',
  'systems/opsandtactics/icons/containers/liquids/water-bottle.webp',
  'systems/opsandtactics/icons/containers/liquids/quill-ink.webp',
  'systems/opsandtactics/icons/weapons/ammo/bullets.webp',
  'systems/opsandtactics/icons/weapons/ammo/cylinder.webp',
  'systems/opsandtactics/icons/weapons/ammo/magazine.webp',
  'systems/opsandtactics/icons/weapons/ammo/quiver.webp',
  'systems/opsandtactics/icons/weapons/ammo/shotgun-rounds.webp',
  'systems/opsandtactics/icons/gear/medical/adhesive-bandage.webp',
  'systems/opsandtactics/icons/gear/medical/cigar.webp',
  'systems/opsandtactics/icons/gear/medical/cigarette.webp',
  'systems/opsandtactics/icons/gear/medical/first-aid-kit.webp',
  'systems/opsandtactics/icons/gear/medical/pill.webp',
  'systems/opsandtactics/icons/gear/medical/pill-bottle.webp',
  'systems/opsandtactics/icons/gear/medical/syringe-empty.webp',
  'systems/opsandtactics/icons/abstract/cube.webp',
  'systems/opsandtactics/icons/gear/equipment/binoculars.webp',
  'systems/opsandtactics/icons/gear/equipment/flashlight.webp',
  'systems/opsandtactics/icons/gear/equipment/gas-stove.webp',
  'systems/opsandtactics/icons/gear/equipment/laptop.webp',
  'systems/opsandtactics/icons/gear/equipment/lighter.webp',
  'systems/opsandtactics/icons/gear/equipment/pc.webp',
  'systems/opsandtactics/icons/gear/equipment/rope-coil.webp',
  'systems/opsandtactics/icons/gear/equipment/smartphone.webp',
  'systems/opsandtactics/icons/gear/equipment/tablet.webp',
  'systems/opsandtactics/icons/gear/equipment/walkie-talkie.webp',
  'systems/opsandtactics/icons/gear/supplies/batteries.webp',
  'systems/opsandtactics/icons/gear/supplies/booze.webp',
  'systems/opsandtactics/icons/gear/supplies/cheese-wedge.webp',
  'systems/opsandtactics/icons/gear/supplies/donut.webp',
  'systems/opsandtactics/icons/gear/supplies/grain.webp',
  'systems/opsandtactics/icons/gear/supplies/metal-bar.webp',
  'systems/opsandtactics/icons/gear/supplies/papers.webp',
  'systems/opsandtactics/icons/gear/supplies/soda-bottle.webp',
  'systems/opsandtactics/icons/gear/tools/concrete-bag.webp',
  'systems/opsandtactics/icons/gear/tools/fishing-pole.webp',
  'systems/opsandtactics/icons/gear/tools/screwdriver.webp',
  'systems/opsandtactics/icons/gear/tools/spanner.webp',
  'systems/opsandtactics/icons/gear/tools/swiss-army-knife.webp',
  'systems/opsandtactics/icons/gear/objects/black-book.webp',
  'systems/opsandtactics/icons/gear/objects/book-cover.webp',
  'systems/opsandtactics/icons/gear/objects/passport.webp',
  'systems/opsandtactics/icons/gear/objects/swipe-card.webp',
  'systems/opsandtactics/icons/gear/objects/white-book.webp'
];

OATS.magicIcons = [
  'systems/opsandtactics/icons/abstract/all-seeing-eye.webp',
  'systems/opsandtactics/icons/abstract/chemical-bolt.webp',
  'systems/opsandtactics/icons/abstract/crystalize.webp',
  'systems/opsandtactics/icons/abstract/cube.webp',
  'systems/opsandtactics/icons/abstract/death-note.webp',
  'systems/opsandtactics/icons/abstract/defilibrate.webp',
  'systems/opsandtactics/icons/abstract/dna.webp',
  'systems/opsandtactics/icons/abstract/explosion-rays.webp',
  'systems/opsandtactics/icons/abstract/flame.webp',
  'systems/opsandtactics/icons/abstract/ice-cube.webp',
  'systems/opsandtactics/icons/abstract/lightning-branches.webp',
  'systems/opsandtactics/icons/abstract/shadow-follower.webp',
  'systems/opsandtactics/icons/abstract/shadow-grasp.webp',
  'systems/opsandtactics/icons/abstract/smoking-orb.webp',
  'systems/opsandtactics/icons/abstract/sparkles.webp',
  'systems/opsandtactics/icons/abstract/splashy-stream.webp',
  'systems/opsandtactics/icons/abstract/static.webp',
  'systems/opsandtactics/icons/gear/supplies/metal-bar.webp',
  'systems/opsandtactics/icons/weapons/other/fountain-pen.webp',
  'systems/opsandtactics/icons/abstract/flat-platform.webp',
  'systems/opsandtactics/icons/gear/medical/adhesive-bandage.webp'
]