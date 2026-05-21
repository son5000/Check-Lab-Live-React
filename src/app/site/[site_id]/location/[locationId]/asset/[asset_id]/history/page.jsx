import { redirect } from "next/navigation";
export default function AssetHistoryPage({ params, }) {
    redirect(`/site/${params.site_id}/location/${params.locationId}/asset/${params.asset_id}`);
}
