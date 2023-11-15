import { opsCheck, opsDamage } from "../opsandtactics.mjs";

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
  }

  prepareDerivedData(){
    
    const itemData = this;
    const systemData = itemData.system;
    if (itemData.type === 'skill') this._prepareSkillData(itemData);
    if (itemData.type === 'weapon') this._prepareWeaponData(itemData);
    if (itemData.type === 'object') this._prepareObjectData(itemData);
    if (itemData.type === 'magic') this._prepareMagicData(itemData);

    if (hasProperty(systemData,'gear.resources')){
      for (let [,entry] of Object.entries(systemData.gear.resources)){
        if (entry.type!='spacecraft') continue;
        entry.hardness.value = entry.hardness.inherent ?? 0;
        switch (entry.damage.type){
          case 'piercing':
            entry.hardness.value += 1;
            break;
          case 'concussion':
            entry.hardness.value += 2;
            break;
        }
      }
    }
  }

  _prepareSkillData(itemData){
    const systemData = itemData.system;
  }
  _prepareWeaponData(itemData){
    const systemData = itemData.system;
    // Map weapon mods values to attacks
    for (let [,a] of Object.entries(systemData.actions)){
      a.type = 'attack';
      if (hasProperty(a,'check.mods')){
        for (let [key,entry] of Object.entries(a.check.mods)){
          if (!entry.active) continue;
          entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
          entry.value = systemData.weaponMods?.[key]?.check ?? null;
         }
      }
      if (hasProperty(a,'effect.mods')){
        for (let [key,entry] of Object.entries(a.effect.mods)){
          if (!entry.active) continue;
          entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
          entry.value = systemData.weaponMods?.[key]?.effect ?? null;
         }
      }
      if (hasProperty(a,'dice.mods')){
        for (let [key,entry] of Object.entries(a.dice.mods)){
          if (!entry.active) continue;
          entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
          entry.value = systemData.weaponMods?.[key]?.dice ?? null;
         }
      }
      if (hasProperty(a,'recoil.mods')){
        for (let [key,entry] of Object.entries(a.recoil.mods)){
          if (!entry.active) continue;
          entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
          entry.value = systemData.weaponMods?.[key]?.recoil ?? null;
         }
      }
      if (hasProperty(a,'cp.mods')){
        for (let [key,entry] of Object.entries(a.cp.mods)){
          if (!entry.active) continue;
          entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
          entry.value = systemData.weaponMods?.[key]?.cp ?? null;
         }
      }
    }
    if (systemData.magazine.type=='cartridge' && systemData.magazine.source!=''){
      let tripleID = systemData.magazine.source.split(',');
      if (this.actor){
        systemData.magazine.loaded = getProperty(this.actor.items.filter(item => item._id == tripleID[0])[0],tripleID[1]+'.'+tripleID[2]);
      }
      else {
        systemData.magazine.loaded = getProperty(this,tripleID[1]+'.'+tripleID[2]);
      }
      
    }
    else {
      systemData.magazine.loaded = {stats:{good:{primary:systemData.damageBase,primaryFlavor:systemData.flavorBase}}};
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

  async rollActionCheck(checkData){
    console.debug(checkData)
    // Check resource consumption and override
    let ammoCheck = (checkData.event && (checkData.event.ctrlKey || checkData.event.altKey))? true : this.resourceAvailableCheck(getProperty(this,`system.actions.${checkData.actionID}.ammo`));
    let cpCheck = (checkData.event && (checkData.event.ctrlKey || checkData.event.altKey))? true : this.actor.cpAvailableCheck(checkData.cp?checkData.cp:this.actionSum(checkData.actionID).cp);
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
    
    const rollConfig = {
      mod: checkData.modifier?checkData.modifier:this.actionSum(checkData.actionID,checkData.tweaks?checkData.tweaks:{}).checkTotal,
      actor: this.actor,
      data: rollData,
      critical: getProperty(this,'system.crit'),
      error: getProperty(this,'system.errorBase') + getProperty(this,'system.magazine.loaded.stats.error'),
      missChance: checkData.missChance,
      title: `${this.name} - ${this.system.actions[checkData.actionID].name}`,
      flavor: getProperty(this,`system.actions.${checkData.actionID}.check.flavor`),
      checkType: getProperty(this,`system.actions.${checkData.actionID}.check.type`),
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      rollMode: game.settings.get('core', 'rollMode'),
    }
    // Execute roll
    const roll = await opsCheck(rollConfig);
    if (roll==null) return null;

    // Perform resource consumption
    if (!(checkData.event && checkData.event.altKey)){
      await this.resourceConsume(getProperty(this,`system.actions.${checkData.actionID}.ammo`));
      await this.actor.attributeConsume('system.cp.value',checkData.cp?checkData.cp:this.actionSum(checkData.actionID).cp);
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
        return ((getProperty(loadedMag,`${dualID[1]}.value`)+cost) <= this.system.magazine.heatBase);
      case 'consumable':
      case 'cartridge':
      case 'magic':
        if (!this.system.magazine.source) return false;
        dualID = this.system.magazine.source.split(',');
        loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
        return ((getProperty(loadedMag,`${dualID[1]}.value`)-cost) >= 0);
    }
  }
  async resourceConsume(cost){
    if (Number(cost)==0) return;
    if (this.system.magazine.type=='coolant') cost = -cost;
    let loadedMag;
    let dualID;
    switch (this.system.magazine.type){
      case 'unlimited':
        break;
      case 'mental':
        await this.actor.update({['system.magic.mlCant']:(this.actor.system.magic.mlCant+cost)});
        break;
      case 'coolant':
      case 'consumable':
      case 'cartridge':
      case 'magic':
        if (!this.system.magazine.source) return;
        dualID = this.system.magazine.source.split(',');
        loadedMag = this.actor.items.filter(item => item._id == dualID[0])[0];
        await loadedMag.update({[`${dualID[1]}.value`]:(getProperty(loadedMag,`${dualID[1]}.value`)-cost)});
        break;
    }
  }

  async attributeConsume(path,cost){
    if (Number(cost)==0) return;
    await this.update({[path]:(getProperty(this,path)-cost)});
  }
  rollDamage(damageData){
    const rollData = this.actor.getRollData();
    const loadedMag = damageData.loaded?damageData.loaded:getProperty(this,'system.magazine.loaded');
    console.debug(loadedMag)
    const rollConfig = {
      rolls: [],
      rollTypes: [],
      actor: this.actor,
      data: rollData,
      title: `${this.name} - ${this.system.actions[damageData.actionID].name}${getProperty(loadedMag,'name')?` - ${loadedMag.name}`:''}`,
      flavor:[`${this.system.actions[damageData.actionID].effect.flavor}`],
      speaker: ChatMessage.getSpeaker({actor:this.actor}),
      rollMode: game.settings.get('core','rollMode')
    }
    const useAmmo = damageData.useAmmo?damageData.useAmmo:getProperty(this,`system.actions.${damageData.actionID}.effect.ammo`)
    if (useAmmo && loadedMag) rollConfig.flavor.push(getProperty(loadedMag,'flavor'))
    const mods = damageData.mods?damageData.mods:this.actionSum(damageData.actionID,damageData.tweaks?damageData.tweaks:{});
    if (damageData.goodBad=='good'){
      if (mods.effectGood.primary){
        rollConfig.rolls.push(mods.effectGood.primary)
        if (useAmmo && loadedMag) rollConfig.rollTypes.push(getProperty(loadedMag,'stats.good.primaryFlavor'));
      }
      if (mods.effectGood.secondary){
        rollConfig.rolls.push(mods.effectGood.secondary)
        rollConfig.rollTypes.push(getProperty(loadedMag,'stats.good.secondaryFlavor'))
      }
      if (mods.effectGood.extra){
        rollConfig.rolls.push(mods.effectGood.extra)
        rollConfig.rollTypes.push('Other');
      }
    }
    else{
      rollConfig.title = rollConfig.title.concat(' (Bad)');
      if (mods.effectBad.primary){
        rollConfig.rolls.push(mods.effectBad.primary)
        rollConfig.rollTypes.push(getProperty(loadedMag,'stats.bad.primaryFlavor'));
      }
      if (mods.effectBad.secondary){
        rollConfig.rolls.push(mods.effectBad.secondary)
        rollConfig.rollTypes.push(getProperty(loadedMag,'stats.bad.secondaryFlavor'))
      }
      if (mods.effectBad.extra){
        rollConfig.rolls.push(mods.effectBad.extra)
        rollConfig.rollTypes.push('Other');
      }
    }
    opsDamage(rollConfig);
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

  actionSum(actionKey,tweaks={}){
    const tweakedThis = mergeObject(this.toObject(false),tweaks);
    const sourceAction = getProperty(tweakedThis,`system.actions.${actionKey}`);
    const mods = {
      checkNum: 0,
      checkParts: [],
      effectParts: [],
      goodBase: {primary:null,secondary:null,extra:null},
      badBase: {primary:null,secondary:null,extra:null},
      effectGood: {primary:null,secondary:null,extra:null},
      effectBad: {primary:null,secondary:null,extra:null},
      cp: null,
      ammo: null
    };
    // Handle Effect
    if (sourceAction.check.type==='noChatAttack' || sourceAction.check.type==='noChatUtility'){
      mods.effectGood = null;
      mods.effectBad = null;
    }
    // If we can't just null it out...
    else {
      // Start with the inherent input from the attack
      if (sourceAction.effect.inherent) mods.effectParts.push(new Roll(`${sourceAction.effect.inherent}`,(this.actor?.getRollData() || {})))
      // Add the actor's ability score if present
      if (this.actor){
        let abilityScale = sourceAction.effect?.scaleAbility || 1;
        let scaledAbility = Math.floor(this.actor.abilityMod(sourceAction.effect.ability) * abilityScale);
        if (scaledAbility!=0) mods.effectParts.push(new Roll(`${scaledAbility}`))
      }
      
      if (this.type=='weapon'){
        // Add each mod with a damage impact on its own
        if (hasProperty(sourceAction,'effect.mods')){
          for (let [,e] of Object.entries(sourceAction.effect.mods)){
            if (e.value && e.active) mods.effectParts.push(new Roll(`${e.value}`))
          }
        }
        // Prepare the base damage both good and bad whatever's present
        // Assign the separately-input flavor to the primary and secondary rolls, leave extra alone
        // Count the total 'base' dice from primary and secondary
        let goodCount = 0;
        let badCount = 0;
        let goodBonus = 0;
        let badBonus = 0;
        if (sourceAction.effect.ammo){
          if (getProperty(tweakedThis,'system.magazine.loaded.stats.good.primary')){
            
            mods.goodBase.primary = new Roll(`${tweakedThis.system.magazine.loaded.stats.good.primary}${getProperty(tweakedThis,'system.magazine.loaded.stats.good.primaryFlavor')?`[${getProperty(tweakedThis,'system.magazine.loaded.stats.good.primaryFlavor')}]`:''}`);
            if (mods.goodBase.primary.terms[0] instanceof Die) goodCount += mods.goodBase.primary.terms[0].number;
          } 
          if (getProperty(tweakedThis,'system.magazine.loaded.stats.good.secondary')){
            
            mods.goodBase.secondary = new Roll(`${tweakedThis.system.magazine.loaded.stats.good.secondary}${getProperty(tweakedThis,'system.magazine.loaded.stats.good.secondaryFlavor')?`[${getProperty(tweakedThis,'system.magazine.loaded.stats.good.secondaryFlavor')}]`:''}`);
            if (mods.goodBase.secondary.terms[0] instanceof Die) goodCount += mods.goodBase.secondary.terms[0].number;
          } 
          if (getProperty(tweakedThis,'system.magazine.loaded.stats.good.extra')){
            
            mods.goodBase.extra = new Roll(tweakedThis.system.magazine.loaded.stats.good.extra);
          }

  
          
          if (getProperty(tweakedThis,'system.magazine.loaded.stats.bad.primary')){
            
            mods.badBase.primary = new Roll(`${tweakedThis.system.magazine.loaded.stats.bad.primary}${getProperty(tweakedThis,'system.magazine.loaded.stats.bad.primaryFlavor')?`[${getProperty(tweakedThis,'system.magazine.loaded.stats.bad.primaryFlavor')}]`:''}`);
            if (mods.badBase.primary.terms[0] instanceof Die) badCount += mods.badBase.primary.terms[0].number;
          } 
          if (getProperty(tweakedThis,'system.magazine.loaded.stats.bad.secondary')){
            
            mods.badBase.secondary = new Roll(`${tweakedThis.system.magazine.loaded.stats.bad.secondary}${getProperty(tweakedThis,'system.magazine.loaded.stats.bad.secondaryFlavor')?`[${getProperty(tweakedThis,'system.magazine.loaded.stats.bad.secondaryFlavor')}]`:''}`);
            if (mods.badBase.secondary.terms[0] instanceof Die) badCount += mods.badBase.secondary.terms[0].number;
          } 
          if (getProperty(tweakedThis,'system.magazine.loaded.stats.bad.extra')){
            
            mods.badBase.extra = new Roll(tweakedThis.system.magazine.loaded.stats.bad.extra);
          } 
          // Dice scaling from attack
          
          
          if (goodCount < getProperty(sourceAction,'dice.scaleCartridge.bar')){
            goodBonus += Number(getProperty(sourceAction,'dice.scaleCartridge.less'));
          }
          else{
            goodBonus += Number(getProperty(sourceAction,'dice.scaleCartridge.more'));
            goodCount -= Number(getProperty(sourceAction,'dice.scaleCartridge.bar'));
            if (goodCount >= Number(getProperty(sourceAction,'dice.scaleCartridge.per')) && getProperty(sourceAction,'dice.scaleCartridge.per')!=0 && getProperty(sourceAction,'dice.scaleCartridge.scale')) goodBonus += Number(getProperty(sourceAction,'dice.scaleCartridge.scale'))*Math.floor(goodCount / Number(getProperty(sourceAction,'dice.scaleCartridge.per')));
          }
          if (Number.isNaN(goodBonus)) goodBonus = 0;      

          
          if (badCount < getProperty(sourceAction,'dice.scaleCartridge.bar')){
            badBonus += Number(getProperty(sourceAction,'dice.scaleCartridge.less'));
          }
          else{
            badBonus += Number(getProperty(sourceAction,'dice.scaleCartridge.more'));
            badCount -= Number(getProperty(sourceAction,'dice.scaleCartridge.bar'));
            if (badCount >= Number(getProperty(sourceAction,'dice.scaleCartridge.per')) && getProperty(sourceAction,'dice.scaleCartridge.per')!=0 && getProperty(sourceAction,'dice.scaleCartridge.scale')) badBonus += Number(getProperty(sourceAction,'dice.scaleCartridge.scale'))*Math.floor(badCount / Number(getProperty(sourceAction,'dice.scaleCartridge.per')));
          }
          if (Number.isNaN(badBonus)) badBonus = 0;    
          // Dice scaling from mods
          if (hasProperty(sourceAction,'dice.mods')){
            for (let [,d] of Object.entries(sourceAction.dice.mods)){
              if (d.value && d.active) {
                goodBonus += d.value;
                badBonus += d.value;
              }
            }
          }
        }
        // Apply bonus dice and dissolve into terms
        if (mods.goodBase.primary){
          mods.goodBase.primary.alter(1,goodBonus);
          mods.goodBase.primary = mods.goodBase.primary.terms;
        } 
        else{
          mods.goodBase.primary = [];
        }
        if (mods.goodBase.secondary){
          mods.goodBase.secondary = mods.goodBase.secondary.terms;
        }
        else{
          mods.goodBase.secondary = [];
        }
        if (mods.goodBase.extra){
          mods.goodBase.extra = mods.goodBase.extra.terms;
        } 
        else{
          mods.goodBase.extra = [];
        }
        if (mods.badBase.primary){
          mods.badBase.primary.alter(1,badBonus);
          mods.badBase.primary = mods.badBase.primary.terms;
        } 
        else{
          mods.badBase.primary = []
        }
        if (mods.badBase.secondary){
          mods.badBase.secondary = mods.badBase.secondary.terms;
        }
        else{
          mods.badBase.secondary = [];
        }
        if (mods.badBase.extra){
          mods.badBase.extra = mods.badBase.extra.terms;
        } 
        else{
          mods.badBase.extra = [];
        }
        
        // Sort attack and mod parts to where they go
        for (let part of mods.effectParts){
          let flavors = [];
          for (let t of part.terms){
            if (t.flavor) flavors.push(t.flavor)
          }
          if (!sourceAction.effect.ammo){
            // If no ammo influence then just put it all in the good primary
            if (!(part.terms[0] instanceof OperatorTerm) && !isEmpty(mods.goodBase.primary)) mods.goodBase.primary.push(new OperatorTerm({operator:'+'}));
            mods.goodBase.primary = mods.goodBase.primary.concat(part.terms);
          }
          // If it only has one flavor, nice and easy
          else if (flavors.length==1){
            // Check if it goes in the primary, then the secondary, and if neither then the extra
            if (flavors[0].toLowerCase()==getProperty(tweakedThis,'system.magazine.loaded.stats.good.primaryFlavor')?.toLowerCase()){
              if (!(part.terms[0] instanceof OperatorTerm)) mods.goodBase.primary.push(new OperatorTerm({operator:'+'}));
              mods.goodBase.primary = mods.goodBase.primary.concat(part.terms);
            }
            else if (flavors[0].toLowerCase()==getProperty(tweakedThis,'system.magazine.loaded.stats.good.secondaryFlavor')?.toLowerCase()){
              if (!(part.terms[0] instanceof OperatorTerm)) mods.goodBase.secondary.push(new OperatorTerm({operator:'+'}));
              mods.goodBase.secondary = mods.goodBase.secondary.concat(part.terms);
            }
            else {
              if (!(part.terms[0] instanceof OperatorTerm) && !isEmpty(mods.goodBase.extra)) mods.goodBase.extra.push(new OperatorTerm({operator:'+'}));
              mods.goodBase.extra = mods.goodBase.extra.concat(part.terms);
            }
            // Same but bad
            if (flavors[0].toLowerCase()==getProperty(tweakedThis,'system.magazine.loaded.stats.bad.primaryFlavor')?.toLowerCase()){
              if (!(part.terms[0] instanceof OperatorTerm)) mods.badBase.primary.push(new OperatorTerm({operator:'+'}));
              mods.badBase.primary = mods.badBase.primary.concat(part.terms);
            }
            else if (flavors[0].toLowerCase()==getProperty(tweakedThis,'system.magazine.loaded.stats.bad.secondaryFlavor')?.toLowerCase()){
              if (!(part.terms[0] instanceof OperatorTerm)) mods.badBase.secondary.push(new OperatorTerm({operator:'+'}));
              mods.badBase.secondary = mods.badBase.secondary.concat(part.terms);
            }
            else {
              if (!(part.terms[0] instanceof OperatorTerm) && !isEmpty(mods.badBase.extra)) mods.badBase.extra.push(new OperatorTerm({operator:'+'}));
              mods.badBase.extra = mods.badBase.extra.concat(part.terms);
            }
          }
          else if (flavors.length==0){
            // If it has no flavor, it goes in the primary
            if (!(part.terms[0] instanceof OperatorTerm)){
              mods.goodBase.primary.push(new OperatorTerm({operator:'+'}));
              mods.badBase.primary.push(new OperatorTerm({operator:'+'}));
            } 
            mods.goodBase.primary = mods.goodBase.primary.concat(part.terms);
            mods.badBase.primary = mods.badBase.primary.concat(part.terms);
          }
          else{
            // If it's flavor-mixed, dump it in the extras
            if (!(part.terms[0] instanceof OperatorTerm) && !isEmpty(mods.goodBase.extra)) mods.goodBase.extra.push(new OperatorTerm({operator:'+'}));
            if (!(part.terms[0] instanceof OperatorTerm) && !isEmpty(mods.badBase.extra)) mods.badBase.extra.push(new OperatorTerm({operator:'+'}));
            mods.goodBase.extra = mods.goodBase.extra.concat(part.terms);
            mods.badBase.extra = mods.badBase.extra.concat(part.terms);
          }
        }
        // Nuke the bad primary if it isn't defined
        if(!getProperty(tweakedThis,'system.magazine.loaded.stats.bad.primary')) mods.badBase.primary = []
        // Nuke the bad extra if there's no bad primary or secondary
        if (isEmpty(mods.badBase.primary) && isEmpty(mods.badBase.secondary)) mods.badBase.extra = [];
        // Turn everything back into rolls and then expressions
        if (!isEmpty(mods.goodBase.primary)){
          mods.effectGood.primary = Roll.fromTerms(mods.goodBase.primary);
          if (sourceAction.effect.ammo){
            mods.effectGood.primaryLabel = [mods.effectGood.primary.terms.reduce((a,b)=>a+b.expression,''),getProperty(tweakedThis,'system.magazine.loaded.stats.good.primaryFlavor')?getProperty(tweakedThis,'system.magazine.loaded.stats.good.primaryFlavor'):''].join(' ');
          }
          else{
            mods.effectGood.primaryLabel = mods.effectGood.primary.formula;
          }          
        } 
        if (!isEmpty(mods.goodBase.secondary)){
          mods.effectGood.secondary = Roll.fromTerms(mods.goodBase.secondary);
          mods.effectGood.secondaryLabel = [mods.effectGood.secondary.terms.reduce((a,b)=>a+b.expression,''),getProperty(tweakedThis,'system.magazine.loaded.stats.good.secondaryFlavor')?getProperty(tweakedThis,'system.magazine.loaded.stats.good.secondaryFlavor'):''].join(' ');
        } 
        if (!isEmpty(mods.goodBase.extra)){
          mods.effectGood.extra = Roll.fromTerms(mods.goodBase.extra);
          mods.effectGood.extraLabel = mods.effectGood.extra.formula;
        } 
        if (!isEmpty(mods.badBase.primary)){
          mods.effectBad.primary = Roll.fromTerms(mods.badBase.primary);
          mods.effectBad.primaryLabel = [mods.effectBad.primary.terms.reduce((a,b)=>a+b.expression,''),getProperty(tweakedThis,'system.magazine.loaded.stats.bad.primaryFlavor')?getProperty(tweakedThis,'system.magazine.loaded.stats.bad.primaryFlavor'):''].join(' ');
        } 
        if (!isEmpty(mods.badBase.secondary)){
          mods.effectBad.secondary = Roll.fromTerms(mods.badBase.secondary);
          mods.effectBad.secondaryLabel = [mods.effectBad.secondary.terms.reduce((a,b)=>a+b.expression,''),getProperty(tweakedThis,'system.magazine.loaded.stats.bad.secondaryFlavor')?getProperty(tweakedThis,'system.magazine.loaded.stats.bad.secondaryFlavor'):''].join(' ');
        } 
        if (!isEmpty(mods.badBase.extra)){
          mods.effectBad.extra = Roll.fromTerms(mods.badBase.extra);
          mods.effectBad.extraLabel = mods.effectBad.extra.formula;
        } 
      }
      // For objects and magic just parse the inherent and ability modifier into the good primary
      if (this.type=='object' || this.type=='magic'){
        mods.goodBase.primary = [];
        for (let part of mods.effectParts){
          if (!(part.terms[0] instanceof OperatorTerm) && !isEmpty(mods.goodBase.primary)) mods.goodBase.primary.push(new OperatorTerm({operator:'+'}));
          mods.goodBase.primary = mods.goodBase.primary.concat(part.terms);
        }
        if (isEmpty(mods.goodBase.primary)){
          mods.effectGood.primary = new Roll('0');
          mods.effectGood.primaryLabel = null;
        }
        else{
          mods.effectGood.primary = Roll.fromTerms(mods.goodBase.primary);
          mods.effectGood.primaryLabel = mods.effectGood.primary.formula;
        }

      }
    }
    // Handle CP
    mods.cp = sourceAction.cp.inherent?Number(sourceAction.cp.inherent):null;
    if (hasProperty(sourceAction,'cp.mods')){
      for (let [,p] of Object.entries(sourceAction.cp.mods)){
        if (p.value && p.active) mods.cp += Number(p.value) || 0;
      }
    }
    // Handle Ammo and CP/Ammo Label
    mods.ammo = sourceAction.ammo?sourceAction.ammo:null;
    let ammoLabel;
    switch (tweakedThis.type){
      case 'weapon':
        if (tweakedThis.system.magazine.type==='coolant'){
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
        if (tweakedThis.system.magazine.type==='mental'){
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
      if (sourceAction.recoil.active){
        if (sourceAction.recoil.inherent != null){
          mods.recoil = Number(Math.min(sourceAction.recoil.inherent,0));
          mods.reduction = Number(Math.max(sourceAction.recoil.inherent,0));
        }
        if (hasProperty(tweakedThis,'system.magazine.loaded.stats.recoil') && sourceAction.recoil.ammo){
          if (tweakedThis.system.magazine.loaded.stats.recoil > 0){
            mods.reduction += tweakedThis.system.magazine.loaded.stats.recoil;
          }
          else if (tweakedThis.system.magazine.loaded.stats.recoil < 0){
            mods.recoil += tweakedThis.system.magazine.loaded.stats.recoil;
          }
        }
        for (let [,r] of Object.entries(sourceAction.recoil.mods)){
          if (r.value > 0 && r.active){
            mods.reduction += r.value?Number(r.value):null;
          }
          else if (r.value < 0 && r.active){
            mods.recoil += r.value?Number(r.value):null;
          }
        }
        if (this.actor && (mods.recoil!=null || mods.reduction!=null)){
          if (getProperty(this.actor,'system.stats.recoil.value')>0){
            mods.reduction += this.actor.system.stats.recoil.value;
          }
          else if (getProperty(this.actor,'system.stats.recoil.value')<0){
            mods.recoil += this.actor.system.stats.recoil.value;
          }
        }
      }
    }
    // Handle Check (general)
    if (sourceAction.check.inherent && Number.isNaN(Number(sourceAction.check.inherent))){
      // If inherent exists and isn't a number, add it to the parts
      mods.checkParts.push(sourceAction.check.inherent)
    }
    else if (sourceAction.check.inherent && !Number.isNaN(Number(sourceAction.check.inherent))){
      // If inherent exists and is a number, add it to num
      mods.checkNum += Number(sourceAction.check.inherent)
    }
    // Ammo Impact
    if (hasProperty(tweakedThis,'system.magazine.loaded.stats.check') && sourceAction.check.ammo) mods.checkNum += Number(tweakedThis.system.magazine.loaded.stats.check);
    // If owned by an actor, add their ability modifier to num
    if (this.actor) mods.checkNum += this.actor.abilityMod(sourceAction.check.ability);
    if (hasProperty(sourceAction,'check.mods')){
      for (let [,c] of Object.entries(sourceAction.check.mods)){
        // If mod isn't active, skip it
        if (!c.active) continue;
        // If mod value exists and isn't a number, add it to parts
        if (c.value && Number.isNaN(Number(c.value))){
          mods.checkParts.push((c.value.charAt(0)=='-' || c.value.charAt(0)=='+') ? `${c.value}` : `+${c.value}`)
        }
        else if (c.value) {
          mods.checkNum += Number(c.value);
        }
      }
    }
    // Attacks add BAB, and recoil if present
    if (sourceAction.check.type==='melee' || sourceAction.check.type==='ranged' || sourceAction.check.type==='otherAttack'){
      if (this.actor) mods.checkNum += Number(getProperty(this.actor,'system.stats.bab.value'));
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

  skillSum(tweaks={}){
    const tweakedThis = mergeObject(this.toObject(false),tweaks);
    const mods = {
      ability: (this?.actor ? this.actor.abilityMod(tweakedThis.system.ability) : 0),
      equip: 0,
      syn: 0,
      occ: (tweakedThis.system.focus == 'double' ? 1 : 0),
      misc: 0
    };
    switch (tweakedThis.system.armor.active){
      case 1:
        mods.armor = getProperty(this,'actor.system.stats.armorNoProf');
        break;
      case 2:
        mods.armor = getProperty(this,'actor.system.stats.armorPenalty.value');
        break;
      default:
        mods.armor = null;
    }
    for (let [,mod] of Object.entries(tweakedThis.system.mods)){
      if (mod.active) mods[mod.type] += Number(mod.value);
    }
    let labelParts = [
      (tweakedThis.system.ranks ? `${Number(tweakedThis.system.ranks)} Ranks` : null),
      (mods.ability ? `${mods.ability>=0 ? '+' : ''}${mods.ability} ${tweakedThis.system.ability.toUpperCase()}` : null),
      (mods.occ ? `${mods.occ>0 ? '+' : ''}${mods.occ} Occupation` : null),
      (mods.equip ? `${mods.equip>0 ? '+' : ''}${mods.equip} Equipment` : null),
      (mods.syn ? `${mods.syn>0 ? '+' : ''}${mods.syn} Synergy` : null),
      (mods.armor ? `${mods.armor>0 ? '+' : ''}${mods.armor} Armor` : null),
      (mods.misc ? `${mods.misc>0 ? '+' : ''}${mods.misc} Misc.` : null)
    ]
    labelParts = labelParts.filter(part => part != null);
    mods.label = labelParts.join(', ') || 'No Modifiers';
    mods.total = Number(tweakedThis.system.ranks) + mods.ability + mods.occ + mods.equip + mods.syn + mods.armor + mods.misc;
    if (Number.isNaN(mods.total)) mods.total = 0;
    mods.total = mods.total>=0?`+${mods.total}`:mods.total;
    return mods;    
  }

  listMagazines(){
    const magazines = {};
    // Unlimited-use and actions that cost ML don't need a magazine list
    if (this.system.magazine.type=='unlimited' || this.system.magazine.type=='mental') return magazines;
    // Magic that uses charges can only look externally and doesn't need to differentiate
    if (this.type=='magic'){
      magazines.entries = [];
      if (this.actor){
        for (let i of this.actor.items){
          if (getProperty(i,'system.gear.resources')){
            for (let [key,entry] of Object.entries(i.system.gear.resources)){
              if (entry.type==='magic') magazines.entries.push({label:`${i.name}: ${entry.name?entry.name:''} [${entry.value?entry.value:0}${entry.max?('/'+entry.max):''}]`,id:`${i.id},system.gear.resources.${key}`});
            }
          }
        }
      }
    }
    // Everything else builds an internal/external list based on what they use
    if (this.system.magazine.insideOut!='external'){
      magazines.internal = {label:'Internal',entries: []};
      switch (this.system.magazine.type){
        case 'consumable':
          if (!hasProperty(this,'system.gear')) break;
          magazines.internal.entries.push({label:`Self x${this.system.gear.quantity.value}`,id:`${this.id},system.gear.quantity`});
          for (let [key, entry] of Object.entries(this.system.gear.resources)){
            if (entry.type==='consumable') magazines.internal.entries.push({label:`${entry.name?entry.name:''} [${entry.value?entry.value:0}${entry.max?('/'+entry.max):''}]`,id:`${this.id},system.gear.resources.${key}`});
          }
          break;
        case 'cartridge':
          for (let [key, entry] of Object.entries(this.system.gear.resources)){
            if (entry.type==='cartridge'){
              for (let [subKey, subEntry] of Object.entries(entry.cartridges)){
                magazines.internal.entries.push({label:`${entry.name?entry.name:''} [${entry.value?entry.value:0}${entry.max?('/'+entry.max):''}] ${subEntry.name?subEntry.name:''}`,id:`${this.id},system.gear.resources.${key},cartridges.${subKey}`});
              }
            }
          }
          break;
        case 'coolant':
          for (let [key, entry] of Object.entries(this.system.gear.resources)){
            if (entry.type==='coolant') magazines.internal.entries.push({label:`${entry.name?entry.name:''} [${entry.value?(entry.value):'Cool'}]`,id:`${this.id},system.gear.resources.${key}`});
          }
          break;
      }
    }
    if (this.actor && this.system.magazine.insideOut!='internal'){
      magazines.external = {label:'External',entries:[]};
      for (let i of this.actor.items){
        if (objectsEqual(this.system,i.system)) continue;
        switch (this.system.magazine.type){
          case 'consumable':
            if (getProperty(i,'system.gear.quantity.available')) magazines.external.entries.push({label:`${i.name} x${i.system.gear.quantity.value}`,id:`${i.id},system.gear.quantity`});
            if (getProperty(i,'system.gear.resources')){
              for (let [key,entry] of Object.entries(i.system.gear.resources)){
                if (entry.type==='consumable' && entry.available) magazines.external.entries.push({label:`${i.name}: ${entry.name?entry.name:''} [${entry.value?entry.value:0}${entry.max?('/'+entry.max):''}]`,id:`${i.id},system.gear.resources.${key}`});
              }
            }
            break;
          case 'cartridge':
            if (getProperty(i,'system.gear.resources')){
              for (let [key, entry] of Object.entries(i.system.gear.resources)){
                if (entry.type==='cartridge' && entry.available){
                  for (let [subKey, subEntry] of Object.entries(entry.cartridges)){
                    magazines.external.entries.push({label:`${i.name}: ${entry.name?entry.name:''} [${entry.value?entry.value:0}${entry.max?('/'+entry.max):''}] ${subEntry.name?subEntry.name:''}`,id:`${i.id},system.gear.resources.${key},cartridges.${subKey}`});
                  }
                }
              }
            }
            break;
          case 'coolant':
            if (getProperty(i,'system.gear.resources')){
              for (let [key,entry] of Object.entries(i.system.gear.resources)){
                if (entry.type==='coolant' && entry.available) magazines.external.entries.push({label:`${i.name}: ${entry.name?entry.name:''} [${entry.value?(entry.value):'Cool'}]`,id:`${i.id},system.gear.resources.${key}`});
              }
            }
            break;
        }
      }
    }
    
    return magazines;
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
        case 'object':
          updates["name"] = this.name.replace('Item','Object')
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
          updates["img"] = CONFIG.OATS.magicIcons[Math.floor(Math.random()*CONFIG.OATS.magicIcons.length)];
          break;
        default:
          updates["img"] = CONFIG.OATS.objectIcons[Math.floor(Math.random()*CONFIG.OATS.objectIcons.length)];
          break;
      }
    }
    if(updates) return this.updateSource(updates);
  }
}
