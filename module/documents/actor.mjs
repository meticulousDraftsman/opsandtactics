import { roll3d6 } from "../dice/3d6-roll.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class OpsActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const flags = this.flags.opsandtactics || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(this);
    this._prepareNpcData(this);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    //console.debug(systemData)

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      // Calculate the modifier using d20 rules.
      if (key != 'foc' && key != 'pow' && key != 'mrk' && key != 'agi') ability.mod = Math.floor((ability.value - 10) / 2) + ability.modMisc;
      //console.debug(key,ability.mod)
    }
    // Calculate POW and AGI based in stat mod and FOC and MRK
    systemData.abilities.pow.mod = systemData.abilities.str.mod-systemData.abilities.foc.mod;
    systemData.abilities.agi.mod = systemData.abilities.dex.mod-systemData.abilities.mrk.mod;
    // Calculate XP Needed to level
    systemData.level.xp.need = 1500 * systemData.level.value * systemData.level.value;
    // Calculate BAB
    systemData.bab.value = systemData.level.value + systemData.bab.misc;
    // Calculate Recoil Reduction
    systemData.recoil.value = systemData.abilities.str.value - 10 + systemData.recoil.misc;
    // Calculate Personal Capital    
    systemData.wealth.capital.personal.total = (5*(systemData.level.value+1))+systemData.abilities.cha.value;
    // Calculate Hit Points and Mental Limit
    const rollData = this.getRollData();
    const chpFormula = `${systemData.health.chp.formula}+${systemData.health.chp.misc}`;
    const chpRoll = new Roll(chpFormula,rollData).evaluate({async:false});
    systemData.health.chp.max = chpRoll.total;
    const xhpFormula = `${systemData.health.xhp.formula}+${systemData.health.xhp.misc}`;
    const xhpRoll = new Roll(xhpFormula,rollData).evaluate({async:false});
    systemData.health.xhp.max = xhpRoll.total;
    const mlMaxFormula = `${systemData.ml.formula}+${systemData.ml.misc}+${systemData.ml.aug}`;
    const mlMaxRoll = new Roll(mlMaxFormula,rollData).evaluate({async:false});
    systemData.ml.max = mlMaxRoll.total;
    // Calculate Carrying Capacity
    const carryFormula = systemData.carrying.capacity;
    const carryRoll = new Roll(carryFormula,rollData).evaluate({async:false});
    systemData.carrying.light = carryRoll.total;
    systemData.carrying.medium = carryRoll.total*2;
    systemData.carrying.heavy = carryRoll.total*3;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    //systemData.xp = (systemData.cr * systemData.cr) * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.level) {
      data.lvl = data.level.value ?? 1;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

}