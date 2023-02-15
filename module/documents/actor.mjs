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
    console.debug('actor prepareData',this)
  }

  /** @override */
  prepareBaseData() {
    //console.debug('actor prepareBaseData',this)
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
    this._prepareCharacterBase(this);
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
    //console.debug('actor prepareDerivedData',this)
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterBase(actorBase){
    if (actorBase.type !== 'character') return;
    const systemBase = actorBase.system;
  }
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;
    // Make modifications to data here. For example:
    const systemData = actorData.system;
    // Loop through equipped armor and determine impact
    systemData.def.equip.value = systemData.def.equip.total;
    systemData.stats.armorPenalty.value = systemData.stats.armorPenalty.total;
    systemData.cp.armor.value = systemData.cp.armor.total;
    systemData.stats.agiMax = null;
    let agiClamp = false;

    console.debug(this.items)

    for (let i of this.items){
      
      if (i.type === 'armor' && i.system.active){
        console.debug(i);
        if (i.system.def.active) systemData.def.equip.value += i.system.def.value;
        if (i.system.penalty.active) systemData.stats.armorPenalty.value += i.system.penalty.value;
        if (i.system.cpLoss.active) systemData.cp.armor.value += i.system.cpLoss.value;
        if (i.system.agiMax.active){
          if (agiClamp){
            systemData.stats.agiMax = Math.min(systemData.stats.agiMax,i.system.agiMax.value);
          }
          else {
            agiClamp = true;
            systemData.stats.agiMax = i.system.agiMax.value;
          }
        }
      }
    }

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      ability.mod = Math.floor((ability.score-10)/2)+ability.modMods.total;
      switch(key){
        case 'str':
            ability.pow = ability.mod - ability.foc;
          break;
        case 'dex':
          ability.agi = ability.mod - ability.mrk;
          if (agiClamp) ability.agi = Math.min(ability.agi,systemData.stats.agiMax);
          break;
      }
    }
    // Calculate Defense
    systemData.def.value = 10 + systemData.def.equip.value + systemData.abilities.dex.agi + systemData.def.size + systemData.def.move + systemData.def.misc + systemData.def.dodge;
    systemData.def.touch = 10 + systemData.abilities.dex.agi + systemData.def.size + systemData.def.move + systemData.def.misc + systemData.def.dodge;
    systemData.def.flat = 10 + systemData.def.equip.value + systemData.def.size + systemData.def.move + systemData.def.misc;
    // Calculate Saves
    systemData.saves.reflex.value = systemData.saves.reflex.base + systemData.saves.reflex.mods.total + systemData.abilities.dex.agi;
    systemData.saves.fortitude.value = systemData.saves.fortitude.base + systemData.saves.fortitude.mods.total + systemData.abilities.con.mod;
    systemData.saves.will.value = systemData.saves.will.base + systemData.saves.will.mods.total + systemData.abilities.wis.mod;
    //Calculate Initiative Modifier
    systemData.stats.init.value = systemData.stats.init.total + systemData.abilities.dex.agi;
    // Calculate BAB
    systemData.stats.bab.value = systemData.stats.level.value + systemData.stats.bab.total;
    // Calculate Recoil Reduction
    systemData.stats.recoil.value = systemData.abilities.str.score - 10 + systemData.stats.recoil.total;
    // Calculate Personal Capital    
    systemData.wealth.capital.personal.total = (5*(systemData.stats.level.value+1))+systemData.abilities.cha.score;
    // Calculate Hit Points and Mental Limit
    const rollData = this.getRollData({deterministic:true});
    try{
      systemData.health.chp.max = Roll.safeEval(Roll.replaceFormulaData(systemData.health.chp.formula,rollData)) + systemData.health.chp.mods.total;
    }
    catch(err){
      systemData.health.chp.max = 0;  
    }
    try{
      systemData.health.xhp.max = Roll.safeEval(Roll.replaceFormulaData(systemData.health.xhp.formula,rollData)) + systemData.health.xhp.mods.total;
    }
    catch{
      systemData.health.xhp.max = 0;
    }
    try{
      systemData.ml.max = Roll.safeEval(Roll.replaceFormulaData(systemData.ml.formula,rollData)) + systemData.ml.mods.total;
    }
    catch{
      systemData.ml.max = 0;
    }
    // Calculate Carrying Capacity
    try{
      systemData.stats.carrying.light = Roll.safeEval(Roll.replaceFormulaData(systemData.stats.carrying.formula,rollData))
    }
    catch{
      systemData.stats.carrying.light = 0;
    }
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
   * Sum the values inside an object
   */
  modSum(obj){
    return Object.values(obj).reduce((a,b)=>a+b,0);
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
    if (data.stats.level) {
      data.lvl = data.stats.level.value ?? 1;
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