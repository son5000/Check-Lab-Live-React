import { cn } from "@/lib/utils";
import { brandIcon as BrandIcon } from "../constants/dashboard-icons";
export function SideMenuBrand({ isCollapsed }) {
    return (<div className="SideMenuBrand SideMenuBrand__container-1 flex h-10 shrink-0 items-center gap-2 px-2">
      <div className="SideMenuBrand SideMenuBrand__container-2 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <BrandIcon className="SideMenuBrand SideMenuBrand__icon-1 h-4 w-4" aria-hidden="true"/>
      </div>
      <div className={cn("SideMenuBrand SideMenuBrand__container-3 min-w-0", isCollapsed && "md:hidden")}>
        <p className="SideMenuBrand SideMenuBrand__text-1 truncate text-sm font-semibold">공정 관제</p>
        <p className="SideMenuBrand SideMenuBrand__text-2 truncate text-[11px] text-muted-foreground">전체 설비 구조</p>
      </div>
    </div>);
}
