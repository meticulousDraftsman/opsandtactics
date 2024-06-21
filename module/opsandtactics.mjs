// Import document classes.
import { OpsActor, TurnStartDashboardApp } from "./documents/actor.mjs";
import { OpsItem } from "./documents/item.mjs";
// Import sheet classes.
import { OpsActorSheet } from "./sheets/actor-sheet.mjs";
import { OpsItemSheet } from "./sheets/item-sheet.mjs";
// Import DataModels.
import { OpsCharacter, OpsVehicle} from "./schema/actor-schema.mjs";
import {OpsSkill, OpsArmor, OpsWeapon, OpsObject, OpsFeature, OpsMagic} from "./schema/item-schema.mjs"

// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { OATS } from "./helpers/OATS-config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.opsandtactics = {
    OpsActor,
    OpsItem,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.OATS = OATS;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "3d6 + @init",
    decimals: 2
  };
  CONFIG.ActiveEffect.legacyTransferral = false;
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["health.chp","health.xhp","cp","ml"],
      value: ["health.temp","health.bleed","cp.temp","def.value","def.touch","def.flat"]
    },
    vehicle: {
      bar: ["health.hp"],
      value: ["vehicle.speed","def.value"]
    },
    spacecraft: {
      bar: ["health.hp","health.soak","cp"],
      value: []
    }
  }

  // Define custom Document classes
  CONFIG.Actor.documentClass = OpsActor;
  CONFIG.Item.documentClass = OpsItem;
  CONFIG.Combat.documentClass = OpsCombat;

  // Assign custom DataModels
  CONFIG.Actor.dataModels['character'] = OpsCharacter;
  CONFIG.Actor.dataModels['vehicle'] = OpsVehicle;
  CONFIG.Item.dataModels['skill'] = OpsSkill;
  CONFIG.Item.dataModels['armor'] = OpsArmor;
  CONFIG.Item.dataModels['weapon'] = OpsWeapon;
  CONFIG.Item.dataModels['object'] = OpsObject;
  CONFIG.Item.dataModels['feature'] = OpsFeature;
  CONFIG.Item.dataModels['magic'] = OpsMagic;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("opsandtactics", OpsActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("opsandtactics", OpsItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
  _manageOpsStatusEffects();
});
Hooks.on("getChatLogEntryContext", addChatContext);
Hooks.on("getJournalDirectoryEntryContext", addJournalContext);
Hooks.on("getCompendiumEntryContext", addCompendiumContext);
Hooks.on("getActorDirectoryEntryContext", addActorContext);
Hooks.on("renderChatLog", (app, html, data) => OpsActor.addChatListeners(html));

export default class OpsCombat extends Combat {
  async _onUpdate(changed, options, userId){
    await super._onUpdate(changed, options, userId);
    if (options.direction === 1){
      // Check to see if the combatant is owned by any users explicitly and if any of those owners are online
      if (this.combatant.hasPlayerOwner && this.combatant.players.some((element) => element.active)){
        const onlineOwners = this.combatant.players.filter((element) => element.active);
        // Check to see if any of those online owners have the combatant selected as their character
        if (onlineOwners.some((element) => element.character?.id == this.combatant.actorId)){
          // If so, trigger for them
          if (game.user.character?.id == this.combatant.actorId) new TurnStartDashboardApp(this.combatant.actor).render(true);
        }
        else {
          // Otherwise, trigger for all online owners
          if (onlineOwners.some((element) => element.isSelf)) new TurnStartDashboardApp(this.combatant.actor).render(true);
        }
      }
      // If it doesn't have any owners or none of its owners are online, trigger for the GM
      else {
        if (game.users.activeGM.isSelf) new TurnStartDashboardApp(this.combatant.actor).render(true);
      }
    }
  }
}

/* -------------------------------------------- */
/*  Core Check Handling                         */
/* -------------------------------------------- */

export async function opsCheck(data){
  // Create the appropriate formula
  let formula;
  const messageData = {
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    from: game.user._id,
    speaker: data.speaker,
    sound: 'sounds/dice.wav'
  }
  switch (data.checkType){
    case 'noChatAttack':
    case 'noChatUtility':
      // Just return with no chat message
      return true;
    case 'noneAttack':
    case 'noneUtility':
      // Just create the chat message and return
      messageData.content = `<h4>${data.title}</h4><p>${data.flavor}</p>`
      ChatMessage.create(messageData, {rollMode: data.rollMode})
      return true;
    case 'otherUtility':
      // Don't staple a 3d6 to the start of this roll
      formula = data.mod;
      break;
    default:
      let firstChar = `${data.mod}`.charAt(0);
      if (firstChar != '+' && firstChar != '-') data.mod = `+${data.mod}`;
      formula = '3d6' + data.mod;
      break;
  }
  // Create the roll and apply any situational modifiers
  const checkRoll = new OpsRoll(formula,data);
  // Evaluate Roll and prepare for message creation
  await checkRoll.evaluate({async:true});
  messageData.rolls = [checkRoll];
  // Add the miss chance roll if necessary
  if (data?.missChance > 0){
    checkRoll.missRoll = await new Roll('1d100').evaluate({async:true});
    checkRoll.missRoll.tooltip = await checkRoll.missRoll.getTooltip();
    messageData.rolls.push(checkRoll.missRoll);
  }
  checkRoll.tooltip = await checkRoll.getTooltip();
  messageData.content = await renderTemplate('systems/opsandtactics/templates/interface/check-roll-card.html',checkRoll);
  ChatMessage.create(messageData, {rollMode: data.rollMode})
  return checkRoll;
}

export async function opsDamage(data){
  // Takes a list of rolls and flavors and outputs them into the special adjustible damage chat card
  const messageData = {
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    from: game.user._id,
    speaker: data.speaker,
    sound: 'sounds/dice.wav'
  }
  messageData.rolls = [];
  for (let e of data.rolls){
    messageData.rolls.push(await new Roll(e.formula).evaluate({async:true}));
  }
  for (let e of messageData.rolls){
    e.tooltip = await e.getTooltip()
  }
  data.rolls=messageData.rolls;
  messageData.content = await renderTemplate('systems/opsandtactics/templates/interface/damage-roll-card.html',data);
  ChatMessage.create(messageData, {rollMode: data.rollMode})  
}

export class OpsRoll extends Roll{
  static get name() {return "Roll"}
  get isCritical(){
    if (!this._evaluated) return undefined;
    if ((this.terms[0] instanceof Die) && (this.terms[0].number==3) && (this.terms[0].faces==6)){
      return (this.dice[0].total >= this.data.critical)
    }
    else {
      return undefined;
    }
  }

  jamBar(){
    switch (true){
      case this.data.error<=15:
        return (3);
      case this.data.error<=20:
        return (4);
      case this.data.error<=25:
        return (5);
      case this.data.error<=30:
        return (6);
      case this.data.error<=35:
        return (7);
      case this.data.error<=40:
        return (8);
      case this.data.error<=45:
        return (9);
      case this.data.error<=50:
        return (10);
      case this.data.error<=55:
        return (11);
      case this.data.error<=60:
        return (12);
      case this.data.error<=65:
        return (13);
      case this.data.error<=70:
        return (14);
      case this.data.error<=75:
        return (16);
      case this.data.error>75:
        return (18);
    }
  }

  get isJam(){
    if (!this._evaluated) return undefined;
    if ((this.terms[0] instanceof Die) && (this.terms[0].number==3) && (this.terms[0].faces==6)){
      return (this.dice[0].total <= this.jamBar());
    }
    else {
      return undefined;
    }
  }

  get isClear(){
    if (!this._evaluated) return undefined;
    if (this.missRoll){
      return (this.missRoll.total > this.data.missChance);
    }
    else {
      return undefined;
    }
  }
}

function _manageOpsStatusEffects(){
  CONFIG.statusEffects.splice(CONFIG.statusEffects.findIndex(e => e.id === 'prone'),1);
  CONFIG.statusEffects.unshift(
    {
      "id":"kneeling",
      "name":"Kneeling",
      "icon":"systems/opsandtactics/icons/svg/kneeling.svg"
    },
    {
      "id":"prone",
      "name":"Prone",
      "icon":"systems/opsandtactics/icons/svg/prone.svg"
    }
  )
}

// Partially taken from 5e
function addChatContext(html, options){
  let canApply = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.isRoll && message?.isContentVisible && canvas.tokens?.controlled.length && message?.rolls?.length>0;
  };
  let oneRoll = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.rolls?.length==1;
  }
  let twoRoll = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.rolls?.length>=2;
  }
  let moreRoll = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.rolls?.length>=3;
  }
  let checkShip = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.isRoll && message?.isContentVisible && canvas.tokens?.controlled.length && message.rolls.length > 0 && game.actors.get(message?.speaker?.actor)?.type==='spacecraft' && canvas.tokens.controlled[0].actor.type!=='spacecraft';
  }
  let checkPersonal = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.isRoll && message?.isContentVisible && canvas.tokens?.controlled.length && message.rolls.length > 0 && game.actors.get(message?.speaker?.actor)?.type!=='spacecraft' && canvas.tokens.controlled[0].actor.type==='spacecraft';
  }
  options.push(
    {
      name: 'Add total to incoming damage',
      icon: '<i class="fas fa-heart-broken"></i>',
      condition: canApply,
      callback: li => applyChatDamage(li, -1, 1)
    },
    {
      name: 'Add half of total to incoming',
      icon: '<i class="fas fa-heart"></i>',
      condition: canApply,
      callback: li => applyChatDamage(li, -1, 0.5)
    },
    {
      name: 'Add quarter of total to incoming',
      icon: '<i class="fas fa-hand-holding-heart"></i>',
      condition: canApply,
      callback: li => applyChatDamage(li, -1, 0.25)
    },
    {
      name: 'Add first roll to incoming damage',
      icon: '<i class="fas fa-heart-broken"></i>',
      condition: (canApply && twoRoll),
      callback: li => applyChatDamage(li, 0, 1)
    },
    {
      name: 'Add half of first to incoming',
      icon: '<i class="fas fa-heart"></i>',
      condition: (canApply && twoRoll),
      callback: li => applyChatDamage(li, 0, 0.5)
    },
    {
      name: 'Add quarter of first to incoming',
      icon: '<i class="fas fa-hand-holding-heart"></i>',
      condition: (canApply && twoRoll),
      callback: li => applyChatDamage(li, 0, 0.25)
    },
    {
      name: 'Add second roll to incoming damage',
      icon: '<i class="fas fa-heart-broken"></i>',
      condition: (canApply && twoRoll),
      callback: li => applyChatDamage(li, 1, 1)
    },
    {
      name: 'Add half of second to incoming',
      icon: '<i class="fas fa-heart"></i>',
      condition: (canApply && twoRoll),
      callback: li => applyChatDamage(li, 1, 0.5)
    },
    {
      name: 'Add quarter of second to incoming',
      icon: '<i class="fas fa-hand-holding-heart"></i>',
      condition: (canApply && twoRoll),
      callback: li => applyChatDamage(li, 1, 0.25)
    },
    {
      name: 'Add third roll to incoming damage',
      icon: '<i class="fas fa-heart-broken"></i>',
      condition: (canApply && moreRoll),
      callback: li => applyChatDamage(li, 2, 1)
    },
    {
      name: 'Add half of third to incoming',
      icon: '<i class="fas fa-heart"></i>',
      condition: (canApply && moreRoll),
      callback: li => applyChatDamage(li, 2, 0.5)
    },
    {
      name: 'Add quarter of third to incoming',
      icon: '<i class="fas fa-hand-holding-heart"></i>',
      condition: (canApply && moreRoll),
      callback: li => applyChatDamage(li, 2, 0.25)
    },
    {
      name: 'Add tenfold of total to incoming damage',
      icon: '<i class="fas fa-rocket"></i>',
      condition: checkShip,
      callback: li => applyChatDamage(li, -1, 10)
    },
    {
      name: 'Add fifth of total to incoming damage',
      icon: '<i class="fas fa-rocket"></i>',
      condition: checkPersonal,
      callback: li => applyChatDamage(li, -1, .2)
    }
  );
  return options;
}
async function applyChatDamage(li, rollNum, multiplier) {
  const message = game.messages.get(li.data("messageId"));
  console.debug(game.actors.get(message?.speaker?.actor)?.type==='spacecraft')
  let damage = 0;
  if (rollNum>=0){
    damage = Number(message.rolls[rollNum].total);
  }
  else{
    for (let r of message.rolls){
      damage += Number(r.total);
    }
  }
  if (damage==0) return;
  return Promise.all(canvas.tokens.controlled.map(t => {
    const a = t.actor;
    if (!a.isOwner) return a;
    const updateData = {['system.health.incoming']:getProperty(a,'system.health.incoming')+Math.floor(damage*multiplier)};
    return a.update(updateData);
  }));
}
function addJournalContext(html, options){
  options.push(
    {
      name: 'Check if source of Weapon Mods',
      icon: '<i class="fas fa-magnifying-glass"></i>',
      condition: () => game.user.isGM,
      callback: li => handleWeaponMod(li,'check')
    },
    {
      name: 'Toggle as source of Weapon Mods',
      icon: '<i class="fas fa-scanner-gun"></i>',
      condition: () => game.user.isGM,
      callback: li => handleWeaponMod(li,'toggle')
    }
  )
  return options;
}
function addCompendiumContext(html, options){
  let canApply = li => {
    const sourcePack = game.packs.get(li.closest('div').data("pack"))
    return game.user.isGM && !sourcePack.locked && (sourcePack.metadata.type == 'JournalEntry');
  }
  options.push(
    {
      name: 'Check if source of Weapon Mods',
      icon: '<i class="fas fa-magnifying-glass"></i>',
      condition: () => game.user.isGM,
      callback: li => handleWeaponMod(li,'check')
    },
    {
      name: 'Toggle as source of Weapon Mods',
      icon: '<i class="fas fa-scanner-gun"></i>',
      condition: canApply,
      callback: li => handleWeaponMod(li,'toggle')
    }
  )
  return options;
}
function addActorContext(html, options){
  options.push(
    {
      name: 'Disable all Active Effects',
      icon: '<i class="fa-solid fa-toggle-off"></i>',
      condition: () => game.user.isGM,
      callback: li => disableActorEffects(li)
    }
  )
}

async function handleWeaponMod(li,op){
  let target;
  if (li.closest('div').hasClass('compendium')){
    target = await game.packs.get(li.closest('div').data("pack")).getDocument(li.data("documentId"))
  }
  else {
    target = await game.journal.get(li.data("documentId"));
  }
  let messageData;
  const checkFlag = await target.getFlag('opsandtactics','wepMods')
  if (op=='check'){
    messageData = `${target.name} is${checkFlag? '' : ' not'} a source of Weapon Mods.`
  }
  else {
    messageData = `${target.name} is ${checkFlag? 'no longer' : 'now'} a source of Weapon Mods. Refresh client.`;
    if (checkFlag){
      await target.unsetFlag('opsandtactics','wepMods');
    }
    else {
      await target.setFlag('opsandtactics','wepMods', true);
    }
  }
  ui.notifications.info(messageData);
}
async function disableActorEffects(li){
  const target = await game.actors.get(li.data("documentId"));
  if (isEmpty(target.appliedEffects)){
    ui.notifications.info(`${target.name} has no Active Effects`)
    return null;
  } 
  for (let ae of target.appliedEffects){
    await ae.update({disabled:true})
  }
  ui.notifications.info(`All Active Effects disabled on ${target.name}`)
}

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.opsandtactics.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "opsandtactics.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    item.roll();
  });
}

/* -------------------------------------------- */
/*  Every other diagonal (Taken from 5e system) */
/* -------------------------------------------- */

Hooks.on("canvasInit", gameCanvas => {
  SquareGrid.prototype.measureDistances = measureDistances;
  //MeasuredTemplate.prototype.
});

function measureDistances(segments, options={}) {
  if ( !options.gridSpaces ) return BaseGrid.prototype.measureDistances.call(this, segments, options);

  // Track the total number of diagonals
  let nDiagonal = 0;
  const d = canvas.dimensions;

  // Iterate over measured segments
  return segments.map(s => {
    let r = s.ray;

    // Determine the total distance traveled
    let nx = Math.abs(Math.ceil(r.dx / d.size));
    let ny = Math.abs(Math.ceil(r.dy / d.size));

    // Determine the number of straight and diagonal moves
    let nd = Math.min(nx, ny);
    let ns = Math.abs(ny - nx);
    nDiagonal += nd;

    // Every other diagonal counts double
    let nd10 = Math.floor(nDiagonal / 2) - Math.floor((nDiagonal - nd) / 2);
    let spaces = (nd10 * 2) + (nd - nd10) + ns;
    return spaces * canvas.dimensions.distance;
  });
}
