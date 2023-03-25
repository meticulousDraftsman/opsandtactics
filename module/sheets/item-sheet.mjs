import { Attack, Protection, SkillMod, WeaponMod } from "../schema/item-schema.mjs";
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
    //console.debug('item-sheet getData')
    // Retrieve base data structure.
    const context = super.getData();
    //console.debug('item-sheet super.getData',context)
    

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
    
    const magazines = [{label:"Unloaded",id:""}];
    const importableMods = {};
    if (itemData.type === 'weapon'){
      if(actor){
        for(let i of actor.items){
          if(i.type === 'magazine' && i.system.magazine.type == itemData.system.magazine.type){
            i.label = actor.items.get(i._id).labelMake();
            magazines.push(i);
          }
        }
      }

      let worldWepMods = game.journal.filter(entry => entry.name==='Weapon Mods');
      for (let [,je] of worldWepMods.entries()){
        for (let [,pe] of je.pages.entries()){
          if (pe.type!=='text') continue;
          let strip = pe.text.content.replaceAll('</p>','[split]');
          let entries = [];
          strip = strip.replace( /(<([^>]+)>)/ig, '');
          strip = strip.split('[split]');
          strip.pop();
          for (let i of strip){
            entries.push({label:i.split(',',1),value:i})
          }
          if (hasProperty(importableMods,`${pe.name}.entries`)){
            importableMods[pe.name].entries.push(entries)
          }
          else {
            setProperty(importableMods,`${pe.name}.entries`,entries);
          }
        }
      }
      
      let tempMod = systemData.importMod.split(',');
      itemData.readyMod = {
        name:(tempMod[0] ? tempMod[0].trim() : 'New Mod'),
        hit:(tempMod[1] ? tempMod[1].trim() : null),
        damage:(tempMod[2] ? tempMod[2].trim() : null),
        recoil:(tempMod[3] ? tempMod[3].trim() : null),
        cp:(tempMod[4] ? tempMod[4].trim() : null),
        description:(tempMod[5] ? tempMod[5].trim() : null),
      }

      for(let [,a] of Object.entries(itemData.system.attacks)){
        a.mods = context.item.attackSum(a);
      }
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

    if (itemData.type === 'skill'){
      itemData.mods = itemData.skillSum();
      itemData.mods.types = {
        equip: 'Equipment',
        misc: 'Miscellaneous',
        occ: 'Occupational',
        syn: 'Synergy'
      }
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.containers = containers;
    if (itemData.type === 'weapon'){
      context.magazines = magazines;
      context.importableMods = importableMods;
      //console.debug(importableMods)
    } 
    if (itemData.type === 'magic') context.sourceMagics = sourceMagics;
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
    // Pull a bullet from a loaded magazine into the internal chamber
    html.find('.chamber-round').click(this._onChamberRound.bind(this));
    // Reset imported mod when changing source filter
    html.find('.filter-select').change(this._onFilterSelect.bind(this));
    // Create/delete sub-properties
    html.find('.sub-create').click(this._subCreation.bind(this));
    html.find('.sub-delete').click(this._subDeletion.bind(this));
    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.item));
  }

  _onChamberRound(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    if (this.actor != null && dataset.loaded != ""){
      const magazine = this.actor.items.get(dataset.loaded);
      const magData = {};
      const wepData = {};
      if(magazine.system.magazine.value>0){
        setProperty(magData,'system.magazine.value',magazine.system.magazine.value-1)
        setProperty(wepData,'system.magazine.value',this.object.system.magazine.value+1)
        magazine.update(magData);
        this.object.update(wepData);
      }
    }
  }

  _onFilterSelect(event){
    event.preventDefault();
    this.object.update({'system.importMod':''});
  }

  _subCreation(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    let systemData;
    let subProperty;
    switch(target){
      case 'resources':
        subProperty = this.object.system.gear[target];
        break;
      default:
        break;
    }
    const updateData = {};
    let mirrorLength;
    let mirrorProperty;
    let newProp;
    switch(target){
        case 'hit':
        case 'damage':
        case 'recoil':
        case 'cp':
        setProperty(updateData,`system.attacks.${preTarget}.${target}.mods.${this.object.system.selectMod}`,{});
        break;
      case 'skillMods':
        newProp = new SkillMod;
        newProp.type = preTarget;
        setProperty(updateData,`system.mods.${randomID(4)}`,newProp);
        break;
      case 'protection':
        setProperty(updateData,`system.protection.${randomID(4)}`,new Protection);
        break;
      case 'attacks':
        setProperty(updateData,`system.attacks.${randomID(4)}`,new Attack);
        break;
      case 'weaponMods':
        newProp = duplicate(this.object.readyMod);
        console.debug(newProp)
        setProperty(updateData,`system.weaponMods.${randomID(4)}`,newProp);
        setProperty(updateData,'system.importFilter','');
        setProperty(updateData,'system.importMod','');
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
        updateTarget = `system.attacks.${preTarget}.${target}.mods.-=${removed}`;
        break;
      case 'skillMods':
        updateTarget = `system.mods.-=${removed}`;
        break;
      case 'protection':
        updateTarget = `system.protection.-=${removed}`;
        break;
      case 'attacks':
        updateTarget = `system.attacks.-=${removed}`;
        break;
      case 'weaponMods':
        updateTarget = `system.weaponMods.-=${removed}`;
        break;
      default:
        systemData = this.object.system;
        updateTarget = "system." + target;
        subProperty = systemData[target];
        subKeys = Object.keys(subProperty);
        break;
    }
    const subLength = subKeys?.length;
    let mirrorLength;
    let newEntry = [];
    const updateData = {};
    switch(target){
      case 'skillMods':
      case 'protection':  
      case 'attacks':
      case 'weaponMods':  
      case 'hit':
      case 'damage':
      case 'recoil':
      case 'cp':
        updateData[updateTarget] = null;
        break;
      case 'resources':
        for(let i=0;i<subLength;i++){
          if(subKeys[i] != removed) newEntry.push(subProperty[subKeys[i]]);
        }
        updateData[updateTarget] = newEntry;
        if(target == 'protection') updateData["system.dr"] = 0;
        break;
    }

    this.object.update(updateData);
  }
}
