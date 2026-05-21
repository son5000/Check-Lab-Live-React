"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { flattenTree } from "../helpers/monitoring-tree";
import { CompactTreeItem } from "./compact-tree-item";
import { MonitoringTreeItem } from "./monitoring-tree-item";
export function MonitoringTreeSection({ monitoringTree, activeNodeId, isCollapsed, }) {
    const expandableNodeIds = useMemo(() => collectExpandableNodeIds(monitoringTree), [monitoringTree]);
    const activeAncestorIds = useMemo(() => collectActiveAncestorIds(monitoringTree, activeNodeId), [activeNodeId, monitoringTree]);
    const knownExpandableNodeIdsRef = useRef(new Set(expandableNodeIds));
    const [expandedNodeIds, setExpandedNodeIds] = useState(() => new Set(expandableNodeIds));
    const compactTreeNodes = flattenTree(monitoringTree).filter((node) => node.type === "overview" || node.type === "site" || node.id === activeNodeId);
    useEffect(() => {
        const knownExpandableNodeIds = knownExpandableNodeIdsRef.current;
        setExpandedNodeIds((currentIds) => {
            const nextIds = new Set();
            expandableNodeIds.forEach((nodeId) => {
                if (currentIds.has(nodeId) || activeAncestorIds.includes(nodeId) || !knownExpandableNodeIds.has(nodeId)) {
                    nextIds.add(nodeId);
                }
            });
            return nextIds;
        });
        knownExpandableNodeIdsRef.current = new Set(expandableNodeIds);
    }, [activeAncestorIds, expandableNodeIds]);
    const handleToggleNode = (nodeId) => {
        setExpandedNodeIds((currentIds) => {
            const nextIds = new Set(currentIds);
            if (nextIds.has(nodeId)) {
                nextIds.delete(nodeId);
            }
            else {
                nextIds.add(nodeId);
            }
            return nextIds;
        });
    };
    return (<section className="MonitoringTreeSection MonitoringTreeSection__section-1 min-h-0 overflow-hidden rounded-md border border-sidebar-border bg-background/45 p-2">
      <div className={cn("MonitoringTreeSection MonitoringTreeSection__container-1 mb-1.5 flex h-5 items-center gap-1.5", isCollapsed && "md:justify-center")}>
        <ListTree className="MonitoringTreeSection MonitoringTreeSection__icon-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true"/>
        <h2 className={cn("MonitoringTreeSection MonitoringTreeSection__title-1 truncate text-xs font-semibold", isCollapsed && "md:hidden")}>
          관제 트리
        </h2>
      </div>

      {isCollapsed ? (<div className="MonitoringTreeSection MonitoringTreeSection__container-2 hidden justify-items-center gap-1 md:grid">
          {compactTreeNodes.map((node) => (<CompactTreeItem key={node.id} node={node} activeNodeId={activeNodeId}/>))}
        </div>) : null}

      <ul className={cn("MonitoringTreeSection MonitoringTreeSection__list-1 space-y-0.5", isCollapsed && "md:hidden")}>
        <MonitoringTreeItem node={monitoringTree} activeNodeId={activeNodeId} depth={0} expandedNodeIds={expandedNodeIds} onToggleNode={handleToggleNode}/>
      </ul>
    </section>);
}
function collectExpandableNodeIds(node) {
    return [
        ...(node.children?.length ? [node.id] : []),
        ...(node.children?.flatMap((child) => collectExpandableNodeIds(child)) ?? []),
    ];
}
function collectActiveAncestorIds(node, activeNodeId, ancestors = []) {
    if (node.id === activeNodeId) {
        return ancestors;
    }
    for (const child of node.children ?? []) {
        const childResult = collectActiveAncestorIds(child, activeNodeId, node.children?.length ? [...ancestors, node.id] : ancestors);
        if (childResult.length || child.id === activeNodeId) {
            return childResult;
        }
    }
    return [];
}
