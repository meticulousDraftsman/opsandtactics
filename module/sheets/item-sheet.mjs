import {OpsAction, Protection, ResourceConsumable, ResourceCoolant, ResourceMagic, SkillMod, WeaponAttack, WeaponMod } from "../schema/item-schema.mjs";
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
  async getData() {
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
    // Enrich description text
    context.enrichDescription = TextEditor.enrichHTML(systemData.description);
    
    const magazines = [{label:"Unloaded",id:""}];
    const importableMods = {};
    if (itemData.type === 'weapon'){
      // Build list of usable object resources for weapons
      if(actor){
        for(let i of actor.items){
          switch (itemData.system.magazine.type){
            case 'coolant':
              if (getProperty(i,'system.gear.resources')){
                for (let [key,r] of Object.entries(i.system.gear.resources)){
                  if (r.type==='coolant') magazines.push({label:`${r.cool?'Cool':'Hot'} ${r.name?r.name:i.name}${r.value?` [${r.value}]`:''}`,id:`${i.id},system.gear.resources.${key}`});
                }
              }
              break;
            case 'external':
              if (getProperty(i,'system.gear.quantity.available')) magazines.push({label:`${i.name} x${i.system.gear.quantity.value}`,id:`${i.id},system.gear.quantity`});
              if (getProperty(i,'system.gear.resources')){
                for (let [key,r] of Object.entries(i.system.gear.resources)){
                  if (r.type==='consumable' && r.available) magazines.push({label:`${r.name?r.name:i.name} [${r.value?r.value:0}/${r.max?r.max:0}]`,id:`${i.id},system.gear.resources.${key}`});
                }
              }
              break;
          }
        }
      }
      // Parse weapon mods from journal entries in the world
      let worldWepMods = game.journal.filter(entry => entry.name.includes('Weapon Mods'));
      let strip;
      let entries;
      for (let [,je] of worldWepMods.entries()){
        for (let [,pe] of je.pages.entries()){
          if (pe.type!=='text') continue;
          strip = pe.text.content.replaceAll('</p>','[split]');
          entries = [];
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
      // Parse weapon mods from journal entries in compendiums
      let journalPacks = game.packs.filter(entry => entry.metadata.type==='JournalEntry');
      for (let jp of journalPacks){
        for (let je of jp.index){
          if (je.name.includes('Weapon Mods')){
            let jeGot = await jp.getDocument(je._id);
            for (let [,pe] of jeGot.pages.entries()){
              if (pe.type!=='text') continue;
              strip = pe.text.content.replaceAll('</p>','[split]');
              entries = [];
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
        }
      }
      // Prep data for addition to the weapon based on the currently-selected mod
      let tempMod = systemData.importMod.split(',');
      itemData.readyMod = {
        name:(tempMod[0] ? tempMod[0].trim() : 'New Mod'),
        check:(tempMod[1] ? tempMod[1].trim() : null),
        effect:(tempMod[2] ? tempMod[2].trim() : null),
        recoil:(tempMod[3] ? tempMod[3].trim() : null),
        cp:(tempMod[4] ? tempMod[4].trim() : null),
        description:(tempMod[5] ? tempMod[5].trim() : null),
      }
      // Tally modifiers for each attack
      for(let [,a] of Object.entries(itemData.system.actions)){
        a.mods = context.item.actionSum(a);
      }
    }
    const sourceSkills = [{label:"None",id:""}];
    if (itemData.type === 'object'){
      // Build list of usable object resources or skill items for objects
      if(actor){
        for (let i of actor.items){
          if (i.type==='skill') sourceSkills.push({label:i.name,id:i.id})
          if (itemData.system.magazine.type === 'external'){
            if (i.id!=itemData.id){
              if (getProperty(i,'system.gear.quantity.available')) magazines.push({label:`${i.name} x${i.system.gear.quantity.value}`,id:`${i.id},system.gear.quantity`});
              if (getProperty(i,'system.gear.resources')){
                for (let [key,r] of Object.entries(i.system.gear.resources)){
                  if (r.type==='consumable' && r.available) magazines.push({label:`${r.name?r.name:i.name} [${r.value?r.value:0}/${r.max?r.max:0}]`,id:`${i.id},system.gear.resources.${key}`});
                }
              }
            }
          }
        }
      }
      if (itemData.system.magazine.type === 'internal'){
        magazines.push({label:`${itemData.name} x${itemData.system.gear.quantity.value}`,id:`${itemData.id},system.gear.quantity`});
        for (let [key,r] of Object.entries(itemData.system.gear.resources)){
          if (r.type==='consumable') magazines.push({label:`${r.name?r.name:itemData.name} [${r.value?r.value:0}/${r.max?r.max:0}]`,id:`${itemData.id},system.gear.resources.${key}`});
        }
      }
    }
    const sourceMagics = [{name:"None",id:""}];
    if (itemData.type==='magic'){
      // Build list of usable object resources for magic
      if(actor && itemData.system.magazine.type==='external'){
        for(let i of actor.items){
          if(getProperty(i,'system.gear.resources')){
            for (let [key,r] of Object.entries(i.system.gear.resources)){
              if (r.type==='magic') sourceMagics.push({label:`${r.name?r.name:i.name} [${r.value?r.value:0}/${r.max?r.max:0}]`,id:`${i.id},system.gear.resources.${key}`});
            }
          }
        }
      }
    }
    const containers = [{name:"Loose",id:"Loose"},{name:"Worn",id:"Worn"},{name:"Carried",id:"Carried"},{name:"Stored",id:"Stored"}];
    if (actor){
      // Build list of potential parent containers for a physical item
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
    } 
    if (itemData.type === 'object'){
      context.sourceSkills = sourceSkills;
      context.magazines = magazines;
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
    // Toggle bool on click
    html.find('.toggle-value').click(this._onToggleValue.bind(this));
    // Delete Self
    html.find('.self-destruct').click(this._selfDestruct.bind(this));
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

  _onToggleValue(event){
    event.preventDefault();
    const target = event.currentTarget.dataset.target;
    const updateData = {[target]:!getProperty(this.object,target)}
    this.object.update(updateData);
  }

  _selfDestruct(event){
    event.preventDefault();
    Dialog.confirm({
      title: "Delete Confirmation",
      content: "Delete item from owning Actor?",
      yes: () => {this.object.delete()},
      no: () => {},
      defaultYes: true
    });
  }

  _onChamberRound(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    if (this.actor != null && dataset.loaded != ""){
      const dualID = dataset.loaded.split(',');
      const magazine = this.actor.items.get(dualID[0]);
      let targetPath = `${dualID[1]}.value`;
      const magData = {};
      const wepData = {};
      if(getProperty(magazine,targetPath)>0){
        setProperty(magData,targetPath,getProperty(magazine,targetPath)-1)
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

  async _subCreation(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    const updateData = {};
    let newProp;
    switch(target){
      case 'check':
      case 'effect':
      case 'recoil':
      case 'cp':
        if (isEmpty(this.object.system.weaponMods)) return null;
        await this._addAttackMod(updateData,preTarget, target);
        //setProperty(updateData,`system.actions.${preTarget}.${target}.mods.${this.object.system.selectMod}`,{});
        break;
      case 'skillMods':
        newProp = new SkillMod;
        newProp.type = preTarget;
        setProperty(updateData,`system.mods.${randomID(8)}`,newProp);
        break;
      case 'protection':
        setProperty(updateData,`system.protection.${randomID(8)}`,new Protection);
        break;
      case 'attacks':
        newProp = new WeaponAttack;
        newProp.name = 'New Attack';
        newProp.check.type = 'ranged';
        setProperty(updateData,`system.actions.${randomID(8)}`,newProp);
        console.debug(newProp);
        break;
      case 'weaponMods':
        newProp = duplicate(this.object.readyMod);
        setProperty(updateData,`system.weaponMods.${randomID(8)}`,newProp);
        setProperty(updateData,'system.importFilter','');
        setProperty(updateData,'system.importMod','');
        break;
      case 'action':
        newProp = new OpsAction;
        if (this.object.type==='object') newProp.check.type = 'otherUtility';
        if (this.object.type==='magic') newProp.check.type = 'ranged';
        setProperty(updateData,`system.actions.${randomID(8)}`,newProp)
        break;
      case 'consumable':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,new ResourceConsumable);
        break;
      case 'coolant':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,new ResourceCoolant);
        break;
      case 'magic':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,new ResourceMagic);
        break;
      case 'resource':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,{name:null, type:'resource', value:null, max:null});
        break;
    }
    this.object.update(updateData);
  }
  async _addAttackMod(updateData,preTarget,target){
    const template = 'systems/opsandtactics/templates/interface/dialog-wepmod-select.html';
    const content = await renderTemplate(template,{
      type: target,
      wepmods: this.object.system.weaponMods
    });
    let flavor;
    switch (target){
      case 'check':
        flavor = 'to-hit';
        break;
      case 'effect':
        flavor = 'damage';
        break;
      case 'recoil':
        flavor = 'recoil';
        break;
      case 'cp':
        flavor = 'combat point';
        break;        
    }
    const title = `Add ${flavor} mod for ${this.object.system.actions[preTarget].name}`;
    return new Promise(resolve => {
      new Dialog({
        title: title,
        content,
        buttons: {
          add: {
            label: "Add Selected",
            callback: html => resolve(this._submitAttackMod(html,updateData,preTarget,target))
          }
        },
        close: () => resolve(null)
      }).render(true,{width:520});
    });
  }
  async _submitAttackMod(html,updateData,preTarget,target){
    const form = html[0].querySelector("form");
    if (form.chooseMod.value==="null") return null;
    setProperty(updateData,`system.actions.${preTarget}.${target}.mods.${form.chooseMod.value}`,{});
  }
  _subDeletion(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    const removed = dataset.removeTarget;
    const updateData = {};
    let updateTarget;
    switch(target){
      case 'check':
      case 'effect':
      case 'recoil':
      case 'cp':
        updateTarget = `system.actions.${preTarget}.${target}.mods.-=${removed}`;
        break;
      default:
        updateTarget = `system.${target}.-=${removed}`;
        break;
    }
    updateData[updateTarget] = null;
    this.object.update(updateData);
  }
}
