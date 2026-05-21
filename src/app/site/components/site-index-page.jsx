"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    buildCreatePreviewSite,
    CreateSiteDialog,
} from "@/app/site/components/create-site-dialog";
import { Metric } from "@/app/site/components/site-form-fields";
import { SiteCardList } from "@/app/site/components/site-card-list";
import { SiteEditor } from "@/app/site/components/site-editor";
import { SiteTree } from "@/app/site/components/site-tree";
import { createAsset as createManagedAsset, createLocation as createManagedLocation, createSite as createManagedSite, deleteAsset as deleteManagedAsset, deleteLocation as deleteManagedLocation, deleteSite as deleteManagedSite, updateAsset as updateManagedAsset, updateLocation as updateManagedLocation, updateSite as updateManagedSite, } from "@/app/site/services/site-management-client";
import { applyAssetResponse, applyLocationResponse, applySiteResponse, EMPTY_INITIAL_SITES, emptyAsset, emptyLocation, emptySite, getApiErrorMessage, getItemAt, normalizeAsset, normalizeLocation, normalizeSite, readStoredSites, recalculateSiteCounts, SITE_BUILDER_STORAGE_KEY, toCreateAssetPayload, toCreateLocationPayload, toCreateSitePayload, toSiteBuilderSite, toUpdateAssetPayload, toUpdateLocationPayload, toUpdateSitePayload, } from "@/app/site/components/site-builder-model";
export function SiteIndexPage({ initialSites = EMPTY_INITIAL_SITES, }) {
    const initialBackendSites = useMemo(() => initialSites.map(toSiteBuilderSite), [initialSites]);
    const [sites, setSites] = useState(initialBackendSites);
    const [hasLoadedStoredSites, setHasLoadedStoredSites] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [activeSiteIndex, setActiveSiteIndex] = useState();
    const [activeLocationIndex, setActiveLocationIndex] = useState();
    const [editorStep, setEditorStep] = useState("site");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createStep, setCreateStep] = useState("site");
    const [createDraftSite, setCreateDraftSite] = useState(emptySite);
    const [createDraftLocation, setCreateDraftLocation] = useState(emptyLocation);
    const [createDraftLocations, setCreateDraftLocations] = useState([]);
    const [createDraftAsset, setCreateDraftAsset] = useState(emptyAsset);
    const [createDraftAssets, setCreateDraftAssets] = useState([]);
    const [createAssetLocationKey, setCreateAssetLocationKey] = useState();
    const [isCreateLocationSkipped, setIsCreateLocationSkipped] = useState(false);
    const [isCreateAssetSkipped, setIsCreateAssetSkipped] = useState(false);
    const [draftSite, setDraftSite] = useState(emptySite);
    const [draftLocation, setDraftLocation] = useState(emptyLocation);
    const [draftAsset, setDraftAsset] = useState(emptyAsset);
    const [editingAssetId, setEditingAssetId] = useState();
    const [pendingAction, setPendingAction] = useState();
    const [apiMessage, setApiMessage] = useState();
    const [siteDeleteTargetIndex, setSiteDeleteTargetIndex] = useState();
    const [siteDeleteConfirmText, setSiteDeleteConfirmText] = useState("");
    // 트리 펼침 상태: site_id → boolean
    const [expandedSites, setExpandedSites] = useState({});
    // location 트리 펼침 상태: location_id → boolean
    const [expandedLocations, setExpandedLocations] = useState({});
    const activeSite = getItemAt(sites, activeSiteIndex);
    const activeLocation = getItemAt(activeSite?.locations, activeLocationIndex);
    const isMutating = Boolean(pendingAction);
    const canSaveSite = Boolean(draftSite.name.trim());
    const canSaveLocation = Boolean(activeSite?.site_id.trim() &&
        draftLocation.name.trim() &&
        (activeLocationIndex === undefined || activeLocation?.location_id.trim()));
    const canSaveAsset = Boolean(activeSite &&
        activeLocation &&
        activeLocation.location_id.trim() &&
        draftAsset.name.trim() &&
        (!editingAssetId || editingAssetId.trim()));
    const canContinueCreateSite = Boolean(createDraftSite.name.trim());
    const canContinueCreateLocation = Boolean(createDraftLocation.name.trim() ||
        createDraftLocations.length);
    const canContinueCreateAsset = Boolean(createDraftAssets.length ||
        (createDraftAsset.name.trim() && createDraftLocations.length));
    const createPreviewSite = useMemo(() => buildCreatePreviewSite({
        asset: createDraftAsset,
        assetLocationKey: createAssetLocationKey,
        assets: createDraftAssets,
        isAssetSkipped: isCreateAssetSkipped,
        isLocationSkipped: isCreateLocationSkipped,
        location: createDraftLocation,
        locations: createDraftLocations,
        site: createDraftSite,
    }), [
        createAssetLocationKey,
        createDraftAsset,
        createDraftAssets,
        createDraftLocation,
        createDraftLocations,
        createDraftSite,
        isCreateAssetSkipped,
        isCreateLocationSkipped,
    ]);
    const totals = useMemo(() => sites.reduce((currentTotals, site) => ({
        alerts: currentTotals.alerts + site.alertCount,
        assets: currentTotals.assets + site.assetCount,
        locations: currentTotals.locations + site.locationCount,
        sites: currentTotals.sites + 1,
    }), { alerts: 0, assets: 0, locations: 0, sites: 0 }), [sites]);
    // ── Storage ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (initialBackendSites.length) {
            setSites(initialBackendSites);
            setActiveSiteIndex(0);
            setDraftSite(initialBackendSites[0]);
            setHasLoadedStoredSites(true);
            return;
        }
        const storedSites = readStoredSites();
        if (storedSites.length) {
            setSites(storedSites);
            setActiveSiteIndex(0);
            setDraftSite(storedSites[0]);
        }
        setHasLoadedStoredSites(true);
    }, [initialBackendSites]);
    useEffect(() => {
        if (!hasLoadedStoredSites)
            return;
        window.localStorage.setItem(SITE_BUILDER_STORAGE_KEY, JSON.stringify(sites));
    }, [hasLoadedStoredSites, sites]);
    // ── Handlers ─────────────────────────────────────────────────────────────
    const runMutation = async (action, failureMessage, mutation) => {
        setPendingAction(action);
        setApiMessage(undefined);
        try {
            return await mutation();
        }
        catch (error) {
            setApiMessage({
                tone: "error",
                text: getApiErrorMessage(error, failureMessage),
            });
            return undefined;
        }
        finally {
            setPendingAction(undefined);
        }
    };
    const showSuccessMessage = (text) => {
        setApiMessage({ tone: "success", text });
    };
    const showBackendIdError = (label) => {
        setApiMessage({
            tone: "error",
            text: `백엔드 응답에 ${label} ID가 없습니다.`,
        });
    };
    const resetCreateDialog = () => {
        setCreateStep("site");
        setCreateDraftSite(emptySite);
        setCreateDraftLocation(emptyLocation);
        setCreateDraftLocations([]);
        setCreateDraftAsset(emptyAsset);
        setCreateDraftAssets([]);
        setCreateAssetLocationKey(undefined);
        setIsCreateLocationSkipped(false);
        setIsCreateAssetSkipped(false);
    };
    const handleStartSite = () => {
        resetCreateDialog();
        setIsCreateDialogOpen(true);
        setIsEditorOpen(false);
        setActiveSiteIndex(undefined);
        setActiveLocationIndex(undefined);
        setEditingAssetId(undefined);
    };
    const handleCloseCreateDialog = () => {
        if (isMutating) {
            return;
        }
        setIsCreateDialogOpen(false);
        resetCreateDialog();
    };
    const handleCreateBack = () => {
        if (createStep === "summary") {
            setCreateStep(isCreateLocationSkipped ? "location" : "asset");
            return;
        }
        if (createStep === "asset") {
            setCreateStep("location");
            return;
        }
        if (createStep === "location") {
            setCreateStep("site");
        }
    };
    const handleCreateNext = () => {
        if (createStep === "site" && canContinueCreateSite) {
            setCreateStep("location");
            return;
        }
        if (createStep === "location" && canContinueCreateLocation) {
            const nextLocations = appendNamedLocation(createDraftLocations, createDraftLocation);
            setCreateDraftLocations(nextLocations);
            setCreateDraftLocation(emptyLocation);
            setCreateAssetLocationKey(nextLocations[0]?._clientId);
            setIsCreateLocationSkipped(false);
            setIsCreateAssetSkipped(false);
            setCreateStep("asset");
            return;
        }
        if (createStep === "asset" && canContinueCreateAsset) {
            const nextLocationKey = createAssetLocationKey ?? createDraftLocations[0]?._clientId;
            setCreateDraftAssets((currentAssets) => appendNamedAsset(currentAssets, createDraftAsset, nextLocationKey));
            setCreateDraftAsset(emptyAsset);
            setIsCreateAssetSkipped(false);
            setCreateStep("summary");
        }
    };
    const handleSkipCreateLocation = () => {
        setIsCreateLocationSkipped(true);
        setIsCreateAssetSkipped(true);
        setCreateDraftLocation(emptyLocation);
        setCreateDraftLocations([]);
        setCreateDraftAsset(emptyAsset);
        setCreateDraftAssets([]);
        setCreateAssetLocationKey(undefined);
        setCreateStep("summary");
    };
    const handleSkipCreateAsset = () => {
        setIsCreateAssetSkipped(true);
        setCreateDraftAsset(emptyAsset);
        setCreateDraftAssets([]);
        setCreateStep("summary");
    };
    const handleAddCreateLocation = () => {
        if (!createDraftLocation.name.trim())
            return;
        const nextLocations = appendNamedLocation(createDraftLocations, createDraftLocation);
        setCreateDraftLocations(nextLocations);
        setCreateDraftLocation(emptyLocation);
        setCreateAssetLocationKey((currentKey) => currentKey ?? nextLocations[0]?._clientId);
    };
    const handleRemoveCreateLocation = (locationKey) => {
        setCreateDraftLocations((currentLocations) => currentLocations.filter((location) => location._clientId !== locationKey));
        setCreateDraftAssets((currentAssets) => currentAssets.filter((asset) => asset._locationKey !== locationKey));
        setCreateAssetLocationKey((currentKey) => currentKey === locationKey ? undefined : currentKey);
    };
    const handleAddCreateAsset = () => {
        if (!createDraftAsset.name.trim())
            return;
        const nextLocationKey = createAssetLocationKey ?? createDraftLocations[0]?._clientId;
        if (!nextLocationKey)
            return;
        setCreateDraftAssets((currentAssets) => appendNamedAsset(currentAssets, createDraftAsset, nextLocationKey));
        setCreateDraftAsset(emptyAsset);
    };
    const handleRemoveCreateAsset = (assetKey) => {
        setCreateDraftAssets((currentAssets) => currentAssets.filter((asset) => asset._clientId !== assetKey));
    };
    const handleCreateSite = async () => {
        if (isMutating) {
            return;
        }
        const nextSite = normalizeSite(createPreviewSite);
        if (!nextSite.name.trim()) {
            return;
        }
        const response = await runMutation("site-create", "공정 생성에 실패했습니다.", () => createManagedSite(toCreateSitePayload(nextSite)));
        if (response === undefined) {
            return;
        }
        const savedSite = applySiteResponse(nextSite, response);
        if (!savedSite.site_id.trim()) {
            showBackendIdError("공정");
            return;
        }
        const nextSiteIndex = sites.length;
        setSites((prev) => [...prev, savedSite]);
        setActiveSiteIndex(nextSiteIndex);
        setExpandedSites((prev) => ({ ...prev, [savedSite.site_id]: true }));
        savedSite.locations.forEach((location) => {
            if (location.location_id) {
                setExpandedLocations((prev) => ({
                    ...prev,
                    [location.location_id]: true,
                }));
            }
        });
        setDraftSite(savedSite);
        setIsCreateDialogOpen(false);
        resetCreateDialog();
        showSuccessMessage("공정이 생성되었습니다.");
    };
    const handleSelectSite = (siteIndex) => {
        const nextSite = sites[siteIndex];
        setIsEditorOpen(true);
        setActiveSiteIndex(siteIndex);
        setActiveLocationIndex(nextSite.locations.length ? 0 : undefined);
        setDraftSite(nextSite);
        setDraftLocation(nextSite.locations[0] ?? emptyLocation);
        setDraftAsset(emptyAsset);
        setEditingAssetId(undefined);
        setEditorStep("site");
    };
    const handleSaveSite = async () => {
        if (isMutating)
            return;
        const nextSite = normalizeSite(draftSite);
        const currentSite = getItemAt(sites, activeSiteIndex);
        const response = await runMutation("site-save", "공정 저장에 실패했습니다.", () => currentSite
            ? updateManagedSite(currentSite.site_id, toUpdateSitePayload(nextSite))
            : createManagedSite(toCreateSitePayload(nextSite)));
        if (response === undefined) {
            return;
        }
        const savedSite = currentSite
            ? recalculateSiteCounts({
                ...applySiteResponse(nextSite, response),
                locations: currentSite.locations,
            })
            : applySiteResponse(nextSite, response);
        if (!savedSite.site_id.trim()) {
            showBackendIdError("공정");
            return;
        }
        if (activeSiteIndex === undefined) {
            const nextSiteIndex = sites.length;
            setSites((prev) => [...prev, savedSite]);
            setActiveSiteIndex(nextSiteIndex);
            // 새 공정 트리 자동 펼치기
            setExpandedSites((prev) => ({ ...prev, [savedSite.site_id]: true }));
        }
        else {
            setSites((prev) => prev.map((site, index) => index === activeSiteIndex
                ? savedSite
                : site));
        }
        setDraftSite(savedSite);
        showSuccessMessage(activeSiteIndex === undefined
            ? "공정이 생성되었습니다."
            : "공정이 수정되었습니다.");
        setEditorStep("location");
    };
    const handleSaveLocation = async ({ moveToAsset = false } = {}) => {
        if (activeSiteIndex === undefined || !activeSite || isMutating)
            return;
        if (!activeSite.site_id.trim()) {
            showBackendIdError("공정");
            return;
        }
        const nextLocation = normalizeLocation(draftLocation);
        const currentLocations = sites[activeSiteIndex]?.locations ?? [];
        const currentLocation = getItemAt(currentLocations, activeLocationIndex);
        if (currentLocation && !currentLocation.location_id.trim()) {
            showBackendIdError("위치");
            return;
        }
        const response = await runMutation("location-save", "위치 저장에 실패했습니다.", () => currentLocation
            ? updateManagedLocation(currentLocation.location_id, toUpdateLocationPayload(nextLocation))
            : createManagedLocation(toCreateLocationPayload(activeSite.site_id, nextLocation)));
        if (response === undefined) {
            return;
        }
        const savedLocation = currentLocation
            ? {
                ...applyLocationResponse(nextLocation, response),
                assets: currentLocation.assets,
            }
            : applyLocationResponse(nextLocation, response);
        const nextLocationIndex = activeLocationIndex === undefined ? currentLocations.length : activeLocationIndex;
        if (!savedLocation.location_id.trim()) {
            showBackendIdError("위치");
            return;
        }
        setSites((prev) => prev.map((site, siteIndex) => {
            if (siteIndex !== activeSiteIndex)
                return site;
            if (activeLocationIndex === undefined) {
                return recalculateSiteCounts({
                    ...site,
                    locations: [...site.locations, savedLocation],
                });
            }
            return recalculateSiteCounts({
                ...site,
                locations: site.locations.map((loc, locIndex) => locIndex === activeLocationIndex
                    ? savedLocation
                    : loc),
            });
        }));
        setActiveLocationIndex(moveToAsset ? nextLocationIndex : undefined);
        setDraftLocation(moveToAsset ? savedLocation : emptyLocation);
        setDraftAsset(emptyAsset);
        setEditingAssetId(undefined);
        // 새 위치 트리 자동 펼치기
        setExpandedLocations((prev) => ({
            ...prev,
            [savedLocation.location_id]: true,
        }));
        showSuccessMessage(currentLocation ? "위치가 수정되었습니다." : "위치가 생성되었습니다.");
        setEditorStep(moveToAsset ? "asset" : "location");
    };
    const handleSaveLocationAndStartAsset = () => {
        void handleSaveLocation({ moveToAsset: true });
    };
    const handleSaveAsset = async () => {
        if (activeSiteIndex === undefined ||
            activeLocationIndex === undefined ||
            !activeLocation ||
            isMutating) {
            return;
        }
        if (!activeLocation.location_id.trim()) {
            showBackendIdError("위치");
            return;
        }
        if (editingAssetId !== undefined && !editingAssetId.trim()) {
            showBackendIdError("설비");
            return;
        }
        const nextAsset = normalizeAsset(draftAsset);
        const response = await runMutation("asset-save", "설비 저장에 실패했습니다.", () => editingAssetId
            ? updateManagedAsset(editingAssetId, toUpdateAssetPayload(nextAsset))
            : createManagedAsset(toCreateAssetPayload(activeSite.site_id, activeLocation.location_id, nextAsset)));
        if (response === undefined) {
            return;
        }
        const savedAsset = applyAssetResponse(nextAsset, response);
        if (!savedAsset.asset_id.trim()) {
            showBackendIdError("설비");
            return;
        }
        setSites((prev) => prev.map((site, siteIndex) => {
            if (siteIndex !== activeSiteIndex)
                return site;
            return recalculateSiteCounts({
                ...site,
                locations: site.locations.map((loc, locIndex) => {
                    if (locIndex !== activeLocationIndex)
                        return loc;
                    const hasSameAsset = loc.assets.some((assetItem) => assetItem.asset_id === (editingAssetId ?? savedAsset.asset_id));
                    return {
                        ...loc,
                        assets: hasSameAsset
                            ? loc.assets.map((assetItem) => assetItem.asset_id === (editingAssetId ?? savedAsset.asset_id)
                                ? savedAsset
                                : assetItem)
                            : [...loc.assets, savedAsset],
                    };
                }),
            });
        }));
        setDraftAsset(emptyAsset);
        setEditingAssetId(undefined);
        showSuccessMessage(editingAssetId ? "설비가 수정되었습니다." : "설비가 생성되었습니다.");
    };
    const handleSelectLocation = (locationIndex, siteIndex = activeSiteIndex) => {
        const targetSite = getItemAt(sites, siteIndex);
        const nextLocation = targetSite?.locations[locationIndex];
        if (siteIndex !== undefined) {
            setActiveSiteIndex(siteIndex);
            setDraftSite(targetSite ?? emptySite);
        }
        setActiveLocationIndex(locationIndex);
        setDraftLocation(nextLocation ?? emptyLocation);
        setDraftAsset(emptyAsset);
        setEditingAssetId(undefined);
        setEditorStep("asset");
    };
    const handleStartLocation = () => {
        setActiveLocationIndex(undefined);
        setDraftLocation(emptyLocation);
        setDraftAsset(emptyAsset);
        setEditingAssetId(undefined);
        setEditorStep("location");
    };
    const handleStartAsset = () => {
        setDraftAsset(emptyAsset);
        setEditingAssetId(undefined);
    };
    const handleEditAsset = (asset) => {
        setDraftAsset(normalizeAsset(asset));
        setEditingAssetId(asset.asset_id);
    };
    const handleRequestRemoveSite = (siteIndex) => {
        if (isMutating)
            return;
        setSiteDeleteTargetIndex(siteIndex);
        setSiteDeleteConfirmText("");
    };
    const handleCloseSiteDeleteDialog = () => {
        if (isMutating)
            return;
        setSiteDeleteTargetIndex(undefined);
        setSiteDeleteConfirmText("");
    };
    const handleConfirmRemoveSite = async () => {
        if (siteDeleteTargetIndex === undefined || siteDeleteConfirmText !== "삭제")
            return;
        await handleRemoveSite(siteDeleteTargetIndex);
    };
    const handleRemoveSite = async (siteIndex) => {
        const site = sites[siteIndex];
        if (!site || isMutating)
            return;
        const response = await runMutation("site-delete", "공정 삭제에 실패했습니다.", () => deleteManagedSite(site.site_id));
        if (response === undefined) {
            return;
        }
        setSites((prev) => prev.filter((_, index) => index !== siteIndex));
        if (activeSiteIndex === siteIndex) {
            setIsEditorOpen(false);
            setActiveSiteIndex(undefined);
            setActiveLocationIndex(undefined);
            setEditorStep("site");
        }
        setSiteDeleteTargetIndex(undefined);
        setSiteDeleteConfirmText("");
        showSuccessMessage("공정이 삭제되었습니다.");
    };
    const handleRemoveLocation = async (locationIndex) => {
        if (activeSiteIndex === undefined || isMutating)
            return;
        const location = sites[activeSiteIndex]?.locations[locationIndex];
        if (!location)
            return;
        const response = await runMutation("location-delete", "위치 삭제에 실패했습니다.", () => deleteManagedLocation(location.location_id));
        if (response === undefined) {
            return;
        }
        setSites((prev) => prev.map((site, siteIndex) => siteIndex === activeSiteIndex
            ? recalculateSiteCounts({
                ...site,
                locations: site.locations.filter((_, i) => i !== locationIndex),
            })
            : site));
        setActiveLocationIndex(undefined);
        setDraftLocation(emptyLocation);
        setDraftAsset(emptyAsset);
        setEditingAssetId(undefined);
        showSuccessMessage("위치가 삭제되었습니다.");
        setEditorStep("location");
    };
    const handleRemoveAsset = async (asset_id) => {
        if (activeSiteIndex === undefined ||
            activeLocationIndex === undefined ||
            isMutating) {
            return;
        }
        const response = await runMutation("asset-delete", "설비 삭제에 실패했습니다.", () => deleteManagedAsset(asset_id));
        if (response === undefined) {
            return;
        }
        setSites((prev) => prev.map((site, siteIndex) => siteIndex === activeSiteIndex
            ? recalculateSiteCounts({
                ...site,
                locations: site.locations.map((loc, locIndex) => locIndex === activeLocationIndex
                    ? {
                        ...loc,
                        assets: loc.assets.filter((assetItem) => assetItem.asset_id !== asset_id),
                    }
                    : loc),
            })
            : site));
        if (editingAssetId === asset_id) {
            setDraftAsset(emptyAsset);
            setEditingAssetId(undefined);
        }
        showSuccessMessage("설비가 삭제되었습니다.");
    };
    // 에디터 스텝 뒤로 가기
    const handleGoBack = () => {
        if (editorStep === "asset")
            setEditorStep("location");
        else if (editorStep === "location")
            setEditorStep("site");
    };
    // 건너뛰기 (location → asset 건너뜀, asset → 완료)
    const handleSkip = () => {
        if (editorStep === "location") {
            setEditorStep("asset");
        }
        else if (editorStep === "asset") {
            // 완료: 에디터 닫고 목록으로 돌아가기
            setIsEditorOpen(false);
            setActiveSiteIndex(undefined);
            setActiveLocationIndex(undefined);
            setEditorStep("site");
        }
    };
    // 트리 토글
    const toggleSiteExpand = (site_id) => {
        setExpandedSites((prev) => ({ ...prev, [site_id]: !prev[site_id] }));
    };
    const toggleLocationExpand = (location_id) => {
        setExpandedLocations((prev) => ({ ...prev, [location_id]: !prev[location_id] }));
    };
    // ── Render ────────────────────────────────────────────────────────────────
    return (<main className="SiteIndexPage SiteIndexPage__root-1 min-w-0 flex-1 overflow-hidden bg-muted/35 p-3 md:p-4">
      <div className="SiteIndexPage SiteIndexPage__container-1 mx-auto h-full max-w-7xl grid grid-rows-[auto_auto_minmax(0,1fr)] gap-3">

        {/* ── 상단 헤더 ── */}
        <section className="SiteIndexPage SiteIndexPage__section-1 flex min-w-0 items-center justify-between gap-3">
          <div className="SiteIndexPage SiteIndexPage__container-2 min-w-0">
            <h1 className="SiteIndexPage SiteIndexPage__title-1 truncate text-xl font-semibold text-foreground">
              공정 구성
            </h1>
            <p className="SiteIndexPage SiteIndexPage__text-1 mt-1 truncate text-sm text-muted-foreground">
              공정, 위치, 설비 등록
            </p>
          </div>
          <div className="SiteIndexPage SiteIndexPage__container-27 flex shrink-0 items-center gap-2">
            {apiMessage ? (<span className={cn("SiteIndexPage SiteIndexPage__api-message-1 max-w-[18rem] truncate rounded-md border px-3 py-2 text-xs font-semibold", apiMessage.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300")} title={apiMessage.text}>
                {apiMessage.text}
              </span>) : null}
            <button type="button" className="SiteIndexPage SiteIndexPage__button-1 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50" disabled={isMutating} onClick={handleStartSite}>
              <Plus className="SiteIndexPage SiteIndexPage__icon-1 h-4 w-4" aria-hidden="true"/>
              공정 생성
            </button>
          </div>
        </section>

        {/* ── 집계 메트릭 ── */}
        <section className="SiteIndexPage SiteIndexPage__summary-1 grid gap-2 md:grid-cols-4">
          <Metric label="공정" value={totals.sites}/>
          <Metric label="위치" value={totals.locations}/>
          <Metric label="설비" value={totals.assets}/>
          <Metric label="알림" value={totals.alerts}/>
        </section>

        {/* ── 워크스페이스 ── */}
        {isEditorOpen ? (<section className="SiteIndexPage SiteIndexPage__workspace-1 grid min-h-0 gap-3 overflow-hidden lg:grid-cols-[22rem_minmax(0,1fr)]">
            <SiteTree
              activeLocationIndex={activeLocationIndex}
              activeSiteIndex={activeSiteIndex}
              expandedLocations={expandedLocations}
              expandedSites={expandedSites}
              sites={sites}
              onSelectLocation={handleSelectLocation}
              onSelectSite={handleSelectSite}
              onToggleLocation={toggleLocationExpand}
              onToggleSite={toggleSiteExpand}
            />
            <SiteEditor
              activeLocation={activeLocation}
              activeLocationIndex={activeLocationIndex}
              activeSite={activeSite}
              activeSiteIndex={activeSiteIndex}
              canSaveAsset={canSaveAsset}
              canSaveLocation={canSaveLocation}
              canSaveSite={canSaveSite}
              draftAsset={draftAsset}
              draftLocation={draftLocation}
              draftSite={draftSite}
              editingAssetId={editingAssetId}
              editorStep={editorStep}
              isMutating={isMutating}
              pendingAction={pendingAction}
              onAssetChange={setDraftAsset}
              onEditAsset={handleEditAsset}
              onGoBack={handleGoBack}
              onLocationChange={setDraftLocation}
              onRemoveAsset={handleRemoveAsset}
              onRemoveLocation={handleRemoveLocation}
              onRemoveSite={handleRequestRemoveSite}
              onSaveAsset={handleSaveAsset}
              onSaveLocation={handleSaveLocation}
              onSaveLocationAndStartAsset={handleSaveLocationAndStartAsset}
              onSaveSite={handleSaveSite}
              onSelectLocation={handleSelectLocation}
              onSiteChange={setDraftSite}
              onSkip={handleSkip}
              onStartAsset={handleStartAsset}
              onStartLocation={handleStartLocation}
            />
          </section>) : (
            <SiteCardList
              isMutating={isMutating}
              sites={sites}
              onRemoveSite={handleRequestRemoveSite}
              onSelectSite={handleSelectSite}
            />
          )}
        {isCreateDialogOpen ? (
          <CreateSiteDialog
            asset={createDraftAsset}
            assetLocationKey={createAssetLocationKey}
            assets={createDraftAssets}
            canContinueAsset={canContinueCreateAsset}
            canContinueLocation={canContinueCreateLocation}
            canContinueSite={canContinueCreateSite}
            isAssetSkipped={isCreateAssetSkipped}
            isLocationSkipped={isCreateLocationSkipped}
            isMutating={isMutating}
            location={createDraftLocation}
            locations={createDraftLocations}
            pendingAction={pendingAction}
            previewSite={createPreviewSite}
            site={createDraftSite}
            step={createStep}
            onAddAsset={handleAddCreateAsset}
            onAddLocation={handleAddCreateLocation}
            onAssetChange={setCreateDraftAsset}
            onAssetLocationChange={setCreateAssetLocationKey}
            onBack={handleCreateBack}
            onClose={handleCloseCreateDialog}
            onCreate={handleCreateSite}
            onLocationChange={setCreateDraftLocation}
            onNext={handleCreateNext}
            onRemoveAsset={handleRemoveCreateAsset}
            onRemoveLocation={handleRemoveCreateLocation}
            onSiteChange={setCreateDraftSite}
            onSkipAsset={handleSkipCreateAsset}
            onSkipLocation={handleSkipCreateLocation}
          />
        ) : null}
        {siteDeleteTargetIndex !== undefined ? (
          <SiteDeleteConfirmDialog
            confirmText={siteDeleteConfirmText}
            isMutating={isMutating}
            pendingAction={pendingAction}
            site={getItemAt(sites, siteDeleteTargetIndex)}
            onClose={handleCloseSiteDeleteDialog}
            onConfirm={handleConfirmRemoveSite}
            onConfirmTextChange={setSiteDeleteConfirmText}
          />
        ) : null}
      </div>
    </main>);
}

function SiteDeleteConfirmDialog({
    confirmText,
    isMutating,
    pendingAction,
    site,
    onClose,
    onConfirm,
    onConfirmTextChange,
}) {
    const canConfirm = confirmText === "삭제" && !isMutating;
    return (<div className="SiteDeleteConfirmDialog fixed inset-0 z-[90] grid place-items-center bg-black/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="공정 삭제 확인">
      <div className="SiteDeleteConfirmDialog grid w-[min(30rem,calc(100dvw-1.5rem))] gap-4 rounded-md border border-border bg-card p-4 text-card-foreground shadow-2xl">
        <header className="SiteDeleteConfirmDialog flex min-w-0 items-start justify-between gap-3">
          <div className="SiteDeleteConfirmDialog min-w-0">
            <h2 className="SiteDeleteConfirmDialog truncate text-base font-semibold text-red-500 dark:text-red-300">
              공정 삭제
            </h2>
            <p className="SiteDeleteConfirmDialog mt-1 text-sm text-muted-foreground">
              {site?.name ? `"${site.name}" 공정을 삭제합니다.` : "선택한 공정을 삭제합니다."}
            </p>
          </div>
          <button type="button" className="SiteDeleteConfirmDialog grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={isMutating} onClick={onClose} title="닫기">
            <X className="SiteDeleteConfirmDialog h-4 w-4" aria-hidden="true"/>
          </button>
        </header>
        <div className="SiteDeleteConfirmDialog rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          공정 내부의 모든 하위 위치, 설비들 정보가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </div>
        <label className="SiteDeleteConfirmDialog grid gap-2 text-sm font-semibold text-muted-foreground">
          계속하려면 아래에 <span className="SiteDeleteConfirmDialog font-bold text-foreground">삭제</span> 를 입력하세요.
          <input className="SiteDeleteConfirmDialog h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-red-400 disabled:cursor-not-allowed disabled:opacity-50" disabled={isMutating} value={confirmText} onChange={(event) => onConfirmTextChange(event.target.value)} placeholder="삭제"/>
        </label>
        <footer className="SiteDeleteConfirmDialog flex justify-end gap-2">
          <button type="button" className="SiteDeleteConfirmDialog inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={isMutating} onClick={onClose}>
            취소
          </button>
          <button type="button" className="SiteDeleteConfirmDialog inline-flex h-9 items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canConfirm} onClick={onConfirm}>
            <Trash2 className="SiteDeleteConfirmDialog h-4 w-4" aria-hidden="true"/>
            {pendingAction === "site-delete" ? "삭제 중" : "공정 삭제"}
          </button>
        </footer>
      </div>
    </div>);
}

function appendNamedLocation(locations, location) {
    if (!location.name.trim())
        return locations;
    return [
        ...locations,
        {
            ...normalizeLocation(location),
            _clientId: createDraftItemKey("location"),
        },
    ];
}

function appendNamedAsset(assets, asset, locationKey) {
    if (!asset.name.trim() || !locationKey)
        return assets;
    return [
        ...assets,
        {
            ...normalizeAsset(asset),
            _clientId: createDraftItemKey("asset"),
            _locationKey: locationKey,
        },
    ];
}

function createDraftItemKey(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
