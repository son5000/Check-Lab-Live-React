"use client";
import { createContext, useContext } from "react";
const DashboardShellStateContext = createContext({
    isSidebarCollapsed: false,
    isMobileSidebarOpen: false,
});
export const DashboardShellStateProvider = DashboardShellStateContext.Provider;
export function useDashboardShellState() {
    return useContext(DashboardShellStateContext);
}
