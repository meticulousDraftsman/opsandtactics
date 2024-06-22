import { opsCheck } from "../opsandtactics.mjs";

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
    this._prepareVehicleData(this);
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
    systemData.def.equip.value = systemData.def.equip.subtotal;
    systemData.def.dodge.value = systemData.def.dodge.subtotal;
    systemData.def.misc.value = systemData.def.misc.subtotal;
    systemData.stats.armorPenalty.value = systemData.stats.armorPenalty.subtotal;
    systemData.stats.armorNoProf = systemData.stats.armorPenalty.subtotal;
    systemData.cp.armor.value = systemData.cp.armor.subtotal;
    // Initially no cap on agility
    systemData.stats.agiMax = null;
    let agiClamp = false;
    for (let i of this.items){
      if (i.type === 'armor' && i.system.active){
        systemData.def.equip.value += i.system.def;
        systemData.stats.armorPenalty.value += i.system.penalty;
        if (!i.system.proficient) systemData.stats.armorNoProf += i.system.penalty;
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
      ability.mod = Math.floor((ability.score-10)/2)+ability.modMods.subtotal;
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
    systemData.def.value = 10 + systemData.def.equip.value + systemData.abilities.dex.agi + systemData.def.size + systemData.def.move + systemData.def.misc.value + systemData.def.dodge.value;
    systemData.def.touch = 10 + systemData.abilities.dex.agi + systemData.def.size + systemData.def.move + systemData.def.misc.value + systemData.def.dodge.value;
    systemData.def.flat = 10 + systemData.def.equip.value + Math.min(0,systemData.abilities.dex.agi) + systemData.def.size + systemData.def.move + systemData.def.misc.value;

    //Calculate Initiative Modifier
    //console.debug(systemData.stats.init.subtotal)
    systemData.stats.init.value = systemData.stats.init.subtotal + systemData.abilities.dex.agi +systemData.stats.wager;
    // Calculate BAB
    systemData.stats.bab.value = systemData.stats.level.value + systemData.stats.bab.subtotal + this.wagerPenalty();
    // Calculate Recoil Reduction
    systemData.stats.recoil.value = systemData.abilities.str.score - 10 + systemData.stats.recoil.subtotal;
    // Calculate Personal Capital    
    systemData.wealth.capital.personal.value = (5*(systemData.stats.level.value+1))+systemData.abilities.cha.score;
    // Calculate Hit Points
    const rollData = this.getRollData({deterministic:true});
    const chpRoll = new Roll(systemData.health.chp.formula,rollData);
    systemData.health.chp.max = chpRoll.isDeterministic ? chpRoll.evaluate({async:false}).total + systemData.health.chp.mods.subtotal : 0;
    const xhpRoll = new Roll(systemData.health.xhp.formula,rollData);
    systemData.health.xhp.max = xhpRoll.isDeterministic ? xhpRoll.evaluate({async:false}).total + systemData.health.xhp.mods.subtotal : 0;
    // Calculate Carrying Capacity
    const carryRoll = new Roll(systemData.stats.carrying.formula,rollData);
    systemData.stats.carrying.light = carryRoll.isDeterministic ? carryRoll.evaluate({async:false}).total + systemData.stats.carrying.mods.subtotal : 0;
    systemData.stats.carrying.medium = systemData.stats.carrying.light*2;
    systemData.stats.carrying.heavy = systemData.stats.carrying.light*3;
    // Calculate Mental Limit
    const mlRoll = new Roll(systemData.ml.formula,rollData);
    systemData.ml.max = mlRoll.isDeterministic ? mlRoll.evaluate({async:false}).total + systemData.ml.mods.subtotal + systemData.ml.temp : 0;
    systemData.magic.mlPsion = systemData.magic.psionFocus?((2*systemData.stats.level.value)+25):0;
    systemData.magic.mlRecipe = systemData.magic.invokerMemorize?((3*systemData.stats.level.value)+3):0;
    systemData.magic.mlObject = 0;
    for (let i of this.items){
      if (hasProperty(i,'system.gear.resources')){
        for (let [,r] of Object.entries(i.system.gear.resources)){
          if (r.type==='magic' && r.value!=0) systemData.magic.mlObject += r.ml;
        }
      }
    }
    systemData.magic.mlMisc = systemData.magic.mods.subtotal
    systemData.magic.mlUsed = systemData.magic.mlPsion + systemData.magic.mlRecipe + systemData.magic.mlObject + systemData.magic.mlCant + systemData.magic.mlMisc;
    systemData.ml.value = systemData.ml.max - systemData.magic.mlUsed;
    // Calculate Skill Points
    systemData.stats.skills.points = (systemData.stats.skills.base + this.abilityMod(systemData.stats.skills.ability)) * (systemData.stats.level.value + systemData.stats.skills.startingMult - 1);
    // Tally Character Option Impacts
    systemData.saves.fortitude.base = 0;
    systemData.saves.reflex.base = 0;
    systemData.saves.will.base = 0;
    for (let cop of systemData.cops){
      systemData.health.xhp.max += cop.xhp;
      systemData.saves.fortitude.base += cop.fortitude;
      systemData.saves.reflex.base += cop.reflex;
      systemData.saves.will.base += cop.will;
      systemData.stats.skills.points += cop.skills;
    }
    // Tally spent skill points
    systemData.stats.skills.spent = 0;
    for (let i of this.items){
      if (i.type==='skill'){
        systemData.stats.skills.spent += i.system.ranks * (i.system.focus==='unfocus'?2:1);
      }
    }
    // Calculate Saves
    systemData.saves.reflex.value = Math.floor(systemData.saves.reflex.base * systemData.saves.reflex.mult) + systemData.saves.reflex.mods.subtotal + systemData.abilities.dex.agi;
    systemData.saves.fortitude.value = Math.floor(systemData.saves.fortitude.base * systemData.saves.fortitude.mult) + systemData.saves.fortitude.mods.subtotal + systemData.abilities.con.mod;
    systemData.saves.will.value = Math.floor(systemData.saves.will.base * systemData.saves.will.mult) + systemData.saves.will.mods.subtotal + systemData.abilities.wis.mod;
    
    // Trigger Vehicle Data Prep
    if (!isEmpty(systemData.links.vehicle)){
      let linked = new Set()
      for (let [,i] of Object.entries(systemData.links.vehicle)){
        linked.add(i)
      }
      for (let i of linked){
        if (fromUuidSync(i).type=='vehicle') fromUuidSync(i).reset();
      }
    } 
  }
  
  _prepareVehicleData(actorData) {
    if (actorData.type !== 'vehicle') return;
    const systemData = actorData.system;
    // Calculate impacts of speed
    switch (systemData.vehicle.speed){
      case 2:
        systemData.stats.maneuver.speed = 0;
        systemData.def.speed = 1;
        break;
      case 3:
        systemData.stats.maneuver.speed = -1;
        systemData.def.speed = 1;
        break;
      case 4:
        systemData.stats.maneuver.speed = -2;
        systemData.def.speed = 2;
        break;
      case 5:
        systemData.stats.maneuver.speed = -4;
        systemData.def.speed = 3;
        break;
      case 6:
        systemData.stats.maneuver.speed = -6;
        systemData.def.speed = 5;
        break;
      case 7:
        systemData.stats.maneuver.speed = -8;
        systemData.def.speed = 7;
        break;
      default:
        systemData.stats.maneuver.speed = 0;
        systemData.def.speed = 0;
    }
    // Calculate total defense, maneuever, and cost
    systemData.def.value = systemData.def.innate + systemData.def.misc + systemData.def.speed;
    systemData.stats.maneuver.value = systemData.stats.maneuver.innate + systemData.stats.maneuver.misc;
    systemData.stats.maneuver.check = systemData.stats.maneuver.value + systemData.stats.maneuver.speed;
    systemData.details.cost.value = systemData.details.cost.innate + systemData.details.cost.misc
    // Calculate total initiative
    systemData.stats.init.value = systemData.stats.init.innate + fromUuidSync(systemData.stats.init.driver)?.system.stats.init.value;
    // Parse linked crew members
    for (let [key, entry] of Object.entries(systemData.vehicle.crew)){
      if (key == 'generic'){}
      else {
        let crewDoc = fromUuidSync(entry.uuid);
        entry.name = crewDoc.name;
        entry.init = crewDoc.system.stats.init.value;
        entry.attackBase = crewDoc.system.stats.bab.value;
        entry.skillBase = entry.skill? crewDoc.items.get(entry.skill).skillSum().total : 0;
      }
    }
  }

  async rollActorCheck(checkData){
    const rollData = this.getRollData();
    const rollConfig = {
      actor: this,
      data: rollData,
      flavor: null,
      speaker: ChatMessage.getSpeaker({actor: this}),
      rollMode: game.settings.get('core', 'rollMode'),
    }
    switch (checkData.checkID){
      case 'fortitude':
        rollConfig.title = 'Fortitude Save';
        rollConfig.checkType = 'generic';
        rollConfig.mod = checkData.modifier?checkData.modifier: this.system.saves[checkData.checkID].value;
        break;
      case 'reflex':
        rollConfig.title = 'Reflex Save';
        rollConfig.checkType = 'reflex';
        rollConfig.mod = checkData.modifier?checkData.modifier:this.system.saves[checkData.checkID].value;
        break;
      case 'will':
        rollConfig.title = 'Will Save';
        rollConfig.checkType = 'generic';
        rollConfig.mod = checkData.modifier?checkData.modifier:this.system.saves[checkData.checkID].value;
        break;
      case 'skill':
        rollConfig.title = `${checkData.itemName} Check`
        rollConfig.checkType = 'generic';
        rollConfig.mod = checkData.modifier;
        break;
      default:
        rollConfig.title = `${game.i18n.localize(CONFIG.OATS.abilities[checkData.checkID])} Check`;
        rollConfig.checkType = 'generic';
        rollConfig.mod = checkData.modifier?checkData.modifier:this.abilityMod(checkData.checkID)
    }
    rollConfig.mod = (`${rollConfig.mod}`.charAt(0)!='+' && `${rollConfig.mod}`.charAt(0)!='-')?`+${rollConfig.mod}`:rollConfig.mod;
    const roll = await opsCheck(rollConfig);
    if (roll==null) return null;
    return roll;
  }

  async rollVehicleCheck(actionID, rollType,event=undefined){
    // Check Resource Consumptions
    let ammoCheck = (event && (event.ctrlKey || event.altKey))? true : this.vehicleResourceAvailableCheck(actionID);
    let cpCheck = (getProperty(this,`system.actions.${actionID}.source`) == 'generic' || (event && (event.ctrlKey || event.altKey)))? true : fromUuidSync(getProperty(this,`system.vehicle.crew.${getProperty(this,`system.actions.${actionID}.source`)}.uuid`)).cpAvailableCheck(getProperty(this,`system.actions.${actionID}.cp`))
    if (!ammoCheck || !cpCheck){
      await Dialog.confirm({
        title: "Insufficient Resources",
        content: `Perform check despite not having enough ${!ammoCheck?'ammo':''}${(!ammoCheck&&!cpCheck)?' or ':''}${!cpCheck?'combat points':''}?`,
        yes: () => {
          ammoCheck = true;
          cpCheck = true;
        },
        no: () => {},
        defaultYes:true
      });
    }
    if(!ammoCheck || !cpCheck) return;
    // Prepare data for roll
    const rollData=this.getRollData();
    const rollConfig = {
      actor: this,
      data: rollData,
      title: this.system.actions[actionID].name,
      flavor: getProperty(this, `system.actions.${actionID}.check.flavor`),
      mod: getProperty(this, `system.actions.${actionID}.check.total`), 
      speaker: ChatMessage.getSpeaker({actor:this}),
      rollMode: game.settings.get('core','rollMode'),
      popupSkip: (event && event.shiftKey)
    }
    switch (rollType){
      case 'skill':
        rollConfig.checkType = 'skill';
        break;
      case 'attack':
        rollConfig.checkType = 'ranged';
        rollConfig.attackStance = this.effects.find(e => e.getFlag("core", "statusId") === 'prone') ? 'prone' : this.effects.find(e => e.getFlag("core", "statusId") === 'kneeling') ? 'kneeling' : undefined;
        rollConfig.targetStance = undefined;
        const mainTarget = Array.from(game.user.targets)[0] || undefined;
        if (mainTarget) rollConfig.targetStance = mainTarget.actor.effects.find(e => e.getFlag("core", "statusId") === 'prone') ? 'prone' : mainTarget.actor?.effects.find(e => e.getFlag("core", "statusId") === 'kneeling') ? 'kneeling' : undefined;
        break;
      case 'message':
        rollConfig.checkType = 'noneUtility';
        break;
    }
    // Execute Roll
    const roll = await opsCheck(rollConfig);
    if (roll==null) return null;
    //Resource Consumption
    if (!(event && event.altKey)){
      let cost = getProperty(this,`system.actions.${actionID}.ammo.cost`);
      if (getProperty(this,`system.actions.${actionID}.ammo.source`)){
        const dualID = getProperty(this,`system.actions.${actionID}.ammo.source`).split(',');
        if (getProperty(this,`system.actions.${actionID}.linked.type`)=='coolant') cost *= -1;
        await this.items.get(dualID[0]).attributeConsume(`${dualID[1]}.value`,cost)
      }
      else {
        await this.attributeConsume(`system.actions.${actionID}.ammo.value`,cost);
      }
      if (getProperty(this,`system.actions.${actionID}.source`) != 'generic') await fromUuidSync(getProperty(this,`system.vehicle.crew.${getProperty(this,`system.actions.${actionID}.source`)}.uuid`)).attributeConsume('system.cp.value',getProperty(this,`system.actions.${actionID}.cp`));
    }
    return roll;
  }
  vehicleResourceAvailableCheck(actionID){
    const action = getProperty(this,`system.actions.${actionID}`);
    const cost = getProperty(action, 'ammo.cost') ?? 0;
    if (Number(cost)==0) return true;
    if (getProperty(action,'ammo.source')){
      const dualID = getProperty(action,'ammo.source').split(',');
      const item = this.items.get(dualID[0]);
      const resource = getProperty(item,dualID[1]);
      if (action.linked.type=='coolant') return ((action.linked.value+cost) <= action.ammo.max);
      return ((action.linked.value-cost) >= 0)   
    }
    else{
      return ((action.ammo.value-cost) >= 0);
    }
  }

  async actorAction(checkID, event=undefined){
    const cpCost = getProperty(this,`system.actions.${checkID}.cost`)*getProperty(this,`system.actions.${checkID}.quantity`);
    if (cpCost==0) return;
    let cpCheck = (event && event.ctrlKey)? true : ((this.system.cp.value-cpCost) >= -this.system.cp.temp);
    if (!cpCheck){
      await Dialog.confirm({
        title: "Not Enough Combat Points!",
        content: `Deduct Combat Points past available limit?`,
        yes: () => {
          cpCheck = true;
        },
        no: () => {},
        defaultYes:true
      });
    }
    if (!cpCheck) return;
    const updateData = {};
    updateData['system.cp.value'] = (this.system.cp.value-cpCost);
    await this.update(updateData);
  }

  cpAvailableCheck(cost){
    if (cost==0 || !hasProperty(this,'system.cp.value')) return true;
    return (this.system.cp.value-cost >= -this.system.cp.temp)
  }
  async attributeConsume(path,cost){
    if (Number(cost)==0) return;
    await this.update({[path]:(getProperty(this,path)-cost)});
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
      case undefined:
      case null:
          return 0;
      case 'foc':
      case 'pow':
          return getProperty(this,`system.abilities.str.${source}`) ?? 0;
      case 'mrk':
      case 'agi':
          return getProperty(this,`system.abilities.dex.${source}`) ?? 0;
      default:
          return getProperty(this,`system.abilities.${source}.mod`) ?? 0;
    }  
  }
  wagerPenalty(){
    switch (this.system.stats.wager){
      case 1:
        return -1;
      case 2:
        return -3;
      case 3:
        return -6;
      case 4:
        return -10;
      case 5:
        return -15
      default:
        return 0;
    }
  }
  /**
   * Roll a d3 for each bleed die on a character and add the result to the incoming damage.
   */
  async rollBleed(){
    const updateData = {};
    if (this.system.health.bleed === null) return;
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
  async applyDamage(target,event=null){
    let incoming = this.system.health.incoming ?? 0;
    const initial = incoming;
    if (incoming == 0) return null;
    const actorUpdateData = {};
    const itemUpdateData = {};
    const chatTemplate = "systems/opsandtactics/templates/interface/armor-damage-card.html";
    let oldReport;
    let chatReport;
    let type = '';
    let remaining = 0;
    let dr = 0;
    let reduced = 0;
    let report = ``;
    let max = -1;
    let drItem;
    let offenseResult;
    // Gather dr and pool data from target
    switch(target){
      case 'xhp':
      case 'chp':
        remaining = this.system.health[target].value;
        type = target;
        break;
      case 'vehicle':
      case 'vehiclePlasma':
        dr = this.system.def.hardness + ((target=='vehiclePlasma')? this.system.def.plasma : 0);
        remaining = this.system.health.hp.value;
        type = target;
        break;
      default:
        if (this.items.get(target) == undefined) return null;
        drItem = this.items.get(target);
        remaining = drItem.system.ap.value;        
        max = drItem.system.ap.soak ?? drItem.system.ap.max;
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
        if(incoming > 0 || remaining == 0){
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
        if (!event?.shiftKey){
          offenseResult = await this.bladePopup();
        }
        else {
          offenseResult = 0;
        }
        if (offenseResult==-1) return null;
        if (offenseResult==0){
          offenseResult = 1;
        }
        else {
          dr=0;
        }
        if (incoming <= dr){
          report = `${drItem.name} diffuses damage completely.`
          incoming = 0;
        }
        else{
          reduced = Math.min((incoming-dr)*offenseResult,remaining);
          remaining -= reduced;
          incoming -= Math.ceil((reduced+dr)/offenseResult);
          if(remaining == 0){
            report = `${drItem.name} reduces damage by ${reduced+dr} and is disabled, ${incoming} damage remains.`
          }
          else{
            report = `${drItem.name} reduces damage to nothing, ${remaining} soak remains.`
          }
          setProperty(itemUpdateData,'system.ap.value',remaining);
        }
        break;
      case 'vehicle':
      case 'vehiclePlasma':
        if (incoming <= dr){
          report = `${this.name} shrugs off the damage.`
        }
        else {
          incoming -= dr;
          remaining -= incoming;
          switch (true){
            case (remaining > 0):
              report = `${this.name} takes ${incoming} damage, ${remaining} HP remain.`
              break;
            case (remaining > (-2 * this.system.health.hp.max)):
              report = `${this.name} takes ${incoming} damage and is disabled at ${remaining} HP.`;
              break;
            default:
              report = `${this.name} takes ${incoming} damage and is destroyed at ${remaining} HP.`;
          }
        }
        incoming=0;
        setProperty(actorUpdateData,'system.health.hp.value',remaining);
        break;
      default:
        if (max == 0) break;
        if(remaining == 0) return null;
        if (!event?.shiftKey) {
          offenseResult = await this.maulPopup();
        }
        else {
          offenseResult = {ignore:0,mult:1};
        }
        if (offenseResult==-1) return null;
        const ignore = offenseResult.ignore;
        const mult = offenseResult.mult;
        reduced = Math.min(incoming*mult,Math.min((dr-ignore)*mult,remaining));
        remaining -= reduced;
        incoming -= Math.ceil(reduced/mult);
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
      const messageData = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        from: game.user._id,
        speaker: ChatMessage.getSpeaker({actor:this}),
        content: ''
      }
      chatReport = await ChatMessage.create(messageData,{rollMode: game.settings.get('core', 'rollMode')});
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
    // Update the chat message based on its flags
    let messReports = await chatReport.getFlag('opsandtactics','report');
    const html = await renderTemplate(chatTemplate,{title:messReports.initial,report:messReports.reports})
    await chatReport.update({content:html});
    // Detach the chat message if all incoming damage is dealt with
    if(incoming==0){
      setProperty(actorUpdateData,'system.health.damageReport','');
      setProperty(actorUpdateData,'system.health.incoming',null);
    }
    // Update target with new remaining value and actor with new incoming value
    await this.update(actorUpdateData);
    if(!isEmpty(itemUpdateData)){
      await drItem.update(itemUpdateData);
      if (type=='shield' && drItem.system.coolant!=''){
        let dualID = drItem.system.coolant.split(',');
        let coolItem = this.items.get(dualID[0]);
        if (coolItem) await coolItem.update({[`${dualID[1]}.value`]:drItem.system.ap.soak-drItem.system.ap.value});
      }
    }
    return report;
  }
  
  async bladePopup(){
    const content = await renderTemplate('systems/opsandtactics/templates/interface/dialog-blades.html');
    return new Promise(resolve => {
      new Dialog({
        title: "Skilled Psiblade Attack?",
        content,
        buttons: {
          apply: {
            label: "Apply Form",
            callback: html => resolve(Number(html[0].querySelector("form").bladeForm.value))
          }
        },
        close: () => resolve(-1)
      }).render(true,{width:260});
    });
  }
  async maulPopup(){
    const content = await renderTemplate('systems/opsandtactics/templates/interface/dialog-mauls.html');
    return new Promise(resolve => {
      new Dialog({
        title: "Extra Armor Destruction?",
        content,
        buttons: {
          apply: {
            label: "Apply Impact",
            callback: html => resolve({ignore:Number(html[0].querySelector("form").drIgnore.value),mult:Number(html[0].querySelector("form").apMult.value)})
          }
        },
        close: () => resolve(-1)
      }).render(true,{width:260});
    });
  }

  // Scrolling bar text
  async modifyTokenAttribute(attribute, value, isDelta, isBar){
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    for (const t of tokens) {
      canvas.interface.createScrollingText(t.center,(isDelta? value.signedString() : value),{
        anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
        fonstSize: 32,
        fill: value>0 ? 0xFFFFFF : 0x000000,
        stroke: value<0 ? 0xFFFFFF : 0x000000,
        strokeThickness: 4,
        jitter: 0.25
      });
    }
    return super.modifyTokenAttribute(attribute,value,isDelta,isBar);
  }

  static addChatListeners(html){
    html.on("click",".chat-button-damage",this._onChatDamage.bind(this));
  }
  static async _onChatDamage(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    let damage = Number(dataset.damage);
    if (!canvas.tokens?.controlled?.length || Number.isNaN(damage)) return;
    damage = event.shiftKey?Math.floor(damage/2):damage;
    damage = event.altKey?-1*damage:damage;
    return Promise.all(canvas.tokens.controlled.map(t => {
      const a = t.actor;
      if (!a.isOwner) return a;
      const updateData = {['system.health.incoming']:getProperty(a,'system.health.incoming')+damage};
      return a.update(updateData);
    }))
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getVehicleRollData(data);
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
    // Add BAB and Initiative
    if (data.stats.init){
      data.init = data.stats.init.value ?? 0;
    }
    if (data.stats.bab){
      data.bab = data.stats.bab.value ?? 0;
    }
  }

  _getVehicleRollData(data) {
    if (this.type !== 'vehicle') return;
    // Bring initiative up for combat tracker
    data.init = data.stats.init.value ?? 0;
  }

  // Pre-creation
  async _preCreate(data, options, user){
    await super._preCreate(data, options, user);
    const updates = {};
    switch (this.type){
      case 'character':
        if (!hasProperty(data,'system')) updates['system.actions'] = CONFIG.OATS.characterActions;
        if (!hasProperty(data,'items')){
          updates['items'] = []
          for (let sid of CONFIG.OATS.characterDefaultItems){
            updates['items'].push((await fromUuid(sid)).toObject());
          }
        }
        if (!hasProperty(data,'img')){
          updates['img'] = CONFIG.OATS.characterIcons[Math.floor(Math.random()*CONFIG.OATS.characterIcons.length)];
          updates['prototypeToken.texture.src'] = updates['img'];
        }
        break;
      case 'vehicle':
        //if (!hasProperty(data,'system')) updates['system.actions'] = CONFIG.OATS.vehicleActions;
        if (!hasProperty(data,'img')){
          updates['img'] = CONFIG.OATS.vehicleIcons[Math.floor(Math.random()*CONFIG.OATS.vehicleIcons.length)];
          updates['prototypeToken.texture.src'] = updates['img'];
        } 
        break;
      case 'spacecraft':
        if (!hasProperty(data,'img')){
          updates['img'] = CONFIG.OATS.spacecraftIcons[Math.floor(Math.random()*CONFIG.OATS.spacecraftIcons.length)];
          updates['prototypeToken.texture.src'] = updates['img'];
        } 
        break;
    }
    if(!isEmpty(updates)) return this.updateSource(updates);
  }
  // Pre-updation
  async _preUpdate(changed,options,user){
    await super._preUpdate(changed,options,user);
    const updates= {};
    switch (this.type){
      case 'character':
        if (hasProperty(changed,'img') && CONFIG.OATS.characterIcons.includes(this.img) && this.img == this.prototypeToken.texture.src) updates['prototypeToken.texture.src'] = changed.img;
        break;
      case 'vehicle':
        if (hasProperty(changed,'img') && CONFIG.OATS.vehicleIcons.includes(this.img) && this.img == this.prototypeToken.texture.src) updates['prototypeToken.texture.src'] = changed.img;
        break;
      case 'spacecraft':
        if (hasProperty(changed,'img') && CONFIG.OATS.spacecraftIcons.includes(this.img) && this.img == this.prototypeToken.texture.src) updates['prototypeToken.texture.src'] = changed.img;
        break;
    }
    if(!isEmpty(updates)) return this.updateSource(updates);
  }
}  

// Start of turn popup
export class TurnStartDashboardApp extends FormApplication {
  static get defaultOptions(){
    return mergeObject(super.defaultOptions, {
      classes: ['opsandtactics','sheet','item'],
      template: 'systems/opsandtactics/templates/interface/dialog-turn-start-dashboard.html',
      width: 300,
      closeOnSubmit: false,
      submitOnChange: true,
      resizable: false
    });
  }
  get title(){
    return `${this.object.name}'s turn is starting`;
  }
  getData(){
    const context = {
      OATS: CONFIG.OATS,
      system: this.object.system
    };
    return context;
  }
  activateListeners(html){
    super.activateListeners(html);
    html.find('.refresh-cp').click(this._refreshCombatPoints.bind(this));
    html.find('.temp-cp').click(this._tempCombatPoints.bind(this));
    html.find('.armor-cp').click(this._armorCombatPoints.bind(this));
    html.find('.move-def').click(this._moveDefense.bind(this));
    html.find('.init-wager').click(this._initiativeWager.bind(this));
    html.find('.mental-limit').click(this._mentalLimit.bind(this));
  }
  async _refreshCombatPoints(event){
    event.preventDefault();
    const updateData = {['system.cp.value']:this.object.system.cp.max};
    await this.object.update(updateData);
    this.render()
  }
  async _tempCombatPoints(event){
    event.preventDefault();
    const updateData = {['system.cp.temp']:null};
    await this.object.update(updateData);
    this.render()
  }
  async _armorCombatPoints(event){
    event.preventDefault();
    const updateData = {['system.cp.value']:this.object.system.cp.value - this.object.system.cp.armor.value};
    await this.object.update(updateData);
    this.render()
  }
  async _moveDefense(event){
    event.preventDefault();
    const updateData = {['system.def.move']:null};
    await this.object.update(updateData);
    this.render()
  }
  async _initiativeWager(event){
    event.preventDefault();
    const updateData = {['system.stats.wager']:0};
    await this.object.update(updateData);
    this.render()
  }
  async _mentalLimit(event){
    event.preventDefault();
    const updateData = {['system.magic.mlCant']:Math.max((this.object.system.magic.mlCant - Math.ceil(this.object.system.ml.max / 10)),0)};
    await this.object.update(updateData);
    this.render()
  }
}