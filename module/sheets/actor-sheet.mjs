import { roll3d6 } from "../dice/3d6-roll.mjs";
import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class OpsActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["opsandtactics", "sheet", "actor"],
      template: "systems/opsandtactics/templates/actor/actor-sheet.html",
      width: 700,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "character" }]
    });
  }

  /** @override */
  get template() {
    return `systems/opsandtactics/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  collapseStates = {
    fortitude: true,
    reflex: true,
    will: true,
    weapons: false,
    objectAttacks: false,
    magicAttacks:false,
    mental:true,
    resources: true,    
    objectUtility: false,
    magicUtility:false,
    Loose: false,
    Worn: false,
    Carried: false,
    Stored: false,
    unfiltered: true
  }

  /** @override */
  getData() {
    //console.debug('actor-sheet getData')
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();
    //console.debug('actor-sheet super.getData',context)
    const actorData = context.actor;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      //console.debug(context);
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    context.collapses = this.collapseStates;

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    
    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    const systemData = context.system;
    // Determine XP required for the next level
    systemData.stats.level.xp.needed =`${Number(systemData.stats.level.xp.value).toLocaleString()} / ${Number(systemData.stats.level.value*systemData.stats.level.value*1500).toLocaleString()}xp`;
    // Initiative Wagering Options
    context.wagers = [
      {value:0,label:'Initiative Wagering'},
      {value:1,label:'+1 Init, -1 CP and Atk'},
      {value:2,label:'+2 Init, -3 CP and Atk'},
      {value:3,label:'+3 Init, -6 CP and Atk'},
      {value:4,label:'+4 Init, -10 CP and Atk'},
      {value:5,label:'+5 Init, -15 CP and Atk'}
    ];
    // Check if agility is being limited by armor
    context.agiLimited = ((systemData.abilities.dex.mrk + systemData.abilities.dex.agi)<systemData.abilities.dex.mod)?'agi-limited':'';
    // Enrich Asset Notes and Biography
    context.enrichGear = TextEditor.enrichHTML(systemData.wealth.description);
    context.enrichBio = TextEditor.enrichHTML(systemData.details.biography);
  }
  

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    const systemData = context.system;
    // Initialize containers.
    const skills = [];
    const armors = {
      magic: {
        items: [],
        label: 'Magical Protection',
        icon: 'fas fa-hat-wizard'
      },
      shield: {
        items: [],
        label: 'Plasma Shielding',
        icon: 'fas fa-shield'
      },
      plate: {
        items: [],
        label: 'Armor Plates',
        icon: 'fas fa-box'
      },
      worn: {
        items: [],
        label: 'Worn Armor',
        icon: 'fas fa-vest'
      },
      other: {
        items: [],
        label: 'Other Protection',
        icon: 'fas fa-calculator'
      },
      inactive: {
        items:[],
        label: 'Inactive Protection',
        icon: 'fas fa-expand'
      }
    }
    const weapons = [];
    let gear = [];
    let gearFail = [];
    const traits = [];
    const attackMagic = [];
    const utilityMagic = [];
    const resObjects = {
      consumable: {
        label: 'Consumable',
        entries: []
      },
      coolant: {
        label: 'Coolant',
        entries: []
      },
      magic:  {
        label: 'Magic',
        entries: []
      },
      resource: {
        label: 'General',
        entries: []
      }
    };
    const attackObjects = [];
    const utilityObjects = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append skills.
      if (i.type === 'skill') {
        i.mods = context.actor.items.get(i._id).skillSum();
        skills.push(i);
      }
      // Append armor.
      if (i.type === 'armor') {
        if(i.system.active){
          //console.debug(i.system)
          armors[i.system.layer].items.push(i);
        }
        else{
          armors.inactive.items.push(i);
        }
      }
      // Append weapons.
      if (i.type === 'weapon') {
        for (let [,a] of Object.entries(i.system.actions)){
          a.mods = context.actor.items.get(i._id).actionSum(a);
        }
        if(i.system.magazine.type != 'internal'){
          if(i.system.magazine.source){
              let dualID = i.system.magazine.source.split(',')
              let loadedMag = context.items.filter(item => item._id == dualID[0])[0];
              i.system.magazine.loaded.value = getProperty(loadedMag,`${dualID[1]}.value`);
              i.system.magazine.loaded.max = getProperty(loadedMag,`${dualID[1]}.max`);  
          }
        }
        weapons.push(i);
      }

      // Append to gear
      if(i.system.gear?.physical){
        // If parent ID is invalid and not one of the predefined containers, set it to loose
        if (!context.actor.items.get(i.system.gear.location.parent) && i.system.gear.location.parent != "Loose" && i.system.gear.location.parent != "Worn" && i.system.gear.location.parent != "Carried" && i.system.gear.location.parent != "Stored"){
          //console.debug(i, "dropped")
          context.actor.items.get(i._id).update({"system.gear.location.parent": "Loose"});
        }
        i.children = [];
        gear.push(i);
        gearFail.push(i);
      }
      // Append to features.
      if (i.type === 'feature') {
        traits.push(i);
      }
      // Append to magics.
      if (i.type === 'magic') {
        if (i.system.magazine.type==='external' && i.system.magazine.source){
          let dualID = i.system.magazine.source.split(',')
          let loadedMag = context.items.filter(item => item._id == dualID[0])[0];
          i.system.magazine.value = getProperty(loadedMag,`${dualID[1]}.value`);
          i.system.magazine.max = getProperty(loadedMag,`${dualID[1]}.max`);  
        }
        if(!isEmpty(getProperty(i,'system.actions'))){
          let attackFlag = false;
          for (let [,a] of Object.entries(i.system.actions)){
            a.mods = context.actor.items.get(i._id).actionSum(a);
            if (a.type==='attack' && a.active) attackFlag = true;
          }
          if (attackFlag) attackMagic.push(i);
        }
        utilityMagic.push(i);
      }

      // Append to objects-with-resources
      if(!isEmpty(getProperty(i,'system.gear.resources'))){
        for (let [key,res] of Object.entries(i.system.gear.resources)){
          let tempRes = res;
          tempRes.name = `${i.name}${res.name?`: ${res.name}`:''}`
          tempRes.id = `${i._id},system.gear.resources.${key}`
          tempRes.itemId = i._id;
          resObjects[res.type].entries.push(tempRes)
        }
      }
      // Append to objects-with-attacks and objects-with utility
      if(!isEmpty(getProperty(i,'system.actions')) && i.type==='object'){
        if (i.system.magazine.type != 'unlimited'){
          if(i.system.magazine.source){
            let dualID = i.system.magazine.source.split(',')
            let loadedMag = context.items.filter(item => item._id == dualID[0])[0];
            i.system.magazine.value = getProperty(loadedMag,`${dualID[1]}.value`);
            i.system.magazine.max = getProperty(loadedMag,`${dualID[1]}.max`);  
          }
        }
        let attackFlag = false;
        for (let [,a] of Object.entries(i.system.actions)){
          a.mods = context.actor.items.get(i._id).actionSum(a);
          if (a.type==='attack' && a.active) attackFlag = true;
        }
        if (attackFlag) attackObjects.push(i);
        utilityObjects.push(i);
      }
    }

    // Purge Empty Armor Layers
    for (let [key,layer] of Object.entries(armors)){
      if (layer.items.length==0 && key != 'worn') delete armors[key];
    }    

    // Crazy Container Nesting
    const locations = ["Loose","Worn","Carried","Stored"];
    // Initialize children of layer 0 items
    const nestedGear = {Loose:{children:[],weight:null},Worn:{children:[],weight:null},Carried:{children:[],weight:null},Stored:{children:[],weight:null}};
    for (let layer0 of locations){
      for (let i = 0; i < gear.length; i++){
        if (gear[i].system.gear.location.parent == layer0){
          nestedGear[layer0].children.push(gear[i]);
          nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0);
          gearFail[i]=undefined;
        }
      }
    }
    for (let layer0 of locations){
      for (let layer1 of nestedGear[layer0].children){
        for (let i = 0; i < gear.length; i++){
          if (gear[i].system.gear.location.parent == layer1._id){
            layer1.children.push(gear[i]);
            nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0);
            gearFail[i]=undefined;
          }
        }
      }
    }
    for (let layer0 of locations){
      for (let layer1 of nestedGear[layer0].children){
        for (let layer2 of layer1.children){
          for (let i = 0; i < gear.length; i++){
            if (gear[i].system.gear.location.parent == layer2._id){
              layer2.children.push(gear[i]);
              nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0);
              gearFail[i]=undefined;
            }
          }
        }
      }
    }
    for (let layer0 of locations){
      for (let layer1 of nestedGear[layer0].children){
        for (let layer2 of layer1.children){
          for (let layer3 of layer2.children){
            for (let i = 0; i < gear.length; i++){
              if (gear[i].system.gear.location.parent == layer3._id){
                layer3.children.push(gear[i]);
                nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0);
                gearFail[i]=undefined;
              }
            }
          }
        }
      }
    }
    for (let i of gearFail){
      if (i != undefined){
        nestedGear.Loose.children.push(i);
        nestedGear.Loose.weight += Math.max((i.system.gear.quantity.value * i.system.gear.weight),0);
      }
    }

    // Purge Empty Gear Layers
    for (let [key,layer] of Object.entries(nestedGear)){
      if (layer.children.length == 0 && key != 'Loose') delete nestedGear[key];
    }       

    // Assign and return
    context.skills = skills;
    context.armors = armors;
    context.weapons = weapons;
    context.gear = gear;
    context.nestedGear = nestedGear;
    context.traits = traits;
    context.utilityMagic = utilityMagic;
    context.attackMagic = attackMagic;
    context.resObjects = resObjects;
    context.attackObjects = attackObjects;
    context.utilityObjects = utilityObjects;
    //console.debug(context);
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));
    // Delete Inventory Item
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    // Edit an Item's values from the Actor Sheet
    html.find('.item-input').change(this._onItemInput.bind(this));
    html.find('.item-checkbox').change(this._onItemCheckbox.bind(this));
    html.find('.item-toggle').click(this._onItemToggle.bind(this));
    // Toggle visibility of a collapsible element
    html.find('.collapse-toggle').click(this._onToggleCollapse.bind(this));
    // Roll bleed dice and add them to incoming damage
    html.find('.actor-bleed').click(this._onRollBleed.bind(this));
    // Apply Incoming Damage to Armor or Hit Points
    html.find('.apply-damage').click(this._onApplyDamage.bind(this));
    // Incantation Mental Limit
    html.find('.incant-regain').click(this._incantRegain.bind(this));     
    // Actor Sheet Rolls
    html.find('.item-check').click(this._actionCheck.bind(this));   
    html.find('.skill-check').click(this._skillCheck.bind(this));   
    html.find('.actor-check').click(this._actorCheck.bind(this));
     // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));
    // Generic Rollables
    html.find('.rollable').click(this._onRoll.bind(this));
    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  // Functions for Listeners

  _onItemEdit(event){
    const dataset = event.currentTarget.dataset 
    const id = dataset.itemId;
    const item = this.actor.items.get(id);
    item.sheet.render(true);
  }
  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];
    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }
  async _onItemDelete(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset 
    const list = $(event.currentTarget).parents(".item");
    const id = dataset.itemId;
    const item = this.actor.items.get(id);
    item.delete();
    list.slideUp(200, () => this.render(false));
  }
  async _onItemInput(event){
    const dataset = event.currentTarget.dataset;
    const targetId = dataset.targetId;
    const targetProp = dataset.targetProp;
    let value = event.target.value;
    if (dataset.dtype==='Number') value = Number(value);    
    if (targetId.includes(',')){
      const dualID = targetId.split(',');
      const item = this.actor.items.get(dualID[0]);
      await item.update({[`${dualID[1]}.${targetProp}`]:value});
    }
    else {
      const item = this.actor.items.get(targetId);
      await item.update({[targetProp]:value});
    }
  }
  async _onItemCheckbox(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const targetId = dataset.targetId;
    const targetProp = dataset.targetProp;
    if (targetId.includes(',')){
      const dualID = targetId.split(',');
      const item = this.actor.items.get(dualID[0]);
      await item.update({[`${dualID[1]}.${targetProp}`]:!getProperty(item,`${dualID[1]}.${targetProp}`)})
    }
    else{
      const item = this.actor.items.get(targetId);
      await item.update({[targetProp]:!getProperty(item,targetProp)});
    }
  }
  async _onItemToggle(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const targetId = dataset.targetId;
    const targetProp = dataset.targetProp;
    const item = this.actor.items.get(targetId);
    let value = !getProperty(item, targetProp);
    await item.update({[targetProp]:value});
  }
  _onToggleCollapse(event){
    event.preventDefault();
    const collapseTarget = event.currentTarget.dataset.collapse;
    const wrapper = $(event.currentTarget).parents(`.collapse-parent`);
    const collapser = wrapper.children(`.${collapseTarget}`);
    this._collapse(collapser,collapseTarget)
  }
  _collapse(collapser,collapseTarget){
    const collapseCheck = this.collapseStates[collapseTarget];
    if(collapseCheck){
      collapser.slideDown(250, () =>{
        collapser.removeClass('collapse');
        this.collapseStates[collapseTarget] = false;
      });
    }
    else {
      collapser.slideUp(250, () => {
        collapser.removeClass('collapse');
        this.collapseStates[collapseTarget] = true;
      });
    }
  }
  async _onRollBleed(event){
    event.preventDefault();
    this.actor.rollBleed();
  }
  async _onApplyDamage(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset 
    const report = this.actor.applyDamage(dataset.target,event);
  };
  async _incantRegain(event){
    event.preventDefault();
    const updateData = {['system.magic.mlCant']:Math.max((this.actor.system.magic.mlCant - Math.ceil(this.actor.system.ml.max / 10)),0)}
    this.actor.update(updateData);
  }
  _actionCheck(event){
    event.preventDefault();
    const itemID = event.currentTarget.dataset.itemId;
    const actionID = event.currentTarget.dataset.actionId;
    const item = this.actor.items.get(itemID);
    item.rollActionCheck(actionID,event);
  }
  _skillCheck(event){
    event.preventDefault();
    const itemID = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemID);
    item.rollSkillCheck(event);
  }
  _actorCheck(event){
    event.preventDefault();
    const checkID = event.currentTarget.dataset.checkId;
    this.actor.rollActorCheck(checkID,event)
  }
  async _actorRoll(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset 
    //console.debug(dataset)
    const data= this.actor.getRollData();
    const options={};
    data.flavor = dataset.title;
    if(data.sourceType=='message'){
      data.content=dataset.flavor;
    }
    else{
      if (dataset.flavor!="") data.flavor = `${data.flavor}<br>${dataset.flavor}`
    }
    data.parts = dataset.parts;
    data.sourceType=dataset.type;
    data.rollType = dataset.rollType;
    data.speaker = ChatMessage.getSpeaker({ actor: this.actor });
    options.rollMode = game.settings.get('core', 'rollMode');
    data.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    const rolled = await roll3d6(data);
    if(rolled!=null && rolled?.ammo!=0){
      switch(data.sourceType){
        case 'weaponattack':
        case 'magicuse':
          await this._attackAmmo(dataset,rolled);
      }
    }
  }
  async _attackAmmo(dataset,rolled){
    const weapon = this.actor.items.get(dataset.weapon);
    let magazine = weapon;
    let updateTarget;
    let targetProp;
    if(weapon.type==='weapon'){
      if(dataset.magType!="internal"){
        if(weapon.system.magazine.loaded.source!=""){
          magazine = this.actor.items.get(weapon.system.magazine.loaded.source);
        }
        else {
          return;
        }
      }
      updateTarget = "system.magazine.value";
      targetProp = magazine.system.magazine.value;
    }
    if(weapon.type==='magic'){
      switch(weapon.system.uses.type){
        case 'unlimited':
          return;
        case 'shared':
          if(weapon.system.uses.shared.source!=""){
            magazine=this.actor.items.get(weapon.system.uses.shared.source);
            break;
          }
      }
      updateTarget="system.uses.value";
      targetProp = magazine.system.uses.value;
    }
    let cost = dataset.ammo;
    if(!isNaN(rolled.ammo)) cost = rolled.ammo;
    if(dataset.magType=="coolant") {
      cost = -(cost);
      await magazine.update({"system.coolant.hot":"Hot"});
    }
    targetProp -= cost;
    await magazine.update({[updateTarget]:targetProp});  
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

}
