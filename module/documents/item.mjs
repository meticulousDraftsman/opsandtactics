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
  }
  _prepareWeaponData(itemData){
    const systemData = itemData.system;
    // Map weapon mods values to attacks
     for (let [,a] of Object.entries(systemData.attacks)){
       for (let [key,entry] of Object.entries(a.hit.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.hit ?? null;
       }
       for (let [key,entry] of Object.entries(a.damage.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.damage ?? null;
       }
       for (let [key,entry] of Object.entries(a.recoil.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.recoil ?? null;
       }
       for (let [key,entry] of Object.entries(a.cp.mods)){
        entry.name = systemData.weaponMods?.[key]?.name ?? 'Error';
        entry.value = systemData.weaponMods?.[key]?.cp ?? null;
       }
      }
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
