"use client";
import { createContext, useContext } from "react";
const DashboardHeaderStateContext = createContext({
    setHeaderState: () => undefined,
});
export const DashboardHeaderStateProvider = DashboardHeaderStateContext.Provider;
export function useDashboardHeaderStateController() {
    return useContext(DashboardHeaderStateContext);
}
