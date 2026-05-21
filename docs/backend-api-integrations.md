# Backend API Integrations

이 문서는 프론트 코드 안에서 실제 CheckLab 백엔드와 통신하는 API 함수를 정리한다. 기준은 `src/app/monitoring/services/checklab-api-client.ts`의 `requestCheckLabJson`을 통해 `CHECKLAB_API_BASE_URL` 또는 `NEXT_PUBLIC_CHECKLAB_API_BASE_URL`로 요청이 나가는 함수다.

## 공통 클라이언트

| 함수 | 위치 | 역할 |
| --- | --- | --- |
| `buildCheckLabApiUrl(path, query?)` | `src/app/monitoring/services/checklab-api-client.ts` | `api/v1/...` 일반 백엔드 URL 생성. query는 `null/undefined` 제외 후 `URLSearchParams`로 반영한다. |
| `buildCheckLabAssetUrl(asset_id, assetPath, query?)` | `src/app/monitoring/services/checklab-api-client.ts` | `api/v1/assets/{asset_id}/...` 하위 URL 생성. 설비 상세, 임계치, 이벤트 API에서 사용한다. |
| `requestCheckLabJson<T>(url, options)` | `src/app/monitoring/services/checklab-api-client.ts` | 실제 `fetch(url)` 수행. JSON body, `no-store`, 성공/실패 로그, JSON 파싱을 담당한다. |

## 관제 트리

| 함수 | 백엔드 엔드포인트 | 받는 값 | 사용하는 곳 |
| --- | --- | --- | --- |
| `fetchMonitoringTree()` | `GET /api/v1/monitoring-tree` | 공정(`site_id/process_id/process_name`), 위치(`location_id/floor/name`), 설비(`asset_id/name/status`) 계층. `children`, `sites`, `tree` 형태를 모두 정규화한다. | `fetchBackendMonitoringTree()`, 서버 페이지의 `fetchBackendWorkflowTree()`, `/api/asset-dashboard/monitoring-tree` 프록시. 사이드 메뉴 `MonitoringTreeSection`, 공정/위치/설비 라우팅, 헤더 breadcrumb에 사용된다. |
| `fetchBackendMonitoringTree()` fallback | `GET /api/v1/alerts?limit=200` 후 `GET /api/v1/assets/{asset_id}/mock-dashboard` | native monitoring-tree가 실패할 때 알림의 `asset_id` 목록과 각 설비 dashboard breadcrumb/status를 이용해 트리를 재구성한다. | 같은 관제 트리 소비 경로에서 fallback으로 사용된다. |

## 설비 대시보드

| 함수 | 백엔드 엔드포인트 | 받는 값 | 사용하는 곳 |
| --- | --- | --- | --- |
| `fetchAssetDashboard(asset_id)` | 복합 호출: `GET /api/v1/assets/{asset_id}/mock-dashboard`, `GET /api/v1/assets/{asset_id}/thresholds`, `GET /api/v1/alerts?asset_id={asset_id}&limit=20`, `GET /api/v1/assets/{asset_id}/events?limit=100` | 설비 헤더, 카메라, 요약 카드, 파트, 임계치, 추이, 알림, 이벤트 타임라인. 보조 API 실패 시 mock-dashboard 값을 유지한다. | 설비 상세 서버 페이지, `/api/asset-dashboard/{asset_id}` 프록시, `AssetDashboardPage` 5초 갱신. |
| `fetchAssetDashboardSnapshot(asset_id)` | `GET /api/v1/assets/{asset_id}/mock-dashboard` | `asset_id`, `header`, `camera`, `summary_cards`, `monitored_parts`, `threshold_panel`, `trend_charts`, `alerts`, `event_timeline`, `recent_events`. | `fetchAssetDashboard` 내부. `asset-dashboard-adapter`가 화면용 `AssetDashboardRemoteSnapshot`으로 변환한다. |
| `fetchDashboardAssetContext(asset_id)` | `GET /api/v1/assets/{asset_id}/mock-dashboard` | 알림 보강용 설비명, breadcrumb, 위치명, 상태. | `enrichAlertsWithDashboardContext`, monitoring-tree fallback. |
| `fetchDashboardAssetContexts(asset_ids)` | 각 `asset_id`별 `GET /api/v1/assets/{asset_id}/mock-dashboard` | 여러 설비의 dashboard context. 실패한 설비는 제외한다. | 글로벌 알림 보강, monitoring-tree fallback. |
| `enrichAlertsWithDashboardContext(alerts)` | 내부적으로 `fetchDashboardAssetContexts` 호출 | 알림에 `asset_name`, `dashboard_href`, `dashboard_status`, `location_label` 추가. | `/api/asset-dashboard/alerts` 프록시가 글로벌 알림 응답을 보강할 때 사용한다. |

## 알림

| 함수 | 백엔드 엔드포인트 | 주고받는 값 | 사용하는 곳 |
| --- | --- | --- | --- |
| `fetchAlerts({ asset_id, isRead, limit, severity })` | `GET /api/v1/alerts?asset_id=&is_read=&limit=&severity=` | 알림 ID, 설비 ID, 생성 시각, 읽음 여부, 메시지, 심각도, dashboard link 관련 필드. | 글로벌 알림 프록시, 설비 알림 프록시, `fetchAssetDashboard`, monitoring-tree fallback. |
| `fetchAssetAlerts(asset_id, { limit })` | `GET /api/v1/alerts?asset_id={asset_id}&limit={limit}` | 특정 설비 알림 목록. | `fetchAssetDashboard`가 이벤트 로그 최신 알림을 합칠 때 사용한다. |
| `fetchActiveAlerts({ asset_id, limit })` | `GET /api/v1/alerts?is_read=false&limit={limit}` | 미열람 알림 목록. | 서비스 함수는 존재하지만 현재 UI는 직접 사용하지 않고 `/api/asset-dashboard/alerts?is_read=false`를 호출한다. |
| `fetchAlertSummary({ asset_id, isRead })` | `GET /api/v1/alerts/summary?asset_id=&is_read=` | 전체/미열람/등급별 알림 수, 최신 생성 시각. | `/api/asset-dashboard/alerts/summary` 프록시. 현재 UI 직접 호출은 확인되지 않는다. |
| `markAlertRead(alertId, readBy)` | `PUT /api/v1/alerts/{alertId}/read` | 요청 body `read_by`. 응답은 갱신된 알림. | `/api/asset-dashboard/alerts/{alertId}/read`; `AssetDashboardPage.handleEventRead`가 임계 알림 이벤트를 열 때 호출한다. |
| `markAlertsRead(request)` | `PUT /api/v1/alerts/read` | `alert_ids`, `asset_id`, `only_unread`, `read_by`. 응답은 갱신 수와 알림 목록. | `/api/asset-dashboard/alerts/read` 프록시. 현재 UI 직접 호출은 확인되지 않는다. |
| `createAlertSuppression(request)` | `POST /api/v1/alert-suppressions` | `asset_id`, `duration_seconds`, `reason`, `suppressed_by`. | `/api/asset-dashboard/alerts/suppression` 프록시. 현재 글로벌 알림 숨김은 로컬 상태로만 처리되어 직접 호출은 확인되지 않는다. |

## 이벤트

| 함수 | 백엔드 엔드포인트 | 주고받는 값 | 사용하는 곳 |
| --- | --- | --- | --- |
| `fetchAssetEvents(asset_id, { limit })` | `GET /api/v1/assets/{asset_id}/events?limit={limit}` | `system_events` 기반 이벤트 ID, 타입, 메시지, 시각, 읽음 여부, ROI/좌표. | `fetchAssetDashboard`, `/api/asset-dashboard/{asset_id}/events`. |
| `markEventRead(eventId, readBy)` | `PUT /api/v1/events/{eventId}/read` | 요청 body `read_by`. 응답은 갱신된 이벤트. | `/api/asset-dashboard/events/{eventId}/read` 프록시. 현재 `AssetDashboardPage.handleEventRead`는 `asset-threshold` 알림만 처리하므로 UI 직접 호출은 확인되지 않는다. |

## 임계치

| 함수 | 백엔드 엔드포인트 | 주고받는 값 | 사용하는 곳 |
| --- | --- | --- | --- |
| `fetchAssetThresholds(asset_id)` | `GET /api/v1/assets/{asset_id}/thresholds` | 온도/초음파 warn·critical 임계치, 설정 여부, 수정자/수정 시각. | `fetchAssetDashboard`, `/api/asset-dashboard/{asset_id}/thresholds` GET, `ThresholdEditor`, Summary/Trend/Part 판정. |
| `updateAssetThresholds(asset_id, thresholds)` | `PUT /api/v1/assets/{asset_id}/thresholds` | `temperature_warn_c`, `temperature_critical_c`, `acoustic_warn_db`, `acoustic_critical_db`, `updated_by`. | `/api/asset-dashboard/{asset_id}/thresholds` PUT, `AssetDashboardPage.handleAssetThresholdSave`. |
| `toAssetThresholdConfig`, `toThresholdFallback` | 백엔드 호출 없음 | 백엔드 threshold panel을 화면 공통 `AssetThresholdConfig`로 변환한다. | Summary/Trend/Camera/Part 판정에서 같은 구조를 공유한다. |

## 공정/위치/설비 관리

| 함수 | 백엔드 엔드포인트 | 주고받는 값 | 사용하는 곳 |
| --- | --- | --- | --- |
| `createSite(payload)` | `POST /api/v1/site` | `process_name`, `description`, 선택적 `locations/assets`. 생성 ID는 백엔드 응답 `site_id/process_id/id`에서 받는다. | `/api/v1/site` 프록시, `SiteIndexPage.handleSaveSite`. |
| `updateSite(site_id, payload)` | `PUT /api/v1/site/{site_id}` | `process_name`, `description`. | `/api/v1/site/{site_id}` 프록시, `SiteIndexPage.handleSaveSite`. |
| `deleteSite(site_id)` | `DELETE /api/v1/site/{site_id}` | path의 `site_id`. | `/api/v1/site/{site_id}` 프록시, `SiteIndexPage.handleRemoveSite`. |
| `createLocation(payload)` | `POST /api/v1/location` | `site_id`, `name`, `description`, `floor`. 생성 ID는 백엔드 응답 `location_id/id`에서 받는다. | `/api/v1/location` 프록시, `SiteIndexPage.handleSaveLocation`. |
| `updateLocation(location_id, payload)` | `PUT /api/v1/location/{location_id}` | `name`, `description`, `floor`. | `/api/v1/location/{location_id}` 프록시, `SiteIndexPage.handleSaveLocation`. |
| `deleteLocation(location_id)` | `DELETE /api/v1/location/{location_id}` | path의 `location_id`. | `/api/v1/location/{location_id}` 프록시, `SiteIndexPage.handleRemoveLocation`. |
| `createAsset(payload)` | `POST /api/v1/asset` | `location_id`, `name`, `description`. 생성 ID는 백엔드 응답 `asset_id/id`에서 받는다. | `/api/v1/asset` 프록시, `SiteIndexPage.handleSaveAsset`. |
| `updateAsset(asset_id, payload)` | `PUT /api/v1/asset/{asset_id}` | `name`, `description`. | `/api/v1/asset/{asset_id}` 프록시, `SiteIndexPage.handleSaveAsset`. |
| `deleteAsset(asset_id)` | `DELETE /api/v1/asset/{asset_id}` | path의 `asset_id`. | `/api/v1/asset/{asset_id}` 프록시, `SiteIndexPage.handleRemoveAsset`. |

## 프론트 프록시 라우트 매핑

| 프론트 라우트 | 내부 서비스 함수 | 실제 백엔드 |
| --- | --- | --- |
| `GET /api/asset-dashboard/monitoring-tree` | `fetchBackendMonitoringTree` | `GET /api/v1/monitoring-tree`, fallback으로 alerts/mock-dashboard |
| `GET /api/asset-dashboard/{asset_id}` | `fetchAssetDashboard` | mock-dashboard, thresholds, alerts, events 복합 |
| `GET /api/asset-dashboard/{asset_id}/thresholds` | `fetchAssetThresholds` | `GET /api/v1/assets/{asset_id}/thresholds` |
| `PUT /api/asset-dashboard/{asset_id}/thresholds` | `updateAssetThresholds` | `PUT /api/v1/assets/{asset_id}/thresholds` |
| `GET /api/asset-dashboard/{asset_id}/alerts` | `fetchAlerts` | `GET /api/v1/alerts?asset_id={asset_id}` |
| `GET /api/asset-dashboard/{asset_id}/events` | `fetchAssetEvents` | `GET /api/v1/assets/{asset_id}/events` |
| `GET /api/asset-dashboard/alerts` | `fetchAlerts` + `enrichAlertsWithDashboardContext` | `GET /api/v1/alerts`, 필요 시 mock-dashboard 보강 |
| `GET /api/asset-dashboard/alerts/summary` | `fetchAlertSummary` | `GET /api/v1/alerts/summary` |
| `PUT /api/asset-dashboard/alerts/{alertId}/read` | `markAlertRead` | `PUT /api/v1/alerts/{alertId}/read` |
| `PUT /api/asset-dashboard/alerts/read` | `markAlertsRead` | `PUT /api/v1/alerts/read` |
| `POST /api/asset-dashboard/alerts/suppression` | `createAlertSuppression` | `POST /api/v1/alert-suppressions` |
| `PUT /api/asset-dashboard/events/{eventId}/read` | `markEventRead` | `PUT /api/v1/events/{eventId}/read` |
| `/api/v1/site*` | site management service | `api/v1/site*` |
| `/api/v1/location*` | site management service | `api/v1/location*` |
| `/api/v1/asset*` | site management service | `api/v1/asset*` |
