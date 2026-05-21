# CheckLabLive 프론트엔드 프로젝트 구조

## 프로젝트 개요
**CheckLabLive**는 실시간 실험실 모니터링 대시보드입니다. Next.js 14 기반의 TypeScript 프로젝트로, 설비 상태 모니터링, 이벤트 추적, 임계값 관리 등의 기능을 제공합니다.

- **프레임워크**: Next.js 14.2.35
- **언어**: TypeScript
- **스타일**: Tailwind CSS + shadcn UI
- **상태관리**: React Query
- **데이터**: Recharts (차트), date-fns (날짜)
- **다국어**: 한국어 (Pretendard 폰트)
- **테마**: 다크 모드

---

## 디렉토리 구조

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root 레이아웃
│   ├── page.tsx                  # 홈 페이지
│   ├── globals.css               # 전역 스타일
│   ├── providers.tsx             # Context/Provider 설정
│   │
│   ├── api/                      # API 라우트 (Backend)
│   │   └── asset-dashboard/
│   │       ├── alerts/           # 경고 관리
│   │       │   ├── route.ts
│   │       │   ├── summary/
│   │       │   ├── suppression/
│   │       │   └── [alertId]/read/
│   │       ├── events/           # 이벤트 조회
│   │       ├── monitoring-tree/  # 모니터링 트리 데이터
│   │       ├── [asset_id]/       # 설비별 엔드포인트
│   │       │   ├── alerts/
│   │       │   ├── events/
│   │       │   └── thresholds/
│   │       └── route.ts
│   │
│   ├── auth/                     # 인증
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── admin/                    # 관리자 페이지
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── settings/                 # 설정 페이지
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── monitoring/               # 모니터링 대시보드
│   │   ├── page.tsx              # 메인 대시보드
│   │   ├── alarms/page.tsx       # 경보 페이지
│   │   ├── realtime/page.tsx     # 실시간 모니터링
│   │   ├── services/             # API 클라이언트
│   │   │   ├── checklab-api-client.ts
│   │   │   ├── asset-alerts-api.ts
│   │   │   ├── asset-events-api.ts
│   │   │   ├── asset-threshold-api.ts
│   │   │   ├── asset-dashboard-adapter.ts
│   │   │   ├── dashboard-asset-context.ts
│   │   │   └── mock-dashboard-table-map.ts
│   │   └── ...
│   │
│   ├── site/                     # 사이트/공정 관리
│   │   ├── page.tsx              # 사이트 구성
│   │   ├── components/
│   │   │   └── site-index-page.tsx
│   │   ├── utils/
│   │   │   └── backend-workflow.ts
│   │   └── [site_id]/
│   │       ├── page.tsx          # 사이트 상세
│   │       ├── components/
│   │       │   └── site-summary-page.tsx
│   │       └── location/
│   │           └── [locationId]/
│   │               ├── page.tsx  # 위치 상세/설비 관리
│   │               ├── components/
│   │               │   └── location-summary-page.tsx
│   │               └── asset/
│   │                   ├── page.tsx
│   │                   └── [asset_id]/
│   │                       ├── page.tsx
│   │                       ├── control/page.tsx      # 설비 제어
│   │                       ├── history/page.tsx      # 이력 조회
│   │                       ├── status/page.tsx       # 상태 조회
│   │                       └── components/
│   │                           ├── asset-dashboard-page.tsx
│   │                           └── panels/
│   │                               ├── asset-summary-panel.tsx
│   │                               ├── asset-trend-panel.tsx
│   │                               ├── asset-camera-panel.tsx
│   │                               ├── asset-event-log-panel.tsx
│   │                               ├── summary/      # 요약 정보
│   │                               └── trend/        # 추세 차트
│   │
│   ├── layouts/                  # 레이아웃 컴포넌트
│   │   ├── dashboard-layout.tsx       # 메인 대시보드 레이아웃
│   │   ├── dashboard-layout-data.ts
│   │   ├── dashboard-header.tsx       # 헤더
│   │   ├── dashboard-side-menu.tsx    # 사이드 메뉴
│   │   ├── dashboard-content.tsx      # 메인 콘텐츠
│   │   ├── global-notifications.tsx   # 전역 알림
│   │   ├── header/
│   │   │   ├── header-icon-button.tsx
│   │   │   ├── header-actions.tsx
│   │   │   ├── header-clock.tsx
│   │   │   └── header-status-summary.tsx
│   │   ├── side-menu/
│   │   │   ├── side-menu-brand.tsx
│   │   │   ├── monitoring-tree-section.tsx
│   │   │   ├── monitoring-tree-item.tsx
│   │   │   ├── compact-tree-item.tsx
│   │   │   └── management-menu-section.tsx
│   │   ├── content/              # 대시보드 콘텐츠 컴포넌트
│   │   │   ├── metric-tile.tsx
│   │   │   ├── asset-video-panel.tsx
│   │   │   ├── asset-status-section.tsx
│   │   │   ├── asset-kpi-section.tsx
│   │   │   ├── asset-summary-panel.tsx
│   │   │   ├── realtime-status-panel.tsx
│   │   │   ├── temperature-area-section.tsx
│   │   │   ├── alarm-record-section.tsx
│   │   │   ├── analysis-panel.tsx
│   │   │   ├── trend-analysis-section.tsx
│   │   │   ├── threshold-metric-row.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   └── waveform-chart.tsx
│   │   ├── notifications/
│   │   │   └── notification-card.tsx
│   │   ├── hooks/                # Custom Hooks
│   │   │   ├── use-dashboard-shell-state.tsx
│   │   │   ├── use-dashboard-theme.ts
│   │   │   ├── use-dashboard-clock.ts
│   │   │   ├── use-dashboard-header-state.tsx
│   │   │   ├── use-dashboard-notifications.tsx
│   │   │   ├── use-dashboard-telemetry.ts
│   │   │   └── use-global-alert-monitor.ts
│   │   ├── helpers/              # 유틸리티 함수
│   │   │   ├── time-formatters.ts
│   │   │   ├── chart-data.ts
│   │   │   ├── monitoring-tree.ts
│   │   │   └── thresholds.ts
│   │   ├── constants/
│   │   │   ├── dashboard-icons.ts
│   │   │   └── status-styles.ts
│   │   ├── data/
│   │   │   ├── dashboard-shell-data.ts
│   │   │   └── asset-monitoring-data.ts
│   │   └── types.ts
│   │
│   └── ...
│
└── lib/
    └── utils.ts                  # 공용 유틸리티
```

---

## 주요 기능 영역

### 1. **인증 (Authentication)**
- **위치**: `src/app/auth/login/`
- **기능**: 사용자 로그인

### 2. **모니터링 대시보드 (Monitoring)**
- **위치**: `src/app/monitoring/`
- **주요 페이지**:
  - `/monitoring`: 메인 대시보드
  - `/monitoring/alarms`: 경보 페이지
  - `/monitoring/realtime`: 실시간 모니터링
- **기능**: 실시간 설비 상태 모니터링, 차트 표시, 알림 관리

### 3. **사이트 관리 (Site Management)**
- **위치**: `src/app/site/`
- **계층 구조**: Site → Location → Asset (설비)
- **주요 기능**:
  - 사이트별 위치 목록 조회
  - 위치별 설비 관리
  - 설비 상태/제어/이력/온도추세 조회
  - 카메라 피드, 임계값 편집

### 4. **관리자 페이지 (Admin)**
- **위치**: `src/app/admin/`
- **기능**: 시스템 관리 (구현 예정)

### 5. **설정 (Settings)**
- **위치**: `src/app/settings/`
- **기능**: 사용자 설정 (구현 예정)

### 6. **API 라우트**
- **위치**: `src/app/api/`
- **주요 엔드포인트**:
  - `GET/POST /api/asset-dashboard/alerts`: 경고 조회/생성
  - `GET /api/asset-dashboard/alerts/summary`: 경고 요약
  - `GET /api/asset-dashboard/monitoring-tree`: 모니터링 트리
  - `GET /api/asset-dashboard/[asset_id]/*`: 설비별 데이터

---

## 컴포넌트 아키텍처

### 레이아웃 (Layouts)
- **DashboardLayout**: 헤더, 사이드메뉴, 메인 콘텐츠로 구성
- **Header**: 상태 표시, 시간, 액션 버튼
- **SideMenu**: 모니터링 트리, 관리 메뉴

### 상태 관리
- **React Query**: 서버 상태 관리
- **Custom Hooks**: 
  - `use-dashboard-shell-state`: 레이아웃 상태
  - `use-dashboard-theme`: 테마 관리
  - `use-dashboard-clock`: 시간 표시
  - `use-global-alert-monitor`: 전역 알림 모니터링

### 서비스 계층
- **checklab-api-client.ts**: 기본 API 클라이언트
- **asset-*-api.ts**: 설비 관련 API 호출
- **asset-dashboard-adapter.ts**: 데이터 변환/적응
- **dashboard-asset-context.ts**: 자산 컨텍스트 관리

---

## 스타일링

- **방식**: Tailwind CSS + CSS Modules
- **테마**: 다크 모드 (기본값)
- **폰트**:
  - 영문: Inter (Google Fonts)
  - 한글: Pretendard (로컬 폰트)
- **CSS 파일**:
  - `src/app/globals.css`: 전역 스타일

---

## 개발 스크립트

```bash
npm run dev      # 개발 서버 시작 (localhost:3000)
npm run build    # 프로덕션 빌드
npm start        # 프로덕션 서버 시작
npm run lint     # ESLint 실행
```

---

## 패키지 주요 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| next | 14.2.35 | 프레임워크 |
| react | 18.3.1 | UI 라이브러리 |
| typescript | ^5 | 타입 안정성 |
| tailwindcss | ^4 | 유틸리티 CSS |
| @tanstack/react-query | 5.100.9 | 서버 상태 관리 |
| recharts | 2.15.4 | 차트 라이브러리 |
| date-fns | 4.1.0 | 날짜 유틸리티 |
| lucide-react | 1.14.0 | 아이콘 |
| radix-ui | 1.4.3 | 접근성 UI 컴포넌트 |
| react-hot-toast | 2.6.0 | 토스트 알림 |

---

## 주요 기능 플로우

### 모니터링 대시보드
1. `monitoring/page.tsx` → DashboardLayout 구성
2. 헤더에서 시간, 상태 표시
3. 사이드메뉴에서 모니터링 트리 렌더링
4. 메인 콘텐츠에서 설비 상태, KPI, 차트 표시
5. 백그라운드에서 `use-global-alert-monitor` 훅으로 알림 모니터링

### 설비 상세 페이지
1. `site/[site_id]/location/[locationId]/asset/[asset_id]/page.tsx`
2. `asset-dashboard-page.tsx` 렌더링
3. Summary/Trend/EventLog 패널 표시
4. 임계값 편집, 카메라 피드 제공

---

## 배포 구성

- **설정 파일**: `tsconfig.json` (TypeScript)
- **환경**: Next.js 14 기반
- **최적화**: 증분 빌드, 번들 최적화

---

## 향후 개선 사항

- [ ] 관리자 페이지 구현
- [ ] 사용자 설정 페이지 구현
- [ ] 실시간 데이터 소켓 연결 (WebSocket)
- [ ] 알림 푸시 기능
- [ ] 데이터 내보내기 기능
- [ ] 다중 언어 지원 (영문, 중문 등)
