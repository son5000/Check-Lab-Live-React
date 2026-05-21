import { cn } from "@/lib/utils";
import { ManagementMenuSection } from "./side-menu/management-menu-section";
import { MonitoringTreeSection } from "./side-menu/monitoring-tree-section";
import { SideMenuBrand } from "./side-menu/side-menu-brand";
export function MainSideMenu({ monitoringTree, activeNodeId, managementMenuItems, isCollapsed, isMobileOpen, onCloseMobile, }) {
    return (<>
      {isMobileOpen ? (<button type="button" className="MainSideMenu MainSideMenu__button-1 MainSideMenuOverlay absolute inset-0 z-30 bg-black/35 md:hidden" aria-label="사이드 메뉴 닫기" onClick={onCloseMobile}/>) : null}

      <aside className={cn("MainSideMenu MainSideMenu__panel-1 absolute inset-y-0 left-0 z-40 flex h-full min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[transform,width] duration-200 md:static md:translate-x-0 md:shadow-none", isMobileOpen ? "translate-x-0" : "-translate-x-full", isCollapsed ? "w-[280px] md:w-[72px]" : "w-[280px]")} aria-label="대시보드 사이드 메뉴">
        <div className="MainSideMenu MainSideMenu__container-1 MainSideMenuInner flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2">
          <SideMenuBrand isCollapsed={isCollapsed}/>

          <div className="MainSideMenu MainSideMenu__container-2 MainSideMenuSections grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2">
            <MonitoringTreeSection monitoringTree={monitoringTree} activeNodeId={activeNodeId} isCollapsed={isCollapsed}/>
            <ManagementMenuSection items={managementMenuItems} isCollapsed={isCollapsed}/>
          </div>
        </div>
      </aside>
    </>);
}
