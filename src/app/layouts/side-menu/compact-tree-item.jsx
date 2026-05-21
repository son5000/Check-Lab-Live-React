import Link from "next/link";
import { cn } from "@/lib/utils";
import { treeIconMap } from "../constants/dashboard-icons";
export function CompactTreeItem({ node, activeNodeId }) {
    const Icon = treeIconMap[node.type];
    const isActive = node.id === activeNodeId;
    const className = cn("grid h-8 w-10 place-items-center rounded-md transition", isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground");
    const icon = <Icon className="CompactTreeItem CompactTreeItem__icon-1 h-4 w-4" aria-hidden="true"/>;
    if (node.href) {
        return (<Link className={cn("CompactTreeItem CompactTreeItem__link-1", className)} title={node.label} aria-label={node.label} aria-current={isActive ? "page" : undefined} href={node.href}>
        {icon}
      </Link>);
    }
    return (<button type="button" className={cn("CompactTreeItem CompactTreeItem__button-1", className)} title={node.label} aria-label={node.label} aria-current={isActive ? "page" : undefined}>
      {icon}
    </button>);
}
