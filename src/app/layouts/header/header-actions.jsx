import Link from "next/link";
import { Bell, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { HeaderIconButton } from "./header-icon-button";
export function HeaderActions({ isDarkMode, unresolvedAlarmCount, userName, onThemeToggle, }) {
    return (<div className="HeaderActions HeaderActions__container-1 flex shrink-0 items-center gap-1">
      <HeaderIconButton label={isDarkMode ? "밝은 화면으로 전환" : "어두운 화면으로 전환"} onClick={onThemeToggle}>
        {isDarkMode ? (<Sun className="HeaderActions HeaderActions__icon-1 h-4 w-4" aria-hidden="true"/>) : (<Moon className="HeaderActions HeaderActions__icon-2 h-4 w-4" aria-hidden="true"/>)}
      </HeaderIconButton>

      <button type="button" className="HeaderActions HeaderActions__button-1 relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground" title="알림" aria-label={`알림, 미처리 경보 ${unresolvedAlarmCount}건`}>
        <Bell className="HeaderActions HeaderActions__icon-3 h-4 w-4" aria-hidden="true"/>
        <span className="HeaderActions HeaderActions__label-1 absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {unresolvedAlarmCount}
        </span>
      </button>

      <Link href="/settings">
        <HeaderIconButton label="설정">
          <Settings className="HeaderActions HeaderActions__icon-4 h-4 w-4" aria-hidden="true"/>
        </HeaderIconButton>
      </Link>

      <button type="button" className="HeaderActions HeaderActions__button-2 flex h-9 max-w-36 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground" title="사용자 메뉴" aria-label="사용자 메뉴">
        <UserCircle className="HeaderActions HeaderActions__icon-5 h-4 w-4 shrink-0" aria-hidden="true"/>
        <span className="HeaderActions HeaderActions__label-2 hidden truncate text-xs font-medium md:inline">{userName}</span>
      </button>
    </div>);
}
