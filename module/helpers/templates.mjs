/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/opsandtactics/templates/actor/parts/actor-effects.html",
    "systems/opsandtactics/templates/actor/parts/nested-gear.html",
    "systems/opsandtactics/templates/actor/parts/object-resources.html",
    "systems/opsandtactics/templates/actor/parts/character-character.html",
    "systems/opsandtactics/templates/actor/parts/character-items.html",
    "systems/opsandtactics/templates/actor/parts/character-utility.html",
    "systems/opsandtactics/templates/actor/parts/character-defense.html",
    "systems/opsandtactics/templates/actor/parts/character-offense.html",
    "systems/opsandtactics/templates/actor/parts/character-traits.html",
    "systems/opsandtactics/templates/actor/parts/character-biography.html",
    "systems/opsandtactics/templates/actor/parts/vehicle-vehicle.html",
    "systems/opsandtactics/templates/actor/parts/vehicle-actions.html",
    // Item partials.
    "systems/opsandtactics/templates/item/parts/item-object.html",
    "systems/opsandtactics/templates/item/parts/item-effects.html"
  ]);
};
