/**
 * Manage Active Effect instances through the Actor Sheet via effect control buttons.
 * @param {MouseEvent} event      The left-click event on the effect control
 * @param {Actor|Item} owner      The owning document which manages this effect
 */
 export function onManageActiveEffect(event, owner) {
  event.preventDefault();
  const a = event.currentTarget;
  const li = a.closest("li");
  let effect;
  if (li.dataset.effectId){
    if (owner.documentName=="Actor"){
      effect = Array.from(owner.allApplicableEffects()).find((element) => element.uuid == li.dataset.effectId) ?? null;
    }
    else{
      effect = Array.from(owner.effects).find((element) => element.uuid == li.dataset.effectId) ?? null;
    }
  }
  else {
    effect = null;
  }
  switch ( a.dataset.action ) {
    case "create":
      return owner.createEmbeddedDocuments("ActiveEffect", [{
        label: "New Effect",
        icon: "icons/svg/aura.svg",
        origin: owner.uuid,
        "duration.rounds": li.dataset.effectType === "temporary" ? 1 : undefined,
        disabled: li.dataset.effectType === "inactive"
      }]);
    case "edit":
      effect.sheet.render(true);
      break;
    case "delete":
      effect.delete();
      break;
    case "toggle":
      effect.update({disabled: !effect.disabled});
      break;
  }
}

/**
 * Prepare the data structure for Active Effects which are currently applied to an Actor or Item.
 * @param {ActiveEffect[]} effects    The array of Active Effect instances to prepare sheet data for
 * @return {object}                   Data for rendering
 */
export function prepareActiveEffectCategories(effects) {

    // Define effect header categories
    const categories = {
      temporary: {
        type: "temporary",
        label: "Temporary Effects",
        effects: []
      },
      passive: {
        type: "passive",
        label: "Passive Effects",
        effects: []
      },
      inactive: {
        type: "inactive",
        label: "Inactive Effects",
        effects: []
      }
    };

    // Iterate over active effects, classifying them into categories
    for ( let e of effects ) {
      //e._getSourceName(); // Trigger a lookup for the source name
      if ( e.disabled ) categories.inactive.effects.push(e);
      else if ( e.isTemporary ) categories.temporary.effects.push(e);
      else categories.passive.effects.push(e);
    }
    return categories;
}