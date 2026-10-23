/** Native Figma mode imports: DTCG values plus cross-collection alias metadata. */
export function createFigmaExports(graph, brand) {
  const collections = new Map(graph.collections.map(collection => [collection.name, collection]));
  const resolve = (path, mode, seen = new Set()) => {
    if (seen.has(path)) throw new Error(`Alias cycle: ${path}`);
    const [collectionName, ...parts] = path.split('/');
    const collection = collections.get(collectionName);
    if (!collection) throw new Error(`Missing collection: ${collectionName}`);
    const values = collection.modes[mode] || Object.values(collection.modes)[0];
    const value = values[parts.join('/')];
    if (value === undefined) throw new Error(`Missing token: ${path}`);
    return value?.alias ? resolve(value.alias, mode, new Set([...seen, path])) : value;
  };
  const files = [];
  for (const collection of graph.collections) {
    for (const [mode, values] of Object.entries(collection.modes)) {
      const document = { $extensions: { 'com.sloyui.export': { version: graph.version, collection: `${brand.name} · ${collection.name}`, mode } } };
      for (const [name, value] of Object.entries(values)) {
        const metadata = graph.metadata[`${collection.name}/${name}`];
        const resolved = value?.alias ? resolve(value.alias, mode) : value;
        const token = { $type: { COLOR: 'color', FLOAT: 'number', STRING: 'string', BOOLEAN: 'number' }[metadata.type], $value: metadata.type === 'BOOLEAN' ? Number(resolved) : resolved, $extensions: { 'com.sloyui.variable': { scopes: metadata.scopes, visibility: metadata.visibility, codeSyntax: metadata.css ? { WEB: `var(${metadata.css})` } : {} } } };
        if (metadata.description) token.$description = metadata.description;
        if (value?.alias) {
          const [target, ...parts] = value.alias.split('/');
          token.$extensions['com.figma.aliasData'] = { targetVariableSetName: `${brand.name} · ${target}`, targetVariableName: parts.join('/') };
        }
        if (metadata.type === 'BOOLEAN') token.$extensions['com.figma.type'] = 'boolean';
        const path = name.split('/');
        let group = document;
        for (const part of path.slice(0, -1)) group = group[part] ||= {};
        group[path.at(-1)] = token;
      }
      files.push({ collection: collection.name, mode, count: Object.keys(values).length, filename: `${brand.slug}-${graph.version}-${collection.name.toLowerCase()}-${mode.toLowerCase()}.tokens.json`, document });
    }
  }
  return files;
}
