import { createContext, useContext } from "react";
const DashboardNotificationsContext = createContext(null);
export const DashboardNotificationsProvider = DashboardNotificationsContext.Provider;
export function useDashboardNotificationsController() {
    const context = useContext(DashboardNotificationsContext);
    if (!context) {
        throw new Error("useDashboardNotificationsController must be used within DashboardNotificationsProvider");
    }
    return context;
}
