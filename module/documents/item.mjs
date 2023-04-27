import { opsCheck } from "../opsandtactics.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class OpsItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
    //console.debug('item prepareData',this)
  }

  prepareDerivedData(){
    
    const itemData = this;
    const systemData = itemData.system;
    //console.debug(itemData)
    if (itemData.type === 'skill') this._prepareSkillData(itemData);
    if (itemData.type === 'weapon') this._prepareWeaponData(itemData);
    if (itemData.type === 'object') this._prepareObjectData(itemData);
    if (itemData.type === 'magic') this._prepareMagicData(itemData);
    //console.debug('item prepareDerivedData',this)
  }

  _prepareSkillData(itemData){
    const systemData = itemData.system;
  }
  _prepareWeaponData(itemData){
    const systemData = itemData.system;
    // Map weapon mods values to attacks
     for (let [,a] of Object.entries(systemData.actions)){
      a.type = 'attack';
       for (let [key,entry] of Object.entries(a.check.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.check ?? null;
       }
       for (let [key,entry] of Object.entries(a.effect.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.effect ?? null;
       }
       for (let [key,entry] of Object.entries(a.recoil.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.recoil ?? null;
       }
       for (let [key,entry] of Object.entries(a.cp.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.cp ?? null;
       }
      }
  }
  _prepareObjectData(itemData){
    const systemData = itemData.system;
    // Flag actions as either attack or utility
    for (let [,a] of Object.entries(systemData.actions)){
      a.type = this.checkType(a.check.type);
    }
  }
  _prepareMagicData(itemData){
    const systemData = itemData.system;
    // Flag actions as either attack or utility
    for (let [,a] of Object.entries(systemData.actions)){
      a.type = this.checkType(a.check.type);
    }
  }

  async rollActionCheck(actionID,event=undefined){
    // Check resource consumption and override
    let ammoCheck = (event && (event.ctrlKey || event.altKey))? true : this.resourceAvailableCheck(getProperty(this,`system.actions.${actionID}.ammo`));
    let cpCheck = (event && (event.ctrlKey || event.altKey))? true : this.cpAvailableCheck(this.actionSum(this.system.actions[actionID]).cp);
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
    
    // Prep data for roll
    const rollData = this.actor.getRollData();
    const mainTarget = Array.from(game.user.targets)[0] || undefined;
    const rollConfig = {
      mod: this.actionSum(this.system.actions[actionID]).checkTotal,
      actor: this.actor,
      data: rollData,
      critical: getProperty(this,'system.crit'),
      error: getProperty(this,'system.error'),
      title: `${this.name} - ${this.system.actions[actionID].name}`,
      flavor: getProperty(this,`system.actions.${actionID}.check.flavor`),
      checkType: getProperty(this,`system.actions.${actionID}.check.type`),
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      rollMode: game.settings.get('core', 'rollMode'),
      popupSkip: (event && event.shiftKey),
      attackStance: this.actor.effects.find(e => e.getFlag("core", "statusId") === 'prone') ? 'prone' : this.actor?.effects.find(e => e.getFlag("core", "statusId") === 'kneeling') ? 'kneeling' : undefined,
      targetStance: undefined
    }
    if (mainTarget) rollConfig.targetStance = mainTarget.actor.effects.find(e => e.getFlag("core", "statusId") === 'prone') ? 'prone' : mainTarget.actor?.effects.find(e => e.getFlag("core", "statusId") === 'kneeling') ? 'kneeling' : undefined;
    // Execute roll
    const roll = await opsCheck(rollConfig);
    if (roll==null) return null;

    // Perform resource consumption
    if (!(event && event.altKey)){
      await this.resourceConsume(getProperty(this,`system.actions.${actionID}.ammo`));
      await this.cpConsume(this.actionSum(this.system.actions[actionID]).cp);
    }

    return roll;
  }
  async rollSkillCheck(event=undefined){
    const rollData = this.actor.getRollData();
    const rollConfig = {
      mod: this.skillSum().total,
      actor: this.actor,
      data: rollData,
      title: this.name,
      flavor: null,
      checkType: 'skill',
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      rollMode: game.settings.get('core', 'rollMode'),
      popupSkip: (event && event.shiftKey)
    }
    const roll = await opsCheck(rollConfig);
    if (roll==null) return null;
    return roll;

  }
  // Returns true if resource consumption is legal
  resourceAvailableCheck(cost){
    let loadedMag;
    let dualID;
    switch (this.system.magazine.type){
      case 'unlimited':
        return true;
      case 'mental':
        return ((this.actor.system.magic.mlUsed+cost) <= this.actor.system.ml.max);
      case 'coolant':
        if (!this.system.magazine.source) return false;
        dualID = this.system.magazine.source.split(',');
        loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
        return ((getProperty(loadedMag,`${dualID[1]}.value`)+cost) <= this.system.magazine.max);
      case 'external':
        if (!this.system.magazine.source) return false;
        dualID = this.system.magazine.source.split(',');
        loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
        if (this.type==='weapon'){
          return ((getProperty(loadedMag,`${dualID[1]}.value`)+this.system.magazine.value-cost) >= 0);
        }
        else {
          return ((getProperty(loadedMag,`${dualID[1]}.value`)-cost) >= 0);
        }
      case 'internal':
        if (this.type==='weapon'){
          return ((this.system.magazine.value-cost) >= 0);
        }
        else {
          if (!this.system.magazine.source) return false;
          dualID = this.system.magazine.source.split(',');
          loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
          return ((getProperty(loadedMag,`${dualID[1]}.value`)-cost) >= 0);
        }
    }
  }
  async resourceConsume(cost){
    if (Number(cost)==0) return;
    let loadedMag;
    let dualID;
    switch (this.system.magazine.type){
      case 'unlimited':
        break;
      case 'mental':
        await this.actor.update({['system.magic.mlCant']:(this.actor.system.magic.mlCant+cost)});
        break;
      case 'coolant':
        if (!this.system.magazine.source) return;
        dualID = this.system.magazine.source.split(',');
        loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
        const coolUpdate = {[`${dualID[1]}.cool`]:false}
        coolUpdate[`${dualID[1]}.value`] = getProperty(loadedMag,`${dualID[1]}.value`)+cost;
        await loadedMag.update(coolUpdate);
        break;
      case 'external':
        if (!this.system.magazine.source) return;
        dualID = this.system.magazine.source.split(',');
        loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
        if (this.type==='weapon'){
          const magOld = getProperty(loadedMag,`${dualID[1]}.value`);
          let magNew = magOld;
          const chamberOld = this.system.magazine.value;
          let chamberNew = chamberOld;
          let reduce;
          // Deduct cost from loaded value until zero
          if (magNew > 0){
            reduce = Math.min(cost, magNew);
            magNew -= reduce;
            cost -= reduce;
          }
          // Deduct any remaining cost from chamber value until zero
          if (cost > 0 && chamberNew > 0){
            reduce = Math.min(cost,chamberNew);
            chamberNew -= reduce;
            cost -= reduce;
          }
          // Deduct any remaining cost from loaded value even below zero
          if (cost > 0) magNew -= cost;
          await loadedMag.update({[`${dualID[1]}.value`]:magNew});
          if (chamberNew != chamberOld) await this.update({['system.magazine.value']:chamberNew});
        }
        else {
          await loadedMag.update({[`${dualID[1]}.value`]:(getProperty(loadedMag,`${dualID[1]}.value`)-cost)});
        }
        break;
      case 'internal':
        if (this.type==='weapon'){
          await this.update({['system.magazine.value']:(this.system.magazine.value-cost)});
        }
        else {
          if (!this.system.magazine.source) return;
          dualID = this.system.magazine.source.split(',');
          loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
          await loadedMag.update({[`${dualID[1]}.value`]:(getProperty(loadedMag,`${dualID[1]}.value`)-cost)});
        }
        break;
    }
  }
  cpAvailableCheck(cost){
    return (this.actor.system.cp.value-cost >= -this.actor.system.cp.temp)
  }
  async cpConsume(cost){
    if (Number(cost)==0) return;
    await this.actor.update({['system.cp.value']:(this.actor.system.cp.value-cost)});
  }

  checkType(checkType){
    switch (checkType){
      case 'melee':
      case 'ranged':
      case 'noneAttack':
      case 'noChatAttack':
        return 'attack';
      case 'skill':
      case 'generic':
      case 'otherUtility':
      case 'noneUtility':
      case 'noChatUtility':
        return 'utility';
    }
  }

  actionSum(sourceAction){
    const mods = {
      checkNum: 0,
      checkParts: [],
      effectParts: [],
      cp: null,
      ammo: null
    };
    // Handle Effect
    if (sourceAction.check.type==='noChatAttack' || sourceAction.check.type==='noChatUtility'){
      mods.effectTotal = null;
    }
    else {
      mods.effectParts.push(sourceAction.effect.inherent?sourceAction.effect.inherent:null);
      if (this.actor){
        let abilityScale = sourceAction.effect?.scaleAbility || 1;
        let scaledAbility = Math.floor(this.actor.abilityMod(sourceAction.effect.ability) * abilityScale);
        mods.effectParts.push(scaledAbility ? scaledAbility.signedString() : null);
      }
      if (hasProperty(sourceAction,'effect.mods')){
        for (let [,e] of Object.entries(sourceAction.effect.mods)){
          mods.effectParts.push(e.value ? (e.value.charAt(0) != '-' ? `+${e.value}` : e.value) : null);
        }
      }
      mods.effectTotal = mods.effectParts.filter(part => part != null).join('') || '0';
      if (mods.effectTotal.charAt(0) == '+') mods.effectTotal = mods.effectTotal.substring(1);
    }
    // Handle CP
    mods.cp = sourceAction.cp.inherent?sourceAction.cp.inherent:null;
    if (hasProperty(sourceAction,'cp.mods')){
      for (let [,p] of Object.entries(sourceAction.cp.mods)){
        mods.cp += Number(p.value) || 0;
      }
    }
    // Handle Ammo and CP/Ammo Label
    mods.ammo = sourceAction.ammo?sourceAction.ammo:null;
    let ammoLabel;
    switch (this.type){
      case 'weapon':
        if (this.system.magazine.type==='coolant'){
          ammoLabel = 'Heat';
        }
        else{
          ammoLabel = 'Ammo';
        }
        break;
      case 'object':
        ammoLabel = `Use${mods.ammo!=1?'s':''}`;
        break;
      case 'magic':
        if (this.system.magazine.type==='mental'){
          ammoLabel = 'ML';
        }
        else{
          ammoLabel = `Charge${mods.ammo!=1?'s':''}`;
        }
        break;
    }
    mods.cpAmmoLabel = [(mods.cp?`${mods.cp} CP`:null),(mods.ammo?`${mods.ammo} ${ammoLabel}`:null)].filter(part => part != null).join(', ');
    // Handle Recoil
    if (hasProperty(sourceAction,'recoil')){
      mods.recoil = null;
      mods.reduction = null;
      if (sourceAction.recoil.inherent != null){
        mods.recoil = Math.min(sourceAction.recoil.inherent,0);
        mods.reduction = Math.max(sourceAction.recoil.inherent,0);
      }
      for (let [,r] of Object.entries(sourceAction.recoil.mods)){
        if (r.value > 0){
          mods.reduction += r.value?r.value:null;
        }
        else if (r.value < 0){
          mods.recoil += r.value?r.value:null;
        }
      }
      if (this.actor && (mods.recoil!=null || mods.reduction!=null)){
        if (this.actor.system.stats.recoil.value>0){
          mods.reduction += this.actor.system.stats.recoil.value;
        }
        else if (this.actor.system.stats.recoil.value<0){
          mods.recoil += this.actor.system.stats.recoil.value;
        }
      }
    }
    // Handle Check (general)
    mods.checkNum = Number.isNaN(Number(sourceAction.check.inherent))?0:Number(sourceAction.check.inherent)
    mods.checkParts.push(Number.isNaN(Number(sourceAction.check.inherent))?sourceAction.check.inherent:null)
    if (this.actor) mods.checkNum += this.actor.abilityMod(sourceAction.check.ability);
    if (hasProperty(sourceAction,'check.mods')){
      for (let [,c] of Object.entries(sourceAction.check.mods)){
        if (Number.isNaN(Number(c.value))){
          mods.checkParts.push(c.value?(c.value.charAt(0) != '-'? `+${c.value}`:`${c.value}`):null);
        }
        else {
          mods.checkNum += Number(c.value);
        }
      }
    }
    // Attacks add BAB, and recoil if present
    if (sourceAction.check.type==='melee' || sourceAction.check.type==='ranged' || sourceAction.check.type==='otherAttack'){
      if (this.actor) mods.checkNum += this.actor.system.stats.bab.value;
      if (hasProperty(sourceAction,'recoil')) mods.checkNum += Math.min(mods.recoil+mods.reduction,0);
    }
    //Totals
    // Message Cards and No-Chats have no check modifier
    if (sourceAction.check.type==='noneAttack' || sourceAction.check.type==='noneUtility' || sourceAction.check.type==='noChatUtility' || sourceAction.check.type==='noChatAttack'){
      mods.checkTotal = null;
    }    
    // Skill rolls just pull the skill modifier
    else if (sourceAction.check.type==='skill'){
      if (sourceAction.check.source==''){
        mods.checkTotal = '+0';
      }
      else{
        let skillMod = this?.actor.items.get(sourceAction.check.source)?.skillSum().total;
        mods.checkTotal = !Number.isNaN(skillMod)?skillMod:'-404';
      }
    }
    // Utility Rolls add nothing else
    else {
      mods.checkParts = mods.checkParts.filter(part => part!= null).join('') || null;
      if (mods.checkParts!=null && mods.checkParts.charAt(0) != '+' && mods.checkParts.charAt(0) != '-') mods.checkParts = `+${mods.checkParts}`;
      // If no parts, fall back to number
      if (mods.checkParts===null){
        mods.checkTotal = `${mods.checkNum>=0?'+':''}${mods.checkNum}`
      }
      // If parts and no number, just use parts
      else if (mods.checkNum==0){
        mods.checkTotal = mods.checkParts;
      }
      // otherwise combine both
      else {
        mods.checkTotal = `${mods.checkNum>=0?'+':''}${mods.checkNum}${mods.checkParts}`;
      }
    }
    return mods;
  }

  skillSum(){
    const mods = {
      ability: (this?.actor ? this.actor.abilityMod(this.system.ability) : 0),
      equip: 0,
      syn: 0,
      occ: (this.system.focus == 'double' ? 1 : 0),
      armor: (this.system.armor.active ? (this?.actor ? this.actor.system.stats.armorPenalty.value : null) : null),
      misc: 0
    };
    for (let [,mod] of Object.entries(this.system.mods)){
      if (mod.active) mods[mod.type] += mod.value;
    }
    let labelParts = [
      (this.system.ranks ? `${this.system.ranks} Ranks` : null),
      (mods.ability ? `${mods.ability>=0 ? '+' : ''}${mods.ability} ${this.system.ability.toUpperCase()}` : null),
      (mods.occ ? `${mods.occ>0 ? '+' : ''}${mods.occ} Occupation` : null),
      (mods.equip ? `${mods.equip>0 ? '+' : ''}${mods.equip} Equipment` : null),
      (mods.syn ? `${mods.syn>0 ? '+' : ''}${mods.syn} Synergy` : null),
      (mods.armor ? `${mods.armor>0 ? '+' : ''}${mods.armor} Armor` : null),
      (mods.misc ? `${mods.misc>0 ? '+' : ''}${mods.misc} Misc.` : null)
    ]
    labelParts = labelParts.filter(part => part != null);
    mods.label = labelParts.join(', ') || 'No Modifiers';
    mods.total = this.system.ranks + mods.ability + mods.occ + mods.equip + mods.syn + mods.armor + mods.misc;
    mods.total = mods.total>=0?`+${mods.total}`:mods.total;
    return mods;    
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // let result = await roll.roll({async: true});
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  

  // Pre-creation
  async _preCreate(data, options, user){
    await super._preCreate(data, options, user);
    // Assign default image based on type
    const updates = {};
    if (!hasProperty(data,'system')){
      switch(this.type){
        case 'weapon':
          updates["name"] = this.name.replace('Item','Weapon')
          break;
        case 'armor':
          updates["name"] = this.name.replace('Item','Armor')
          break;
        case 'skill':
          updates["name"] = this.name.replace('Item','Skill')
          break;
        case 'feature':
          updates["name"] = this.name.replace('Item','Feature')
          break;
        case 'magic':
          updates["name"] = this.name.replace('Item','Magic')
          break;
      }
    }
    if (!hasProperty(data,'img')){
      switch(this.type){
        case 'weapon':
          updates["img"] = CONFIG.OATS.weaponIcons[Math.floor(Math.random()*CONFIG.OATS.weaponIcons.length)];
          break;
        case 'armor':
          updates["img"] = CONFIG.OATS.armorIcons[Math.floor(Math.random()*CONFIG.OATS.armorIcons.length)];
          break;
        case 'skill':
          updates["img"] = `systems/opsandtactics/icons/svg/bookshelf.svg`;
          break;
        case 'feature':
          updates["img"] = `systems/opsandtactics/icons/svg/notebook.svg`;
          break;
        case 'magic':
          updates["img"] = `systems/opsandtactics/icons/svg/sparkles.svg`;
          break;
        default:
          updates["img"] = CONFIG.OATS.objectIcons[Math.floor(Math.random()*CONFIG.OATS.objectIcons.length)];
          break;
      }
    }
    if(updates) return this.updateSource(updates);
  }
}
