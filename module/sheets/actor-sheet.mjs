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
    cops:false,
    weapons: false,
    objectAttacks: false,
    magicAttacks:false,
    mental:true,
    resources: true,    
    characterActions: true,
    objectUtility: false,
    magicUtility:false,
    Loose: false,
    Worn: false,
    Carried: false,
    Stored: false,
    unfiltered: true
  }

  /** @override */
  async getData() {
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
      this._prepareCharacterItems(context);
      this._prepareCharacterData(context);
    }
    if (actorData.type == 'vehicle') {
      this._prepareVehicleItems(context);
      this._prepareVehicleData(context);
    }

    context.collapses = this.collapseStates;

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);
    
    // Enrich HTML for editors
    if (hasProperty(context,'system.wealth.description')) context.enrichGear = await TextEditor.enrichHTML(context.system.wealth.description,{async:true});
    if (hasProperty(context,'system.details.biography')) context.enrichBio = await TextEditor.enrichHTML(context.system.details.biography,{async:true});

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  async _prepareCharacterData(context) {
    const systemData = context.system;
    // Determine XP required for the next level
    systemData.stats.level.xp.needed =`${Number(systemData.stats.level.xp.value).toLocaleString()} / ${Number(systemData.stats.level.value*systemData.stats.level.value*1500).toLocaleString()}xp`;
    // Determine number of Incantation Recipes are memorized
    systemData.magic.numRecipes = systemData.magic.invokerMemorize?((3+systemData.abilities.cha.mod)*systemData.stats.level.value):0;
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
  }
  

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(context) {
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
    const nestedGear = {Loose:{children:[],weight:0},Worn:{children:[],weight:0},Carried:{children:[],weight:0},Stored:{children:[],weight:0}};
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

    // Clean up floating point weight and Purge Empty Gear Layers
    for (let [key,layer] of Object.entries(nestedGear)){
      layer.weight = Number(parseFloat(layer.weight).toPrecision(12));
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

  _prepareVehicleData(context) {
    const systemData = context.system;
    // Speed Options
    context.speedList = [
      {value: 0, label: 'Stationary: 0 MPH, +0 / -0'},
      {value: 1, label: 'Observing: 0-15 MPH, +0 / +0'},
      {value: 2, label: 'Cruising: 15-30 MPH, +1 / +0'},
      {value: 3, label: 'Alley: 30-45 MPH, +1 / -1'},
      {value: 4, label: 'Avenue: 45-60 MPH, +2 / -2'},
      {value: 5, label: 'Street: 60-75 MPH, +3 / -4'},
      {value: 6, label: 'Highway: 75-90 MPH, +5 / -6'},
      {value: 7, label: 'All Out: 90-110+ MPH, +7 / -8'}
    ]
    context.topSpeeds = [
      {value: 0, label: 'Top: Stationary'},
      {value: 1, label: 'Top: Observing'},
      {value: 2, label: 'Top: Cruising'},
      {value: 3, label: 'Top: Alley'},
      {value: 4, label: 'Top: Avenue'},
      {value: 5, label: 'Top: Street'},
      {value: 6, label: 'Top: Highway'},
      {value: 7, label: 'Top: All Out'}
    ]
    console.debug(context)
  }

  _prepareVehicleItems(context) {

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
    // Toggle an actor property
    html.find('.actor-toggle').click(this._onActorToggle.bind(this));
    // Roll bleed dice and add them to incoming damage
    html.find('.actor-bleed').click(this._onRollBleed.bind(this));
    // Apply Incoming Damage to Armor or Hit Points
    html.find('.apply-damage').click(this._onApplyDamage.bind(this));
    // Incantation Mental Limit and CP armor loss
    html.find('.property-change').click(this._onPropertyChange.bind(this));
    html.find('.incant-regain').click(this._incantRegain.bind(this));
    // Resource Delta Edits
    html.find('.resource-delta').focus(ev =>{
      ev.preventDefault();
      ev.currentTarget.select();
    });
    html.find('.resource-delta').change(this._onResourceDelta.bind(this));
    // Actor Sheet Rolls
    html.find('.item-check').click(this._actionCheck.bind(this));   
    html.find('.skill-check').click(this._skillCheck.bind(this));   
    html.find('.actor-check').click(this._actorCheck.bind(this));
    // Character Actions
    html.find('.action-spend').click(this._actionSpend.bind(this));
    html.find('.action-create').click(this._actionCreate.bind(this));
    html.find('.action-delete').click(this._actionDelete.bind(this));
    // Character Option Points
    html.find('.create-cop').click(this._copCreate.bind(this));    
    html.find('.delete-cop').click(this._copDelete.bind(this));
    // Context Menu
    html.find('.item-edit').on('contextmenu',this._itemContextMenu.bind(this));
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
    await item.update({[targetProp]:!getProperty(item,targetProp)});
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
  async _onActorToggle(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const targetProp = dataset.targetProp;
    await this.actor.update({[targetProp]:!getProperty(this.actor,targetProp)});
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
  async _onPropertyChange(event){
    event.preventDefault()
    const updateData = {};
    const targetProp = event.currentTarget.dataset.targetProp;
    const change = Number(event.currentTarget.dataset.change);
    updateData[targetProp] = getProperty(this.actor,targetProp)+change;
    await this.actor.update(updateData);
  }
  async _incantRegain(event){
    event.preventDefault();
    const updateData = {['system.magic.mlCant']:Math.max((this.actor.system.magic.mlCant - Math.ceil(this.actor.system.ml.max / 10)),0)}
    await this.actor.update(updateData);
  }
 async _onResourceDelta(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const updateData = {};
    let newVal;
    if (event.target.value.charAt(0)=='='){
      newVal = Number(event.target.value.substr(1));
    }
    else if (event.target.value.charAt(0)=='+' || event.target.value.charAt(0)=='-'){
      newVal = Number(getProperty(this.actor,dataset.target))+Number(event.target.value);
    }
    else {
      newVal = Number(event.target.value)
    }
    if (!Number.isNumeric(newVal)){
      this.render()
      return;
    } 
    setProperty(updateData,dataset.target,Number(newVal));
    await this.actor.update(updateData);
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
    this.actor.rollActorCheck(checkID,event);
  }
  _actionSpend(event){
    event.preventDefault();
    this.actor.actorAction(event.currentTarget.dataset.checkId,event);
  }
  async _actionCreate(event){
    event.preventDefault();
    const updateData = {};
    updateData[`system.actions.${randomID(8)}`] = {name:null,cost:null,quantity:1};
    await this.actor.update(updateData);
  }
  async _actionDelete(event){
    event.preventDefault();
    const updateData = {};
    updateData[`system.actions.-=${event.currentTarget.dataset.target}`] = null;
    await this.actor.update(updateData);
  }
  async _copCreate(event){
    event.preventDefault();
    const updateData = {};
    updateData['system.cops'] = getProperty(this.actor,'system.cops')
    updateData['system.cops'].push({label:`Level ${updateData['system.cops'].length+1}`});
    await this.actor.update(updateData);
  }
  async _copDelete(event){
    event.preventDefault();
    const updateData = {};
    updateData['system.cops'] = getProperty(this.actor,'system.cops')
    updateData['system.cops'].splice(event.currentTarget.dataset.target,1);
    await this.actor.update(updateData);
  }
  _itemContextMenu(event){
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId)
    const dupe = new Dialog({
      title: `Extra options for ${item.name}`,
      content: null,
      buttons:{
        internal :{
          icon: '<i class="fas fa-clone"></i>',
          label: 'Copy in Actor',
          callback: () => {
            Item.createDocuments([item.toObject()],{parent:this.actor});
          }
        },
        external:{
          icon: '<i class="fas fa-file-export"></i>',
          label: 'Copy to World',
          callback: () => {
            Item.createDocuments([item.toObject()]);
          }
        }
      }
    }).render(true);
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
