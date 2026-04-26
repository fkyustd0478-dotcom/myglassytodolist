// workout_config.js — Dynamic exercise category discovery
// Depends on: workout_data.js (for _defaultCategoryTree, _defaultExercises fallbacks)
// Exposes: window.WorkoutConfig.getAvailableExerciseCategories()
'use strict';

window.WorkoutConfig = (function () {
    /**
     * Scans the Action Library and category tree from localStorage.
     * Returns sub-categories grouped by their main categories,
     * filtered to only those that have at least one exercise in the library.
     *
     * @returns {Array<{main: {name: string, nameZh: string}, subs: Array<{name: string, nameZh: string}>}>}
     */
    function getAvailableExerciseCategories() {
        const treeRaw = JSON.parse(localStorage.getItem('lapis_workout_categories') || 'null');
        const libRaw  = JSON.parse(localStorage.getItem('lapis_workout_library')    || 'null');

        const tree = (treeRaw && Array.isArray(treeRaw) && treeRaw.length > 0)
            ? treeRaw
            : (typeof _defaultCategoryTree === 'function' ? _defaultCategoryTree() : []);

        const library = (libRaw && Array.isArray(libRaw) && libRaw.length > 0)
            ? libRaw
            : (typeof _defaultExercises === 'function' ? _defaultExercises() : []);

        // Collect every category name used by any library exercise
        const usedCats = new Set();
        library.forEach(ex => (ex.categories || []).forEach(c => usedCats.add(c)));

        // Walk top-level tree nodes (main categories), collect used immediate children (sub-categories)
        return tree
            .map(main => ({
                main: { name: main.name, nameZh: main.nameZh || main.name },
                subs: (main.children || [])
                    .filter(sub => usedCats.has(sub.name))
                    .map(sub => ({ name: sub.name, nameZh: sub.nameZh || sub.name }))
            }))
            .filter(group => group.subs.length > 0);
    }

    return { getAvailableExerciseCategories };
})();
