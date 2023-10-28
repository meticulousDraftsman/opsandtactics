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
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();
    const actorData = context.actor;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    
    context.flags = actorData.flags;
    context.OATS = CONFIG.OATS;
    context.collapses = this.collapseStates;
    
    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareCharacterItems(context);
      this._prepareCharacterData(context);
    }
    if (actorData.type == 'vehicle') {
      this._prepareVehicleItems(context);
      this._prepareVehicleData(context);
    }

    

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.allApplicableEffects());
    
    // Enrich HTML for editors
    if (hasProperty(context,'system.wealth.description')) context.enrichGear = await TextEditor.enrichHTML(context.system.wealth.description,{async:true});
    if (hasProperty(context,'system.details.biography')) context.enrichBio = await TextEditor.enrichHTML(context.system.details.biography,{async:true});
    if (hasProperty(context,'system.vehicle.passengers')) context.enrichPassengers = await TextEditor.enrichHTML(context.system.vehicle.passengers,{async:true});
    if (hasProperty(context,'system.details.cargo')) context.enrichCargo = await TextEditor.enrichHTML(context.system.details.cargo,{async:true});

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
      quantity: {
        label: 'Object Quantity',
        entries: []
      },
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
        label: 'Generic',
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
          context.actor.items.get(i._id).update({"system.gear.location.parent": "Loose"});
        }
        i.children = [];
        gear.push(i);
        gearFail.push(i);
        if(i.system.gear.quantity.available){
          resObjects.quantity.entries.push({value:i.system.gear.quantity.value,available:true,name:i.name,id:`${i._id},system.gear.quantity`,itemId:i._id})
        }
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

       

    // Assign and return
    context.skills = skills;
    context.armors = armors;
    context.weapons = weapons;
    context.gear = gear;
    context.nestedGear = this._nestContainers(gear,gearFail);
    context.traits = traits;
    context.utilityMagic = utilityMagic;
    context.attackMagic = attackMagic;
    context.resObjects = resObjects;
    context.attackObjects = attackObjects;
    context.utilityObjects = utilityObjects;
  }

  _prepareVehicleData(context) {
    const systemData = context.system;
    // Speed Options
    switch(systemData.details.speedUnit){
      case 'mph':
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
        break;
      case 'fps':
        context.speedList = [
          {value: 0, label: 'Stationary: 0 FPS, +0 / -0'},
          {value: 1, label: 'Observing: 0-22 FPS, +0 / +0'},
          {value: 2, label: 'Cruising: 22-44 FPS, +1 / +0'},
          {value: 3, label: 'Alley: 44-66 FPS, +1 / -1'},
          {value: 4, label: 'Avenue: 66-88 FPS, +2 / -2'},
          {value: 5, label: 'Street: 88-110 FPS, +3 / -4'},
          {value: 6, label: 'Highway: 110-132 FPS, +5 / -6'},
          {value: 7, label: 'All Out: 132-161+ FPS, +7 / -8'}
        ]
        break;
      case 'fpr':
        context.speedList = [
          {value: 0, label: 'Stationary: 0 FPR, +0 / -0'},
          {value: 1, label: 'Observing: 0-132 FPR, +0 / +0'},
          {value: 2, label: 'Cruising: 132-264 FPR, +1 / +0'},
          {value: 3, label: 'Alley: 264-396 FPR, +1 / -1'},
          {value: 4, label: 'Avenue: 396-528 FPR, +2 / -2'},
          {value: 5, label: 'Street: 528-660 FPR, +3 / -4'},
          {value: 6, label: 'Highway: 660-792 FPR, +5 / -6'},
          {value: 7, label: 'All Out: 792-968+ FPR, +7 / -8'}
        ]
        break;
    }
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
    // Parse linked crew members
    context.crew = [{value:'generic', label: 'Crew Quality'}]
    context.drivers = [];
    context.attackers = [{value: 'generic', label: `Crew Quality (${systemData.vehicle.crew.generic.attackBase>=0?'+':''}${systemData.vehicle.crew.generic.attackBase})`}];
    context.skillers = [{value: 'generic', label: `Crew Quality (${systemData.vehicle.crew.generic.skillBase>=0?'+':''}${systemData.vehicle.crew.generic.skillBase})`}]
    for (let [key, entry] of Object.entries(systemData.vehicle.crew)) {
      if (key == 'generic') continue;
      let crewDoc = fromUuidSync(entry.uuid);
      entry.listSkills = [];
      for (let i of crewDoc.items){
        if (i.type=='skill') entry.listSkills.push({value:i._id,label:`${i.name} (${i.skillSum().total})`})
      }
    context.crew.push({value:key, uuid:entry.uuid, label:entry.name});
    context.drivers.push({value:entry.uuid, label: `${entry.name} (${entry.init>=0?'+':''}${entry.init})`})
    context.attackers.push({value:key, label: `${entry.name} (${entry.attackBase>=0?'+':''}${entry.attackBase})`})
    context.skillers.push({value:key, label: `${entry.name} (${entry.skillBase})`})
    }
  }

  _prepareVehicleItems(context) {
    const systemData = context.system;
    let gear = [];
    let gearFail = [];
    const resObjects = {
      quantity: {
        label: 'Object Quantity',
        entries: []
      },
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
        label: 'Generic',
        entries: []
      }
    };
    const resOptions = duplicate(resObjects);
    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear
      if(i.system.gear?.physical){
        // If parent ID is invalid and not one of the predefined containers, set it to loose
        if (!context.actor.items.get(i.system.gear.location.parent) && i.system.gear.location.parent != "Loose" && i.system.gear.location.parent != "Worn" && i.system.gear.location.parent != "Carried" && i.system.gear.location.parent != "Stored"){
          context.actor.items.get(i._id).update({"system.gear.location.parent": "Loose"});
        }
        i.children = [];
        gear.push(i);
        gearFail.push(i);

        if(i.system.gear.quantity.available){
          resObjects.quantity.entries.push({value:i.system.gear.quantity.value,available:true,name:i.name,id:`${i._id},system.gear.quantity`,itemId:i._id})
          resOptions.quantity.entries.push({value:i.system.gear.quantity.value,available:true,name:i.name,id:`${i._id},system.gear.quantity`,itemId:i._id})
        }
      }
      // Append to objects-with-resources
      if(!isEmpty(getProperty(i,'system.gear.resources'))){
        for (let [key,res] of Object.entries(i.system.gear.resources)){
          let tempRes = res;
          tempRes.name = `${i.name}${res.name?`: ${res.name}`:''}`
          tempRes.id = `${i._id},system.gear.resources.${key}`
          tempRes.itemId = i._id;
          resObjects[res.type].entries.push(tempRes)
          if (res.type!='consumable' || res?.available) resOptions[res.type].entries.push(tempRes)
        }
      }
    }
    context.gear = gear;
    context.nestedGear = this._nestContainers(gear,gearFail);
    context.resObjects = resObjects;
    context.resOptions = resOptions;
  }

  _nestContainers(gear,gearFail){
    // Crazy Container Nesting
    const locations = ["Loose","Worn","Carried","Stored"];
    // Initialize children of layer 0 items
    const nestedGear = {Loose:{children:[],weight:0,label:"Loose"},Worn:{children:[],weight:0,label:(this.actor.type=='character'?"Worn":"Mounted")},Carried:{children:[],weight:0,label:"Carried"},Stored:{children:[],weight:0,label:"Stored"}};
    for (let layer0 of locations){
      for (let i = 0; i < gear.length; i++){
        if (gear[i].system.gear.location.parent == layer0){
          nestedGear[layer0].children.push(gear[i]);
          nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0) * (gear[i].system.gear.tons?2000:1);
          gearFail[i]=undefined;
        }
      }
    }
    for (let layer0 of locations){
      for (let layer1 of nestedGear[layer0].children){
        for (let i = 0; i < gear.length; i++){
          if (gear[i].system.gear.location.parent == layer1._id){
            layer1.children.push(gear[i]);
            nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0) * (gear[i].system.gear.tons?2000:1);
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
              nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0) * (gear[i].system.gear.tons?2000:1);
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
                nestedGear[layer0].weight += Math.max((gear[i].system.gear.quantity.value * gear[i].system.gear.weight),0) * (gear[i].system.gear.tons?2000:1);
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
        nestedGear.Loose.weight += Math.max((i.system.gear.quantity.value * i.system.gear.weight),0) * (i.system.gear.tons?2000:1);
      }
    }

    // Clean up floating point weight and Purge Empty Gear Layers
    for (let [key,layer] of Object.entries(nestedGear)){
      layer.pounds = layer.weight.toLocaleString()
      layer.tons = (layer.weight / 2000).toLocaleString()
      if (layer.children.length == 0 && key != 'Loose') delete nestedGear[key];
    }
    return nestedGear;
  }

  /** @override */
  render(force=false, options={}){
    if (this.actor.type=='vehicle' && Object.keys(this.actor.system.vehicle.crew).filter(key => key!='generic').length){
      let linked = new Set()
      for (let [key,entry] of Object.entries(this.actor.system.vehicle.crew)){
        if (key=='generic') continue;
        linked.add(entry.uuid)
      }
      for (let i of linked){
        fromUuidSync(i).apps[this.appId] = this;
      }
    }
    return super.render(force, options)
  }
  close(options={}){
    if (this.actor.type=='vehicle' && Object.keys(this.actor.system.vehicle.crew).filter(key => key!='generic').length){
      let linked = new Set()
      for (let [key,entry] of Object.entries(this.actor.system.vehicle.crew)){
        if (key=='generic') continue;
        linked.add(entry.uuid)
      }
      for (let i of linked){
        delete fromUuidSync(i).apps[this.appId];
      }
    }
    return super.close(options)
  }
  async _onDropActor(event, data) {
    super._onDropActor(event, data);
    if (this.actor.type=='vehicle'){
      const dropActor = await fromUuid(data.uuid);
      if (dropActor.pack){
        ui.notifications.warn("Cannot link Compendium actors");
        return false;
      }
      if (dropActor.type!='character'){
        ui.notifications.warn("Linked crew must be a Character");
        return false;
      }
      const updateData = {};
      const charData = {};
      const randKey = randomID(8);
      updateData[`system.vehicle.crew.${randKey}`] = {uuid:data.uuid, note:null, skill:null, attackMisc:null, attackAbility: 'mrk'};
      charData[`system.links.vehicle.${randKey}`] = getProperty(this.actor,'uuid')
      await this.actor.update(updateData);
      await dropActor.update(charData);   
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.actor-edit').click(this._onActorEdit.bind(this));
    html.find('.sheet-refresh').click(() => this.render());
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
    html.find('.vehicle-check').click(this._vehicleCheck.bind(this));
    // Character Actions
    html.find('.action-spend').click(this._actionSpend.bind(this));
    html.find('.action-create').click(this._actionCreate.bind(this));
    html.find('.action-delete').click(this._actionDelete.bind(this));
    // Character Option Points
    html.find('.create-cop').click(this._copCreate.bind(this));    
    html.find('.delete-cop').click(this._copDelete.bind(this));
    // Item Context Menu
    new ContextMenu(html, '.item-context', [
      {
        name: 'Copy inside Actor',
        icon: '<i class="fas fa-clone"></i>',
        callback: event => {
          const item = this.actor.items.get(event[0].dataset.itemId)
          Item.createDocuments([item.toObject()],{parent:this.actor})
        }
      },
      {
        name: 'Copy to World',
        icon: '<i class="fas fa-file-export"></i>',
        callback: event => {
          const item = this.actor.items.get(event[0].dataset.itemId)
          Item.createDocuments([item.toObject()])
        }
      }
    ])
    //html.find('.item-edit').on('contextmenu',this._itemContextMenu.bind(this));
    // Vehicle Crew Linking
    html.find('.crew-link').click(this._onLinkCrew.bind(this));
    html.find('.crew-unlink').click(this._crewUnlink.bind(this));
    html.find('.actor-refresh').click(() => {
      this.actor.prepareData();
      this.render();
    })
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
  async _onActorEdit(event){
    const dataset = event.currentTarget.dataset 
    const uuid = dataset.actorUuid;
    const actor = await fromUuid(uuid);
    actor.sheet.render(true);
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
  _vehicleCheck(event){
    event.preventDefault();
    const checkID = event.currentTarget.dataset.checkId;
    const rollType = event.currentTarget.dataset.rollType;
    this.actor.rollVehicleCheck(checkID,rollType,event);
  }
  _actionSpend(event){
    event.preventDefault();
    this.actor.actorAction(event.currentTarget.dataset.checkId,event);
  }
  async _actionCreate(event){
    event.preventDefault();
    const updateData = {};
    if (this.actor.type == 'character') updateData[`system.actions.${randomID(8)}`] = {
      name:null,
      cost:null,
      quantity:1
    };
    if (this.actor.type == 'vehicle') updateData[`system.actions.${randomID(8)}`] = {
      name:null,
      source: 'generic',
      check: {
        type: 'skill',
        misc: null,
        flavor: null
      },
      effect: {
        misc: null,
        flavor: null
      },
      ammo: {
        cost: null,
        source: '',
        value: null,
        max: null
      },
      cp: 6
    };
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

  async _onLinkCrew(event) {
    event.preventDefault();
    const template = 'systems/opsandtactics/templates/interface/dialog-document-link.html';
    const content = await renderTemplate(template);
    const title = 'Paste actor UUID to link them as vehicle crew (drag-and-drop works too)';
    return new Promise(resolve => {
      new Dialog({
        title: title,
        content,
        buttons:{
          link:{
            label: 'Add actor link to crew list',
            callback: html => resolve(this._submitLinkCrew(html))
          }
        },
        close: () => resolve(null)
      }).render(true,{width:520});
    });
  }
  async _submitLinkCrew(html){
    const form = html[0].querySelector("form");
    const checkLink = await fromUuid(form.idLink.value);
    if (!checkLink) {
      ui.notifications.warn("Invalid UUID");
      return null;
    }
    if (checkLink.pack) {
      ui.notifications.warn("Cannot link Compendium actors");
      return null;
    }
    if (checkLink.type!='character'){
      ui.notifications.warn("Linked crew must be a Character");
      return null;
    }
    const updateData = {};
    const charData = {};
    const randKey = randomID(8);
    updateData[`system.vehicle.crew.${randKey}`] = {uuid:form.idLink.value, note:null, skill:null, attackMisc:null, attackAbility: 'mrk'};
    charData[`system.links.vehicle.${randKey}`] = getProperty(this.actor,'uuid')
    await this.actor.update(updateData);
    await checkLink.update(charData);      
  }
  async _crewUnlink(event){
    event.preventDefault();
    Dialog.confirm({
      title: "Unlink Confirmation",
      content: "Remove linked Actor from crew list?",
      yes: () => this._submitUnlinkCrew(event),
      no: () => {return null},
      defaultYes: true
    });
  }
  async _submitUnlinkCrew(event){
    const checkLink = await fromUuid(getProperty(this.actor,`system.vehicle.crew.${event.currentTarget.dataset.target}.uuid`))
    const updateData = {};
    const charData = {};
    if (hasProperty(this.actor, `system.vehicle.crew.${event.currentTarget.dataset.target}`)){
      updateData[`system.vehicle.crew.-=${event.currentTarget.dataset.target}`] = null;
      if (this.actor.system.stats.init.drive == getProperty(this.actor,`system.vehicle.crew.${event.currentTarget.dataset.target}.uuid`)) updateData['system.stats.init.drive'] = '';
      for (let [key,entry] of Object.entries(this.actor.system.actions)){
        if (entry.source==event.currentTarget.dataset.target) updateData[`system.actions.${key}.source`] = 'generic';
      }
    } 
    if (hasProperty(checkLink, `system.links.vehicle.${event.currentTarget.dataset.target}`)) charData[`system.links.vehicle.-=${event.currentTarget.dataset.target}`] = null;
    await this.actor.update(updateData);
    if (checkLink)await checkLink.update(charData)
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
