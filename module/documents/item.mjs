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
   * Sums the impacts of an attack's modifiers, including factors from an actor if present
   * @param {Object} sourceAttack The attack whose modifiers are being tallied
   * @returns {Object} The total to-hit, hit modifier, damage terms, combined damage string, recoil penalty and reduction, and combat point cost
   */
  attackSum(sourceAttack){
    const mods = {
      hit: sourceAttack.hit.attack,
      damageParts: [sourceAttack.damage.attack || null],
      recoil: Math.min(sourceAttack.recoil.attack,0),
      reduction: Math.max(sourceAttack.recoil.attack,0), //Just in case there's some weird attack that has inherent recoil reduction
      cp: sourceAttack.cp.attack
    };
    if (this.actor){
      mods.hit += this.actor.system.stats.bab.value + this.actor.abilityMod(sourceAttack.hit.ability);
      mods.damageParts.push(Math.floor(this.actor.abilityMod(sourceAttack.damage.ability)*sourceAttack.damage.scaleAbility) ? `${Math.floor(this.actor.abilityMod(sourceAttack.damage.ability)*sourceAttack.damage.scaleAbility)>0 ? '+' : ''}${Math.floor(this.actor.abilityMod(sourceAttack.damage.ability)*sourceAttack.damage.scaleAbility)}` : null);
      if (this.actor.system.stats.recoil.value>0){
        mods.reduction += this.actor.system.stats.recoil.value;
      }
      else {
        mods.recoil += this.actor.system.stats.recoil.value;
      }
    }
    for (let [,h] of Object.entries(sourceAttack.hit.mods)){
      mods.hit += h.value;
    }
    for (let [,d] of Object.entries(sourceAttack.damage.mods)){
      mods.damageParts.push(d.value ? `${d.value>=0 ? '+' : ''}${d.value}` : null);
    }
    for (let [,r] of Object.entries(sourceAttack.recoil.mods)){
      if (r.value > 0){
        mods.reduction += r.value;
      }
      else {
        mods.recoil += r.value;
      }
    }
    for (let [,c] of Object.entries(sourceAttack.cp.mods)){
      mods.cp += c.value;
    }
    mods.hitTotal = mods.hit + Math.min(mods.recoil+mods.reduction,0);
    mods.damageParts = mods.damageParts.filter(part => part != null);
    mods.damageTotal = mods.damageParts.join('') || '0';
    if (mods.damageTotal.charAt(0) == '+') mods.damageTotal = mods.damageTotal.substring(1);
    //console.debug(mods)
    return mods;
  }

  skillSum(){
    const mods = {
      ability: (this?.actor ? this.actor.abilityMod(this.system.ability) : 0),
      equip: 0,
      syn: 0,
      occ: (this.system.focus == 'double' ? 1 : 0),
      armor: (this.system.armor.active ? (this?.actor ? this.actor.system.stats.armorPenalty.value : null) : null),
      misc: 0
    };
    for (let [,mod] of Object.entries(this.system.mods)){
      if (mod.active) mods[mod.type] += mod.value;
    }
    let labelParts = [
      (this.system.ranks ? `${this.system.ranks} Ranks` : null),
      (mods.ability ? `${mods.ability>=0 ? '+' : ''}${mods.ability} ${this.system.ability.toUpperCase()}` : null),
      (mods.occ ? `${mods.occ>0 ? '+' : ''}${mods.occ} Occupation` : null),
      (mods.equip ? `${mods.equip>0 ? '+' : ''}${mods.equip} Equipment` : null),
      (mods.syn ? `${mods.syn>0 ? '+' : ''}${mods.syn} Synergy` : null),
      (mods.armor ? `${mods.armor>0 ? '+' : ''}${mods.armor} Armor` : null),
      (mods.misc ? `${mods.misc>0 ? '+' : ''}${mods.misc} Misc.` : null)
    ]
    labelParts = labelParts.filter(part => part != null);
    mods.label = labelParts.join(', ') || 'No Modifiers';
    mods.total = this.system.ranks + mods.ability + mods.occ + mods.equip + mods.syn + mods.armor + mods.misc;
    return mods;    
  }

  labelMake(){
    let label = this.name;
    switch(this.type){
      case 'magazine':
        label = `${this.name} [${this.system.magazine.value}/${this.system.magazine.max}]`;
        if (this.system.magazine.type==='coolant') label = `[${this.system.coolant.hot?'Hot':'Cool'}] ${this.name}`;
        break;
      default:
        break;      
    }
    return label;
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
