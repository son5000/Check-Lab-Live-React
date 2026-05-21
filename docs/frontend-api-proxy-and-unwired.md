# Frontend API Proxy And Unwired APIs

이 문서는 프론트에 API 함수나 라우트가 붙어 있지만 브라우저가 백엔드와 직접 통신하지 않는 경우, 또는 라우트는 준비되어 있으나 현재 UI에서 호출되지 않는 경우를 정리한다.

## 브라우저에서 직접 백엔드를 치지 않는 내부 프록시 호출

아래 항목은 클라이언트 코드의 `fetch()` 또는 API 함수이지만, 요청 대상이 외부 백엔드가 아니라 Next.js 내부 API 라우트다. 실제 백엔드 통신은 해당 route handler가 서버에서 수행한다.

| 클라이언트 함수/호출 | 내부 프론트 엔드포인트 | 실제 백엔드 연결 상태 | 사용 위치 |
| --- | --- | --- | --- |
| `site-management-client.createSite` | `POST /api/v1/site` | 간접 연결. route handler가 `site-management-api.createSite`로 `POST /api/v1/site` 백엔드 호출. | `SiteIndexPage.handleSaveSite` |
| `site-management-client.updateSite` | `PUT /api/v1/site/{site_id}` | 간접 연결. | `SiteIndexPage.handleSaveSite` |
| `site-management-client.deleteSite` | `DELETE /api/v1/site/{site_id}` | 간접 연결. | `SiteIndexPage.handleRemoveSite` |
| `site-management-client.createLocation` | `POST /api/v1/location` | 간접 연결. | `SiteIndexPage.handleSaveLocation` |
| `site-management-client.updateLocation` | `PUT /api/v1/location/{location_id}` | 간접 연결. | `SiteIndexPage.handleSaveLocation` |
| `site-management-client.deleteLocation` | `DELETE /api/v1/location/{location_id}` | 간접 연결. | `SiteIndexPage.handleRemoveLocation` |
| `site-management-client.createAsset` | `POST /api/v1/asset` | 간접 연결. | `SiteIndexPage.handleSaveAsset` |
| `site-management-client.updateAsset` | `PUT /api/v1/asset/{asset_id}` | 간접 연결. | `SiteIndexPage.handleSaveAsset` |
| `site-management-client.deleteAsset` | `DELETE /api/v1/asset/{asset_id}` | 간접 연결. | `SiteIndexPage.handleRemoveAsset` |
| `MainLayout` polling | `GET /api/asset-dashboard/monitoring-tree` | 간접 연결. route handler가 monitoring tree 백엔드를 호출한다. | 사이드바 관제 트리 30초 갱신 |
| `useGlobalAlertMonitor` polling | `GET /api/asset-dashboard/alerts?limit=100&is_read=false` | 간접 연결. route handler가 `/api/v1/alerts`와 dashboard context를 호출한다. | 글로벌 알림 5초 갱신 |
| `AssetDashboardPage` snapshot polling | `GET /api/asset-dashboard/{asset_id}` | 간접 연결. route handler가 설비 dashboard 복합 백엔드를 호출한다. | 설비 상세 5초 갱신 |
| `AssetDashboardPage.handleAssetThresholdSave` | `PUT /api/asset-dashboard/{asset_id}/thresholds` | 간접 연결. route handler가 asset thresholds 백엔드를 호출한다. | 임계치 저장 |
| `AssetDashboardPage.handleEventRead` | `PUT /api/asset-dashboard/alerts/{alertId}/read` | 간접 연결. route handler가 alert read 백엔드를 호출한다. | 임계 알림 이벤트 열람 |

## 프론트 API 라우트는 있지만 현재 UI 호출이 확인되지 않는 항목

아래 route handler들은 호출되면 백엔드와 통신하지만, 현재 코드 검색 기준 브라우저 UI에서 직접 호출하는 `fetch()`는 확인되지 않는다. 향후 화면에서 붙일 수 있도록 준비된 프록시로 보인다.

| 프론트 엔드포인트 | 백엔드 함수 | 실제 백엔드 엔드포인트 | 현재 상태 |
| --- | --- | --- | --- |
| `GET /api/asset-dashboard/{asset_id}/alerts` | `fetchAlerts` | `GET /api/v1/alerts?asset_id={asset_id}` | 별도 설비 알림 목록 프록시. 현재 대시보드는 `/api/asset-dashboard/{asset_id}` 복합 snapshot에서 알림을 받는다. |
| `GET /api/asset-dashboard/{asset_id}/events` | `fetchAssetEvents` | `GET /api/v1/assets/{asset_id}/events` | 별도 이벤트 목록 프록시. 현재 대시보드는 복합 snapshot에서 이벤트를 받는다. |
| `GET /api/asset-dashboard/alerts/summary` | `fetchAlertSummary` | `GET /api/v1/alerts/summary` | 알림 카운트 요약용. 현재 헤더/글로벌 알림은 목록 기반 계산을 사용한다. |
| `PUT /api/asset-dashboard/alerts/read` | `markAlertsRead` | `PUT /api/v1/alerts/read` | 알림 일괄 열람용. 현재 UI 직접 호출 없음. |
| `POST /api/asset-dashboard/alerts/suppression` | `createAlertSuppression` | `POST /api/v1/alert-suppressions` | 서버 기준 알림 숨김용. 현재 `MainLayout.handleSuppressNotification`은 React state로만 3분 숨김 처리한다. |
| `PUT /api/asset-dashboard/events/{eventId}/read` | `markEventRead` | `PUT /api/v1/events/{eventId}/read` | 시스템 이벤트 열람용. 현재 `AssetDashboardPage.handleEventRead`는 `event.source !== "asset-threshold"`이면 return해서 alert read만 호출한다. |

## 서비스 함수는 있으나 현재 직접 사용이 약한 항목

| 함수 | 위치 | 상태 |
| --- | --- | --- |
| `fetchActiveAlerts` | `src/app/monitoring/services/asset-alerts-api.ts` | 미열람 알림 전용 래퍼지만 현재 UI는 `fetchAlerts({ isRead: false })`를 프록시 라우트에서 직접 사용한다. |
| `fetchAlertSummary` | `src/app/monitoring/services/asset-alerts-api.ts` | route handler는 있으나 UI 직접 호출 없음. |
| `markAlertsRead` | `src/app/monitoring/services/asset-alerts-api.ts` | route handler는 있으나 UI 직접 호출 없음. |
| `createAlertSuppression` | `src/app/monitoring/services/asset-alerts-api.ts` | route handler는 있으나 글로벌 알림 숨김 UI는 로컬 상태만 사용한다. |
| `markEventRead` | `src/app/monitoring/services/asset-events-api.ts` | route handler는 있으나 현재 이벤트 열람 핸들러가 시스템 이벤트에는 연결되어 있지 않다. |

## API처럼 보이지만 백엔드 통신이 아닌 모듈

| 모듈 | 이유 |
| --- | --- |
| `src/app/monitoring/services/asset-dashboard-adapter.ts` | 백엔드 응답을 화면 모델로 바꾸는 순수 어댑터다. 자체 `fetch` 없음. |
| `src/app/monitoring/services/mock-dashboard-table-map.ts` | 백엔드 테이블과 화면 영역 매핑 문서성 데이터다. 자체 `fetch` 없음. |
| `src/app/site/utils/backend-workflow.ts` | 직접 백엔드 호출 함수는 없고 `fetchBackendMonitoringTree`를 위임 호출한 뒤 트리 노드를 화면 모델로 변환한다. |
| `src/app/layouts/hooks/use-notification-settings.ts` | 알림 표시 설정을 `localStorage`에 저장한다. 서버 API 없음. |
| `src/app/auth/session.ts`, `src/app/auth/login-panel.tsx` | 개발용 고정 계정/토큰 검증과 쿠키 저장만 한다. 인증 백엔드 API 없음. |

## 정리

- 브라우저에서 외부 백엔드로 직접 나가는 호출은 없다.
- 실제 백엔드 통신은 Next route handler 또는 서버 컴포넌트가 `requestCheckLabJson`으로 수행한다.
- 프록시 route 중 일부는 기능 확장용으로 준비되어 있으나 현재 UI에서 직접 호출되지 않는다.
