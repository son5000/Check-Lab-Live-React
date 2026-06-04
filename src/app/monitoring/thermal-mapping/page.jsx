import { MainLayout } from "@/app/layouts/main-layout";
import { ThermalMappingPreviewPage } from "./thermal-mapping-preview-page";

export default function MonitoringThermalMappingPage() {
  return (
    <MainLayout activeNodeId="overview">
      <ThermalMappingPreviewPage />
    </MainLayout>
  );
}
