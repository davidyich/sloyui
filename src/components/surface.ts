/** Surface describes the purpose of a region, independently of its nesting depth. */
export type Surface = 'shell' | 'workspace' | 'content' | 'overlay' | 'invert' | 'glass'
  /** Compatibility spellings for existing consumers. */
  | 'page' | 'inset' | 'panel' | 'base' | 'canvas' | 'raised' | 'floating';
