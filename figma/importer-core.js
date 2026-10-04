/** Create only V2 collections. Roll back all newly created collections on any error. */
async function importCapacitiesVariables(figma, graph, selectedModes = graph.modes) {
  if (!Array.isArray(selectedModes) || selectedModes.length === 0 || new Set(selectedModes).size !== selectedModes.length || selectedModes.some(mode => !graph.modes.includes(mode))) throw new Error('Choose at least one valid accent mode.');
  const prefix = 'Capacities V2 · ';
  const existing = await figma.variables.getLocalVariableCollectionsAsync();
  if (existing.some(collection => graph.collections.some(c => prefix + c.name === collection.name))) throw new Error('Capacities V2 collections already exist. Use another file or rename the previous import before retrying. Nothing was changed.');
  const created = [], variables = new Map(), modeIds = new Map();
  const scope = name => name.includes('content/') || name.endsWith('/text') || name.endsWith('/ink') || name.endsWith('/on-solid') ? ['TEXT_FILL'] : name.includes('border/') || name.endsWith('/border') || name.includes('focus/') ? ['STROKE_COLOR'] : ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'];
  try {
    for (const definition of graph.collections) {
      const collection = figma.variables.createVariableCollection(prefix + definition.name);
      created.push(collection);
      const names = Object.keys(definition.modes).filter(name => definition.name !== 'Accent' || selectedModes.includes(name));
      collection.renameMode(collection.defaultModeId, names[0]);
      const ids = new Map([[names[0], collection.defaultModeId]]);
      for (const name of names.slice(1)) ids.set(name, collection.addMode(name));
      modeIds.set(definition.name, ids);
      for (const name of Object.keys(definition.modes[names[0]])) {
        const variable = figma.variables.createVariable(name, collection, 'COLOR');
        variable.scopes = scope(name);
        variable.description = definition.name === 'Accent' ? 'Shared 12-step accent scale. Set the Accent mode on a parent frame.' : 'Capacities UI V2. Generated from src/tokens/figma-modes.json.';
        variable.setVariableCodeSyntax('WEB', `var(--cap-${name.replaceAll('/', '-')})`);
        variables.set(`${definition.name}/${name}`, variable);
      }
    }
    for (const definition of graph.collections) for (const [mode, id] of modeIds.get(definition.name)) for (const [name, value] of Object.entries(definition.modes[mode])) {
      const resolved = value.alias ? { type: 'VARIABLE_ALIAS', id: variables.get(value.alias).id } : { r: value.components[0], g: value.components[1], b: value.components[2], a: value.alpha };
      variables.get(`${definition.name}/${name}`).setValueForMode(id, resolved);
    }
    return { collections: created.map(c => ({ id: c.id, name: c.name, modes: c.modes })), variableIds: [...variables.values()].map(v => v.id), variableCount: variables.size, accentModes: selectedModes, appearances: ['Light', 'Dark'] };
  } catch (error) {
    for (const collection of created.reverse()) collection.remove();
    throw new Error(`${String(error.message || error)} All collections created by this attempt were removed. If your Figma plan limits modes, select fewer accents and retry.`);
  }
}
