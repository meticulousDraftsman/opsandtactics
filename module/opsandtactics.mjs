// Import document classes.
import { OpsActor } from "./documents/actor.mjs";
import { OpsItem } from "./documents/item.mjs";
// Import sheet classes.
import { OpsActorSheet } from "./sheets/actor-sheet.mjs";
import { OpsItemSheet } from "./sheets/item-sheet.mjs";
// Import DataModels.
import { OpsCharacter} from "./schema/actor-schema.mjs";
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

  // Define custom Document classes
  CONFIG.Actor.documentClass = OpsActor;
  CONFIG.Item.documentClass = OpsItem;

  // Assign custom DataModels
  CONFIG.Actor.systemDataModels['character'] = OpsCharacter;
  CONFIG.Item.systemDataModels['skill'] = OpsSkill;
  CONFIG.Item.systemDataModels['armor'] = OpsArmor;
  CONFIG.Item.systemDataModels['weapon'] = OpsWeapon;
  CONFIG.Item.systemDataModels['object'] = OpsObject;
  CONFIG.Item.systemDataModels['feature'] = OpsFeature;
  CONFIG.Item.systemDataModels['magic'] = OpsMagic;

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
});

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
  }
  switch (data.checkType){
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
    case 'ranged':
    case 'melee':
      formula = '3d6' + (data.critical ? `[${data.critical}+]` : '') + data.mod;
      break;
    default:
      formula = '3d6' + data.mod;
      break;
  }
  // Create the roll and apply any situational modifiers
  const roll = new OpsRoll(formula,data);
  const poppedRoll = await roll.situationalPopup(data);
  if (poppedRoll===null) return null;
  // Evaluate Roll and prepare for message creation
  await poppedRoll.evaluate({async:true});
  data.critResult = poppedRoll.isCritical;
  const concealResult = await poppedRoll.concealRoll();
  messageData.rolls = [poppedRoll];
  if (concealResult){
    data.concealResult = concealResult.result;
    data.concealTip = await concealResult.getTooltip();
    messageData.rolls.push(concealResult);
  }
  else{
    data.concealResult = null;
    data.concealTip = null;
  }
  data.tooltip = await poppedRoll.getTooltip();
  data.formula = poppedRoll.formula;
  data.total = poppedRoll.total;
  messageData.content = await renderTemplate('systems/opsandtactics/templates/interface/check-roll-card.html',data);
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

  async concealRoll(){
    if (this.data?.missChance > 0){
      const missRoll = await new Roll(`1d100cs>${this.data.missChance}`).evaluate({async:true});
      return missRoll;
    }
    else {
      return null;
    }
  }

  async situationalPopup(data){
    let template;
    let templateData;
    switch (data.checkType){
      case 'ranged':
      case 'melee':
        template = 'systems/opsandtactics/templates/interface/dialog-attack.html';
        templateData = {
          formula: this.formula,
          atkType: data.checkType,
        }
        break;
      case 'save':
        console.debug('need to implement')
        break;
      default:
        template = 'systems/opsandtactics/templates/interface/dialog-utility.html';
        templateData = {
          formula: this.formula
        }
        break;
    }
    const content = await renderTemplate(template,templateData);
    return new Promise(resolve => {
      new Dialog({
        title: data.title,
        content,
        buttons: {
          roll: {
            label: "Roll",
            callback: html => resolve(this._submitPopup(html,data))
          }
        },
        close: () => resolve(null)
      }).render(true,{width:520});
    });
  }

  async _submitPopup(html,data){
    const form = html[0].querySelector("form");
    switch (data.checkType){
      case 'ranged':
      case 'melee':
        let atkBon = 0;
        atkBon += form.atkHigh.checked?Number(form.atkHigh.value):0;
        atkBon += form.atkSeen.checked?Number(form.atkSeen.value):0;
        atkBon += Number(form.atkFlank.value);
        atkBon += Number(form.atkStance.value);
        atkBon += Number(form.atkFace.value);
        let defBon = 0;
        defBon += form.defStun.checked?Number(form.defStun.value):0;
        defBon += form.defClimb.checked?Number(form.defClimb.value):0;
        defBon += form.defPin.checked?Number(form.defPin.value):0;
        defBon += Number(form.defStance.value);
        let missChance = 0;
        switch (form.defCover.value){
          case 'cov0':
            break;
          case 'cov1':
            defBon += 3;
            break;
          case 'cov2':
            defBon += 6;
            missChance = 10;
            break;
          case 'cov3':
            defBon += 9;
            missChance = 20;
            break;
          case 'cov4':
            defBon += 15;
            missChance = 30;
            break;
        }
        data.missChance = Math.max(missChance, Number(form.defConceal.value));
        if (form.sitBon.value){
          const situation = new Roll(form.sitBon.value,this.data);
          if(!(situation.terms[0] instanceof OperatorTerm)) this.terms.push(new OperatorTerm({operator:"+"}));
          this.terms = this.terms.concat(situation.terms);
        }
        if (atkBon != 0){
          const attacker = new Roll(`+(${atkBon})`,this.data);
          this.terms = this.terms.concat(attacker.terms);
        }
        if (defBon != 0){
          const defender = new Roll(`-(${defBon})`,this.data);
          this.terms = this.terms.concat(defender.terms);
        }
        this._formula = this.constructor.getFormula(this.terms);
        break;
      case 'save':
        break;
      default:
        if (form.sitBon.value){
          const situation = new Roll(form.sitBon.value,this.data);
          if(!(situation.terms[0] instanceof OperatorTerm)) this.terms.push(new OperatorTerm({operator:"+"}));
          this.terms = this.terms.concat(situation.terms);
        }
        this._formula = this.constructor.getFormula(this.terms);
        break;  
    }
    return this;
  }
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
  //console.debug(segments, options)

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
