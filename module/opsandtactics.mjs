// Import document classes.
import { OpsActor } from "./documents/actor.mjs";
import { OpsItem } from "./documents/item.mjs";
// Import sheet classes.
import { OpsActorSheet } from "./sheets/actor-sheet.mjs";
import { OpsItemSheet } from "./sheets/item-sheet.mjs";
// Import DataModels.
import { OpsCharacter} from "./schema/actor-schema.mjs";
import {OpsSkill, OpsArmor, OpsWeapon, OpsMagazine, OpsObject, OpsFeature, OpsMagic} from "./schema/item-schema.mjs"

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
  CONFIG.Item.systemDataModels['magazine'] = OpsMagazine;
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
