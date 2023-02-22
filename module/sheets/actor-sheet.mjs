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
    console.debug('break')
    // Tally skill modifiers
    for (let i of context.skills){
      i.mods = {total:0,ranks:i.system.ranks,ability:0,equip:0,syn:0,occ:0,armor:0,misc:0};
      if (i.system.ability!=''){
        i.mods.ability = context.system.abilities[i.system.ability].mod;
      }
      if (i.system.focus == 'double') {
        i.mods.occ += 1;
      }
      for (let j=0; j<Object.keys(i.system.skillMods).length;j++){
        if (i.system.skillMods[j].active){
          i.mods[i.system.skillMods[j].type] += i.system.skillMods[j].value;
        }
      }
      if (i.system.armor){
        i.mods.armor = context.system.armorPenalty;
      }
      i.mods.total = i.mods.ranks + i.mods.ability + i.mods.equip + i.mods.syn + i.mods.occ + i.mods.armor + i.mods.misc;      
    }

    
    
    
    // Calculate ML usage
    systemData.magic.psion=0;
    if(systemData.magic.psionFocus) systemData.magic.psion = (2*systemData.stats.level.value)+25;
    systemData.magic.recipe = ((3*systemData.stats.level.value)+3)*systemData.magic.memorized;
    systemData.ml.value = systemData.magic.psion + systemData.magic.recipe + systemData.magic.incant;
    for (let i of context.magic){
      if(i.system.active && i.system.flags.passive) systemData.ml.value += i.system.mlCost.value;
    }

    
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
      0: [],
      1: [],
      2: [],
      3: [],
      4: []
    }
    const weapons = [];
    let gear = [];
    let gearFail = [];
    const traits = [];
    const magic = [];

    // Iterate through items, allocating to containers
    for (let i of context.actor.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append skills.
      if (i.type === 'skill') {

        skills.push(i);
      }
      // Append armor.
      if (i.type === 'armor') {
        if (i.system.layer != undefined){
          armors[i.system.layer].push(i);
        }
      }
      // Append weapons.
      if (i.type === 'weapon') {
        for (let a of i.system.attacks){
          // Calculate item to hit
          a.hit.total = a.hit.attack;
          switch (a.hit.ability){
            case '':
              break;
            case 'foc':
            case 'pow':
              a.hit.total += systemData.abilities.str[a.hit.ability];
              break;
            case 'mrk':
            case 'agi':
              a.hit.total += systemData.abilities.dex[a.hit.ability];
              break;
            default:
              a.hit.total += systemData.abilities[a.hit.ability].mod;
          }
          for (let m of a.hit.mods){
            a.hit.total += m.value;
          }
          // Calculate item damage
          a.damage.total = a.damage.attack;
          switch (a.damage.ability){
            case '':
              break;
            case 'foc':
            case 'pow':
              a.damage.total += '+' + Math.floor(systemData.abilities.str[a.damage.ability]*a.damage.scaleAbility);
              break;
            case 'foc':
            case 'pow':
              a.damage.total += '+' + Math.floor(systemData.abilities.dex[a.damage.ability]*a.damage.scaleAbility);
              break;
            default:
              a.damage.total += '+' + Math.floor(systemData.abilities[a.damage.ability].mod*a.damage.scaleAbility);
          }
          for (let m of a.damage.mods){
            a.damage.total += '+' + m.value;
          }
          // Calculate item recoil
          a.recoil.total = a.recoil.attack;
          for (let m of a.recoil.mods){
            a.recoil.total += m.value;
          }
          // Calculate item CP
          a.cp.total = a.cp.attack;
          for (let m of a.cp.mods){
            a.cp.total += m.value;
          }
          // Add BAB and recoil reduction
          a.hit.total += systemData.stats.bab.value;
          a.recoil.total = Math.min(a.recoil.total+systemData.stats.recoil.value,0);
          a.hit.total += a.recoil.total;

        }
        
          if(i.system.magazine.external || i.system.magazine.coolant){
            if(i.system.magazine.loaded.source){
              let loadedMag = context.items.filter(item => item._id == i.system.magazine.loaded.source)[0];
              i.system.magazine.loaded.value = loadedMag.system.magazine.value;
              i.system.magazine.loaded.max = loadedMag.system.magazine.max;
            }
            else{
              i.system.magazine.external=false;
            }     
          }
        
        weapons.push(i);
      }
      // Handle Magazines
      if (i.type === 'magazine'){
        if (i.system.magazine.type=='coolant'){
          i.label = `${i.name} [${i.system.coolant.hot}]`
        }
        else{
          i.label = `${i.name} [${i.system.magazine.value}/${i.system.magazine.max}]`
        }
      }

      // Append to gear
      if(i.system.gear?.physical){
        // If parent ID is invalide and not one of the predefined containers, set it to loose
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
      // Append to magic.
      if (i.type === 'magic') {
        i.system.flags.shared=false;
        i.system.flags.limited=false;
        i.system.flags.passive=false;
        switch(i.system.uses.type){
          case 'shared':
            i.system.flags.shared=true;
            i.system.flags.limited=true;
            break;
          case 'unlimited':
            break;
          case 'limited':
            i.system.flags.limited=true;
            break;
        }
        if(i.system.mlCost.type=='passive'){
          i.system.flags.passive=true;
        }

        if(i.system.flags.shared){
          if(i.system.uses.shared.source){
            let usageSource = context.items.filter(item => item._id == i.system.uses.shared.source)[0];
            i.system.uses.shared.value = usageSource.system.uses.value;
            i.system.uses.shared.max = usageSource.system.uses.max;
          }         
          
        }
        if(i.system.action.type=='attack'){
          i.system.action.mods = `${context.system.stats.bab.value}`
        }
        else{
          i.system.action.mods = "";
        }
        if(i.system.effect.type=='attack'){
          i.system.effect.mods = `${context.system.stats.bab.value}`
        }
        else{
          i.system.effect.mods = "";
        }
        switch (i.system.action.ability){
          case 'foc':
          case 'pow':
            i.system.action.mods += '+' + context.system.abilities.str[i.system.action.ability];
            break;
          case 'mrk':
          case 'agi':
            i.system.action.mods += '+' + context.system.abilities.dex[i.system.action.ability];
          case '':
            break;
          default:
            i.system.action.mods += '+' + context.system.abilities[i.system.action.ability].mod;  
        }
        switch (i.system.effect.ability){
          case 'foc':
          case 'pow':
            i.system.effect.mods += '+' + context.system.abilities.str[i.system.action.ability];
            break;
          case 'mrk':
          case 'agi':
            i.system.effect.mods += '+' + context.system.abilities.dex[i.system.action.ability];
          case '':
            break;
          default:
            i.system.effect.mods += '+' + context.system.abilities[i.system.action.ability].mod;  
        }
        if(i.system.action.misc!=""){
          i.system.action.mods += '+' + i.system.action.misc;
        }
        if(i.system.effect.misc!=""){
          i.system.effect.mods += '+' + i.system.effect.misc;
        }


        //console.debug(i);
        //i.system.action.mods = ""
        //if(i.system.action.ability!="") i.system.action.mods = context.system.abilites[i.system.action.ability].mod
        //if(i.system.action.misc!="") i.system.action.mods = `${i.system.action.mods}+${i.system.action.misc}`;
        //i.system.effect.mods = ""
        //if(i.system.effect.ability!="") i.system.effect.mods = context.system.abilites[i.system.effect.ability].mod
        //if(i.system.effect.misc!="") i.system.effect.mods = `${i.system.effect.mods}+${i.system.effect.misc}`;
        magic.push(i);
      }
    }
    // Crazy Container Nesting
    const locations = ["Loose","Worn","Carried","Stored"];
    // Initialize children of layer 0 items
    const nestedGear = {Loose:[],Worn:[],Carried:[],Stored:[]}
    for (let layer0 of locations){
      for (let i = 0; i < gear.length; i++){
        if (gear[i].system.gear.location.parent == layer0){
          nestedGear[layer0].push(gear[i]);
          gearFail[i]=undefined;
        }
      }
    }
    for (let layer0 of locations){
      for (let layer1 of nestedGear[layer0]){
        for (let i = 0; i < gear.length; i++){
          if (gear[i].system.gear.location.parent == layer1._id){
            layer1.children.push(gear[i]);
            gearFail[i]=undefined;
          }
        }
      }
    }
    for (let layer0 of locations){
      for (let layer1 of nestedGear[layer0]){
        for (let layer2 of layer1.children){
          for (let i = 0; i < gear.length; i++){
            if (gear[i].system.gear.location.parent == layer2._id){
              layer2.children.push(gear[i]);
              gearFail[i]=undefined;
            }
          }
        }
      }
    }
    for (let layer0 of locations){
      for (let layer1 of nestedGear[layer0]){
        for (let layer2 of layer1.children){
          for (let layer3 of layer2.children){
            for (let i = 0; i < gear.length; i++){
              if (gear[i].system.gear.location.parent == layer3._id){
                layer3.children.push(gear[i]);
                gearFail[i]=undefined;
              }
            }
          }
        }
      }
    }
    for (let i of gearFail){
      if (i != undefined){
        nestedGear.Loose.push(i);
      }
    }

    // Assign and return
    context.skills = skills;
    context.armors = armors;
    context.weapons = weapons;
    context.gear = gear;
    context.nestedGear = nestedGear;
    context.traits = traits;
    context.magic = magic;
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
    html.find('.item-checkbox').click(this._onItemCheckbox.bind(this));
    // Apply Incoming Damage to Armor or Hit Points
    html.find('.apply-damage').click(this._onApplyDamage.bind(this));
    // Actor Sheet Rolls
    html.find('.3d6-roll').click(this._actorRoll.bind(this));   
    // Incantation Mental Limit
    html.find('.mental-limit').click(this._mentalLimit.bind(this)); 
     // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));
    // Rollable abilities.
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
    const value = event.target.value;
    const item = this.actor.items.get(targetId);
    await item.update({[targetProp]:value});
  }
  async _onItemCheckbox(event){
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const targetId = dataset.targetId;
    const targetProp = dataset.targetProp;
    let value=true;
    if(dataset.value=='true') value=false;
    const item = this.actor.items.get(targetId);
    await item.update({[targetProp]:value});
  }
  async _onApplyDamage(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset 
    const armorType = dataset.armorType;
    const target = dataset.armorTarget;
    const id = dataset.itemId;
    let name=armorType;
    if (armorType != 'xhp' && armorType != 'chp') {
      name = this.actor.items.get(id).name || null;
      if(!this.actor.items.get(id).system.active) return;
    }
    
    const initial = dataset.armorValue;
    const dr = dataset.armorDr;
    let incoming = this.actor.system.health.incoming;
    let damageReport = '';
    const flavor = `Resolving ${incoming} incoming damage.`
    let remaining = 0;
    let reduce = 0;
    if (incoming == 0) return;

    if (armorType === 'shield'){
      if (incoming <= dr){ // If DR meets or exceeds Plasma damage
        damageReport = `${incoming} damage completely diffused by ${name}.`
        incoming = 0; // Damage is nullified
        remaining = initial; // Soak is unharmed
      }
      else{ // If plasma damage exceeds DR
        damageReport = `${incoming} damage partially diffused,`;
        incoming = incoming - dr; // reduce damage by DR
        if(initial <= incoming){ // if remaining damage meets or exceeds soak
          incoming = incoming - initial; // damage is reduced by remaining soak
          remaining = 0; // soak is wiped out
          damageReport = `${damageReport} ${name} is disabled with ${incoming} damage remaining.`
        }
        else{ // If soak exceeds plasma damage
          remaining = initial - incoming; // soak is reduced by remaining damage
          incoming = 0; // damage is expended
          damageReport = `${damageReport} ${name} retains ${remaining} Soak.`
        }
      }
    }

    else if (armorType === 'chp'){ // No DR, no lower limit, all damage will be expended
      remaining = initial - incoming; 
      damageReport = `${incoming} damage suffered to core hit points, ${remaining} CHP remaining.`;
      incoming = 0;
    }
    
    else if (armorType === 'xhp'){ // No DR, can't go below zero
      if (incoming <= initial){ // if damage is less than or equal to xhp
        remaining = initial - incoming;
        damageReport = `${incoming} damage suffered to extended hit points, ${remaining} XHP remaining.`;
        incoming = 0;
      }
      else {
        remaining = 0;
        damageReport = `${incoming} damage empties extended hit points with`;
        incoming = incoming - initial;
        damageReport = `${damageReport} ${incoming} damage remaining.`;
      }
    }

    else {
      if(initial <= 0){ // If AP is completely empty
        if (incoming <= dr){
          damageReport = `${name} completely stops ${incoming} damage.`
        }
        else{
          damageReport = `${name} reduces ${incoming} damage by ${Math.min(incoming,dr)}.`;
        }
        incoming = Math.max(0,incoming-dr); // simply apply dr to incoming damage
      }
      else { // If AP is nonzero
        reduce = Math.min(dr,initial); // use lower of DR and AP for damage reduction
        if (incoming <= reduce){ // If 'dr' meets or exceeds damage
          remaining = initial - incoming; // ap is reduced by defeated damage
          damageReport = `${incoming} damage stopped completely by ${name}, leaving ${remaining} AP.`;
          incoming = 0; // no damage left
        }
        else{ //if damage exceeds effective dr
          damageReport = `${name} reduces ${incoming} damage by ${reduce}, leaving`;
          incoming = incoming - reduce; // damage is reduced by dr
          remaining = initial - reduce; // ap is reduced by dr
          damageReport = `${damageReport} ${remaining} AP and ${incoming} damage.`
        }
      }
    }  
  
    if (id != null){ // if the DR is from an item
      this.actor.items.get(id).update({[target]:remaining});
    }
    else { // If it was xhp or chp
      this.actor.update({[target]:remaining});
    }

    const speaker = ChatMessage.getSpeaker({actor:this.actor});
    const chatTemplate = "systems/opsandtactics/templates/chat/armor-damage-card.html";
    if (this.actor.system.health.incomingReport.message=="" || this.actor.system.health.incomingReport.message!=ui.chat.collection?.contents[ui.chat.collection.contents.length-1]?.id){
      // If there's no existing chat message or existing chat message isn't most recent
      const newReport = [flavor,damageReport];
      const html = await renderTemplate(chatTemplate,{damage:newReport})
      const chatReport = await ChatMessage.create({speaker:speaker,content:html})
      await this.actor.update({"system.health.incomingReport.message":chatReport.id});
      await this.actor.update({"system.health.incomingReport.log":newReport});
    }
    else {
      // If there is an existing chat message
      const newReport = this.actor.system.health.incomingReport.log
      newReport.push(damageReport);
      const chatReport = game.messages.get(this.actor.system.health.incomingReport.message)
      const html = await renderTemplate(chatTemplate,{damage:newReport})
      await chatReport.update({content:html});
      await this.actor.update({"system.health.incomingReport.log":newReport});
    }
    if (incoming==0) await this.actor.update({"system.health.incomingReport.message":""})
    await this.actor.update({"system.health.incoming":incoming});
  };
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
  async _mentalLimit(event){
    event.preventDefault();
    const dataset=event.currentTarget.dataset;
    let cost = Number(dataset.mlCost);
    if(cost<0) cost = Math.floor(cost/10);
    let mlTarget = this.actor.system.magic.incant;
    mlTarget = Math.max(0,mlTarget+cost);
    this.actor.update({"system.magic.incant":mlTarget});
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
