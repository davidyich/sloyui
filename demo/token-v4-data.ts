import graphSource from '../figma/token-system-v4/graph.json';

export type TokenComposition = { color: {alias:string}; opacity:{alias:string} };
export type TokenValue = TokenComposition | string | number | { alias: string } | { r: number; g: number; b: number; a: number };
export type TokenVariable = { name: string; type: string; values: Record<string, TokenValue>; css?: string; description: string; unit?: string };
export type TokenCollection = { key: string; modes: string[]; variables: TokenVariable[]; description: string; hidden?: boolean };
export type TokenModes = Record<string, string>;
export const tokenGraph = graphSource as unknown as { schemaVersion: number; sourceHash: string; axes: Record<string, { default: string; values: string[] }>; collections: TokenCollection[] };
export const defaultTokenModes: TokenModes = Object.fromEntries(Object.entries(tokenGraph.axes).map(([key, axis]) => [key, axis.default]));
export const tokenIndex: Map<string, { collection: TokenCollection; variable: TokenVariable }> = new Map(tokenGraph.collections.flatMap(collection => collection.variables.map(variable => [`${collection.key}/${variable.name}`, { collection, variable }] as const)));
export const surfacePurposes = [
  { name: 'Shell', purpose: 'Оболочка приложения и общая навигация.', example: 'Навигация' },
  { name: 'Workspace', purpose: 'Рабочая область, список или боковая панель.', example: 'Список задач' },
  { name: 'Content', purpose: 'Документ, редактор или основной контент.', example: 'Документ' },
  { name: 'Invert', purpose: 'Инверсная область без смены темы.', example: 'Контрастная панель' },
  { name: 'Glass', purpose: 'Защищённая прозрачная область над текстурой.', example: 'Панель на изображении' },
  { name: 'Overlay', purpose: 'Всплывающее меню, popover или диалог.', example: 'Меню' },
] as const;

export function resolveTokenChain(path: string, modes: TokenModes = defaultTokenModes) {
  const chain: { path: string; mode: string; collection: TokenCollection; variable: TokenVariable; value: TokenValue }[] = [];
  const seen = new Set<string>();
  while (true) {
    if (seen.has(path)) throw new Error(`Token cycle: ${path}`);
    seen.add(path);
    const token = tokenIndex.get(path);
    if (!token) throw new Error(`Missing token: ${path}`);
    const mode = modes[token.collection.key] ?? token.collection.modes[0];
    const value = token.variable.values[mode];
    if (value === undefined) throw new Error(`Missing mode: ${path} (${mode})`);
    chain.push({ path, mode, ...token, value });
    if (typeof value !== 'object' || !('alias' in value)) return chain;
    path = value.alias;
  }
}
export function resolveTokenValue(path: string, modes: TokenModes = defaultTokenModes): Exclude<TokenValue,TokenComposition> { const value=resolveTokenChain(path,modes).at(-1)!.value;if(typeof value==='object'&&'color' in value){const pigment=resolveTokenValue(value.color.alias,modes) as {r:number;g:number;b:number;a:number};return {...pigment,a:Number(resolveTokenValue(value.opacity.alias,modes))/100};}return value; }
export function formatTokenValue(value: TokenValue, unit = ''): string {
  if (typeof value === 'object') {
    if ('alias' in value) return value.alias;
    if ('color' in value) return value.color.alias+' × '+value.opacity.alias;
    const bytes = [value.r, value.g, value.b].map(channel => Math.round(channel * 255));
    return value.a === 1 ? `#${bytes.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}` : `rgba(${bytes.join(', ')}, ${value.a})`;
  }
  return `${value}${typeof value === 'number' && unit ? ` ${unit}` : ''}`;
}
export function tokenColor(path: string, modes: TokenModes = defaultTokenModes) { return formatTokenValue(resolveTokenValue(path, modes)); }
