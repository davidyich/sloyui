// Figma resolves aliases using each collection's independently inherited mode.
export function separateFigmaContexts(semantic, metadata) {
 const theme = { Light: {}, Dark: {} }, surface = { Base: {}, Canvas: {}, Raised: {}, Floating: {} };
 const primitiveRef = (ref, mode, seen = []) => {
  if (ref.startsWith('Primitives/')) return ref;
  if (seen.includes(ref)) throw Error('Alias cycle: ' + ref);
  return primitiveRef(semantic[mode][ref.slice('Semantic/'.length)].alias, mode, [...seen, ref]);
 };
 for (const name of Object.keys(semantic['Light · Base'])) {
  const pairs = Object.fromEntries(Object.keys(surface).map(s => [s, Object.fromEntries(Object.keys(theme).map(t => [t, primitiveRef('Semantic/' + name, t + ' · ' + s)]))]));
  const shared = Object.values(pairs).every(pair => JSON.stringify(pair) === JSON.stringify(pairs.Base));
  for (const s of Object.keys(surface)) {
   const key = shared ? name : 'context/' + s.toLowerCase() + '/' + name;
   for (const t of Object.keys(theme)) theme[t][key] = { alias: pairs[s][t] };
   surface[s][name] = { alias: 'Theme/' + key };
   metadata['Theme/' + key] = { ...metadata['Semantic/' + name], scopes: [], css: metadata['Semantic/' + name].css };
  }
 }
 return [{ name: 'Theme', modes: theme }, { name: 'Semantic', modes: surface }];
}
