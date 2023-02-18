/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class OpsItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
    //console.debug('item prepareData',this)
  }

  prepareDerivedData(){
    
    const itemData = this;
    const systemData = itemData.system;
    if (itemData.type === 'skill') this._prepareSkillData(itemData);
    if (itemData.type === 'weapon') this._prepareWeaponData(itemData);
    if (itemData.type === 'magazine') this._prepareMagazineData(itemData);
    if (itemData.type === 'magic') this._prepareMagicData(itemData);
    //console.debug('item prepareDerivedData',this)
  }

  _prepareSkillData(itemData){
    const systemData = itemData.system;
    // If no actor, mod is zero
    //if(itemData.actor) {
      //let temp = itemData.actor.system.abilities[systemData.ability.type];
      //console.debug(temp.mod);
     // systemData.ability.mod = itemData.actor.system.abilities[systemData.ability.type]["mod"];
     // console.debug(systemData.ability.mod);
    //}
    //else{
    //  systemData.ability.mod = 0;
   // }
    //systemData.formula = `3d6 + @${systemData.attribute}.mod + ${systemData.mod}`;
  }
  _prepareWeaponData(itemData){
    const systemData = itemData.system;
    // Map weapon mods values to attacks
    for (let i of systemData.attacks){
      for (let j of i.hit.mods){
        let source = systemData.weaponMods.find(mod=> mod.id === j.sourceID);
        if (source === undefined){
          j.name = 'Error';
          j.value = 404;
        }
        else {
          j.name = source.name;
          j.value = source.hit;
        }
      }
      for (let i of systemData.attacks){
        for (let j of i.damage.mods){
          let source = systemData.weaponMods.find(mod=> mod.id === j.sourceID);
          if (source === undefined){
            j.name = 'Error';
            j.value = '404';
          }
          else {
            j.name = source.name;
            j.value = source.damage;
          }
          
        }
      }
      for (let i of systemData.attacks){
        for (let j of i.recoil.mods){
          let source = systemData.weaponMods.find(mod=> mod.id === j.sourceID);
          if (source === undefined){
            j.name = 'Error';
            j.value = 404;
          }
          else {
            j.name = source.name;
            j.value = source.recoil;
          }
          
        }
      }
      for (let i of systemData.attacks){
        for (let j of i.cp.mods){
          let source = systemData.weaponMods.find(mod=> mod.id === j.sourceID);
          if (source === undefined){
            j.name = 'Error';
            j.value = 404;
          }
          else {
            j.name = source.name;
            j.value = source.cp;
          }
          
        }
      }
    }
    // Copy the values of each weapon mod to each attack for display
    //for(let i of systemData.attacks){
    //  for(let j=0;j<systemData.weaponMods.length;j++){
    //    let selectedMod = i.modSelection[j];
    //    selectedMod.name = systemData.weaponMods[j].name;
    //    selectedMod.hit = systemData.weaponMods[j].hit;
    //    selectedMod.damage = systemData.weaponMods[j].damage;
    //    selectedMod.recoil = systemData.weaponMods[j].recoil;
    //    selectedMod.cp = systemData.weaponMods[j].cp;
    //  }
    //}
    // Set flags for magazine type
    //systemData.magazine.internal = false;
    //systemData.magazine.external = false;
    //systemData.magazine.coolant = false;
    //systemData.magazine[systemData.magazine.type] = true;
  }

  _prepareMagazineData(itemData){
    const systemData = itemData.system;
    if (systemData.magazine.type == 'coolant'){
      itemData.label = itemData.name + " [" + systemData.coolant.hot + "]";
    }
    else {
      itemData.label = itemData.name + " [" + systemData.magazine.value + "/" + systemData.magazine.max + "]";
    }
    itemData.system.coolant.flag = false;
    if (itemData.system.magazine.type == 'coolant') itemData.system.coolant.flag = true;
  }
  _prepareMagicData(itemData){
    const systemData = itemData.system;
    systemData.flags.shared=false;
    systemData.flags.limited=false;
    systemData.flags.passive=false;
    switch(systemData.uses.type){
      case 'shared':
        systemData.flags.shared=true;
        systemData.flags.limited=true;
        break;
      case 'unlimited':
        break;
      case 'limited':
        systemData.flags.limited=true;
        break;
    }
    if(systemData.mlCost.type=='passive'){
      systemData.flags.passive=true;
    }
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // let result = await roll.roll({async: true});
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  // Pre-creation
  async _preCreate(data, options, user){
    await super._preCreate(data, options, user);
    // Assign default image based on type
    const updates = {};
    switch(this.type){
      case 'weapon':
        updates["img"] = "icons/weapons/guns/gun-pistol-flintlock.webp";
        break;
      case 'armor':
        updates["img"] = "icons/commodities/tech/metal-panel.webp";
        break;
      case 'skill':
        updates["img"] = "icons/sundries/books/book-stack.webp";
        break;
      case 'magazine':
        updates["img"] = "icons/weapons/ammunition/bullets-cartridge-shell-gray.webp";
        break;
      case 'feature':
        updates["img"] = "icons/skills/trades/gaming-gambling-dice-gray.webp";
        break;
      case 'magic':
        updates["img"] = "icons/sundries/documents/paper-plain-white.webp";
        break;
      default:
        updates["img"] = "icons/consumables/grains/sack-oats-glowing-white.webp";
        break;

    }
    if(updates) return this.updateSource(updates);
  }
}
