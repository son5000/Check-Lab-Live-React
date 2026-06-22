import { LocationWorldViewerPage } from "@/app/site/[site_id]/location/[locationId]/world/location-world-viewer-page";
import {
  sampleAssets,
  sampleLocation,
  sampleSite,
} from "@/app/site/[site_id]/location/[locationId]/world/sample-wind-farm-demo";

export default function LocationWorldViewerRoutePage() {
  return (
    <LocationWorldViewerPage
      assets={sampleAssets}
      location={sampleLocation}
      site={sampleSite}
    />
  );
}
