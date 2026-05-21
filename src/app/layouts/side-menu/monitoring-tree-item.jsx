import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { treeIconMap } from "../constants/dashboard-icons";
export function MonitoringTreeItem({ node, activeNodeId, depth, expandedNodeIds, onToggleNode, }) {
    const Icon = treeIconMap[node.type];
    const hasChildren = Boolean(node.children?.length);
    const isExpanded = hasChildren && expandedNodeIds.has(node.id);
    const isActive = node.id === activeNodeId;
    const labelContent = (<>
      <Icon className="MonitoringTreeItem MonitoringTreeItem__icon-2 h-3.5 w-3.5 shrink-0" aria-hidden="true"/>
      <span className="MonitoringTreeItem MonitoringTreeItem__label-2 min-w-0 truncate">{node.label}</span>
    </>);
    const rowClassName = cn("flex h-5 w-full min-w-0 items-center gap-1.5 rounded-md pr-1.5 text-left text-xs transition", isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground");
    const labelClassName = "MonitoringTreeItem MonitoringTreeItem__link-1 flex min-w-0 flex-1 items-center gap-1.5 text-left";
    return (<li className="MonitoringTreeItem MonitoringTreeItem__item-1">
      <div className={cn("MonitoringTreeItem MonitoringTreeItem__row-1", rowClassName)} style={{ paddingLeft: `${depth * 10 + 6}px` }}>
        {hasChildren ? (<button type="button" className="MonitoringTreeItem MonitoringTreeItem__button-1 grid h-4 w-4 shrink-0 place-items-center rounded-sm transition hover:bg-sidebar-accent" title={isExpanded ? `${node.label} 접기` : `${node.label} 펼치기`} aria-label={isExpanded ? `${node.label} 접기` : `${node.label} 펼치기`} aria-expanded={isExpanded} onClick={() => onToggleNode(node.id)}>
            <ChevronDown className={cn("MonitoringTreeItem MonitoringTreeItem__icon-1 h-3 w-3 opacity-70 transition-transform", !isExpanded && "-rotate-90")} aria-hidden="true"/>
          </button>) : (<span className="MonitoringTreeItem MonitoringTreeItem__label-1 h-4 w-4 shrink-0" aria-hidden="true"/>)}
        {node.href ? (<Link className={labelClassName} title={node.label} href={node.href} aria-current={isActive ? "page" : undefined}>
            {labelContent}
          </Link>) : (<button type="button" className={labelClassName} title={node.label} aria-current={isActive ? "page" : undefined}>
            {labelContent}
          </button>)}
      </div>
      {isExpanded ? (<ul className="MonitoringTreeItem MonitoringTreeItem__list-1 mt-0.5 space-y-0.5">
          {node.children?.map((child) => (<MonitoringTreeItem key={child.id} node={child} activeNodeId={activeNodeId} depth={depth + 1} expandedNodeIds={expandedNodeIds} onToggleNode={onToggleNode}/>))}
        </ul>) : null}
    </li>);
}
