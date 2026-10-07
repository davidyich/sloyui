import { useTranslate } from './locale.js';
import { useState, type ReactNode } from 'react';
import { FileCode2, FileJson2, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { TreeView, type TreeNode } from './tree-view.js';
import { Button, Counter, Icon, Tag, cx, type IconSource, type Size } from './primitives.js';
import { EmptyState } from './layout.js';

export interface FileTreeAction { id: string; label: string; icon?: IconSource; disabled?: boolean; onSelect: (node: FileTreeNode) => void }
export interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  icon?: IconSource | false;
  meta?: ReactNode;
  description?: ReactNode;
  preview?: ReactNode;
  actions?: FileTreeAction[];
  disabled?: boolean;
}
export interface FileTreeProps {
  nodes: FileTreeNode[];
  label: string;
  selectedId?: string;
  defaultSelectedId?: string;
  onSelect?: (node: FileTreeNode) => void;
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  size?: Size;
  showGuides?: boolean;
  showPreview?: boolean;
  emptyLabel?: string;
  className?: string;
}
function extension(name: string) { const dot = name.lastIndexOf('.'); return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''; }
function fileIcon(node: FileTreeNode, open: boolean): IconSource | false {
  if (node.icon !== undefined) return node.icon;
  if (node.type === 'folder') return open ? FolderOpen : 'folder';
  const suffix = extension(node.name);
  if (['ts', 'tsx', 'js', 'jsx', 'css', 'html', 'py', 'sh'].includes(suffix)) return FileCode2;
  if (['json', 'yaml', 'yml', 'toml'].includes(suffix)) return FileJson2;
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(suffix)) return ImageIcon;
  return 'page';
}

/** TreeView owns branch motion and complete tree keyboard navigation; actions are outside tree buttons. */
export function FileTree({ nodes, label, selectedId, defaultSelectedId, onSelect, expandedIds, defaultExpandedIds = [], onExpandedChange, size = 'md', showGuides = true, showPreview = true, emptyLabel: suppliedEmptyLabel, className }: FileTreeProps) {
  const t = useTranslate();
  const emptyLabel = suppliedEmptyLabel === undefined ? (t("Нет файлов", "No files")) : suppliedEmptyLabel;

  const [internalSelection, setInternalSelection] = useState(defaultSelectedId), [internalExpanded, setInternalExpanded] = useState(defaultExpandedIds);
  const expanded = expandedIds ?? internalExpanded, expandedSet = new Set(expanded);
  const byId = new Map<string, FileTreeNode>();
  const convert = (items: FileTreeNode[]): TreeNode[] => items.map(node => {
    byId.set(node.id, node);
    return { id: node.id, label: node.name, icon: fileIcon(node, expandedSet.has(node.id)), disabled: node.disabled,
      children: node.type === 'folder' ? convert(node.children ?? []) : undefined,
      meta: node.meta ?? (node.type === 'folder' ? <Counter value={node.children?.length ?? 0} size="xs" variant="plain"/> : extension(node.name) ? <Tag interactive={false} color="neutral" size="xs">{extension(node.name)}</Tag> : undefined),
    };
  });
  const treeNodes = convert(nodes), selected = byId.get(selectedId ?? internalSelection ?? '');
  const choose = (node: TreeNode) => {
    const file = byId.get(node.id);
    if (!file || file.disabled) return;
    if (selectedId === undefined) setInternalSelection(file.id);
    onSelect?.(file);
  };
  return <div className={cx('cap-file-tree', className)} data-preview={showPreview || undefined}>
    <div className="cap-file-tree-list">
      {nodes.length ? <TreeView label={label} nodes={treeNodes} selectedId={selected?.id} onSelect={choose} expandedIds={expanded} onExpandedChange={ids => { if (expandedIds === undefined) setInternalExpanded(ids); onExpandedChange?.(ids); }} size={size} showGuides={showGuides}/> : <EmptyState title={emptyLabel} icon={false}/>}
    </div>
    {showPreview && <section className="cap-file-tree-preview cap-surface-boundary" data-surface="raised" aria-label={`${label}${t(": предпросмотр", ": preview")}`}>
      {selected && !selected.disabled ? <div key={selected.id} className="cap-file-tree-preview-content"><div className="cap-file-tree-preview-heading">{fileIcon(selected, expandedSet.has(selected.id)) !== false && <Icon name={fileIcon(selected, expandedSet.has(selected.id)) as IconSource}/>}<strong>{selected.name}</strong></div>
        {selected.description && <div className="cap-file-tree-description">{selected.description}</div>}
        <div className="cap-file-tree-preview-body">{selected.preview ?? <p>{t("Для этого файла нет предпросмотра.", "No preview is available for this file.")}</p>}</div>
      </div> : <EmptyState title={nodes.length ? t("Выберите файл", "Choose a file") : emptyLabel} description={nodes.length ? t("Стрелки перемещают фокус, Enter или пробел выбирают файл.", "Arrow keys move focus; Enter or Space selects a file.") : undefined} icon={false}/>}
    </section>}
    {!!selected?.actions?.length && !selected.disabled && <div role="group" aria-label={`${selected.name}${t(": действия", ": actions")}`} className="cap-file-tree-actions">{selected.actions.map(action => <Button key={action.id} variant="ghost" size="sm" leading={action.icon && <Icon name={action.icon}/>} disabled={action.disabled} onClick={() => action.onSelect(selected)}>{action.label}</Button>)}</div>}
  </div>;
}
