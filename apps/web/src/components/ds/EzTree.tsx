import { HTMLAttributes, ReactNode, forwardRef, useState } from 'react';
import { cn } from './utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface EzTreeNode {
  id: string | number;
  label: string;
  children?: EzTreeNode[];
  icon?: ReactNode;
}

export interface EzTreeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /**
   * The root nodes of the tree. Each node may have nested `children`.
   */
  nodes: EzTreeNode[];
  /**
   * Called with the clicked node.
   */
  onSelect?: (node: EzTreeNode) => void;
  /**
   * Id of the currently selected node, to highlight it.
   */
  selectedId?: string | number;
  /**
   * Ids of nodes expanded by default.
   */
  defaultExpandedIds?: (string | number)[];
}

interface EzTreeNodeItemProps {
  node: EzTreeNode;
  level: number;
  selectedId?: string | number;
  onSelect?: (node: EzTreeNode) => void;
  expanded: Set<string | number>;
  toggleExpand: (id: string | number) => void;
}

function EzTreeNodeItem({ node, level, selectedId, onSelect, expanded, toggleExpand }: EzTreeNodeItemProps) {
  const hasChildren = !!node.children && node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isOpen : undefined}
        data-testid={`tree-node-${node.id}`}
        onClick={() => onSelect?.(node)}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        className={cn(
          'flex items-center gap-1 py-1.5 pr-2 rounded-[8px] cursor-pointer text-[14px] transition-colors select-none',
          isSelected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-900 hover:bg-gray-90'
        )}
      >
        <button
          type="button"
          aria-label={isOpen ? 'Recolher' : 'Expandir'}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(node.id);
          }}
          className={cn(
            'flex items-center justify-center w-4 h-4 shrink-0',
            !hasChildren && 'opacity-0 pointer-events-none'
          )}
        >
          {hasChildren &&
            (isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>
        {node.icon && (
          <span className="flex items-center justify-center w-4 h-4 shrink-0">{node.icon}</span>
        )}
        <span className="truncate">{node.label}</span>
      </div>

      {hasChildren && isOpen && (
        <div role="group">
          {node.children!.map((child) => (
            <EzTreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expanded={expanded}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Aponta DS Tree (inspired by @sankhyalabs/ezui)
 * Expandable hierarchical tree with per-level indentation.
 */
export const EzTree = forwardRef<HTMLDivElement, EzTreeProps>(
  ({ nodes, onSelect, selectedId, defaultExpandedIds = [], className, ...props }, ref) => {
    const [expanded, setExpanded] = useState<Set<string | number>>(new Set(defaultExpandedIds));

    const toggleExpand = (id: string | number) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    return (
      <div ref={ref} role="tree" className={cn('flex flex-col w-full gap-0.5', className)} {...props}>
        {nodes.map((node) => (
          <EzTreeNodeItem
            key={node.id}
            node={node}
            level={0}
            selectedId={selectedId}
            onSelect={onSelect}
            expanded={expanded}
            toggleExpand={toggleExpand}
          />
        ))}
      </div>
    );
  }
);

EzTree.displayName = 'EzTree';
