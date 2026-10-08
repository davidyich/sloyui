import type { KanbanTask } from '../src';

/** Preserve task IDs; index is local to the target column after source removal. */
export function moveDemoTask(items: KanbanTask[], id: string, columnId: string, index: number): KanbanTask[] {
  const task = items.find(item => item.id === id); if (!task) return items;
  const next = items.filter(item => item.id !== id), targets = next.filter(item => item.columnId === columnId);
  const before = targets[index], insertion = before ? next.indexOf(before) : targets.length ? next.indexOf(targets[targets.length - 1]) + 1 : next.length;
  next.splice(insertion, 0, { ...task, columnId, completed: columnId === 'done' }); return next;
}
