import { fetchBackendMonitoringTree } from "@/app/monitoring/services/monitoring-tree-loader";
export const dynamic = "force-dynamic";
export async function GET() {
    try {
        const monitoringTree = await fetchBackendMonitoringTree();
        return Response.json(monitoringTree, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    }
    catch (error) {
        console.error("[CheckLab API] monitoring tree proxy failed", { error });
        return Response.json({ message: "Failed to load monitoring tree." }, { status: 502 });
    }
}
