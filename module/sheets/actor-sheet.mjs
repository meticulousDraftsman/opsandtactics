import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import {ResourceTransferApp} from "../documents/item.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class OpsActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["opsandtactics", "sheet", "actor"],
      template: "systems/opsandtactics/templates/actor/actor-sheet.html",
      width: 700,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "character" }],
      dragDrop: [{dragSelector: [".item-list .item"], dropSelector: null}]
    });
  }

  /** @override */
  get template() {
    return `systems/opsandtactics/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

 /** @override */
  _getSubmitData(updateData = {}) {
    // Skip over ActorSheet#_getSubmitData to allow for editing overridden values in edit mode.
    if (this.collapseStates.edit) return FormApplication.prototype._getSubmitData.call(this, updateData);
    const data = super._getSubmitData(updateData);
    return data;
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
    unfiltered: true,
    skills: false,
    edit: false
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
    if (foundry.utils.hasProperty(context,'system.wealth.description')) context.enrichGear = await TextEditor.enrichHTML(context.system.wealth.description,{async:true});
    if (foundry.utils.hasProperty(context,'system.details.biography')) context.enrichBio = await TextEditor.enrichHTML(context.system.details.biography,{async:true});
    if (foundry.utils.hasProperty(context,'system.vehicle.passengers')) context.enrichPassengers = await TextEditor.enrichHTML(context.system.vehicle.passengers,{async:true});
    if (foundry.utils.hasProperty(context,'system.details.cargo')) context.enrichCargo = await TextEditor.enrichHTML(context.system.details.cargo,{async:true});

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
    const rollData = this.actor.getRollData({deterministic:true});
    // Determine XP required for the next level
    systemData.stats.level.xp.needed =`${Number(systemData.stats.level.xp.value).toLocaleString()} / ${Number(systemData.stats.level.value*systemData.stats.level.value*1500).toLocaleString()}xp`;
    // Display trait formulas with rolldata replaced
    systemData.health.chp.display = Roll.replaceFormulaData(systemData.health.chp.formula,rollData);
    systemData.health.xhp.display = Roll.replaceFormulaData(systemData.health.xhp.formula,rollData);
    systemData.ml.display = Roll.replaceFormulaData(systemData.ml.formula,rollData);
    systemData.stats.carrying.display = Roll.replaceFormulaData(systemData.stats.carrying.formula,rollData);
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
    const skills = {
      double: {
        items: [],
        label: 'Occupational (Double)'
      },
      occupation: {
        items: [],
        label: 'Occupational'
      },
      focus: {
        items: [],
        label: 'Focused'
      },
      default: {
        items: [],
        label: 'Focused (Default)'
      },
      unfocus: {
        items: [],
        label: 'Unfocused'
      }
    };
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
      cartridge: {
        label: 'Cartridge',
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
    for (let i of context.actor.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append skills.
      if (i.type === 'skill') {
        i.mods = context.actor.items.get(i._id).skillSum();
        let target = 'unfocus';
        switch(i.system.focus){
          case 'double':
            if (this.collapseStates.skills){
              target = 'double';
            }
            else {
              target = 'occupation';
            };
            break;
          case 'default':
            if (this.collapseStates.skills){
              target = 'default';
            }
            else {
              target = 'focus';
            }
            break;
          default:
            target = i.system.focus;
        }
        skills[target].items.push(i);
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
        for (let [key,a] of Object.entries(i.system.actions)){
          a.mods = context.actor.items.get(i._id).actionSum(key);
        }
        i.magazines = context.actor.items.get(i._id).listMagazines();
        i.system.error = i.system.errorBase;
        if (foundry.utils.getProperty(i,'system.magazine.loaded.stats.error')) i.system.error += foundry.utils.getProperty(i,'system.magazine.loaded.stats.error');
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
        i.magazines = context.actor.items.get(i._id).listMagazines();
        if(!foundry.utils.isEmpty(foundry.utils.getProperty(i,'system.actions'))){
          let attackFlag = false;
          for (let [key,a] of Object.entries(i.system.actions)){
            a.mods = context.actor.items.get(i._id).actionSum(key);
            if (a.type==='attack' && a.active) attackFlag = true;
          }
          if (attackFlag) attackMagic.push(i);
        }
        utilityMagic.push(i);
      }
      if (i.type === 'object'){
        i.magazines = context.actor.items.get(i._id).listMagazines();
      }

      // Append to objects-with-resources
      if(!foundry.utils.isEmpty(foundry.utils.getProperty(i,'system.gear.resources'))){
        for (let [key,res] of Object.entries(i.system.gear.resources)){
          let tempRes = duplicate(res);
          tempRes.name = `${i.name}${res.name?`: ${res.name}`:''}`
          if (tempRes.type=='cartridge'){
            for (let [,car] of Object.entries(tempRes.cartridges)){
              if (car.name) tempRes.name = tempRes.name.concat(', ',car.name);
            }
          }
          tempRes.id = `${i._id},system.gear.resources.${key}`
          tempRes.itemId = i._id;
          resObjects[res.type].entries.push(tempRes)
        }
      }
      // Append to objects-with-attacks and objects-with utility
      if(!foundry.utils.isEmpty(foundry.utils.getProperty(i,'system.actions')) && i.type==='object'){
        if (i.system.magazine.type != 'unlimited'){
          if(i.system.magazine.source){
            let dualID = i.system.magazine.source.split(',')
            let loadedMag = context.items.filter(item => item._id == dualID[0])[0];
            i.system.magazine.value = foundry.utils.getProperty(loadedMag,`${dualID[1]}.value`);
            i.system.magazine.max = foundry.utils.getProperty(loadedMag,`${dualID[1]}.max`);  
          }
        }
        let attackFlag = false;
        for (let [key,a] of Object.entries(i.system.actions)){
          a.mods = context.actor.items.get(i._id).actionSum(key);
          if (a.type==='attack' && a.active) attackFlag = true;
        }
        if (attackFlag) attackObjects.push(i);
        utilityObjects.push(i);
      }
    }

    // Purge Empty Armor Layers and sort
    for (let [key,layer] of Object.entries(armors)){
      layer.items = layer.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      if (layer.items.length==0 && key != 'worn') delete armors[key];
    }    
    // Purge Empty Skill Layers and sort
    for (let [key,layer] of Object.entries(skills)){
      layer.items = layer.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      if (layer.items.length==0) delete skills[key];
    }    

    // Assign and return
    context.skills = skills;
    context.armors = armors;
    context.weapons = weapons.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.nestedGear = this._nestContainers(gear,gearFail);
    context.traits = traits.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.utilityMagic = utilityMagic.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.attackMagic = attackMagic.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.resObjects = resObjects;
    context.attackObjects = attackObjects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.utilityObjects = utilityObjects.sort((a, b) => (a.sort || 0) - (b.sort || 0));
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
    context.crew = [];
    context.drivers = [];
    context.attackers = [{value: 'generic', label: `Crew Quality (${systemData.stats.bab.value>=0?'+':''}${Number(systemData.stats.bab.value)})`}];
    context.skillers = [{value: 'generic', label: `Crew Quality (${systemData.stats.skillBase>=0?'+':''}${Number(systemData.stats.skillBase)})`}]
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
      cartridge: {
        label: 'Cartridge',
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
    const mounted = [];
    const offense = {
      weapons: [],
      objects: [],
    };
    const utility = [];
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
      if(!foundry.utils.isEmpty(foundry.utils.getProperty(i,'system.gear.resources'))){
        for (let [key,res] of Object.entries(i.system.gear.resources)){
          let tempRes = res;
          tempRes.name = `${i.name}${res.name?`: ${res.name}`:''}`
          tempRes.id = `${i._id},system.gear.resources.${key}`
          tempRes.itemId = i._id;
          resObjects[res.type].entries.push(tempRes)
          if (res.type!='consumable' || res?.available) resOptions[res.type].entries.push(tempRes)
        }
      }
      // Append to offense items
      //if (i.type=='weapon' && !foundry.utils.isEmpty(i.system.actions)) e;
      // Append to utility items
    }
    context.gear = gear;
    context.nestedGear = this._nestContainers(gear,gearFail);
    if (context.nestedGear.Worn){
      for (let i1 of context.nestedGear.Worn.children){
        mounted.push(context.actor.items.get(i1._id))
        for (let i2 of i1?.children){
          mounted.push(context.actor.items.get(i2._id))
          for (let i3 of i2?.children){
            mounted.push(context.actor.items.get(i3._id))
            for (let i4 of i3?.children){
              mounted.push(context.actor.items.get(i4._id))
            }
          }
        }
      }
    }
    // Iterate through mounted items specifically
    for (let i of mounted){
      // Append weapons.
      if (i.type === 'weapon') {
        for (let [key,a] of Object.entries(i.system.actions)){
          a.mods = context.actor.items.get(i._id).actionSum(key);
        }
        i.magazines = context.actor.items.get(i._id).listMagazines();
        i.system.error = i.system.errorBase;
        if (foundry.utils.getProperty(i,'system.magazine.loaded.stats.error')) i.system.error += foundry.utils.getProperty(i,'system.magazine.loaded.stats.error');
        offense.weapons.push(i);
      }
      // Append objects
      if (i.type === 'object'){
        i.magazines = context.actor.items.get(i._id).listMagazines();
        if(!foundry.utils.isEmpty(foundry.utils.getProperty(i,'system.actions'))){
          if (i.system.magazine.type != 'unlimited'){
            if(i.system.magazine.source){
              let dualID = i.system.magazine.source.split(',')
              let loadedMag = context.items.filter(item => item._id == dualID[0])[0];
              i.system.magazine.value = foundry.utils.getProperty(loadedMag,`${dualID[1]}.value`);
              i.system.magazine.max = foundry.utils.getProperty(loadedMag,`${dualID[1]}.max`);  
            }
          }
          let attackFlag = false;
          for (let [key,a] of Object.entries(i.system.actions)){
            a.mods = context.actor.items.get(i._id).actionSum(key);
            if (a.type==='attack' && a.active) attackFlag = true;
          }
          if (attackFlag) offense.objects.push(i);
          utility.push(i);
        }
      }
    }
    context.offense = offense;
    context.utility = utility;
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
      //if (layer.children.length == 0 && key != 'Loose') delete nestedGear[key];
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
  async _onDrop(event){
    super._onDrop(event);
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
      charData[`system.links.vehicle.${randKey}`] = foundry.utils.getProperty(this.actor,'uuid')
      await this.actor.update(updateData);
      await dropActor.update(charData);   
    }
  }
  async _onDropItem(event, data){
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();

    // Handle item sorting within the same Actor
    if ( this.actor.uuid === item.parent?.uuid ) return this._onSortItem(event, itemData);

    // Set category parent if dropping gear onto category
    const dropTarget = event.target.closest("[data-item-id]");
    if (dropTarget && ['Loose','Worn','Carried','Stored'].indexOf(dropTarget.dataset.itemId)>-1 && foundry.utils.getProperty(itemData,'system.gear.physical')) itemData.system.gear.location.parent = dropTarget.dataset.itemId;

    // If item is gear with children, handle all that mess
    if ((event.shiftKey || event.ctrlKey) && foundry.utils.getProperty(item,'system.gear.location.children.length')){
      this._nestedGearDrop(item, dropTarget);
    }
    else {
      // Create the owned item
      return this._onDropItemCreate(itemData);
    }
  }

  async _nestedGearDrop(item1,dropTarget){
    // Original actor from drag source for finding items
    const sourceActor = await fromUuid(item1.parent?.uuid);
    const sourceItems = sourceActor.items;
    // Item data and new created item for parent
    const dataLayer1 = item1.toObject();
    if (dropTarget && ['Loose','Worn','Carried','Stored'].indexOf(dropTarget.dataset.itemId)>-1 && foundry.utils.getProperty(dataLayer1,'system.gear.physical')) dataLayer1.system.gear.location.parent = dropTarget.dataset.itemId;
    const layer1 = await this.actor.createEmbeddedDocuments("Item", [dataLayer1], {render: false});
    // Item, item data, and new created item for first layer of children
    for (let i = 0; i < foundry.utils.getProperty(item1,'system.gear.location.children.length'); i++){
      const item2 = sourceItems.get(item1.system.gear.location.children[i]);
      const dataLayer2 = item2.toObject();
      dataLayer2.system.gear.location.parent = layer1[0]._id;
      const layer2 = await this.actor.createEmbeddedDocuments("Item", [dataLayer2], {render: false});
      // Item, item data, and new created item for second layer of children
      for (let i = 0; i < foundry.utils.getProperty(item2,'system.gear.location.children.length'); i++){
        const item3 = sourceItems.get(item2.system.gear.location.children[i]);
        const dataLayer3 = item3.toObject();
        dataLayer3.system.gear.location.parent = layer2[0]._id;
        const layer3 = await this.actor.createEmbeddedDocuments("Item", [dataLayer3], {render: false});
        // Item, item data, and new created item for third layer of children
        for (let i = 0; i < foundry.utils.getProperty(item3,'system.gear.location.children.length'); i++){
          const item4 = sourceItems.get(item3.system.gear.location.children[i]);
          const dataLayer4 = item4.toObject();
          dataLayer4.system.gear.location.parent = layer3[0]._id;
          await this.actor.createEmbeddedDocuments("Item", [dataLayer4], {render: false});
        }
      }
    }
    this.render()
  }

  async _onSortItem(event, itemData){
    // Get the drag source and drop target
    const items = this.actor.items;
    const source = items.get(itemData._id);
    const dropTarget = event.target.closest("[data-item-id]");
    if ( !dropTarget ) return;
    if (['Loose','Worn','Carried','Stored'].indexOf(dropTarget.dataset.itemId)>-1){
      if (foundry.utils.hasProperty(source, 'system.gear')) await source.update({['system.gear.location.parent']: dropTarget.dataset.itemId});
      return;
    }
    else {
      if (event.shiftKey || event.ctrlKey){
        const target = items.get(dropTarget.dataset.itemId);
        // Don't nest if both items aren't physical
        if (!foundry.utils.hasProperty(source, 'system.gear') || !foundry.utils.hasProperty(target,'system.gear')) return;
        // Don't self-nest
        if (source.id === target.id) return;
        // Set drop target as container parent
        await source.update({['system.gear.location.parent']: target.id});
      }
      else {
        super._onSortItem(event,itemData);
      }
      
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
    html.find('.resource-transfer').click(this._onResourceTransfer.bind(this));
    // Toggle visibility of a collapsible element
    html.find('.collapse-toggle').click(this._onToggleCollapse.bind(this));
    html.find('.verbose-toggle').click(this._onToggleVerbose.bind(this));
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
    html.find('.item-attack-dash').click(this._onAttackDash.bind(this));
    html.find('.item-utility-dash').click(this._onUtilityDash.bind(this));
    html.find('.actor-action-dash').click(this._onActionDash.bind(this));
    html.find('.damage-roll').click(this._damageRoll.bind(this));
    html.find('.skill-check').click(this._skillCheck.bind(this));   
    html.find('.actor-check').click(this._actorCheck.bind(this));
    html.find('.vehicle-check').click(this._vehicleCheck.bind(this));
    // Character Actions
    html.find('.action-spend').click(this._actionSpend.bind(this));
    html.find('.action-create').click(this._actionCreate.bind(this));
    html.find('.action-delete').click(this._actionDelete.bind(this));
    // Trait Editing
    html.find('.trait-edit').click(this._editTrait.bind(this));
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
      },
      {
        name: 'Delete',
        icon: '<i class="fas fa-trash"></i>',
        callback: event => {
          const item = this.actor.items.get(event[0].dataset.itemId)
          item._selfDestruct();
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
      await item.update({[`${dualID[1]}.${targetProp}`]:!foundry.utils.getProperty(item,`${dualID[1]}.${targetProp}`)})
    }
    else{
      const item = this.actor.items.get(targetId);
      await item.update({[targetProp]:!foundry.utils.getProperty(item,targetProp)});
    }
  }
  async _onItemToggle(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const targetId = dataset.targetId;
    const targetProp = dataset.targetProp;
    const item = this.actor.items.get(targetId);
    await item.update({[targetProp]:!foundry.utils.getProperty(item,targetProp)});
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
  _onToggleVerbose(event){
    event.preventDefault();
    const verboseTarget = event.currentTarget.dataset.verbose;
    this.collapseStates[verboseTarget] = !this.collapseStates[verboseTarget];
    this.render();
  }
  async _onActorToggle(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const targetProp = dataset.targetProp;
    await this.actor.update({[targetProp]:!foundry.utils.getProperty(this.actor,targetProp)});
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
    updateData[targetProp] = foundry.utils.getProperty(this.actor,targetProp)+change;
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
      newVal = Number(foundry.utils.getProperty(this.actor,dataset.target))+Number(event.target.value);
    }
    else {
      newVal = Number(event.target.value)
    }
    if (!Number.isNumeric(newVal)){
      this.render()
      return;
    } 
    foundry.utils.setProperty(updateData,dataset.target,Number(newVal));
    await this.actor.update(updateData);
  }
  _actionCheck(event){
    event.preventDefault();
    const itemID = event.currentTarget.dataset.itemId;
    const actionID = event.currentTarget.dataset.actionId;
    const item = this.actor.items.get(itemID);
    item.rollActionCheck(actionID,event);
  }
  _damageRoll(event){
    event.preventDefault();
    const itemID = event.currentTarget.dataset.itemId;
    const actionID = event.currentTarget.dataset.actionId;
    const goodBad = event.currentTarget.dataset.goodBad;
    const item = this.actor.items.get(itemID);
    item.rollDamage({actionID:actionID,goodBad:goodBad,event:event,loaded:false});
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
  _editTrait(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const target = dataset.targetName;
    console.debug(this.object)
    new TraitEditApp(this.object,{target:target}).render(true)
  }
  async _copCreate(event){
    event.preventDefault();
    const updateData = {};
    updateData['system.cops'] = foundry.utils.getProperty(this.actor,'system.cops')
    updateData['system.cops'].push({label:`Level ${updateData['system.cops'].length+1}`});
    await this.actor.update(updateData);
  }
  async _copDelete(event){
    event.preventDefault();
    const updateData = {};
    updateData['system.cops'] = foundry.utils.getProperty(this.actor,'system.cops')
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
    charData[`system.links.vehicle.${randKey}`] = foundry.utils.getProperty(this.actor,'uuid')
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
    const checkLink = await fromUuid(foundry.utils.getProperty(this.actor,`system.vehicle.crew.${event.currentTarget.dataset.target}.uuid`))
    const updateData = {};
    const charData = {};
    if (foundry.utils.hasProperty(this.actor, `system.vehicle.crew.${event.currentTarget.dataset.target}`)){
      updateData[`system.vehicle.crew.-=${event.currentTarget.dataset.target}`] = null;
      if (this.actor.system.stats.init.drive == foundry.utils.getProperty(this.actor,`system.vehicle.crew.${event.currentTarget.dataset.target}.uuid`)) updateData['system.stats.init.drive'] = '';
      for (let [key,entry] of Object.entries(this.actor.system.actions)){
        if (entry.source==event.currentTarget.dataset.target) updateData[`system.actions.${key}.source`] = 'generic';
      }
    } 
    if (foundry.utils.hasProperty(checkLink, `system.links.vehicle.${event.currentTarget.dataset.target}`)) charData[`system.links.vehicle.-=${event.currentTarget.dataset.target}`] = null;
    await this.actor.update(updateData);
    if (checkLink)await checkLink.update(charData)
  }

  _onAttackDash(event){
    event.preventDefault();
    const itemID = event.currentTarget.dataset.itemId;
    const actionID = event.currentTarget.dataset.actionId;
    const item = this.actor.items.get(itemID);
    const tweaks = {
      offense:{
        stance: 0,
        rangeMult: 1
      },
      defense:{
        stance: 0,
        stun: null
      },
      item: item,
      attack: item.system.actions[actionID]
    }
    const mainTarget = Array.from(game.user.targets)[0] || undefined;
    let defStance;
    if (mainTarget){
      defStance = mainTarget.actor.statuses.has('prone') ? 'prone' : mainTarget.actor.statuses.has('kneeling') ? 'kneeling' : 'standing';
      if (mainTarget.actor.statuses.has('stun')) tweaks.defense.stun = -2;
    }
    let atkStance = this.actor.statuses.has('prone') ? 'prone' : this.actor.statuses.has('kneeling') ? 'kneeling' : 'standing'
    if (tweaks.attack.check.type=='melee'){
      if (defStance=='prone') tweaks.defense.stance = -2;
      if (defStance=='kneeling') tweaks.defense.stance = -4;
      if (atkStance=='prone') tweaks.offense.stance = -4;
      if (atkStance=='kneeling') tweaks.offense.stance = -2;
    }
    else{
      if (defStance=='prone') tweaks.defense.stance = 4;
      if (defStance=='kneeling') tweaks.defense.stance = 2;
      if (atkStance=='prone') tweaks.offense.stance = 2;
      if (atkStance=='kneeling') tweaks.offense.stance = 1;
    }
    if (item.type=='weapon' && item.system.magazine.type=='cartridge' && item.system.magazine.source!=''){
      const tripleID = foundry.utils.getProperty(item,'system.magazine.source').split(',')
      item.system.magazine.preLoad =  foundry.utils.getProperty(this.actor.items.filter(item => item._id == tripleID[0])[0],tripleID[1]);
      tweaks.ammo = {
        effect: tripleID[2],
        active: {}
      }
      if (item.system.magazine.preLoad){
        for (let [key,entry] of Object.entries(item.system.magazine.preLoad.cartridges)){
          tweaks.ammo.active[key] = {name:entry.name,check:(`cartridges.${key}`==tripleID[2]),recoil:(`cartridges.${key}`==tripleID[2])}
        }
      }
      else (
        item.system.magazine.preLoad = {}
      )
    }
    let actingActor = null;
    switch (this.actor?.type){
      case 'character':
        actingActor = this.actor;
        break;
      case 'vehicle':
        actingActor = fromUuidSync(foundry.utils.getProperty(this.actor,`system.vehicle.crew.${this.actor.system.vehicle.attacker}.uuid`))
        if (actingActor==null) actingActor = this.actor;
        if (this.actor.system.stats.maneuver.speed) tweaks.situation = `${this.actor.system.stats.maneuver.speed>=0?'+':''}${this.actor.system.stats.maneuver.speed}[Speed]`;
        break;
      default:
        actingActor = this.actor;
    }
    if ((event && event.shiftKey) || item.system.actions[actionID].check.type.includes('noChat')){
      new AttackDashboardApp(tweaks,{source:item,actor:actingActor,target:actionID}).rollAttack(event)
    }
    else{
      new AttackDashboardApp(tweaks,{source:item,actor:actingActor,target:actionID}).render(true)
    }
    
  }
  _onUtilityDash(event){
    event.preventDefault();
    const itemID = event.currentTarget.dataset.itemId;
    const actionID = event.currentTarget.dataset.actionId;
    const item = this.actor.items.get(itemID);
    const tweaks = {
      item: item,
      skill: null,
      utility: item.system.actions[actionID]
    }
    let actingActor = null;
    switch (this.actor?.type){
      case 'character':
        actingActor = this.actor;
        if (actingActor && tweaks.utility.check.type==='skill' && tweaks.utility.check.source=='') tweaks.utility.check.source = tweaks.item.system.skillSource;
        break;
      case 'vehicle':
        actingActor = fromUuidSync(foundry.utils.getProperty(this.actor,`system.vehicle.crew.${this.actor.system.vehicle.skiller}.uuid`))
        if (actingActor && tweaks.utility.check.type==='skill') tweaks.utility.check.source = foundry.utils.getProperty(this.actor,`system.vehicle.crew.${this.actor.system.vehicle.skiller}.skill`)
        if (actingActor==null) actingActor = this.actor;
        tweaks.situation = `${this.actor.system.stats.maneuver.speed?`${this.actor.system.stats.maneuver.speed>=0?'+':''}${this.actor.system.stats.maneuver.speed}[Speed]`:''}${this.actor.system.stats.maneuver.value?`${this.actor.system.stats.maneuver.value>=0?'+':''}${this.actor.system.stats.maneuver.value}[Maneuver]`:''}`
        break;
      default:
        actingActor = this.actor;
    }
    if (tweaks.utility.check.type=='skill' && tweaks.utility.check.source!='') tweaks.skill = this.actor.items.get(tweaks.utility.check.source)
    if ((event && event.shiftKey) || item.system.actions[actionID].check.type.includes('noChat')){
      new UtilityDashboardApp(tweaks,{sourceItem:item,sourceSkill:tweaks.skill,actor:actingActor,target:actionID}).rollUtility(event)
    }
    else{
      new UtilityDashboardApp(tweaks,{sourceItem:item,sourceSkill:tweaks.skill,actor:actingActor,target:actionID}).render(true)
    }
  }
  _onActionDash(event){
    event.preventDefault()
    const checkID = event.currentTarget.dataset.checkId;
    const itemID = event.currentTarget.dataset.itemId;
    const item = itemID?this.actor.items.get(itemID):null;
    let checkName='';
    switch (checkID){
      case 'skill':
        checkName = `${item.name} Check`
        break;
      case 'fortitude':
        checkName = 'Fortitude Save';
        break;
      case 'reflex':
        checkName = 'Reflex Save';
        break;
      case 'will':
        checkName = 'Will Save';
        break;
      case 'grapple':
        checkName = 'Grapple Check';
        break;
      default:
        checkName = `${game.i18n.localize(CONFIG.OATS.abilities[checkID])} Check`
    }
    const tweaks = {
      skill: (checkID=='skill')?item:null,
    }
    if ((event && event.shiftKey)){
      new ActionDashboardApp(tweaks,{actor:this.actor,name:checkName,sourceSkill:tweaks.skill,target:checkID}).rollAction(event);
    }
    else{
      new ActionDashboardApp(tweaks,{actor:this.actor,name:checkName,sourceSkill:tweaks.skill,target:checkID,height:(checkID=='skill'?340:180),width:((checkID=='skill' || checkID=='reflex')?520:260)}).render(true);
    }
  }

  _onResourceTransfer(event){
    event.preventDefault()
    const itemID = event.currentTarget.dataset.itemId;
    const initialID = event.currentTarget.dataset.initialId.split(',');
    new ResourceTransferApp({resourceLeft:[initialID[0],initialID[1]].join(','),resourceRight:'',transfer:1,cp:null},{actor:this.actor,item:this.actor.items.get(itemID)}).render(true);
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

class AttackDashboardApp extends FormApplication {
  static get defaultOptions(){
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['opsandtactics','sheet','item'],
      template: 'systems/opsandtactics/templates/interface/dialog-attack-dashboard.html',
      width: 650,
      height: 480,
      closeOnSubmit: false,
      submitOnChange: true,
      resizable: true
    });
  }
  get title(){
    return `${this.options.actor.name} tweaking execution of ${this.options.source.system.actions[this.options.target].name} from ${this.options.source.name}`;
  }
  collapseStates = {
    dashAttack: true
  }
  getData(){
    const tempSource = duplicate(this.options.source)
    if (this.options.source.type=='weapon'){
      for (let [key,entry] of Object.entries(this.options.source.system.weaponMods)){
        for (let imp of ['check','effect','dice','recoil','cp']){
          if (entry[imp]){
            foundry.utils.setProperty(tempSource,`system.actions.${this.options.target}.${imp}.mods.${key}.value`,entry[imp])
          }
        }
      }
    }
    this.object.item = foundry.utils.mergeObject(tempSource,this.object.item);
    if (this.object.ammo && !foundry.utils.isEmpty(this.options.source.system.magazine.preLoad)){
      foundry.utils.mergeObject(this.object.item.system.magazine.loaded,duplicate(foundry.utils.getProperty(this.options.source.system.magazine.preLoad,this.object.ammo.effect)))
      let tempCheck = 0;
      let tempRecoil = 0;
      
      for (let [key,entry] of Object.entries(this.object.ammo.active)){
        entry.name = foundry.utils.getProperty(this.options.source.system.magazine.preLoad.cartridges,key).name;
        if (entry.check) tempCheck += Number(foundry.utils.getProperty(this.options.source.system.magazine.preLoad.cartridges,key).stats.check)
        if (entry.recoil) tempRecoil += Number(foundry.utils.getProperty(this.options.source.system.magazine.preLoad.cartridges,key).stats.recoil)
      }
      foundry.utils.setProperty(this,'object.item.system.magazine.loaded.stats.check',tempCheck);
      foundry.utils.setProperty(this,'object.item.system.magazine.loaded.stats.recoil',tempRecoil);
    }
    const context = {
      OATS: CONFIG.OATS,
      collapses: this.collapseStates,
      tweaks: this.object,
      item: this.options.source,
      target: this.options.target,
      action: this.object.item.system.actions[this.options.target],
      attackMods: this.options.source.actionSum(this.options.target,this.object.item),
      wepMods: {
        check:{},
        effect:{},
        dice:{},
        recoil:{},
        cp:{}
      },
      lists: {
        attackFlank: [
          {label:`Attacking into Defender's Front`,value:0},
          {label:`Attacking into Defender's Flanks (+2)`,value:2},
          {label:`Attacking into Defender's Rear (+4)`,value:4}
        ],
        attackStance: [],
        attackFace: [
          {label:`Attacking from Attacker's Front`,value:0},
          {label:`Attacking from Attacker's Flanks (-5)`,value:-5},
          {label:`Attacking from Attacker's Rear (-10)`,value:-10}
        ],
        defendStance: [],
        defendCover: [
          {label:'Defender behind No Cover',value:'cov0'},
          {label:'Defender behind 1/4 Cover (+3)',value:'cov1'},
          {label:'Defender behind 1/2 Cover (+6, 10%)',value:'cov2'},
          {label:'Defender behind 3/4 Cover (+9, 20%)',value:'cov3'},
          {label:'Defender behind 9/10 Cover (+15, 30%)',value:'cov4'}
        ],
        defendConceal: [
          {label:'Defender has No Concealment',value:0},
          {label:'Defender has (5%)',value:5},
          {label:'Defender has 1/4 Concealment (10%)',value:10},
          {label:'Defender has (15%)',value:15},
          {label:'Defender has 1/2 Concealment (20%)',value:20},
          {label:'Defender has (25%)',value:25},
          {label:'Defender has 3/4 Concealment (30%)',value:30},
          {label:'Defender has (35%)',value:35},
          {label:'Defender has 9/10 Concealment (40%)',value:40},
          {label:'Defender has (45%)',value:45},
          {label:'Defender has Total Concealment (50%)',value:50},
        ]
      }
    }
    if (context.tweaks.attack.check.type=='melee'){
      context.lists.attackStance = [
        {label:'Attacker is Standing',value:0},
        {label:'Attacker is Kneeling (-2)',value:-2},
        {label:'Attacker is Prone (-4)',value:-4}
      ]
      context.lists.defendStance = [
        {label:'Defender is Standing',value:0},
        {label:'Defender is Kneeling (-4)',value:-4},
        {label:'Defender is Prone (-2)',value:-2}
      ]
    }
    else{
      context.lists.attackStance = [
        {label:'Attacker is Standing',value:0},
        {label:'Attacker is Kneeling (+1)',value:1},
        {label:'Attacker is Prone (+2)',value:2}
      ]
      context.lists.defendStance = [
        {label:'Defender is Standing',value:0},
        {label:'Defender is Kneeling (+2)',value:2},
        {label:'Defender is Prone (+4)',value:4}
      ]
    }
    if (this.options.source.type=='weapon'){
      for (let [key,entry] of Object.entries(this.options.source.system.weaponMods)){
        for (let imp of ['check','effect','dice','recoil','cp']){
          if ((entry[imp])){
            context.wepMods[imp][key] =  {name: entry.name, [imp]: entry[imp], description: entry.description,active:this.object.item.system.actions[this.options.target][imp]?.mods[key]?.active}
          }
        }
      }
    }
    context.magLabel = [];
    if (this.options.source.type=='magic'){
      context.magLabel = context.magLabel.concat(this.options.source.listMagazines().entries)
    }
    else {
      for (let exin of Object.values(this.options.source.listMagazines())){
        context.magLabel = context.magLabel.concat(exin.entries)
      }
    }
    context.magLabel = context.magLabel.find(mag => mag?.id==this.options.source.system.magazine.source)?.label
    if (context.magLabel===undefined){
      switch (this.options.source.type){
        case 'weapon':
          context.magLabel = context.magLabel = this.options.source.system.magazine.type=='unlimited'?'Unlimited':(this.options.source.system.magazine.type=='coolant'?'Uncooled':'Unloaded');
          break;
        case 'object':
          context.magLabel = context.magLabel = this.options.source.system.magazine.type=='unlimited'?'Unlimited':'Empty';
          break;
        case 'magic':
          context.magLabel = context.magLabel = this.options.source.system.magazine.type=='unlimited'?'Unlimited':(this.options.source.system.magazine.type=='mental'?`Mental Limit [${this.options.actor.system.magic.mlUsed}/${this.options.actor.system.ml.max}]`:'Empty');
          break;
      }
    }
    if (foundry.utils.getProperty(context.action,'dice.scaleCartridge.bar')>0) context.action.dice.scaleCartridge.lessBar = context.action.dice.scaleCartridge.bar-1;
    context.situational = foundry.utils.getProperty(this.object,'situation')
    context.offenseTotal = Number(foundry.utils.getProperty(this.object,'offense.high')?this.object.offense.high:0) + Number(foundry.utils.getProperty(this.object,'offense.seen')?this.object.offense.seen:0) + Number(foundry.utils.getProperty(this.object,'offense.flank')?this.object.offense.flank:0) + Number(foundry.utils.getProperty(this.object,'offense.stance')?this.object.offense.stance:0) + Number(foundry.utils.getProperty(this.object,'offense.face')?this.object.offense.face:0) + Math.floor(Number(foundry.utils.getProperty(this.object,'offense.range')?this.object.offense.range:0) * -2 * Number(foundry.utils.getProperty(this.object,'offense.rangeMult')?this.object.offense.rangeMult:1))
    context.defenseTotal = Number(foundry.utils.getProperty(this.object,'defense.pin')?this.object.defense.pin:0) + Number(foundry.utils.getProperty(this.object,'defense.stun')?this.object.defense.stun:0) + Number(foundry.utils.getProperty(this.object,'defense.climb')?this.object.defense.climb:0) + Number(foundry.utils.getProperty(this.object,'defense.stance')?this.object.defense.stance:0)
    context.missChance = 0;
    switch (foundry.utils.getProperty(this.object,'defense.cover')){
      case 'cov0':
        break;
      case 'cov1':
        context.defenseTotal += Math.floor(3/Number(foundry.utils.getProperty(this.object,'offense.sharp')?this.object.offense.sharp:1));
        break;
      case 'cov2':
        context.defenseTotal += Math.floor(6/Number(foundry.utils.getProperty(this.object,'offense.sharp')?this.object.offense.sharp:1));
        context.missChance = 10;
        break;
      case 'cov3':
        context.defenseTotal += Math.floor(9/Number(foundry.utils.getProperty(this.object,'offense.sharp')?this.object.offense.sharp:1));
        context.missChance = 20;
        break;
      case 'cov4':
        context.defenseTotal += Math.floor(15/Number(foundry.utils.getProperty(this.object,'offense.sharp')?this.object.offense.sharp:1));
        context.missChance = 30;
    }
    context.missChance = Math.max(context.missChance,Number(foundry.utils.getProperty(this.object,'defense.conceal')?this.object.defense.conceal:0));
    context.formula = context.attackMods.checkTotal;
    if (context.formula!==null){
      context.formula = `${context.formula}${context.situational?` +(${context.situational})`:''}${context.offenseTotal?` +(${context.offenseTotal})`:''}${context.defenseTotal?` -(${context.defenseTotal})`:''}`;
    }
    //console.debug(context)
    return context;
  }

  activateListeners(html){
    super.activateListeners(html);
    html.find('.collapse-toggle').click(this._onToggleCollapse.bind(this));
    html.find('.attack-roll').click(this.rollAttack.bind(this));
    html.find('.damage-roll').click(this.rollDamage.bind(this));    
  }

  async rollAttack(event){
    event.preventDefault();
    const context = this.getData();
    await this.options.source.rollActionCheck({modifier:context.formula,missChance:context.missChance,event:event,actionID:context.target,cp:context.attackMods.cp,ammo:context.attackMods.ammo,actor:this.options.actor});
    this.render()
  }
  rollDamage(event){
    event.preventDefault()
    const context = this.getData()
    this.options.source.rollDamage({loaded:context.tweaks.item.system.magazine.loaded,actionID:context.target,useAmmo:context.action.effect.ammo,goodBad:event.currentTarget.dataset.goodBad,mods:context.attackMods,actor:this.options.actor})
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
  async _updateObject(event, formData){
    for (let [key,entry] of Object.entries(expandObject(formData).tweaks)){
      foundry.utils.setProperty(this.object,key,entry)
    }
    this.render()
  }
}
class TraitEditApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["opsandtactics", "sheet", "item"],
      template: 'systems/opsandtactics/templates/interface/dialog-trait-edit.html',
      width: 520,
      height: 240,
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: true,
      resizable: true
    });
  }
  get title(){
    let temp = 'Trait';
    let target = this.options.target.split('.').pop();
    switch (target){
      case 'chp':
        temp = 'Core Hit Points';
        break;
      case 'xhp':
        temp = 'Extended Hit Points';
        break;
      case 'ml':
        temp = 'Mental Limit';
        break;
      case 'carrying':
        temp = 'Carrying Capacity';
        break;
      case 'str':
      case 'dex':
      case 'con':
      case 'int':
      case 'wis':
      case 'cha':
        temp = game.i18n.localize(CONFIG.OATS.abilities[target]);
        break;
      case 'fortitude':
      case 'reflex':
      case 'will':
        temp = game.i18n.localize(CONFIG.OATS.saves[target]);
        break;
      case 'grapple':
        temp = 'Grapple';
        break;
    }
    return `Editing ${temp} calculation for ${this.object.name}`;
  }
  getData(){
    const context = {
      OATS: CONFIG.OATS,
      system: this.object.system,
      trait: {
        id: this.options.target,
        object: foundry.utils.getProperty(this.object,this.options.target)
      }
    }; 
    if (foundry.utils.hasProperty(this.object,`${this.options.target}.formula`)){
      context.trait.formula = {
        current: foundry.utils.getProperty(this.object,`${this.options.target}.formula`),
        source: foundry.utils.getProperty(this.object._source,`${this.options.target}.formula`),
        overridden: foundry.utils.hasProperty(this.object.overrides,`${this.options.target}.formula`)
      };
    }   
    if (foundry.utils.hasProperty(this.object,`${this.options.target}.score`)){
      context.trait.score = {
        current: foundry.utils.getProperty(this.object,`${this.options.target}.score`),
        source: foundry.utils.getProperty(this.object._source,`${this.options.target}.score`),
        overridden: foundry.utils.hasProperty(this.object.overrides,`${this.options.target}.score`),
        sourceMod: Math.floor((foundry.utils.getProperty(this.object._source,`${this.options.target}.score`)-10)/2),
        modMisc: foundry.utils.getProperty(this.object,`${this.options.target}.modsMods.misc`)
      };
    }
    if (foundry.utils.hasProperty(this.object,`${this.options.target}.foc`)){
      context.trait.foc = {
        current: foundry.utils.getProperty(this.object,`${this.options.target}.foc`),
        source: foundry.utils.getProperty(this.object._source,`${this.options.target}.foc`),
        overridden: foundry.utils.hasProperty(this.object.overrides,`${this.options.target}.foc`)
      }
    }
    if (foundry.utils.hasProperty(this.object,`${this.options.target}.mrk`)){
      context.trait.mrk = {
        current: foundry.utils.getProperty(this.object,`${this.options.target}.mrk`),
        source: foundry.utils.getProperty(this.object._source,`${this.options.target}.mrk`),
        overridden: foundry.utils.hasProperty(this.object.overrides,`${this.options.target}.mrk`)
      }
    }
    if (foundry.utils.hasProperty(this.object,`${this.options.target}.mods.misc`)){
      context.trait.misc = foundry.utils.getProperty(this.object,`${this.options.target}.mods.misc`);
    }
    console.debug(this.object, context)
    return context;
    if (foundry.utils.getProperty(context,'attack.object.dice.scaleCartridge.bar') > 0) context.attack.object.dice.scaleCartridge.lessBar = context.attack.object.dice.scaleCartridge.bar - 1;
    for (let [key,entry] of Object.entries(this.object.system.weaponMods)){
      for (let imp of ['check','effect','dice','recoil','cp']){
        if ((entry[imp])) context.attack[imp][key] =  {name: entry.name, [imp]: entry[imp], description: entry.description,active:foundry.utils.getProperty(this.object,`system.actions.${this.options.target}.${imp}.mods.${key}.active`)};
      }
    }
    for (let [key,entry] of Object.entries(this.object.system.weaponMods)){
      for (let imp of ['check','effect','dice','recoil','cp']){
        if (!(entry[imp])) context.attack[imp][key] =  {name: entry.name, [imp]: null, description: entry.description,active:foundry.utils.getProperty(this.object,`system.actions.${this.options.target}.${imp}.mods.${key}.active`)} ;
      }
    }
    return context;
  }
  activateListeners(html){
    super.activateListeners(html);
    html.find('.trait-copy').click(this._onCopyTrait.bind(this));
  }
  _onCopyTrait(event){
    event.preventDefault();
    game.clipboard.copyPlainText(event.currentTarget.dataset.path)
    ui.notifications.info(`Example attribute key '${event.currentTarget.dataset.path}' copied to clipboard.`)
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
class UtilityDashboardApp extends FormApplication {
  static get defaultOptions(){
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['opsandtactics','sheet','item'],
      template: 'systems/opsandtactics/templates/interface/dialog-utility-dashboard.html',
      width: 520,
      height: 340,
      closeOnSubmit: false,
      submitOnChange: true,
      resizable: true
    });
  }
  get title(){
    return `${this.options.actor.name} tweaking execution of ${this.options.sourceItem.system.actions[this.options.target].name} from ${this.options.sourceItem.name}`;
  }
  collapseStates = {
    dashUtility: true
  }
  getData(){
    const tempItemSource = duplicate(this.options.sourceItem)
    this.object.item = foundry.utils.mergeObject(tempItemSource,this.object.item);
    if (this.options.sourceSkill){
      const tempSkillSource = duplicate(this.options.sourceSkill)
      this.object.skill = foundry.utils.mergeObject(tempSkillSource,this.object.skill);
    }
    const context = {
      OATS: CONFIG.OATS,
      collapses: this.collapseStates,
      tweaks: this.object,
      item: this.options.sourceItem,
      skill: this.options.sourceSkill,
      target: this.options.target,
      action: this.object.item.system.actions[this.options.target],
      utilityMods: this.options.sourceItem.actionSum(this.options.target,this.object.item),
      lists: {}
    }
    context.magLabel = [];
    if (this.options.sourceItem){
      if (this.options.sourceItem.type=='magic'){
        context.magLabel = context.magLabel.concat(this.options.sourceItem.listMagazines().entries)
      }
      else {
        for (let exin of Object.values(this.options.sourceItem.listMagazines())){
          context.magLabel = context.magLabel.concat(exin.entries)
        }
      }
      context.magLabel = context.magLabel.find(mag => mag?.id==this.options.sourceItem.system.magazine.source)?.label
      if (context.magLabel===undefined){
        switch (this.options.sourceItem.type){
          case 'object':
            context.magLabel = context.magLabel = this.options.sourceItem.system.magazine.type=='unlimited'?'Unlimited':'Empty';
            break;
          case 'magic':
            context.magLabel = context.magLabel = this.options.sourceItem.system.magazine.type=='unlimited'?'Unlimited':(this.options.sourceItem.system.magazine.type=='mental'?`Mental Limit [${this.options.actor.system.magic.mlUsed}/${this.options.actor.system.ml.max}]`:'Empty');
            break;
        }
      }
    }

    context.situational = foundry.utils.getProperty(this.object,'situation')
    if (this.options.sourceSkill) {
      context.skillMods = this.options.sourceSkill.skillSum(this.object.skill)
      context.formula = context.skillMods.total;
    }
    else {
      context.formula = context.utilityMods.checkTotal;
    }
    if (context.formula!==null){
      context.formula = `${context.formula}${context.situational?` +(${context.situational})`:''}`;
    }
    //console.debug(context)
    return context;
  }
  activateListeners(html){
    super.activateListeners(html);
    html.find('.collapse-toggle').click(this._onToggleCollapse.bind(this));
    html.find('.utility-roll').click(this.rollUtility.bind(this));
    html.find('.effect-roll').click(this.rollEffect.bind(this));
  }
  async rollUtility(event){
    event.preventDefault();
    const context = this.getData();
    await this.options.sourceItem.rollActionCheck({modifier:context.formula,event:event,actionID:context.target,cp:context.utilityMods.cp,ammo:context.utilityMods.ammo,actor:this.options.actor});
    this.render()
  }
  rollEffect(event){
    event.preventDefault()
    const context = this.getData()
    this.options.sourceItem.rollDamage({actionID:context.target,goodBad:'good',mods:context.utilityMods,actor:this.options.actor})
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
  async _updateObject(event, formData){
    for (let [key,entry] of Object.entries(expandObject(formData).tweaks)){
      foundry.utils.setProperty(this.object,key,entry)
    }
    this.render()
  }
}
class ActionDashboardApp extends FormApplication {
  static get defaultOptions(){
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['opsandtactics','sheet','item'],
      template: 'systems/opsandtactics/templates/interface/dialog-utility-dashboard.html',
      width: 520,
      height: 340,
      closeOnSubmit: false,
      submitOnChange: true,
      resizable: true
    });
  }
  get title(){
    return `${this.options.actor.name}: ${this.options.name}`;
  }
  collapseStates = {
    dashUtility: true
  }
  getData(){
    if (this.options.sourceSkill){
      const tempSkillSource = duplicate(this.options.sourceSkill)
      this.object.skill = foundry.utils.mergeObject(tempSkillSource,this.object.skill);
    }
    const context = {
      OATS: CONFIG.OATS,
      collapses: this.collapseStates,
      tweaks: this.object,
      skill: this.options.sourceSkill,
      isReflex: (this.options.target=='reflex'),
      lists: {
        reflexCover: [
          {label:'Not Behind Cover',value:'cov0'},
          {label:'Behind 1/4 Cover (+2)',value:2},
          {label:'Behind 1/2 Cover (+4)',value:4},
          {label:'Behind 3/4 Cover (+6)',value:6},
          {label:'Behind 9/10 Cover (+8)',value:8}
        ]
      }
    }
    context.situational = foundry.utils.getProperty(this.object,'situation')
    context.cover = foundry.utils.getProperty(this.object,'reflexCover')
    switch(this.options.target){
      case 'skill':
        context.skillMods = this.options.sourceSkill.skillSum(this.object.skill)
        context.formula = context.skillMods.total;
        break;
      case 'fortitude':
      case 'reflex':
      case 'will':
        context.formula = `${this.options.actor.system.saves[this.options.target].value>=0?'+':''}${this.options.actor.system.saves[this.options.target].value}`;
        break;
      case 'grapple':
        context.formula = `${this.options.actor.system.stats.grapple.value>=0?'+':''}${this.options.actor.system.stats.grapple.value}`;
        break;
      case 'vehicle':
        context.formula = `${this.options.actor.system.actions[this.option.target].check.total}`
        break;
      default:
        context.formula = `${this.options.actor.abilityMod(this.options.target)>=0?'+':''}${this.options.actor.abilityMod(this.options.target)}`
    }
    if (context.formula!==null){
      context.formula = `${context.formula}${context.situational?` +(${context.situational})`:''}`;
      if (this.options.target=='reflex') context.formula = `${context.formula}${context.cover?` +(${context.cover})`:''}`;
    }
    return context;
  }
  activateListeners(html){
    super.activateListeners(html);
    html.find('.collapse-toggle').click(this._onToggleCollapse.bind(this));
    html.find('.utility-roll').click(this.rollAction.bind(this));
  }
  rollAction(event){
    event.preventDefault();
    const context = this.getData();
    this.options.actor.rollActorCheck({modifier:context.formula,event:event,checkID:this.options.target,itemName:foundry.utils.getProperty(context,'skill.name')});
    this.close();
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
  async _updateObject(event, formData){
    for (let [key,entry] of Object.entries(expandObject(formData).tweaks)){
      foundry.utils.setProperty(this.object,key,entry)
    }
    this.render()
  }
}