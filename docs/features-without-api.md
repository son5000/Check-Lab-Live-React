# Features Without Backend API

이 문서는 화면 기능은 존재하지만 현재 백엔드 API 저장/조회가 붙어 있지 않거나, 일부 값만 API에 보내고 나머지는 프론트 로컬 상태로만 유지되는 부분을 정리한다.

## 인증/설정

| 기능 | 위치 | 현재 동작 | 필요한 API 후보 |
| --- | --- | --- | --- |
| 로그인 | `src/app/auth/login-panel.tsx`, `src/app/auth/session.ts` | `dev / 123` 고정 계정만 검증하고 `localStorage`와 cookie에 샘플 토큰을 저장한다. 백엔드 로그인/세션 검증 없음. | `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` |
| 알림 표시 설정 | `src/app/layouts/hooks/use-notification-settings.ts`, `src/app/settings/components/notification-settings-form.tsx` | 알림 on/off와 위치를 `localStorage`에만 저장한다. | 사용자별 notification preference 조회/저장 API |
| 테마 전환 | `src/app/layouts/hooks/use-dashboard-theme.ts` | React state와 `document.documentElement` class만 변경한다. 새로고침/다른 기기 동기화 없음. | 사용자별 theme preference API 또는 localStorage persistence |

## 공정/위치/설비 구성 화면의 로컬 전용 값

`src/app/site/components/site-index-page.tsx`의 생성/수정 자체는 backend API에 연결되어 있다. 다만 화면에서 입력하거나 관리하는 일부 값은 현재 payload에 포함되지 않아 백엔드 저장이 되지 않는다.

| 화면 값/기능 | 현재 API payload | 현재 상태 |
| --- | --- | --- |
| 공정 대표 이미지 `imageUrl` | 전송 안 함 | 파일을 base64로 읽어 프론트 상태와 `localStorage`에만 보관한다. |
| 공정 상태 `status` | 전송 안 함 | 화면 상태/표시에만 사용한다. backend 응답에 status가 있으면 반영 가능하지만 저장 payload에는 없다. |
| 위치 대표 이미지 `imageUrl` | 전송 안 함 | 프론트 상태와 `localStorage`에만 보관한다. |
| 위치 상태 `status` | 전송 안 함 | 화면 상태/표시에만 사용한다. |
| 설비 코드 `asset_code` | 전송 안 함 | 화면 입력은 있지만 `createAsset/updateAsset` payload는 `name`, `description`, `location_id`만 보낸다. |
| 설비 담당자 `manager` | 전송 안 함 | 화면 입력은 있지만 백엔드 저장 없음. |
| 설비 유형 `type` | 전송 안 함 | 화면 입력은 있지만 백엔드 저장 없음. |
| 설비 대표 이미지 `imageUrl` | 전송 안 함 | 프론트 상태와 `localStorage`에만 보관한다. |
| 설비 상태 `status` | 전송 안 함 | 화면 상태/표시에만 사용한다. |
| `SITE_BUILDER_STORAGE_KEY` 저장 | 백엔드 API 아님 | `checklab:site-builder-sites`에 편집 중인 트리 사본을 저장한다. 백엔드와 동기화되는 저장소가 아니다. |

## 위치 상세의 설비 관리

| 기능 | 위치 | 현재 동작 | 필요한 API 후보 |
| --- | --- | --- | --- |
| 위치 상세에서 설비 등록 | `LocationSummaryPage.handleRegisterAsset` | `createAssetId`로 프론트에서 `asset-{slug}` ID를 만들고 `managedAssets` state에만 추가한다. 백엔드 `POST /api/v1/asset`을 호출하지 않는다. | 이미 존재하는 `POST /api/v1/asset` 프록시 재사용 또는 위치 상세 전용 등록 API 연결 |
| 위치 상세에서 설비 삭제 | `LocationSummaryPage.handleRemoveAsset` | `managedAssets` state에서만 제거한다. 백엔드 삭제 없음. | `DELETE /api/v1/asset/{asset_id}` |
| 백엔드 설비 복원 | `LocationSummaryPage.handleRestoreBackendAssets` | 초기 props로 받은 backend tree 설비 목록으로 로컬 state를 되돌린다. 서버 재조회는 하지 않는다. | monitoring-tree 재조회 또는 위치 설비 목록 API |
| 알림 연동, 카메라 ID, 수집 주기, 온도/초음파 임계치 변경 | `LocationSummaryPage.handleAssetChange` | 선택 설비의 로컬 state만 수정한다. | 설비 운영 설정 저장 API |

## 설비 상세의 파트/ROI/3D 분석

| 기능 | 위치 | 현재 동작 | 필요한 API 후보 |
| --- | --- | --- | --- |
| 사용자 정의 감지 파트 생성 | `AssetDashboardPage.handleCreateAssetPart`, `AssetCameraPanel.handleSave` | `AssetPartConfig`를 React state에 추가한다. ID는 `detection-{Date.now()}`로 프론트에서 생성한다. | `POST /api/v1/assets/{asset_id}/parts` 또는 ROI/part 설정 API |
| 사용자 정의 감지 파트 수정 | `AssetDashboardPage.handleUpdateAssetPart` | React state만 수정한다. | `PUT /api/v1/assets/{asset_id}/parts/{part_id}` |
| 카메라 화면에서 ROI/포인트 드래그 | `AssetCameraPanel` pointer handlers | 선택 영역/포인트를 draft state로 관리한다. 저장 시 로컬 파트 생성으로만 이어진다. | ROI 좌표 저장 API |
| 3D 분석 포인트/영역 생성 | `AssetCameraPanel.handleViewer3DAnalysisTargetCreate` | `viewer-3d-analysis-{Date.now()}` ID를 만들고 로컬 state에 추가한다. | `POST /api/v1/assets/{asset_id}/3d-analysis-targets` |
| 3D 분석 포인트/영역 수정/삭제 | `handleViewer3DAnalysisTargetUpdate`, `handleViewer3DAnalysisTargetDelete` | 로컬 state 배열만 변경한다. | `PUT/DELETE /api/v1/assets/{asset_id}/3d-analysis-targets/{target_id}` |
| 3D 모델 PLY/텍스처 파일 업로드 | `handleViewer3DPlyFileChange`, `handleViewer3DTextureFileChange`, `Three3DViewer` | 브라우저 `File` 객체를 state에 보관하고 Three.js에서 즉시 로드한다. 서버 업로드 없음. | 파일 업로드 API, 모델 메타데이터 저장 API |
| 3D 뷰어 카메라/조명/재질/배경 설정 | `Three3DViewer.handleConfigChange`, `Viewer3DOptionBar` | 컴포넌트 state와 부모 callback으로만 유지된다. | 설비별 3D viewer preset 저장 API |

## 설비 상세 이벤트/알림에서 API가 부분 연결된 기능

| 기능 | 위치 | 현재 동작 | 필요한 API 후보 |
| --- | --- | --- | --- |
| 시스템 이벤트 열람 처리 | `AssetDashboardPage.handleEventRead` | `event.source !== "asset-threshold"`이면 return한다. 즉 현재 UI에서는 alert read만 호출하고 `markEventRead` 프록시는 사용하지 않는다. | `PUT /api/asset-dashboard/events/{eventId}/read` 연결 |
| 글로벌 알림 3분 숨김 | `MainLayout.handleSuppressNotification` | `suppressedNotificationKeys` React state로만 숨긴다. `/api/asset-dashboard/alerts/suppression` route는 있지만 호출하지 않는다. | `POST /api/asset-dashboard/alerts/suppression` 호출 연결 |
| 설비 상세 내 실시간 합성 이벤트 | `AssetDashboardPage.buildAssetEvents` 호출부 | 백엔드 이벤트와 프론트 계산 이벤트를 merge한다. 프론트 계산 이벤트는 서버 저장 없음. | 이벤트 생성/감사 저장 API가 필요하면 별도 연결 |

## 카메라/3D 표시 옵션

| 기능 | 위치 | 현재 동작 | 필요한 API 후보 |
| --- | --- | --- | --- |
| 카메라 선택 | `AssetCameraPanel` select | 패널 로컬 state만 변경한다. | 설비별 기본 카메라 저장 API |
| 카메라 이미지 위 ROI/온도 좌표 표시 | `AssetCameraPanel` | backend snapshot의 parts/events를 표시하거나 로컬 draft를 그린다. 새 좌표는 서버 저장 없음. | ROI 좌표/센서 매핑 API |
| 샘플 3D 모델 사용 | `handleUseSampleViewer3DModel` | `DEFAULT_MODEL_3D_FILE`을 state에 넣는다. | 샘플/기본 모델 선택 저장 API |

## 샘플/플레이스홀더성 화면

| 기능 | 위치 | 현재 동작 | 필요한 API 후보 |
| --- | --- | --- | --- |
| `/monitoring`, `/monitoring/realtime`, `/monitoring/alarms` 기본 페이지 | 각 `page.tsx` | `MainLayout`만 렌더링하고 본문 데이터 조회/전용 API 없음. | 페이지별 목록/대시보드 API |
| `/admin` | `src/app/admin/page.tsx` | `/`로 redirect만 한다. | 관리자 기능 API가 필요하면 별도 정의 |
| 설비 `control`, `history`, `status` 하위 페이지 | 각 `page.tsx` | 설비 상세 메인 페이지로 redirect만 한다. | 제어 명령, 이력 목록, 상태 상세 API |
| 공정 요약의 주요 알림 상세 목록 | `SiteSummaryPage` | `site.alertCount`만 표시하고 "알림 상세 목록 API가 연결되면..." placeholder 문구가 있다. | 공정별 알림 목록 API |
| legacy telemetry hook | `useDashboardTelemetry`, `layouts/data/*` | 정적 샘플 데이터와 타이머 생성 차트 데이터를 쓴다. 현재 백엔드 API 없음. | 실시간 telemetry/observation API |

## 우선 연결 후보

1. `LocationSummaryPage`의 설비 등록/삭제를 기존 `site-management-client.createAsset/deleteAsset`에 연결한다.
2. `SiteIndexPage`에서 입력받는 `asset_code`, `manager`, `type`, `status`, `imageUrl`를 백엔드 계약에 맞게 확장할지 결정한다.
3. 사용자 정의 ROI/파트/3D 분석 대상 저장 API를 정의한다.
4. 글로벌 알림 숨김 UI를 이미 있는 `/api/asset-dashboard/alerts/suppression` 프록시에 연결한다.
5. 시스템 이벤트 열람 처리를 `/api/asset-dashboard/events/{eventId}/read`에 연결한다.
