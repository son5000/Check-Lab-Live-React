import { Menu, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderActions } from "./header/header-actions";
import { HeaderClock } from "./header/header-clock";
import { HeaderIconButton } from "./header/header-icon-button";
import { HeaderStatusSummary } from "./header/header-status-summary";
export function MainHeader({ headerState, currentDate, currentTime, isDarkMode, isSidebarCollapsed, isMobileSidebarOpen, onMenuToggle, onThemeToggle, }) {
    const menuLabel = isMobileSidebarOpen || isSidebarCollapsed ? "사이드 메뉴 열기" : "사이드 메뉴 닫기";
    return (<header className="MainHeader MainHeader__header-1 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border bg-background px-2.5 md:px-3">
      <div className="MainHeader MainHeader__container-1 flex min-w-0 items-center gap-2">
        <HeaderIconButton label={menuLabel} onClick={onMenuToggle}>
          <Menu className="MainHeader MainHeader__icon-1 h-4 w-4 md:hidden" aria-hidden="true"/>
          <PanelLeftClose className={cn("MainHeader MainHeader__icon-2 hidden h-4 w-4 md:block", isSidebarCollapsed && "rotate-180")} aria-hidden="true"/>
        </HeaderIconButton>

        <HeaderStatusSummary headerState={headerState}/>
      </div>

      <HeaderClock currentDate={currentDate} currentTime={currentTime}/>

      <div className="MainHeader MainHeader__container-2 flex min-w-0 justify-end">
        <HeaderActions isDarkMode={isDarkMode} unresolvedAlarmCount={headerState.unresolvedAlarmCount} userName={headerState.userName} onThemeToggle={onThemeToggle}/>
      </div>
    </header>);
}
