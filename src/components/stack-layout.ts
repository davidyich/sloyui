export type StackDirection = 'up' | 'down' | 'left' | 'right';
export interface StackSize { width: number; height: number }
/** Bounds include every translated item, so inline stacks and fixed anchors reserve real space. */
export function stackLayout(sizes: StackSize[], direction: StackDirection, expanded: boolean, gap = 8) {
  const horizontal = direction === 'left' || direction === 'right', sign = direction === 'up' || direction === 'left' ? -1 : 1;
  let offset = 0;
  const positions = sizes.map((size, index) => {
    if (expanded && index > 0) { const distance = sign > 0 ? sizes[index - 1] : size; offset += (horizontal ? distance.width : distance.height) + gap; }
    const shift = sign * (expanded ? offset : index * gap);
    return { x: horizontal ? shift : 0, y: horizontal ? 0 : shift, ...size };
  });
  const minX = Math.min(0, ...positions.map(item => item.x)), minY = Math.min(0, ...positions.map(item => item.y));
  return { width: Math.max(0, ...positions.map(item => item.x + item.width)) - minX, height: Math.max(0, ...positions.map(item => item.y + item.height)) - minY, positions: positions.map(item => ({...item, x: item.x - minX, y: item.y - minY})) };
}
