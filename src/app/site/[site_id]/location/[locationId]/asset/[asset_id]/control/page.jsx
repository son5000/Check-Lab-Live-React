import { redirect } from "next/navigation";
export default function AssetControlPage({ params, }) {
    redirect(`/site/${params.site_id}/location/${params.locationId}/asset/${params.asset_id}`);
}
