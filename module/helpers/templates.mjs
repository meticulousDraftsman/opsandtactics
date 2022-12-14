/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/opsandtactics/templates/actor/parts/actor-character.html",
    "systems/opsandtactics/templates/actor/parts/actor-items.html",
    "systems/opsandtactics/templates/actor/parts/actor-magic.html",
    "systems/opsandtactics/templates/actor/parts/actor-effects.html",
    "systems/opsandtactics/templates/actor/parts/actor-defense.html",
    "systems/opsandtactics/templates/actor/parts/actor-offense.html",
    "systems/opsandtactics/templates/actor/parts/actor-traits.html",
    // Item partials.
    "systems/opsandtactics/templates/item/parts/item-object.html"
  ]);
};
