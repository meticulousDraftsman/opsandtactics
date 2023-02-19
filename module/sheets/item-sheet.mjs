import { Attack, Protection, SelectMod, SkillMod, WeaponMod } from "../schema/item-schema.mjs";
import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class OpsItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["opsandtactics", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body"}]
    });
  }

  /** @override */
  get template() {
    const path = "systems/opsandtactics/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    console.debug('item-sheet getData')
    // Retrieve base data structure.
    const context = super.getData();
    console.debug('item-sheet super.getData',context)
    

    // Include config in context
    context.OATS = CONFIG.OATS;

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;
    const systemData = itemData.system;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    context.effects = prepareActiveEffectCategories(this.item.effects);
    
    const abilityMods ={
      str:0, foc:0, pow:0, dex:0, mrk:0, agi:0, con:0, int:0, wis:0, cha:0
    }
    if(actor){
      abilityMods.str = actor.system.abilities.str.mod;
      abilityMods.foc = actor.system.abilities.str.foc;
      abilityMods.pow = actor.system.abilities.str.pow;
      abilityMods.dex = actor.system.abilities.dex.mod;
      abilityMods.mrk = actor.system.abilities.dex.mrk;
      abilityMods.agi = actor.system.abilities.dex.agi;
      abilityMods.con = actor.system.abilities.con.mod;
      abilityMods.int = actor.system.abilities.int.mod;
      abilityMods.wis = actor.system.abilities.wis.mod;
      abilityMods.cha = actor.system.abilities.cha.mod;
    }

    const magazines = [{label:"Unloaded",id:""}];
    if (itemData.type === 'weapon'){
      if(actor){
        for(let i of actor.items){
          if(i.type === 'magazine' && i.system.magazine.type == itemData.system.magazine.type){
            magazines.push(i);
          }
        }
      }
      for(let i of itemData.system.attacks){
        i.hit.total = i.hit.attack;
        if (i.hit.ability != '') i.hit.total += abilityMods[i.hit.ability];
        for(let j of i.hit.mods){
          i.hit.total += j.value;
        }
        i.damage.total = i.damage.attack;
        if (i.damage.ability != ''){
          if (i.damage.total !='') i.damage.total += '+';
          i.damage.total += Math.floor(abilityMods[i.damage.ability]*i.damage.scaleAbility);
        }
        for(let j of i.damage.mods){
          if (i.damage.total !='') i.damage.total += '+'
          i.damage.total += j.value;
        }
        i.recoil.total = i.recoil.attack;
        for(let j of i.recoil.mods){
          i.recoil.total += j.value;
        }
        if(i.recoil.total==0) i.recoil.total=null;
        i.cp.total = i.cp.attack;
        for(let j of i.cp.mods){
          i.cp.total += j.value;
        }
      }
      
      //for(let i of itemData.system.weaponMods){
      //  wepMods[i.id] = i;
      //}
    }
    const sourceMagics = [{name:"None",id:""}];
    if (itemData.type==='magic'){
      if(actor){
        for(let i of actor.items){
          if(i.type==='magic' && i.system.uses.type==='limited'){
            sourceMagics.push(i);
          }
        }
      }
    }
    const containers = [{name:"Loose",id:"Loose"},{name:"Worn",id:"Worn"},{name:"Carried",id:"Carried"},{name:"Stored",id:"Stored"}];
    if (actor){
      for (let i of actor.items){
        if (i.system.gear?.physical && i._id != this.object._id) {
          containers.push(i);
        }
      }
    }
    //const otherSkills = []
    if (itemData.type === 'skill'){
      if (actor){
        itemData.system.abilityMod = actor.system.abilities[itemData.system.ability].mod;
        itemData.system.armorPenalty = actor.system.armorPenalty;
    //    for (let i of actor.items){
    //      if (i.type === 'skill' && i.id != itemData.id){
    //        otherSkills.push(i);
    //      }
    //    }
      }
      else {
        itemData.system.abilityMod = 0;
      }
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.containers = containers;
    context.magazines = magazines;
    context.sourceMagics = sourceMagics;
    //context.otherSkills = otherSkills;
    //context.abilityMod = abilityMod;

    //console.debug(context);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    // Delete Self
    html.find('.self-destruct').click(ev=>{
      const id = $(ev.currentTarget).attr("self");
      if (this.actor != null){
        this.actor.items.get(id).delete();
      }
    });
    html.find('.sub-create').click(this._subCreation.bind(this));
    html.find('.sub-delete').click(this._subDeletion.bind(this));
    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.item));
  }
  _subCreation(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    console.debug(dataset)
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    let systemData;
    let subProperty;
    switch(target){
      case 'resources':
        subProperty = this.object.system.gear[target];
        break;
      case 'hit':
      case 'damage':
      case 'recoil':
      case 'cp':
        subProperty = this.object.system.attacks;
        break;
      default:
        subProperty = this.object.system[target];
        break;
    }
    const updateData = {};
    let mirrorLength;
    let mirrorProperty;
    switch(target){
      case 'attacks':
        subProperty.push(new Attack);
        updateData["system.attacks"] = subProperty;
        break;
      case 'weaponMods':
        let temp = new WeaponMod;
        temp.id = randomID(8);
        subProperty.push(temp)
        updateData["system.weaponMods"]= subProperty;
        break;
        case 'hit':
        case 'damage':
        case 'recoil':
        case 'cp':
        subProperty[preTarget][target].mods.push({sourceID:this.object.system.selectMod})
        updateData['system.attacks'] = subProperty;
        break;
      case 'skillMods':
        subProperty.push(new SkillMod);
        updateData["system.skillMods"] = subProperty;
        break;
      case 'protection':
        subProperty.push(new Protection);
        updateData["system.protection"] = subProperty;
        break;
      case 'resources':
        subProperty.push({name:null,value:null,max:null});
        updateData["system.gear.resources"] = subProperty;
        break;
    }
    this.object.update(updateData);
  }
  _subDeletion(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    const removed = dataset.removeTarget;
    let systemData;
    let updateTarget;
    let subProperty;
    let subKeys;
    switch(target){
      case 'resources':
        systemData = this.object.system.gear;
        updateTarget = "system.gear." + target;
        subProperty = systemData[target];
        subKeys = Object.keys(subProperty);
        break;
      case 'hit':
      case 'damage':
      case 'recoil':
      case 'cp':
        subProperty = this.object.system.attacks
        updateTarget = 'system.attacks';
        subKeys = Object.keys(subProperty[preTarget][target].mods);
        break;
      default:
        systemData = this.object.system;
        updateTarget = "system." + target;
        subProperty = systemData[target];
        subKeys = Object.keys(subProperty);
        break;
    }
    const subLength = subKeys.length;
    let mirrorLength;
    let newEntry = [];
    const updateData = {};
    switch(target){
      case 'skillMods':
      case 'attacks':
      case 'protection':
      case 'resources':
      case 'weaponMods':
        for(let i=0;i<subLength;i++){
          if(subKeys[i] != removed) newEntry.push(subProperty[subKeys[i]]);
        }
        updateData[updateTarget] = newEntry;
        if(target == 'protection') updateData["system.dr"] = 0;
        break;
      case 'hit':
      case 'damage':
      case 'recoil':
      case 'cp':
        for(let i=0;i<subLength;i++){
          if(subKeys[i] != removed) newEntry.push(subProperty[preTarget][target].mods[subKeys[i]]); 
        }
        subProperty[preTarget][target].mods = newEntry;
        updateData[updateTarget] = subProperty;
        break;
      case 'oldweaponMods':
        // Have to remove matching SelectMod from every current attack
        for(let i=0;i<subLength;i++){
          if(subKeys[i] != removed) newEntry.push(subProperty[subKeys[i]]);
        }
        updateData[updateTarget] = newEntry;
        mirrorLength = Object.keys(systemData.attacks).length;
        for (let j=0;j<mirrorLength;j++){
          newEntry = systemData.attacks[j];
          newEntry.modSelection = [];
          updateTarget = "system.attacks."+j;
          for(let i=0;i<subLength;i++){
            if(subKeys[i] != removed) newEntry.modSelection.push(systemData.attacks[j].modSelection[subKeys[i]]);
          }
          updateData[updateTarget] = newEntry;
        }
        break;
    }

    this.object.update(updateData);
    console.debug(this.object)
  }
}
