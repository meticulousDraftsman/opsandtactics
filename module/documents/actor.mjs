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
    systemData.def.dodge.value = systemData.def.dodge.total;
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
    systemData.def.value = 10 + systemData.def.equip.value + systemData.abilities.dex.agi + systemData.def.size + systemData.def.move + systemData.def.misc + systemData.def.dodge.value;
    systemData.def.touch = 10 + systemData.abilities.dex.agi + systemData.def.size + systemData.def.move + systemData.def.misc + systemData.def.dodge.value;
    systemData.def.flat = 10 + systemData.def.equip.value + systemData.def.size + systemData.def.move + systemData.def.misc;
    // Calculate Saves
    systemData.saves.reflex.value = Math.floor(systemData.saves.reflex.base * systemData.saves.reflex.mult) + systemData.saves.reflex.mods.total + systemData.abilities.dex.agi;
    systemData.saves.fortitude.value = Math.floor(systemData.saves.fortitude.base * systemData.saves.fortitude.mult) + systemData.saves.fortitude.mods.total + systemData.abilities.con.mod;
    systemData.saves.will.value = Math.floor(systemData.saves.will.base * systemData.saves.will.mult) + systemData.saves.will.mods.total + systemData.abilities.wis.mod;
    //Calculate Initiative Modifier
    systemData.stats.init.value = systemData.stats.init.total + systemData.abilities.dex.agi +systemData.stats.wager;
    // Calculate BAB
    systemData.stats.bab.value = systemData.stats.level.value + systemData.stats.bab.total + this.wagerPenalty();
    // Calculate Recoil Reduction
    systemData.stats.recoil.value = systemData.abilities.str.score - 10 + systemData.stats.recoil.total;
    // Calculate Personal Capital    
    systemData.wealth.capital.personal.total = (5*(systemData.stats.level.value+1))+systemData.abilities.cha.score;
    // Calculate Hit Points
    const rollData = this.getRollData({deterministic:true});
    const chpRoll = new Roll(systemData.health.chp.formula,rollData);
    systemData.health.chp.max = chpRoll.isDeterministic ? chpRoll.evaluate({async:false}).total + systemData.health.chp.mods.total : 0;
    const xhpRoll = new Roll(systemData.health.xhp.formula,rollData);
    systemData.health.xhp.max = xhpRoll.isDeterministic ? xhpRoll.evaluate({async:false}).total + systemData.health.xhp.mods.total : 0;
    // Calculate Carrying Capacity
    const carryRoll = new Roll(systemData.stats.carrying.formula,rollData);
    systemData.stats.carrying.light = carryRoll.isDeterministic ? carryRoll.evaluate({async:false}).total + systemData.stats.carrying.mods.total : 0;
    systemData.stats.carrying.medium = systemData.stats.carrying.light*2;
    systemData.stats.carrying.heavy = systemData.stats.carrying.light*3;
    // Calculate Mental Limit
    const mlRoll = new Roll(systemData.ml.formula,rollData);
    systemData.ml.max = mlRoll.isDeterministic ? mlRoll.evaluate({async:false}).total + systemData.ml.mods.total + systemData.ml.temp : 0;
    systemData.magic.mlPsion = systemData.magic.psionFocus?((2*systemData.stats.level.value)+25):0;
    systemData.magic.mlRecipe = ((3*systemData.stats.level.value)+3)*systemData.magic.memorizedSets;
    systemData.magic.mlObject = 0;
    for (let i of this.items){
      if (hasProperty(i,'system.gear.resources')){
        for (let [,r] of Object.entries(i.system.gear.resources)){
          if (r.type==='magic' && r.value>0) systemData.magic.mlObject += r.ml;
        }
      }
    }
    systemData.magic.mlMisc = systemData.magic.mods.total
    systemData.magic.mlUsed = systemData.magic.mlPsion + systemData.magic.mlRecipe + systemData.magic.mlObject + systemData.magic.mlCant + systemData.magic.mlMisc;
  }
  
  async rollActorCheck(checkID,event=undefined){
    const rollData = this.getRollData();
    const rollConfig = {
      actor: this,
      data: rollData,
      flavor: null,
      speaker: ChatMessage.getSpeaker({actor: this}),
      rollMode: game.settings.get('core', 'rollMode'),
      popupSkip: (event && event.shiftKey)
    }
    switch (checkID){
      case 'fortitude':
        rollConfig.title = 'Fortitude Save';
        rollConfig.checkType = 'generic';
        rollConfig.mod = this.system.saves[checkID].value;
        break;
      case 'reflex':
        rollConfig.title = 'Reflex Save';
        rollConfig.checkType = 'reflex';
        rollConfig.mod = this.system.saves[checkID].value;
        break;
      case 'will':
        rollConfig.title = 'Will Save';
        rollConfig.checkType = 'generic';
        rollConfig.mod = this.system.saves[checkID].value;
        break;
      default:
        rollConfig.title = `${game.i18n.localize(CONFIG.OATS.abilities[checkID])} Check`;
        rollConfig.checkType = 'generic';
        rollConfig.mod = this.abilityMod(checkID)
    }
    rollConfig.mod = rollConfig.mod>=0?`+${rollConfig.mod}`:rollConfig.mod;
    const roll = await opsCheck(rollConfig);
    if (roll==null) return null;
    return roll;
  }

  async actorAction(checkID, event=undefined){
    if (((getProperty(this,`system.actions.${checkID}.cost`)*getProperty(this,`system.actions.${checkID}.quantity`)))==0) return;
    let cpCheck = (event && event.ctrlKey)? true : ((this.system.cp.value-(getProperty(this,`system.actions.${checkID}.cost`)*getProperty(this,`system.actions.${checkID}.quantity`))) >= -this.system.cp.temp);
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
    updateData['system.cp.value'] = (this.system.cp.value-(getProperty(this,`system.actions.${checkID}.cost`)*getProperty(this,`system.actions.${checkID}.quantity`)));
    await this.update(updateData);
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
    this.update(actorUpdateData);
    if(!isEmpty(itemUpdateData)) drItem.update(itemUpdateData);
    return report;
  }
  
  async bladePopup(){
    const content = await renderTemplate('systems/opsandtactics/templates/interface/dialog-blades.html');
    return new Promise(resolve => {
      new Dialog({
        title: "Skilled Plas- or Psibladist?",
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

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
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

  // Pre-creation
  async _preCreate(data, options, user){
    await super._preCreate(data, options, user);
    console.debug(data,options,user)
    const characterActions = {
      walking: {
        name: 'Walking and Running (per 5ft)',
        cost: 1,
        quantity: 1
      },
      crouchmove: {
        name: 'Moving while Crouched (per 5ft)',
        cost: 2,
        quantity: 1
      },
      proneclimb: {
        name: 'Moving while Prone; Accelerated Climbing (per 5ft)',
        cost: 3,
        quantity: 1
      },
      fastclimb: {
        name: 'Climbing (per 5ft)',
        cost: 4,
        quantity: 1
      },
      swimming: {
        name: 'Swimming (per 5ft)',
        cost: 5,
        quantity: 1
      },
      unholster: {
        name: 'Draw a weapon from a holster or sheath',
        cost: 3,
        quantity: 1
      },
      unsling: {
        name: 'Unsling or resling a weapon',
        cost: 5,
        quantity: 1
      },
      waistband: {
        name: 'Draw a weapon from Waistband carry',
        cost: 6,
        quantity: 1
      },
      holster: {
        name: 'Holster a weapon',
        cost: 4,
        quantity: 1
      },
      bagging: {
        name: 'Retrieve or store an item in a pocket, bag, or pouch',
        cost: 4,
        quantity: 1
      },
      mollelbe: {
        name: 'Retrieve or store an item in a pocket, bag, or pouch',
        cost: 3,
        quantity: 1
      },
      pickmanip: {
        name: 'Pick up or manipulate an object within reach',
        cost: 3,
        quantity: 1
      },
      dropdrop: {
        name: 'Drop an item or drop to kneeling, sitting, or prone',
        cost: 0,
        quantity: 0
      },
      cyclebow: {
        name: 'Cycle a weapon or reload a bow',
        cost: 1,
        quantity: 1
      },
      standup: {
        name: 'Stand up from kneeling, prone, or sitting',
        cost: 6,
        quantity: 1
      },
      clearjam: {
        name: 'Clear a jammed firearm',
        cost: 12,
        quantity: 1
      },
      crossbow: {
        name: 'Reload a crossbow or speargun',
        cost: 2,
        quantity: 1
      },
      slingtase: {
        name: 'Reload a slingshot, Taser, paintball hopper, or pistol crossbow',
        cost: 3,
        quantity: 1
      },
      tranqload: {
        name: 'Reload a tranquilizer gun',
        cost: 9,
        quantity: 1
      },
      handload: {
        name: 'Reload or unload a weapon, magazine, speedloader, or clip by hand (per round)',
        cost: 3,
        quantity: 1
      },
      magload: {
        name: 'Reload a firearm using a new magazine, speedloader, or clip',
        cost: 4,
        quantity: 1
      },
      beltfed: {
        name: 'Reload a link fed weapon with a new link',
        cost: 6,
        quantity: 1
      },
      clipazine: {
        name: 'Reload a magazine using a clip',
        cost: 3,
        quantity: 1
      },
      blackpowder: {
        name: 'Reload a black powder weapon (per barrel or chamber)',
        cost: 12,
        quantity: 1
      },
      plasdraw: {
        name: 'Draw a plasma blade or psiblade',
        cost: 6,
        quantity: 1
      },
      coolant: {
        name: 'Reload a plasarm, lasarm, elarm, or plasma blade',
        cost: 4,
        quantity: 1
      }
    }
    const updates = {};
    switch (this.type){
      case 'character':
        if (!hasProperty(data,'system')) updates['system.actions'] = characterActions;
        break;
    }
    if(updates) return this.updateSource(updates);
  }

}