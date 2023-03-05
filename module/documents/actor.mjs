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
    //console.debug('actor prepareData',this)
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

    // Loop through active armor and determine impact before calculating ability modifiers
    // Start with mods from active effects
    systemData.def.equip.value = systemData.def.equip.total;
    systemData.stats.armorPenalty.value = systemData.stats.armorPenalty.total;
    systemData.cp.armor.value = systemData.cp.armor.total;
    // Initially no cap on agility
    systemData.stats.agiMax = null;
    let agiClamp = false;
    for (let i of this.items){
      if (i.type === 'armor' && i.system.active){
        systemData.def.equip.value += i.system.def;
        systemData.stats.armorPenalty.value += i.system.penalty;
        systemData.cp.armor.value += i.system.cpLoss;
        if (i.system.agiMax != null){
          if (agiClamp){
            systemData.stats.agiMax = Math.min(systemData.stats.agiMax,i.system.agiMax);
          }
          else {
            agiClamp = true;
            systemData.stats.agiMax = i.system.agiMax;
          }
        }
      }
    }

    // Loop through ability scores and calculate modifiers
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
    catch{systemData.health.chp.max = 0;  }
    try{
      systemData.health.xhp.max = Roll.safeEval(Roll.replaceFormulaData(systemData.health.xhp.formula,rollData)) + systemData.health.xhp.mods.total;
    }
    catch{systemData.health.xhp.max = 0;}
    try{
      systemData.ml.max = Roll.safeEval(Roll.replaceFormulaData(systemData.ml.formula,rollData)) + systemData.ml.mods.total;
    }
    catch{systemData.ml.max = 0;}
    // Calculate Carrying Capacity
    try{
      systemData.stats.carrying.light = Roll.safeEval(Roll.replaceFormulaData(systemData.stats.carrying.formula,rollData))
    }
    catch{systemData.stats.carrying.light = 0;}
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
   * Fetch a given ability modifier from the actor
   * @param {String} source The desired ability
   * @returns {Number} The ability's modifier
   */
  abilityMod(source){
    switch (source){
      case '':
          return 0;
      case 'foc':
      case 'pow':
          return this.system.abilities.str[source] ?? 0;
      case 'mrk':
      case 'agi':
          return this.system.abilities.dex[source] ?? 0;
      default:
          return this.system.abilities[source].mod ?? 0;
    }  
  }
  /**
   * Roll a d3 for each bleed die on a character and add the result to the incoming damage.
   */
  async rollBleed(){
    const updateData = {};
    let r = await new Roll(`${this.system.health.bleed}d3`).evaluate({async:true})
    r.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor:'Bleeding out...',
      rollMode: game.settings.get('core', 'rollMode')
    })
    updateData['system.health.incoming'] = this.system.health.incoming + r.total;
    this.update(updateData);
  }
  /**
   * Takes damage and applies it to the targeted protection
   * @param {String} target item id or actor health pool to apply damage to
   */
  async applyDamage(target){
    console.debug(this.system.health.damageReport)
    console.debug(ui.chat.collection?.contents[ui.chat.collection.contents.length-1]?.id)
    let incoming = this.system.health.incoming;
    const initial = incoming;
    if (incoming == 0) return null;
    const actorUpdateData = {};
    const itemUpdateData = {};
    const chatTemplate = "systems/opsandtactics/templates/chat/armor-damage-card.html";
    let oldReport;
    let chatReport;
    let type = '';
    let remaining = 0;
    let dr = 0;
    let reduced = 0;
    let report = ``;
    let max = -1;
    let drItem;
    // Gather dr and pool data from target
    switch(target){
      case 'xhp':
      case 'chp':
        remaining = this.system.health[target].value;
        type = target;
        break;
      default:
        if (this.items.get(target) == undefined) return null;
        drItem = this.items.get(target);
        remaining = drItem.system.ap.value;        
        max = drItem.system.ap.max;
        dr = drItem.system.protection[drItem.system.activeDR]?.value ?? 0;
        if(dr==0) return;
        type = drItem.system.layer;
        break;
    }
    // Apply damage depending on protection type and generate message
    switch(type){
      case 'chp':
        remaining -= incoming;
        report = `Core hit points take ${incoming} damage, ${remaining} CHP remains.`
        incoming = 0;
        setProperty(actorUpdateData,'system.health.chp.value',remaining);
        break;
      case 'xhp':
        if(remaining == 0) return null;
        reduced = Math.min(incoming,remaining);
        remaining -= reduced;
        incoming -= reduced;
        if(incoming >= 0){
          report = `Extended hit points emptied by ${reduced} damage, ${incoming} damage remains.`;
        }
        else{
          report = `Extended hit points take ${reduced} damage, ${remaining} XHP remains.`
        }
        setProperty(actorUpdateData,'system.health.xhp.value',remaining);
        break;
      case 'shield':
        if (max == 0) break;
        if(remaining == 0) return null;
        if (incoming <= dr){
          report = `${drItem.name} diffuses damage completely.`
          incoming = 0;
        }
        else{
          reduced = Math.min(incoming-dr,remaining);
          remaining -= reduced;
          incoming -= (reduced+dr);
          if(remaining == 0){
            report = `${drItem.name} reduces damage by${reduced+dr} and is disabled, ${incoming} damage remains.`
          }
          else{
            report = `${drItem.name} reduces damage to nothing, ${remaining} soak remains.`
          }
          setProperty(itemUpdateData,'system.ap.value',remaining);
        }
        break;
      default:
        if (max == 0) break;
        if(remaining == 0) return null;
        reduced = Math.min(incoming,Math.min(dr,remaining));
        remaining -= reduced;
        incoming -= reduced;
        if(remaining == 0){
          report = `${drItem.name} reduces damage by ${reduced} and is depleted, ${incoming} damage remains.`
        }
        else{
          report = `${drItem.name} reduces damage by ${reduced}, ${incoming} damage and ${remaining} AP remains`
        }
        setProperty(itemUpdateData,'system.ap.value',remaining);
        break;
    }
    // Apply non-health protection without defined AP/Soak as pure DR
    if (max == 0){
      reduced = Math.min(incoming,dr);
      incoming -= reduced;
      if (incoming > 0){
        report = `${drItem.name} reduces damage by ${reduced}, ${incoming} damage remains.`
      }
      else{
        report = `${drItem.name} reduces damage to nothing.`;
      }
    }
    setProperty(actorUpdateData,'system.health.incoming',incoming);
    // Create a new message if there's no existing one or the existing one isn't the most recent
    if (this.system.health.damageReport == '' || this.system.health.damageReport!=ui.chat.collection?.contents[ui.chat.collection.contents.length-1]?.id){
      const speaker = ChatMessage.getSpeaker({actor:this.actor});
      const rollMode = game.settings.get('core', 'rollMode');
      chatReport = await ChatMessage.create({speaker:speaker,rollMode:rollMode});
      setProperty(actorUpdateData,'system.health.damageReport',chatReport.id);
      await chatReport.setFlag('opsandtactics','report',{initial:initial,reports:[report]});
    }
    // If an existing message is most recent, add the new report to its list
    else{
      chatReport = game.messages.get(this.system.health.damageReport)
      oldReport = await chatReport.getFlag('opsandtactics','report');
      oldReport.reports.push(report);
      await chatReport.setFlag('opsandtactics','report',oldReport);
    }
    console.debug(chatReport)
    // Update the chat message based on its flags
    let messReports = await chatReport.getFlag('opsandtactics','report');
    const html = await renderTemplate(chatTemplate,{title:messReports.initial,report:messReports.reports})
    console.debug(html)
    await chatReport.update({content:html});
    // Detach the chat message if all incoming damage is dealt with
    if(incoming==0) setProperty(actorUpdateData,'system.health.damageReport','');
    // Update target with new remaining value and actor with new incoming value
    this.update(actorUpdateData);
    if(!isEmpty(itemUpdateData)) drItem.update(itemUpdateData);
    console.debug(report);
    return report;
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