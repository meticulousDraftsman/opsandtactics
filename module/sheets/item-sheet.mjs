import { Attack, Protection, SelectMod, SkillMod, WeaponMod } from "../schema/item-schema.mjs";

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
    // Retrieve base data structure.
    const context = super.getData();

    // Include config in context
    context.OATS = CONFIG.OATS;

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }
    
    //let abilityMod = 0;
    //if (actor) {
    //  abilityMod = actor.system.abilities[itemData.system.ability.type]["mod"] ?? 0;
    //}

    //if (actor){
    //  const actorAbilities = actor.system.abilities;
    //  if (itemData.type == 'skill'){
    //    const abilityMod = actorAbilities[itemData.system.ability.type]["mod"];
    //    console.debug(abilityMod);
    //  }
    //}
    const magazines = [{label:"Unloaded",id:""}];
    if (itemData.type === 'weapon'){
      if(actor){
        for(let i of actor.items){
          if(i.type === 'magazine' && i.system.magazine.type == itemData.system.magazine.type){
            magazines.push(i);
          }
        }
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
  }
  _subCreation(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    let systemData;
    if(target==='resources'){
      systemData = this.object.system.gear;
    }
    else {
      systemData = this.object.system;
    }
    const subProperty = systemData[target];
    const updateData = {};
    let mirrorLength;
    let mirrorProperty;
    switch(target){
      case 'attacks':
        // Create a new attack with enough SelectMods to match the current number of WeaponMods
        mirrorProperty = new Attack;
        mirrorLength = Object.keys(systemData.weaponMods).length;
        for (let i=0;i<mirrorLength;i++){
          mirrorProperty.modSelection.push(new SelectMod);
        }
        subProperty.push(mirrorProperty);
        updateData["system.attacks"] = subProperty;
        break;
      case 'weaponMods':
        // Create a new SelectMod in every current Attack
        subProperty.push(new WeaponMod);
        updateData["system.weaponMods"] = subProperty;
        mirrorLength = Object.keys(systemData.attacks).length;
        for (let i=0;i<mirrorLength;i++){
          mirrorProperty = systemData.attacks[i];
          mirrorProperty.modSelection.push(new SelectMod);
          let updateTarget = "system.attacks."+i;
          updateData[updateTarget] = mirrorProperty;
        }
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
    const removed = dataset.removeTarget;
    let systemData;
    let updateTarget;
    if(target==='resources'){
      systemData = this.object.system.gear;
      updateTarget = "system.gear." + target;
    }
    else {
      systemData = this.object.system;
      updateTarget = "system." + target;
    }
    const subProperty = systemData[target];
    const subKeys = Object.keys(subProperty);
    const subLength = subKeys.length;
    let mirrorLength;
    let newEntry = [];
    const updateData = {};
    switch(target){
      case 'attacks':
      case 'skillMods':
      case 'protection':
      case 'resources':
        for(let i=0;i<subLength;i++){
          if(subKeys[i] != removed) newEntry.push(subProperty[subKeys[i]]);
        }
        updateData[updateTarget] = newEntry;
        if(target == 'protection') updateData["system.dr"] = 0;
        break;
      case 'weaponMods':
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
  }
}
