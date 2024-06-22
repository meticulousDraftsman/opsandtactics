import {OpsAction, Protection, ResourceConsumable, ResourceCartridge, Cartridge, ResourceCoolant, ResourceMagic, ResourceSpacecraft, SkillMod, WeaponAttack, WeaponMod } from "../schema/item-schema.mjs";
import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import {ResourceTransferApp} from "../documents/item.mjs";

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
    // Retrieve base data structure.
    const context = super.getData();

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
    context.enrichDescription = await TextEditor.enrichHTML(systemData.description,{async:true});

    let  magazines;
    let importableMods;
    
    if (itemData.type === 'weapon'){
      magazines = itemData.listMagazines();
      importableMods = await this._wepModImportList();
      // Prep data for addition to the weapon based on the currently-selected mod
      let tempMod = systemData.importMod?.split('|') ?? [null,null,null,null,null,null,null];
      itemData.readyMod = {
        name:(tempMod[0] ? tempMod[0].trim() : 'New Mod'),
        check:(tempMod[1] ? tempMod[1].trim() : null),
        effect:(tempMod[2] ? tempMod[2].trim() : null),
        dice:(tempMod[3] ? tempMod[3].trim() : null),
        recoil:(tempMod[4] ? tempMod[4].trim() : null),
        cp:(tempMod[5] ? tempMod[5].trim() : null),
        description:(tempMod[6] ? tempMod[6].trim() : null),
      }
      // Tally modifiers for each attack
      for(let [key,a] of Object.entries(itemData.system.actions)){
        a.mods = context.item.actionSum(key);
      }
    }
    if (itemData.type === 'armor'){
      magazines = itemData.listMagazines();
    }
    const sourceSkills = [{label:"None",id:""}];
    if (itemData.type === 'object'){
      // Build list of usable object resources or skill items for objects
      magazines = itemData.listMagazines();
      if(actor){
        for (let i of actor.items){
          if (i.type==='skill') sourceSkills.push({label:i.name,id:i.id})
        }
      }
    }
    if (itemData.type==='magic'){
      // Build list of usable object resources for magic
      magazines = itemData.listMagazines();
    }
    let containers = [{name:"Loose",id:"Loose"},{name:"Worn",id:"Worn"},{name:"Carried",id:"Carried"},{name:"Stored",id:"Stored"}];
    if (actor){
      // Build list of potential parent containers for a physical item
      if (actor.type!='character') containers[1].name = "Mounted";
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
    if (hasProperty(systemData,'gear.resources')){
      systemData.gear.hasConsumable = false;
      systemData.gear.hasCartridge = false;
      systemData.gear.hasCoolant = false;
      systemData.gear.hasMagic = false;
      systemData.gear.hasSpacecraft = false;
      systemData.gear.hasGeneric = false;
      for (let res of Object.values(systemData.gear.resources)){
        switch (res.type){
          case 'consumable':
            systemData.gear.hasConsumable = true;
            break;
          case 'cartridge':
            systemData.gear.hasCartridge = true;
            break;
          case 'coolant':
            systemData.gear.hasCoolant = true;
            break;
          case 'magic':
            systemData.gear.hasMagic = true;
            break;
          case 'spacecraft':
            systemData.gear.hasSpacecraft = true;
            break;
          case 'resource':
            systemData.gear.hasGeneric = true;
            break;
        }
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
    if (itemData.type === 'armor'){
      context.magazines = magazines;
    }
    if (itemData.type === 'object'){
      context.sourceSkills = sourceSkills;
      context.magazines = magazines;
    }
    if (itemData.type === 'magic') context.magazines = magazines;

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
    // Transfer bullets to/from internal magazines
    html.find('.mag-load').click(this._onMagLoad.bind(this));
    // Pull a bullet from a loaded magazine into the internal chamber
    html.find('.resource-transfer').click(this._onResourceTransfer.bind(this));
    html.find('.chamber-round').click(this._onChamberRound.bind(this));
    html.find('.attack-edit').click(this._editAttackMod.bind(this));
    html.find('.cartridge-edit').click(this._editCartridge.bind(this));
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
    this.object._selfDestruct()
  }
  _onResourceTransfer(event){
    event.preventDefault()
    const initialID = event.currentTarget.dataset.initialId.split(',');
    new ResourceTransferApp({resourceLeft:[initialID[0],initialID[1]].join(','),resourceRight:'',transfer:1,cp:null},{actor:this.actor?this.actor:undefined,item:this.object}).render(true);
  }

  async _onMagLoad(event){
    event.preventDefault();
    const template = 'systems/opsandtactics/templates/interface/dialog-load-internal.html';
    const content = await renderTemplate(template,{
      magazines: this.object.listMagazines().slice(2)
    });
    const title = `Transfer ammunition from available resources`
    return new Promise(resolve => {
      new Dialog({
        title: title,
        content,
        buttons: {
          transfer: {
            label: "Load this amount from selected resource into weapon",
            callback: html => resolve(this._submitMagLoad(html))
          }
        },
        close: () => resolve(null)
      }).render(true,{width:520});
    });
  }
  async _submitMagLoad(html){
    const form = html[0].querySelector("form");
    if (form.amount.value==="null") return null;
    if (form.chooseMag.value==="") return null;
    if (Number.isNaN(Number(form.amount.value))) return undefined;
    const dualID = form.chooseMag.value.split(',');
    const loadedMag = this.object.actor.items.filter(item => item._id == dualID[0])[0];
    await this.object.update({['system.magazine.value']:(getProperty(this.object,'system.magazine.value')+Number(form.amount.value))});
    await loadedMag.update({[`${dualID[1]}.value`]:(getProperty(loadedMag,`${dualID[1]}.value`)-Number(form.amount.value))});
  }

  async _onChamberRound(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const value = event.shiftKey?-1:1;
    if (this.object.resourceAvailableCheck(value)){
      await this.object.resourceConsume(value);
      await this.object.update({['system.magazine.value']:(getProperty(this.object,'system.magazine.value')+value)});
    }
  }

  async _wepModImportList(){
    const importableMods = {};
    // Parse weapon mods from journal entries in the world
    let worldWepMods = await game.journal.filter(entry => entry.getFlag('opsandtactics','wepMods')==true);
    let strip;
    let entries;
    for (let [,je] of worldWepMods.entries()){
      for (let [,pe] of je.pages.entries()){
        if (pe.type!=='text') continue;
        entries = [];
        strip = new DOMParser().parseFromString(pe.text.content, 'text/html').getElementsByTagName('p');
        for (let i of strip){
          if (i.textContent=='') continue;
          entries.push({label:i.textContent.split('|',1),value:i.textContent})
        }
        if (hasProperty(importableMods,`${pe.name}.entries`)){
          importableMods[pe.name].entries.push(entries)
        }
        else {
          setProperty(importableMods,`${pe.name}.entries`,entries);
          setProperty(importableMods,`${pe.name}.name`,pe.name)
        }
      }
    }
    // Parse weapon mods from journal entries in compendiums
    let journalPacks = game.packs.filter(entry => entry.metadata.type==='JournalEntry');
    for (let jp of journalPacks){
      await jp.getIndex({fields: ['flags']})
      for (let je of jp.index){
        if (getProperty(je,'flags.opsandtactics.wepMods')){
          let jeGot = await jp.getDocument(je._id);
          for (let [,pe] of jeGot.pages.entries()){
            if (pe.type!=='text') continue;
            entries = [];
            strip = new DOMParser().parseFromString(pe.text.content, 'text/html').getElementsByTagName('p');
            for (let i of strip){
              if (i.textContent=='') continue;
              entries.push({label:i.textContent.split('|',1),value:i.textContent})
            }
            if (hasProperty(importableMods,`${pe.name}.entries`)){
              importableMods[pe.name].entries.push(entries)
            }
            else {
              setProperty(importableMods,`${pe.name}.entries`,entries);
              setProperty(importableMods,`${pe.name}.name`,pe.name)
            }
          }
        }
      }
    }
    return importableMods;
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
      case 'skillMods':
        newProp = (new SkillMod).toObject();
        newProp.type = preTarget;
        setProperty(updateData,`system.mods.${randomID(8)}`,newProp);
        break;
      case 'protection':
        setProperty(updateData,`system.protection.${randomID(8)}`,new Protection);
        break;
      case 'attacks':
        newProp = (new WeaponAttack).toObject();
        setProperty(updateData,`system.actions.${randomID(8)}`,newProp);
        break;
      case 'weaponMods':
        newProp = duplicate(this.object.readyMod);
        setProperty(updateData,`system.weaponMods.${randomID(8)}`,newProp);
        setProperty(updateData,'system.importFilter','');
        setProperty(updateData,'system.importMod','');
        break;
      case 'action':
        newProp = (new OpsAction).toObject();
        if (this.object.type==='object') newProp.check.type = 'otherUtility';
        if (this.object.type==='magic') newProp.check.type = 'ranged';
        setProperty(updateData,`system.actions.${randomID(8)}`,newProp)
        break;
      case 'consumable':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,new ResourceConsumable);
        break;
      case 'cartridge':
        newProp = (new ResourceCartridge).toObject();
        newProp.cartridges[randomID(8)] = new Cartridge;
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,newProp);
        break;
      case 'bullet':
        setProperty(updateData,`system.gear.resources.${preTarget}.cartridges.${randomID(8)}`,new Cartridge);
        break;
      case 'coolant':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,new ResourceCoolant);
        break;
      case 'magic':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,new ResourceMagic);
        break;
      case 'spacecraft':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`, new ResourceSpacecraft);
        break;
      case 'resource':
        setProperty(updateData,`system.gear.resources.${randomID(8)}`,{name:null, type:'resource', value:null, max:null});
        break;
    }
    this.object.update(updateData);
  }
  _editAttackMod(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    new AttackEditApp(this.object,{target:preTarget,tabs:[{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial:target}]}).render(true)
  }
  _editCartridge(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    new CartridgeEditApp(this.object,{target:target,resource:preTarget}).render(true)
  }
  _subDeletion(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    const preTarget = dataset?.preTarget;
    const removed = dataset.removeTarget;
    const updateData = {};
    switch(target){
      case 'weaponMods':
        updateData[`system.${target}.-=${removed}`] = null;
        for (let [key,entry] of Object.entries(this.object.system.actions)){
          for (let imp of ['check','effect','dice','recoil','cp']){
            if (hasProperty(entry,`${imp}.mods.${removed}`)) updateData[`system.actions.${key}.${imp}.mods.-=${removed}`] = null;
          }
        }
        break;
      default:
        updateData[`system.${target}.-=${removed}`] = null;
        break;
    }
    this.object.update(updateData);
  }
}

class AttackEditApp extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["opsandtactics", "sheet", "item"],
      template: 'systems/opsandtactics/templates/interface/dialog-attack-edit.html',
      width: 520,
      height: 480,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body"}],
      resizable: true
    });
  }
  get title(){
    return `Editing details for attack '${this.object.system.actions[this.options.target].name}' in ${this.object.name}`;
  }
  getData(){
    const context = {
      OATS: CONFIG.OATS,
      system: this.object.system,
      attack: {
        id: this.options.target,
        object: this.object.system.actions[this.options.target],
        check: {},
        effect: {},
        dice: {},
        recoil: {},
        cp: {}
      } 
    }
    if (getProperty(context,'attack.object.dice.scaleCartridge.bar') > 0) context.attack.object.dice.scaleCartridge.lessBar = context.attack.object.dice.scaleCartridge.bar - 1;
    for (let [key,entry] of Object.entries(this.object.system.weaponMods)){
      for (let imp of ['check','effect','dice','recoil','cp']){
        if ((entry[imp])) context.attack[imp][key] =  {name: entry.name, [imp]: entry[imp], description: entry.description,active:getProperty(this.object,`system.actions.${this.options.target}.${imp}.mods.${key}.active`)};
      }
    }
    for (let [key,entry] of Object.entries(this.object.system.weaponMods)){
      for (let imp of ['check','effect','dice','recoil','cp']){
        if (!(entry[imp])) context.attack[imp][key] =  {name: entry.name, [imp]: null, description: entry.description,active:getProperty(this.object,`system.actions.${this.options.target}.${imp}.mods.${key}.active`)} ;
      }
    }
    return context;
  }
  render(force=false, options={}){
    this.object.apps[this.appId] = this;
    return super.render(force,options)
  }
  close(options={}){
    delete this.object.apps[this.appId]
    return super.close(options)
  }
  async _updateObject(event, formData){
    await this.object.update(formData)
  }
}
class CartridgeEditApp extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['opsandtactics','sheet','item'],
      template: 'systems/opsandtactics/templates/interface/dialog-cartridge-edit.html',
      width: 520,
      height: 380,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      resizable: true
    });
  }
  get title(){
    return `Editing cartridge '${this.object.system.gear.resources[this.options.resource].cartridges[this.options.target].name}' in '${this.object.system.gear.resources[this.options.resource].name}' in ${this.object.name}`;
  }
  getData(){
    const context = {
      OATS: CONFIG.OATS,
      system: this.object.system,
      resource: {
        id: this.options.resource,
        object: this.object.system.gear.resources[this.options.resource]
      },
      cartridge: {
        id: this.options.target,
        object: this.object.system.gear.resources[this.options.resource].cartridges[this.options.target]
      }
    };
    return context;
  }
  render(force=false,options={}){
    this.object.apps[this.appId] = this;
    return super.render(force,options)
  }
  close(options={}){
    delete this.object.apps[this.appId];
    return super.close(options)
  }
  async _updateObject(event, formData){
    for (let [key, entry] of Object.entries(formData)){
      if ((key.includes('stats.check') || key.includes('stats.recoil' || key.includes('stats.error'))) && Number.isNaN(entry)) formData[key] = 0;
      if (entry===null){
        formData[key] = '';
        switch(true){
          case key.includes('stats.check'):
          case key.includes('stats.recoil'):
          case key.includes('stats.error'):
            formData[key] = 0;
            break;
        }
      }
    }
    await this.object.update(formData)
  }
}