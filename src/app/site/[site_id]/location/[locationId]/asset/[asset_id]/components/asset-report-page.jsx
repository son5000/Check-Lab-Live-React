"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Mail, Printer } from "lucide-react";
import * as THREE from "three";
import { createDashboardDateTimeFormatter } from "@/app/layouts/helpers/time-formatters";
import { translateText } from "@/app/layouts/helpers/localization";
import { useDisplaySettings } from "@/app/layouts/hooks/use-display-settings";
import {
  DEFAULT_MODEL_3D_FILE,
  DEFAULT_VIEWER_3D_CONFIG,
} from "./panels/3d-viewer";
import { ModelLoader } from "./panels/3d-viewer/modules/ModelLoader";
import { disposeObject3D } from "./panels/3d-viewer/utils/threeDisposal";
import { readAssetReportDraft } from "./asset-report-draft-storage";

const DEFAULT_ULTRASOUND_THRESHOLD_DB = 88;
const TREND_RANGES = [
  { id: "1m", points: 13 },
  { id: "1h", points: 13 },
  { id: "24h", points: 13 },
  { id: "7d", points: 8 },
  { id: "30d", points: 16 },
];
const RANGE_AXIS_CONFIG = {
  "1m": { max: 60, ticks: ["-60", "-45", "-30", "-15", "현재"], unit: "초" },
  "1h": { max: 60, ticks: ["-60", "-45", "-30", "-15", "현재"], unit: "분" },
  "24h": { max: 24, ticks: ["-24", "-18", "-12", "-6", "현재"], unit: "시간" },
  "7d": { max: 7, ticks: ["-7", "-5", "-3", "-1", "현재"], unit: "일" },
  "30d": { max: 30, ticks: ["-30", "-20", "-10", "현재"], unit: "일" },
};
const STATUS_LABEL = {
  caution: "요주의",
  danger: "이상",
  error: "오류",
  normal: "정상",
  warning: "경고",
};
const REPORT_MODEL_SNAPSHOT_WIDTH = 1400;
const REPORT_MODEL_SNAPSHOT_MIN_HEIGHT = 480;
const REPORT_MODEL_SNAPSHOT_MAX_HEIGHT = 720;
const REPORT_MODEL_SNAPSHOT_CAMERA_PADDING = 0.96;
const REPORT_MODEL_SNAPSHOT_RADIUS_DISTANCE = 1;
const REPORT_PARTS_PER_PAGE = 4;
const REPORT_NAVIGATION_DRAFT_MAX_AGE_MS = 1000 * 60 * 5;
const REPORT_BOOT_LOADER_STYLE = {
  alignItems: "center",
  background: "#e5e7eb",
  display: "grid",
  inset: 0,
  justifyItems: "center",
  minHeight: "100vh",
  padding: 24,
  position: "fixed",
  zIndex: 1000,
};
const REPORT_CONTENT_HIDDEN_STYLE = {
  opacity: 0,
  pointerEvents: "none",
  visibility: "hidden",
};
const REPORT_CONTENT_READY_STYLE = {
  opacity: 1,
  pointerEvents: "auto",
  transition: "opacity 180ms ease-out",
  visibility: "visible",
};
const REPORT_EMAIL_ENDPOINT = "https://checklab.co.kr/api/reports/email";
const REPORT_EXPORT_STYLE = `
  html.AssetReportPageDocument,
  body.AssetReportPageBody {
    width: 210mm !important;
    min-width: 210mm !important;
    margin: 0 !important;
    overflow: visible !important;
    background: #ffffff !important;
  }

  .AssetReportPage {
    width: 210mm !important;
    min-height: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
    padding: 0 !important;
  }

  .AssetReportPage__toolbar,
  .AssetReportPage__toolbar-message,
  .AssetReportPage__boot-loader {
    display: none !important;
  }

  .AssetReportPage__sheet {
    width: 210mm !important;
    min-width: 210mm !important;
    max-width: 210mm !important;
    height: 297mm !important;
    min-height: 297mm !important;
    max-height: 297mm !important;
    margin: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    outline: 0 !important;
    box-sizing: border-box !important;
    page-break-inside: avoid !important;
    break-inside: avoid-page !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__metrics-table,
  .AssetReportPage__metrics-table--summary {
    border: 1px solid #000000 !important;
    border-collapse: collapse !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__metrics-table th,
  .AssetReportPage__metrics-table td,
  .AssetReportPage__metrics-table--summary th,
  .AssetReportPage__metrics-table--summary td {
    border: 1px solid #000000 !important;
    padding: 4px 8px !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__metrics-table th,
  .AssetReportPage__metrics-table--summary th {
    background: #dbe4f0 !important;
    color: #1e3a5f !important;
  }

  .AssetReportPage__part-table {
    border: 1px solid #111827 !important;
    border-collapse: collapse !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__part-table th,
  .AssetReportPage__part-table td {
    border: 1px solid #111827 !important;
    padding: 3px 6px !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__part-table th {
    background: #dbe4f0 !important;
    color: #1e3a5f !important;
  }

  .AssetReportPage__panel,
  .AssetReportPage__chart-card,
  .AssetReportPage__part-slot {
    border: 1px solid #6b7280 !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__panel-header,
  .AssetReportPage__chart-header {
    border-bottom: 1px solid #6b7280 !important;
    background: #f3f4f6 !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__part-image {
    border: 1px solid #9ca3af !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__model-section {
    border: 1px solid #6b7280 !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  .AssetReportPage__chart-svg {
    border: 1px solid #6b7280 !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }
`;

export function AssetReportPage({
  asset,
  asset_id,
  location,
  remoteDashboard,
  site,
}) {
  const { settings: displaySettings } = useDisplaySettings();
  const [reportSnapshot, setReportSnapshot] = useState(() => ({
    generatedAt: undefined,
    isLoaded: false,
    remoteDashboard,
    reportDraft: null,
  }));
  const report = useMemo(
    () =>
      buildReportModel({
        asset,
        generatedAt: reportSnapshot.generatedAt,
        location,
        remoteDashboard: reportSnapshot.remoteDashboard,
        reportDraft: reportSnapshot.reportDraft,
        displaySettings,
        site,
      }),
    [asset, displaySettings, location, reportSnapshot, site],
  );
  const partPageRows = useMemo(
    () =>
      report.assetPartRows.length
        ? chunkRows(report.assetPartRows, REPORT_PARTS_PER_PAGE)
        : [[]],
    [report.assetPartRows],
  );
  const totalPageCount = 1 + partPageRows.length;
  const [isReportReady, setIsReportReady] = useState(false);
  const [isSendingReportEmail, setIsSendingReportEmail] = useState(false);
  const [reportEmailMessage, setReportEmailMessage] = useState(null);
  const isReportContentReady = reportSnapshot.isLoaded && isReportReady;

  useEffect(() => {
    setIsReportReady(false);
    const nextReportDraft = readAssetReportDraft(asset_id, {
      maxAgeMs: REPORT_NAVIGATION_DRAFT_MAX_AGE_MS,
    });
    setReportSnapshot({
      generatedAt: readReportSnapshotGeneratedAt(nextReportDraft),
      isLoaded: true,
      remoteDashboard: nextReportDraft?.remoteDashboard ?? remoteDashboard,
      reportDraft: nextReportDraft,
    });
  }, [asset_id, remoteDashboard]);

  useEffect(() => {
    if (!reportSnapshot.isLoaded) {
      return undefined;
    }

    let firstFrameId = 0;
    let secondFrameId = 0;
    document.documentElement.classList.add("AssetReportPageDocument");
    document.body.classList.add("AssetReportPageBody");
    document.title = translateText(
      `${report.asset.name} 설비 보고서`,
      displaySettings.language,
    );
    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setIsReportReady(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
      document.documentElement.classList.remove("AssetReportPageDocument");
      document.body.classList.remove("AssetReportPageBody");
    };
  }, [displaySettings.language, report.asset.name, reportSnapshot.isLoaded]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendReportEmail = async () => {
    if (!isReportContentReady || isSendingReportEmail) {
      return;
    }

    const resolvedRecipientEmail = getReportRecipientEmail(report, asset);
    const recipientEmail =
      resolvedRecipientEmail ??
      window.prompt(
        translateText("담당자 이메일을 입력하세요.", displaySettings.language),
      );
    const normalizedRecipientEmail = recipientEmail?.trim();

    if (!normalizedRecipientEmail || !isLikelyEmail(normalizedRecipientEmail)) {
      setReportEmailMessage({
        tone: "error",
        text: "담당자 이메일을 확인해 주세요.",
      });
      return;
    }

    const html = buildCurrentReportHtmlDocument({
      assetName: report.asset.name,
      generatedAt: report.generatedAt,
      language: displaySettings.language,
    });

    if (!html) {
      setReportEmailMessage({
        tone: "error",
        text: "보고서 화면이 아직 준비되지 않았습니다.",
      });
      return;
    }

    setIsSendingReportEmail(true);
    setReportEmailMessage(null);

    try {
      const response = await fetch(REPORT_EMAIL_ENDPOINT, {
        body: JSON.stringify({
          asset_id,
          format: "pdf",
          location_id: location.id,
          recipient: {
            email: normalizedRecipientEmail,
            name: report.asset.manager ?? report.asset.assignee ?? "",
          },
          filename: createReportPdfFileName(report.asset.name),
          report: {
            generatedAt: report.generatedAt,
            html,
            sourceUrl: window.location.href,
            title: translateText(
              `${report.asset.name} 설비 보고서`,
              displaySettings.language,
            ),
          },
          site_id: site.site_id,
          subject: `[CheckLab] ${translateText(
            `${report.asset.name} 설비 보고서`,
            displaySettings.language,
          )}`,
        }),
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await readResponseErrorText(response);
        throw new Error(
          errorText || `보고서 이메일 발송 요청 실패 (${response.status})`,
        );
      }

      setReportEmailMessage({
        tone: "success",
        text: "담당자에게 보고서 이메일 발송을 요청했습니다.",
      });
    } catch (error) {
      setReportEmailMessage({
        tone: "error",
        text:
          error instanceof Error && error.message
            ? error.message
            : "보고서 이메일 발송에 실패했습니다.",
      });
    } finally {
      setIsSendingReportEmail(false);
    }
  };

  return (
    <main className="AssetReportPage">
      {!isReportContentReady ? (
        <ReportBootLoader assetName={report.asset.name} />
      ) : null}
      <div
        style={
          isReportContentReady
            ? REPORT_CONTENT_READY_STYLE
            : REPORT_CONTENT_HIDDEN_STYLE
        }
      >
        <div className="AssetReportPage__toolbar">
          <button
            className="AssetReportPage__toolbar-button"
            type="button"
            onClick={handlePrint}
          >
            <Printer aria-hidden="true" size={16} />
            인쇄/저장
          </button>
          <button
            className="AssetReportPage__toolbar-button"
            type="button"
            disabled={!isReportContentReady || isSendingReportEmail}
            onClick={handleSendReportEmail}
          >
            {isSendingReportEmail ? (
              <LoaderCircle
                aria-hidden="true"
                className="AssetReportPage__toolbar-spinner"
                size={16}
              />
            ) : (
              <Mail aria-hidden="true" size={16} />
            )}
            {isSendingReportEmail ? "이메일 전송 중" : "담당자 이메일 발송"}
          </button>
        </div>
        {reportEmailMessage ? (
          <p
            className={`AssetReportPage__toolbar-message AssetReportPage__toolbar-message--${reportEmailMessage.tone}`}
          >
            {reportEmailMessage.text}
          </p>
        ) : null}

        <section
          className="AssetReportPage__sheet AssetReportPage__sheet--first"
          aria-label="설비 보고서 1페이지"
        >
          <ReportModelSection
            asset={report.asset}
            generatedAt={report.generatedAt}
            location={location}
            site={site}
          />
          <ReportStatusSection report={report} />
          <section
            className="AssetReportPage__trend-section"
            aria-label="설비 추이 그래프"
          >
            <SimpleTrendChart
              color="#1f2937"
              data={report.ultrasonicData}
              referenceLines={report.ultrasonicReferenceLines}
              title="초음파 추이"
              unit="dB"
              xAxis={report.xAxis}
              yAxisMax={120}
            />
            <SimpleTrendChart
              color="#4b5563"
              data={report.temperatureData}
              referenceLines={report.temperatureReferenceLines}
              title="온도 추이"
              unit="℃"
              xAxis={report.xAxis}
              yAxisMax={report.temperatureYAxisMax}
            />
          </section>
          <ReportPageFooter pageNumber={1} totalPages={totalPageCount} />
        </section>

        {partPageRows.map((pageRows, pageIndex) => (
          <ReportPartAnalysisSheet
            key={`part-page-${pageIndex}`}
            assetName={report.asset.name}
            pageNumber={pageIndex + 2}
            rows={pageRows}
            startIndex={pageIndex * REPORT_PARTS_PER_PAGE}
            totalPartCount={report.assetPartRows.length}
            totalPages={totalPageCount}
          />
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          margin: 0;
          size: A4 portrait;
        }

        .AssetReportPageDocument,
        .AssetReportPageBody {
          height: auto !important;
          margin: 0 !important;
          min-height: 100%;
          overflow-x: hidden !important;
          overflow-y: auto !important;
        }

        .AssetReportPage {
          min-height: 100vh;
          background: #d4d4d4;
          color: #111827;
          padding: 24px;
          font-family: var(--font-app-sans), "Noto Sans KR", sans-serif;
        }

        .AssetReportPage__toolbar {
          position: sticky;
          top: 12px;
          z-index: 20;
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .AssetReportPage__boot-loader {
          color: #111827;
          font-family: var(--font-app-sans), "Noto Sans KR", sans-serif;
        }

        .AssetReportPage__boot-card {
          display: grid;
          width: min(28rem, calc(100vw - 48px));
          justify-items: center;
          gap: 12px;
          border: 1px solid #9ca3af;
          background: #ffffff;
          padding: 24px;
          text-align: center;
        }

        .AssetReportPage__boot-spinner {
          width: 34px;
          height: 34px;
          border: 3px solid #d1d5db;
          border-top-color: #111827;
          animation: asset-report-spin 760ms linear infinite;
        }

        .AssetReportPage__boot-title {
          margin: 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 900;
        }

        .AssetReportPage__boot-text {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        @keyframes asset-report-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .AssetReportPage__toolbar-button {
          display: inline-flex;
          height: 36px;
          align-items: center;
          gap: 6px;
          border: 1px solid #9ca3af;
          background: #f9fafb;
          color: #0f172a;
          padding: 0 12px;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .AssetReportPage__toolbar-button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .AssetReportPage__toolbar-spinner {
          animation: asset-report-spin 760ms linear infinite;
        }

        .AssetReportPage__toolbar-message {
          width: 210mm;
          margin: -6px auto 12px;
          border: 1px solid #9ca3af;
          background: #ffffff;
          padding: 10px 12px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
        }

        .AssetReportPage__toolbar-message--success {
          border-color: #10b981;
          background: #ecfdf5;
          color: #047857;
        }

        .AssetReportPage__toolbar-message--error {
          border-color: #ef4444;
          background: #fef2f2;
          color: #b91c1c;
        }

        .AssetReportPage__sheet {
          position: relative;
          width: 210mm;
          height: 297mm;
          margin: 0 auto 18px;
          break-after: page;
          page-break-after: always;
          background: #ffffff;
          box-sizing: border-box;
          overflow: hidden;
          border: 1px solid #b8b8b8;
          padding: 13mm 14mm 16mm;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .AssetReportPage__sheet:last-child {
          break-after: auto;
          page-break-after: auto;
          margin-bottom: 0;
        }

        .AssetReportPage__sheet--first {
          display: grid;
          grid-template-rows: 60mm 62mm minmax(0, 1fr);
          gap: 3mm;
        }

        .AssetReportPage__sheet--second {
          display: grid;
          grid-template-rows: 12mm minmax(0, 1fr);
          gap: 3mm;
        }

        .AssetReportPage__page-footer {
          position: absolute;
          right: 14mm;
          bottom: 5mm;
          left: 14mm;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          text-align: center;
        }

        .AssetReportPage__model-section {
          position: relative;
          display: grid;
          min-height: 0;
          overflow: hidden;
          border: 1px solid #6b7280;
          background: #0f172a;
        }

        .AssetReportPage__model-stage {
          position: absolute;
          inset: 0;
          min-height: 0;
        }

        .AssetReportPage__model-image {
          display: block;
          width: 100%;
          height: 100%;
          background: #0f172a;
          object-fit: cover;
        }

        .AssetReportPage__model-placeholder {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: #0f172a;
          color: rgba(226, 232, 240, 0.86);
          font-size: 11px;
          font-weight: 800;
          text-align: center;
        }

        .AssetReportPage__model-placeholder-content {
          display: grid;
          justify-items: center;
          gap: 8px;
        }

        .AssetReportPage__model-spinner {
          width: 26px;
          height: 26px;
          border: 3px solid rgba(148, 163, 184, 0.28);
          border-top-color: #e5e7eb;
          animation: asset-report-spin 760ms linear infinite;
        }

        .AssetReportPage__model-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          pointer-events: none;
        }

        .AssetReportPage__model-title {
          max-width: 64%;
        }

        .AssetReportPage__eyebrow,
        .AssetReportPage__model-meta,
        .AssetReportPage__page-header p {
          margin: 0;
          color: rgba(226, 232, 240, 0.78);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .AssetReportPage__model-title h1 {
          margin: 3px 0 0;
          color: #ffffff;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1.12;
        }

        .AssetReportPage__model-meta {
          align-self: flex-start;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(2, 6, 23, 0.72);
          padding: 6px 8px;
          color: #e2e8f0;
          text-align: right;
        }

        .AssetReportPage__status-section {
          display: grid;
          min-height: 0;
          grid-template-columns: minmax(0, 1fr);
        }

        .AssetReportPage__panel {
          min-height: 0;
          overflow: hidden;
          border: 1px solid #6b7280 !important;
          background: #ffffff !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__status-panel {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
        }

        .AssetReportPage__panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-bottom: 1px solid #6b7280 !important;
          background: #f3f4f6 !important;
          padding: 8px 10px;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__panel-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 12px;
          font-weight: 900;
        }

        .AssetReportPage__metrics-table {
          width: 100%;
          height: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1px solid #000000 !important;
          empty-cells: show;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__metrics-table--summary {
          height: 100%;
          border: 1px solid #000000 !important;
          border-collapse: collapse;
          border-spacing: 0;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__metrics-table--summary tr {
          height: 11%;
        }

        .AssetReportPage__metrics-table--summary .AssetReportPage__metrics-table-opinion-row {
          height: 34%;
        }

        .AssetReportPage__metrics-table th,
        .AssetReportPage__metrics-table td {
          box-sizing: border-box;
          overflow: hidden;
          border: 1px solid #000000 !important;
          padding: 4px 8px;
          line-height: 1.3;
          overflow-wrap: anywhere;
          vertical-align: middle;
          word-break: keep-all;
          text-align: center;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__metrics-table th {
          background: #dbe4f0 !important;
          color: #1e3a5f !important;
          font-size: 10px;
          font-weight: 700;
          text-align: center;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__metrics-table td {
          color: #111827 !important;
          font-size: 10px;
          font-weight: 400;
          text-align: center;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__metrics-table--summary th,
        .AssetReportPage__metrics-table--summary td {
          border: 1px solid #000000 !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__metrics-table-opinion-row th {
          background: #dbe4f0;
          text-align: center;
          vertical-align: middle;
          overflow: hidden;
        }

        .AssetReportPage__metrics-table-opinion-row td {
          color: #334155;
          font-size: 9px;
          font-weight: 400;
          line-height: 1.35;
          text-align: left;
          vertical-align: middle;
        }

        .AssetReportPage__opinion-text,
        .AssetReportPage__part-opinion-text {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
        }

        .AssetReportPage__opinion-text {
          -webkit-line-clamp: 3;
        }

        .AssetReportPage__part-opinion-text {
          -webkit-line-clamp: 3;
        }

        .AssetReportPage__trend-section {
          display: grid;
          min-height: 0;
          grid-template-rows: 1fr 1fr;
          gap: 3mm;
        }

        .AssetReportPage__chart-card {
          display: grid;
          min-height: 0;
          grid-template-rows: auto minmax(0, 1fr);
          overflow: hidden;
          border: 1px solid #6b7280 !important;
          background: #ffffff !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-bottom: 1px solid #6b7280 !important;
          background: #f3f4f6 !important;
          padding: 8px 10px;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__chart-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 12px;
          font-weight: 900;
        }

        .AssetReportPage__chart-header span {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .AssetReportPage__chart-svg {
          display: block;
          min-height: 0;
          width: 100%;
          height: 100%;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          background: #ffffff;
          font-family: var(--font-app-sans), "Noto Sans KR", sans-serif;
          letter-spacing: 0;
        }

        .AssetReportPage__page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
        }

        .AssetReportPage__page-header p {
          color: #64748b;
        }

        .AssetReportPage__page-header h2 {
          margin: 1px 0 0;
          color: #0f172a;
          font-size: 16px;
          font-weight: 900;
        }

        .AssetReportPage__page-header span {
          color: #334155;
          font-size: 11px;
          font-weight: 800;
        }

        .AssetReportPage__part-list {
          display: grid;
          min-height: 0;
          grid-template-rows: repeat(4, 1fr);
          gap: 3mm;
        }

        .AssetReportPage__part-slot {
          display: grid;
          min-height: 0;
          grid-template-columns: 38% minmax(0, 1fr);
          gap: 3mm;
          overflow: hidden;
          border: 1px solid #6b7280 !important;
          background: #ffffff !important;
          padding: 4mm;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__part-slot--empty {
          visibility: hidden;
        }

        .AssetReportPage__part-image {
          position: relative;
          min-height: 0;
          overflow: hidden;
          border: 1px solid #9ca3af !important;
          background: #f3f4f6 !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__part-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #020617;
        }

        .AssetReportPage__part-roi {
          position: absolute;
          border: 2px solid #111827;
          background: rgba(17, 24, 39, 0.12);
        }

        .AssetReportPage__part-point {
          position: absolute;
          display: grid;
          width: 16px;
          height: 16px;
          place-items: center;
          transform: translate(-50%, -50%);
          border: 1px solid #ffffff;
          background: #111827;
          color: #ffffff;
          font-size: 9px;
          font-weight: 900;
        }

        .AssetReportPage__part-content {
          display: grid;
          min-height: 0;
          align-items: stretch;
          text-align: center;
        }

        .AssetReportPage__part-table {
          width: 100%;
          height: 100%;
          min-height: 0;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1px solid #111827 !important;
          empty-cells: show;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__part-table tbody {
          height: 100%;
        }

        .AssetReportPage__part-table tr {
          height: 12%;
        }

        .AssetReportPage__part-table .AssetReportPage__part-opinion {
          height: 28%;
        }

        .AssetReportPage__part-table th,
        .AssetReportPage__part-table td {
          box-sizing: border-box;
          overflow: hidden;
          border: 1px solid #111827 !important;
          padding: 3px 6px;
          font-size: 9px;
          line-height: 1.25;
          overflow-wrap: anywhere;
          vertical-align: middle;
          word-break: keep-all;
          text-align: center;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__part-table th {
          width: 30%;
          background: #dbe4f0 !important;
          color: #1e3a5f !important;
          font-weight: 700;
          text-align: center;
          vertical-align: middle;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__part-table td {
          color: #111827 !important;
          font-weight: 400;
          text-align: center;
          vertical-align: middle;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .AssetReportPage__part-name-row td {
          color: #0f172a !important;
          font-size: 9px;
          font-weight: 900;
        }

        .AssetReportPage__part-opinion td {
          color: #334155 !important;
          font-size: 8px;
          font-weight: 600;
          line-height: 1.35;
          text-align: left;
          vertical-align: top;
        }

        .AssetReportPage__empty-part {
          display: grid;
          min-height: 0;
          place-items: center;
          border: 1px dashed #6b7280;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            width: 210mm;
            min-width: 210mm;
            overflow: visible !important;
            background: #ffffff !important;
          }

          .AssetReportPage {
            width: 210mm !important;
            min-height: 0;
            background: #ffffff !important;
            padding: 0 !important;
          }

          .AssetReportPage__toolbar,
          .AssetReportPage__toolbar-message {
            display: none;
          }

          .AssetReportPage__boot-loader {
            display: none;
          }

          .AssetReportPage__sheet {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            outline: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .AssetReportPage__metrics-table,
          .AssetReportPage__metrics-table--summary {
            border: 1px solid #000000 !important;
            border-collapse: collapse !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .AssetReportPage__metrics-table th,
          .AssetReportPage__metrics-table td,
          .AssetReportPage__metrics-table--summary th,
          .AssetReportPage__metrics-table--summary td {
            border: 1px solid #000000 !important;
            padding: 4px 8px !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .AssetReportPage__metrics-table th,
          .AssetReportPage__metrics-table--summary th {
            background: #dbe4f0 !important;
            color: #1e3a5f !important;
          }

          .AssetReportPage__part-table,
          .AssetReportPage__part-table th,
          .AssetReportPage__part-table td {
            border: 1px solid #111827 !important;
            border-collapse: collapse !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .AssetReportPage__part-table th {
            background: #dbe4f0 !important;
            color: #1e3a5f !important;
          }

          .AssetReportPage__panel,
          .AssetReportPage__chart-card,
          .AssetReportPage__part-slot {
            border: 1px solid #6b7280 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .AssetReportPage__panel-header,
          .AssetReportPage__chart-header {
            border-bottom: 1px solid #6b7280 !important;
            background: #f3f4f6 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .AssetReportPage__part-image {
            border: 1px solid #9ca3af !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `,
        }}
      />
    </main>
  );
}

function ReportModelSection({ asset, generatedAt, location, site }) {
  return (
    <section className="AssetReportPage__model-section">
      <ReportModelSnapshot />
      <div className="AssetReportPage__model-overlay">
        <div className="AssetReportPage__model-title">
          <p className="AssetReportPage__eyebrow">Asset Condition Report</p>
          <h1>{asset.name}</h1>
          <p className="AssetReportPage__eyebrow">
            {site.name} / {location.name}
          </p>
        </div>
        <div className="AssetReportPage__model-meta">
          <div>{generatedAt}</div>
          <div>{asset.assetCode ?? asset.id}</div>
        </div>
      </div>
    </section>
  );
}

function ReportBootLoader({ assetName }) {
  return (
    <div
      className="AssetReportPage__boot-loader"
      style={REPORT_BOOT_LOADER_STYLE}
      role="status"
      aria-live="polite"
    >
      <div className="AssetReportPage__boot-card">
        <div className="AssetReportPage__boot-spinner" aria-hidden="true" />
        <p className="AssetReportPage__boot-title">보고서 화면 준비 중</p>
        <p className="AssetReportPage__boot-text">
          {assetName}의 3D 모델, 수치 테이블, 추이 그래프 레이아웃을 정돈하고
          있습니다.
        </p>
      </div>
    </div>
  );
}

function ReportModelSnapshot() {
  const containerRef = useRef(null);
  const [snapshot, setSnapshot] = useState({ status: "loading", dataUrl: "" });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let disposed = false;
    let disposeSnapshotResources = () => {};

    const renderStaticSnapshot = async () => {
      let scene;
      let renderer;
      let model;
      let resourcesDisposed = false;

      const releaseResources = () => {
        if (resourcesDisposed) {
          return;
        }
        resourcesDisposed = true;
        if (model && !model.parent) {
          disposeObject3D(model);
        }
        if (scene) {
          disposeObject3D(scene);
        }
        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss?.();
        }
      };

      disposeSnapshotResources = releaseResources;

      try {
        const { width, height } = getReportModelSnapshotSize(container);
        scene = new THREE.Scene();
        scene.background = new THREE.Color("#0f172a");

        const camera = new THREE.PerspectiveCamera(
          34,
          width / height,
          0.1,
          1200,
        );
        const rendererOptions = {
          antialias: true,
          preserveDrawingBuffer: true,
        };
        renderer = new THREE.WebGLRenderer(rendererOptions);
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        renderer.shadowMap.enabled = false;

        const ambient = new THREE.HemisphereLight("#e0f2fe", "#1e293b", 1.45);
        const keyLight = new THREE.DirectionalLight("#ffffff", 2.35);
        keyLight.position.set(150, 190, 140);
        const fillLight = new THREE.PointLight("#67e8f9", 0.75, 520);
        fillLight.position.set(-130, 90, -120);
        scene.add(ambient, keyLight, fillLight);

        model = await new ModelLoader().loadModel({
          ...DEFAULT_MODEL_3D_FILE,
          textures:
            DEFAULT_MODEL_3D_FILE.textures?.map((texture) => ({
              ...texture,
            })) ?? [],
        });

        if (disposed) {
          disposeObject3D(model);
          model = undefined;
          return;
        }

        const rotation = DEFAULT_VIEWER_3D_CONFIG.model.rotation;
        model.rotation.order = "XYZ";
        model.rotation.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z),
        );
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = false;
            object.receiveShadow = false;
          }
        });
        scene.add(model);
        frameReportModelSnapshotCamera(camera, model);
        renderer.render(scene, camera);

        const dataUrl = renderer.domElement.toDataURL("image/png");
        if (!disposed) {
          setSnapshot({ status: "ready", dataUrl });
        }
      } catch {
        if (!disposed) {
          setSnapshot({ status: "error", dataUrl: "" });
        }
      } finally {
        releaseResources();
      }
    };

    setSnapshot({ status: "loading", dataUrl: "" });
    renderStaticSnapshot();

    return () => {
      disposed = true;
      disposeSnapshotResources();
    };
  }, []);

  return (
    <div ref={containerRef} className="AssetReportPage__model-stage">
      {snapshot.status === "ready" ? (
        <img
          className="AssetReportPage__model-image"
          src={snapshot.dataUrl}
          alt=""
          aria-hidden="true"
        />
      ) : null}
      {snapshot.status === "loading" ? (
        <div
          className="AssetReportPage__model-placeholder"
          role="status"
          aria-live="polite"
        >
          <div className="AssetReportPage__model-placeholder-content">
            <div
              className="AssetReportPage__model-spinner"
              aria-hidden="true"
            />
            <span>3D 모델 이미지 생성 중</span>
          </div>
        </div>
      ) : null}
      {snapshot.status === "error" ? (
        <div className="AssetReportPage__model-placeholder">
          3D 모델 이미지를 불러오지 못했습니다.
        </div>
      ) : null}
    </div>
  );
}

function getReportModelSnapshotSize(container) {
  const bounds = container.getBoundingClientRect();
  const aspectRatio =
    bounds.width > 0 && bounds.height > 0 ? bounds.width / bounds.height : 2.15;
  const height = Math.round(REPORT_MODEL_SNAPSHOT_WIDTH / aspectRatio);

  return {
    width: REPORT_MODEL_SNAPSHOT_WIDTH,
    height: Math.min(
      Math.max(height, REPORT_MODEL_SNAPSHOT_MIN_HEIGHT),
      REPORT_MODEL_SNAPSHOT_MAX_HEIGHT,
    ),
  };
}

function frameReportModelSnapshotCamera(camera, model) {
  const box = new THREE.Box3().setFromObject(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius > 0 ? sphere.radius : 80;
  const center = sphere.center;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const viewDirection = new THREE.Vector3(1.08, 0.72, 1.08).normalize();
  const boxCorners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  camera.position.copy(center).add(viewDirection);
  camera.lookAt(center);
  camera.updateMatrixWorld();

  const projectedCorners = boxCorners.map((corner) =>
    corner.clone().applyMatrix4(camera.matrixWorldInverse),
  );
  const maxProjectedX = Math.max(
    ...projectedCorners.map((corner) => Math.abs(corner.x)),
  );
  const maxProjectedY = Math.max(
    ...projectedCorners.map((corner) => Math.abs(corner.y)),
  );
  const nearestDepthOffset = Math.max(
    0,
    ...projectedCorners.map((corner) => corner.z + 1),
  );
  const fitDistance = Math.max(
    maxProjectedX / Math.tan(horizontalFov / 2),
    maxProjectedY / Math.tan(verticalFov / 2),
  );
  const distance =
    Math.max(
      fitDistance + nearestDepthOffset,
      radius * REPORT_MODEL_SNAPSHOT_RADIUS_DISTANCE,
    ) * REPORT_MODEL_SNAPSHOT_CAMERA_PADDING;

  camera.position.copy(center).add(viewDirection.multiplyScalar(distance));
  camera.near = Math.max(0.1, distance - radius * 3);
  camera.far = distance + radius * 5;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

function ReportStatusSection({ report }) {
  const summaryFields = getReportStatusSummaryFields(report);

  return (
    <section
      className="AssetReportPage__status-section"
      aria-label="설비 상태 및 소견"
    >
      <div className="AssetReportPage__panel AssetReportPage__status-panel">
        <div className="AssetReportPage__panel-header">
          <h2>설비 상태 요약</h2>
        </div>
        <table className="AssetReportPage__metrics-table AssetReportPage__metrics-table--summary">
          <tbody>
            <tr>
              <th scope="col">설비명</th>
              <th scope="col">위치</th>
              <th scope="col">설비 코드</th>
            </tr>
            <tr>
              <td>{summaryFields.assetName}</td>
              <td>{summaryFields.location}</td>
              <td>{summaryFields.assetCode}</td>
            </tr>
            <tr>
              <th scope="col">설비 유형</th>
              <th scope="col">담당자</th>
              <th scope="col">최근 점검일</th>
            </tr>
            <tr>
              <td>{summaryFields.assetType}</td>
              <td>{summaryFields.manager}</td>
              <td>{summaryFields.lastInspectedAt}</td>
            </tr>
            <tr>
              <th scope="col">온도℃ (평균/최대/최소)</th>
              <th scope="col">초음파dB (평균/피크dB, kHz)</th>
              <th scope="col">상태</th>
            </tr>
            <tr>
              <td>{summaryFields.temperature}</td>
              <td>{summaryFields.ultrasoundWithFreq}</td>
              <td>{summaryFields.status}</td>
            </tr>
            <tr className="AssetReportPage__metrics-table-opinion-row">
              <th scope="row">소견</th>
              <td colSpan={2}>
                <span className="AssetReportPage__opinion-text">
                  {summaryFields.opinion}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function getReportStatusSummaryFields(report) {
  const metricByLabel = new Map(
    report.metricRows.map((row) => [row.label, row.value]),
  );
  const ultrasoundDb = metricByLabel.get("초음파 평균 / 피크") ?? "-";
  const frequencyKHz =
    metricByLabel.get("주파수 / 검출")?.split("/")[0]?.trim() ?? "-";
  const ultrasoundWithFreq =
    ultrasoundDb !== "-" ? `${ultrasoundDb} / ${frequencyKHz}` : "-";

  return {
    assetCode: metricByLabel.get("설비 코드") ?? "-",
    assetName: metricByLabel.get("설비명") ?? "-",
    assetType: metricByLabel.get("설비 유형") ?? "-",
    lastCollectedAt: metricByLabel.get("최근 수집") ?? "-",
    lastInspectedAt:
      report.asset.lastInspectedAt ?? metricByLabel.get("최근 점검일") ?? "-",
    location: metricByLabel.get("위치") ?? "-",
    manager: report.asset.manager ?? report.asset.assignee ?? "-",
    modelName: metricByLabel.get("모델명") ?? "-",
    opinion: report.overallOpinions.join(" "),
    status: metricByLabel.get("가동 상태") ?? "-",
    temperature: metricByLabel.get("온도 평균 / 최대 / 최소") ?? "-",
    ultrasound: ultrasoundDb,
    ultrasoundWithFreq,
  };
}

function SimpleTrendChart({
  color,
  data,
  referenceLines,
  title,
  unit,
  xAxis,
  yAxisMax,
}) {
  const chart = buildSvgChart(data, yAxisMax, referenceLines);
  const legendItems = buildChartLegendItems({ unit, xAxis });
  const gradientId = title.includes("온도")
    ? "asset-report-temperature-fill"
    : "asset-report-ultrasound-fill";
  return (
    <article className="AssetReportPage__chart-card">
      <div className="AssetReportPage__chart-header">
        <h2>{title}</h2>
        <span>최근 {formatChartRangeLabel(xAxis)}</span>
      </div>
      <svg
        className="AssetReportPage__chart-svg"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 420 144"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect fill="#ffffff" height="144" width="420" />
        {chart.horizontalLines.map((line) => (
          <line
            key={line.y}
            stroke="#e2e8f0"
            strokeWidth="1"
            x1={chart.plot.x}
            x2={chart.plot.x + chart.plot.width}
            y1={line.y}
            y2={line.y}
          />
        ))}
        {chart.areaPath ? (
          <path d={chart.areaPath} fill={`url(#${gradientId})`} />
        ) : null}
        {chart.linePath ? (
          <path
            d={chart.linePath}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        ) : null}
        {chart.points.map((point, index) => (
          <circle
            key={`${point.x}-${index}`}
            cx={point.x}
            cy={point.y}
            fill="#ffffff"
            r="2.4"
            stroke={color}
            strokeWidth="1.6"
          />
        ))}
        {referenceLines.map((line, index) => {
          const referenceY = chart.valueToY(line.value);
          return (
            <line
              key={`${line.label}-${index}`}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="1.35"
              x1={chart.plot.x}
              x2={chart.plot.x + chart.plot.width}
              y1={referenceY}
              y2={referenceY}
            />
          );
        })}
        <line
          stroke="#94a3b8"
          strokeWidth="1"
          x1={chart.plot.x}
          x2={chart.plot.x + chart.plot.width}
          y1={chart.axisY}
          y2={chart.axisY}
        />
        <line
          stroke="#94a3b8"
          strokeWidth="1"
          x1={chart.plot.x}
          x2={chart.plot.x}
          y1={chart.plot.y}
          y2={chart.axisY}
        />
        {chart.yAxisLabels.map((label) => (
          <text
            key={label.key}
            fill={label.variant === "threshold" ? "#b91c1c" : "#64748b"}
            fontSize={label.variant === "threshold" ? "7.2" : "6.8"}
            fontWeight={label.variant === "threshold" ? "700" : "600"}
            letterSpacing="0"
            textAnchor="end"
            x={chart.yAxisLabelX}
            y={label.y}
          >
            {label.value}
          </text>
        ))}
        {xAxis.ticks.map((tick, index) => (
          <text
            key={tick}
            fill="#64748b"
            fontSize="6.6"
            fontWeight="600"
            letterSpacing="0"
            textAnchor="middle"
            x={
              chart.plot.x +
              (chart.plot.width * index) / Math.max(xAxis.ticks.length - 1, 1)
            }
            y={chart.xTickY}
          >
            {tick}
          </text>
        ))}
        <g aria-hidden="true">
          {legendItems.map((item, index) => (
            <g
              key={item.label}
              transform={`translate(${64 + index * 122}, ${chart.legendY})`}
            >
              {item.variant === "threshold" ? (
                <line
                  stroke="#ef4444"
                  strokeDasharray="4 3"
                  strokeWidth="1.4"
                  x1="0"
                  x2="18"
                  y1="-3"
                  y2="-3"
                />
              ) : null}
              <text
                fill="#334155"
                fontSize="9"
                fontWeight="700"
                letterSpacing="0"
                x={item.variant === "threshold" ? 23 : 0}
                y="0"
              >
                {item.value ? `${item.label}: ${item.value}` : item.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </article>
  );
}

function buildChartLegendItems({ unit, xAxis }) {
  return [
    { label: "임계치", value: "", variant: "threshold" },
    { label: "x", value: formatXAxisUnit(xAxis), variant: "axis" },
    { label: "y", value: formatYAxisUnit(unit), variant: "axis" },
  ];
}

function formatChartRangeLabel(xAxis) {
  switch (xAxis.rangeId) {
    case "1m":
      return "60초";
    case "1h":
      return "1시간";
    case "24h":
      return "24시간";
    case "7d":
      return "7일";
    case "30d":
      return "30일";
    default:
      return `${xAxis.max}${xAxis.unit}`;
  }
}

function formatXAxisUnit(xAxis) {
  switch (xAxis.rangeId) {
    case "1m":
      return "초";
    case "1h":
      return "분";
    case "24h":
      return "시간";
    case "7d":
    case "30d":
      return "일";
    default:
      return xAxis.unit;
  }
}

function formatYAxisUnit(unit) {
  if (unit === "dB") {
    return "데시벨(dB)";
  }
  return `섭씨(${unit})`;
}

function ReportPartAnalysisSheet({
  assetName,
  pageNumber,
  rows,
  startIndex,
  totalPartCount,
  totalPages,
}) {
  const rangeLabel = rows.length
    ? `${startIndex + 1}-${startIndex + rows.length}`
    : "0";

  return (
    <section
      className="AssetReportPage__sheet AssetReportPage__sheet--second"
      aria-label={`설비 보고서 ${pageNumber}페이지`}
    >
      <header className="AssetReportPage__page-header">
        <div>
          <p>관심 영역 분석</p>
          <h2>{assetName}</h2>
        </div>
        <span>
          {totalPartCount}개 영역 · {rangeLabel}
        </span>
      </header>
      <div className="AssetReportPage__part-list">
        {rows.length ? (
          rows.map((row) => <ReportPartSection key={row.part.id} row={row} />)
        ) : (
          <ReportEmptyPartSection />
        )}
        {Array.from({
          length: Math.max(0, REPORT_PARTS_PER_PAGE - Math.max(rows.length, 1)),
        }).map((_, index) => (
          <div
            key={`empty-slot-${pageNumber}-${index}`}
            className="AssetReportPage__part-slot AssetReportPage__part-slot--empty"
          />
        ))}
      </div>
      <ReportPageFooter pageNumber={pageNumber} totalPages={totalPages} />
    </section>
  );
}

function ReportPageFooter({ pageNumber, totalPages }) {
  return (
    <footer
      className="AssetReportPage__page-footer"
      aria-label={`현재 페이지 ${pageNumber} / ${totalPages}`}
    >
      - {pageNumber} -
    </footer>
  );
}

function ReportPartSection({ row }) {
  return (
    <article className="AssetReportPage__part-slot">
      <ReportPartImage part={row.part} />
      <div className="AssetReportPage__part-content">
        <table className="AssetReportPage__part-table">
          <tbody>
            <tr className="AssetReportPage__part-name-row">
              <th scope="row">관심 영역</th>
              <td>{row.part.name}</td>
            </tr>
            {row.rows.map((item) => (
              <tr key={item.label}>
                <th scope="row">{item.label}</th>
                <td>{item.value}</td>
              </tr>
            ))}
            <tr className="AssetReportPage__part-opinion">
              <th scope="row">소견</th>
              <td>
                <span className="AssetReportPage__part-opinion-text">
                  {row.opinion}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ReportPartImage({ part }) {
  const target = part.viewer3DTarget;
  if (target?.previewImageDataUrl) {
    return (
      <div className="AssetReportPage__part-image">
        <img alt={`${part.name} 관심 영역`} src={target.previewImageDataUrl} />
      </div>
    );
  }
  const points = part.points?.length
    ? part.points
    : [getRoiCenterPoint(part.roi)].filter(Boolean);
  return (
    <div
      className="AssetReportPage__part-image"
      aria-label={`${part.name} 관심 영역 위치`}
    >
      {part.roi ? (
        <span
          className="AssetReportPage__part-roi"
          style={{
            height: `${part.roi.height}%`,
            left: `${part.roi.x}%`,
            top: `${part.roi.y}%`,
            width: `${part.roi.width}%`,
          }}
        />
      ) : null}
      {points.map((point, index) => (
        <span
          key={point.id ?? `point-${index}`}
          className="AssetReportPage__part-point"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          {index + 1}
        </span>
      ))}
    </div>
  );
}

function ReportEmptyPartSection() {
  return (
    <div className="AssetReportPage__empty-part">
      등록된 관심 영역이 없습니다.
    </div>
  );
}

function chunkRows(rows, chunkSize) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  return chunks;
}

function buildCurrentReportHtmlDocument({ assetName, generatedAt, language }) {
  const sheetHtml = Array.from(
    document.querySelectorAll(".AssetReportPage__sheet"),
  )
    .map((sheet) => cloneReportSheetHtml(sheet))
    .join("\n");

  if (!sheetHtml.trim()) {
    return "";
  }

  const reportStyleText = Array.from(document.querySelectorAll("style"))
    .map((styleElement) => styleElement.textContent ?? "")
    .filter(
      (styleText) =>
        styleText.includes("AssetReportPage") || styleText.includes("@page"),
    )
    .join("\n");

  const title = translateText(
    `${assetName} 설비 보고서`,
    language ?? "ko",
  );

  return `<!doctype html>
<html class="AssetReportPageDocument" lang="${escapeHtml(language ?? "ko")}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${reportStyleText}
    ${REPORT_EXPORT_STYLE}
  </style>
</head>
<body class="AssetReportPageBody">
  <main class="AssetReportPage" data-generated-at="${escapeHtml(generatedAt)}">
    ${sheetHtml}
  </main>
</body>
</html>`;
}

function cloneReportSheetHtml(sheet) {
  const clonedSheet = sheet.cloneNode(true);
  removeNextGeneratedClassNames(clonedSheet);
  return clonedSheet.outerHTML;
}

function removeNextGeneratedClassNames(root) {
  [root, ...root.querySelectorAll("[class]")].forEach((element) => {
    Array.from(element.classList).forEach((className) => {
      if (className.startsWith("jsx-")) {
        element.classList.remove(className);
      }
    });
  });
}

function getReportRecipientEmail(report, asset) {
  return readFirstString(
    report.asset.managerEmail,
    report.asset.manager_email,
    report.asset.email,
    report.asset.managerContactEmail,
    asset.managerEmail,
    asset.manager_email,
    asset.email,
    asset.managerContactEmail,
  );
}

function readFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createReportPdfFileName(assetName) {
  const safeAssetName = String(assetName)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "_");
  return `${safeAssetName || "asset"}-report.pdf`;
}

async function readResponseErrorText(response) {
  const responseText = await response.text();
  if (!responseText) {
    return "";
  }

  try {
    const data = JSON.parse(responseText);
    return (
      readFirstString(data.message, data.detail, data.error) ?? responseText
    );
  } catch {
    return responseText;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readReportSnapshotGeneratedAt(reportDraft) {
  return reportDraft?.capturedAt ?? reportDraft?.savedAt;
}

function formatReportGeneratedAt(value, displaySettings) {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return createDashboardDateTimeFormatter(displaySettings, {
    includeSeconds: false,
  }).format(validDate);
}

function buildReportModel({
  asset,
  generatedAt,
  location,
  remoteDashboard,
  reportDraft,
  displaySettings,
  site,
}) {
  const summary = remoteDashboard?.summary ?? {};
  const thresholds = reportDraft?.assetThresholds ??
    remoteDashboard?.initialThresholds ?? {
      temperature: summary.temperatureMax ?? 0,
      ultrasoundDb: DEFAULT_ULTRASOUND_THRESHOLD_DB,
    };
  const assetParts = Array.isArray(reportDraft?.assetParts)
    ? reportDraft.assetParts
    : (remoteDashboard?.initialAssetParts ?? []);
  const assetPartStates = Array.isArray(reportDraft?.assetPartStates)
    ? reportDraft.assetPartStates
    : (remoteDashboard?.initialAssetPartStates ?? []);
  const range = getReportRange(remoteDashboard?.trend?.selectedRangeId);
  const temperatureData = remoteDashboard?.trend?.temperatureData?.length
    ? remoteDashboard.trend.temperatureData
    : buildEmptyTrendData(range);
  const ultrasonicData = remoteDashboard?.trend?.ultrasonicData?.length
    ? remoteDashboard.trend.ultrasonicData
    : buildEmptyTrendData(range);
  const latestTemperature = getLatestTrendPoint(temperatureData);
  const latestUltrasonic = getLatestTrendPoint(ultrasonicData);
  const averageTemperature = readNumber(
    summary.averageTemperature,
    latestTemperature?.average ?? 0,
  );
  const temperatureMax = readNumber(
    summary.temperatureMax,
    latestTemperature?.max ?? averageTemperature,
  );
  const temperatureMin = readNumber(
    summary.temperatureMin,
    latestTemperature?.min ?? averageTemperature,
  );
  const ultrasoundAverageDb = readNumber(
    summary.ultrasoundAverageDb,
    latestUltrasonic?.average ?? 0,
  );
  const ultrasoundPeakDb = readNumber(
    summary.ultrasoundPeakDb,
    latestUltrasonic?.max ?? ultrasoundAverageDb,
  );
  const assetPartRows = buildAssetPartRows(
    assetParts,
    assetPartStates,
    thresholds,
    summary,
  );
  const overallJudgement = mergeJudgements([
    remoteDashboard?.header?.statusJudgement,
    classifyByThreshold(
      averageTemperature,
      thresholds.temperature,
      thresholds.temperatureCritical,
      6,
    ),
    classifyByThreshold(
      ultrasoundAverageDb,
      thresholds.ultrasoundDb,
      thresholds.ultrasoundCriticalDb,
      6,
    ),
    ...assetPartRows.map((row) => row.judgement),
  ]);
  const reportAsset = {
    ...asset,
    lastCollectedAt:
      remoteDashboard?.header?.lastCollectedAt ?? asset.lastCollectedAt,
    name: remoteDashboard?.header?.assetName ?? asset.name,
    status: remoteDashboard?.header?.dashboardStatus ?? asset.status,
  };
  const metricRows = [
    { label: "설비명", value: reportAsset.name },
    { label: "위치", value: `${site.name} / ${location.name}` },
    { label: "설비 코드", value: reportAsset.assetCode ?? reportAsset.id },
    { label: "모델명", value: reportAsset.modelName ?? "미등록" },
    { label: "설비 유형", value: reportAsset.type ?? "설비" },
    {
      label: "가동 상태",
      value: STATUS_LABEL[reportAsset.status] ?? reportAsset.status ?? "정상",
    },
    { label: "최근 수집", value: reportAsset.lastCollectedAt ?? "대기" },
    {
      label: "온도 평균 / 최대 / 최소",
      value: `${roundOne(averageTemperature)}℃ / ${roundOne(temperatureMax)}℃ / ${roundOne(temperatureMin)}℃`,
    },
    {
      label: "초음파 평균 / 피크",
      value: `${roundOne(ultrasoundAverageDb)} dB / ${roundOne(ultrasoundPeakDb)} dB`,
    },
    {
      label: "주파수 / 검출",
      value: `${summary.frequencyBandKHz ?? "0-0 kHz"} / ${summary.ultrasoundDetectionCount ?? assetPartRows.length}건`,
    },
    {
      label: "임계치",
      value: `온도 ${roundOne(thresholds.temperature ?? 0)}℃ / 초음파 ${roundOne(thresholds.ultrasoundDb ?? 0)} dB`,
    },
  ];

  return {
    asset: reportAsset,
    assetPartRows,
    generatedAt: formatReportGeneratedAt(generatedAt, displaySettings),
    metricRows,
    overallJudgement,
    overallOpinions: buildOverallOpinions({
      assetPartRows,
      averageTemperature,
      overallJudgement,
      temperatureMax,
      thresholds,
      ultrasoundAverageDb,
      ultrasoundPeakDb,
    }),
    temperatureData,
    temperatureReferenceLines: normalizeReferenceLines(
      remoteDashboard?.trend?.temperatureReferenceLines,
      thresholds.temperature,
      "온도 임계",
    ),
    temperatureYAxisMax: getTemperatureYAxisMax(
      temperatureMax,
      thresholds.temperature,
    ),
    ultrasonicData,
    ultrasonicReferenceLines: normalizeReferenceLines(
      remoteDashboard?.trend?.ultrasonicReferenceLines,
      thresholds.ultrasoundDb,
      "초음파 임계",
    ),
    xAxis: { ...RANGE_AXIS_CONFIG[range.id], rangeId: range.id },
  };
}

function buildAssetPartRows(parts, states, thresholds, summary) {
  return parts.map((part, index) => {
    const state =
      states.find((item) => item.partId === part.id) ??
      buildFallbackPartState(part, thresholds, summary, index);
    const judgement =
      state.judgement ??
      mergeJudgements([
        classifyByThreshold(
          state.temperatureMax,
          part.thresholds?.temperature ?? thresholds.temperature,
          part.thresholds?.temperatureCritical,
          6,
        ),
        classifyByThreshold(
          state.ultrasoundPeakDb,
          part.thresholds?.ultrasoundDb ?? thresholds.ultrasoundDb,
          part.thresholds?.ultrasoundCriticalDb,
          6,
        ),
      ]);
    return {
      judgement,
      part,
      rows: [
        { label: "영역 유형", value: getAssetPartModeLabel(part) },
        {
          label: "온도 평균 / 최대",
          value: `${roundOne(state.temperatureAverage ?? 0)}℃ / ${roundOne(state.temperatureMax ?? 0)}℃`,
        },
        {
          label: "초음파 피크",
          value: `${roundOne(state.ultrasoundPeakDb ?? 0)} dB`,
        },
        {
          label: "주파수",
          value: `${roundOne(state.dominantFrequencyKHz ?? 0)} kHz`,
        },
        {
          label: "임계치",
          value: `온도 ${roundOne(part.thresholds?.temperature ?? thresholds.temperature ?? 0)}℃ / 초음파 ${roundOne(part.thresholds?.ultrasoundDb ?? thresholds.ultrasoundDb ?? 0)} dB`,
        },
      ],
      opinion: buildPartOpinion(part, state, judgement),
    };
  });
}

function buildFallbackPartState(part, thresholds, summary, index) {
  const offset = index * 0.7;
  return {
    dominantFrequencyKHz: readNumber(summary.dominantFrequencyKHz, 40 + offset),
    judgement: "normal",
    partId: part.id,
    temperatureAverage: Math.max(
      readNumber(summary.averageTemperature, thresholds.temperature - 6),
      0,
    ),
    temperatureMax: Math.max(
      readNumber(summary.temperatureMax, thresholds.temperature - 4),
      0,
    ),
    ultrasoundPeakDb: Math.max(
      readNumber(summary.ultrasoundPeakDb, thresholds.ultrasoundDb - 8),
      0,
    ),
  };
}

function buildOverallOpinions({
  assetPartRows,
  averageTemperature,
  overallJudgement,
  temperatureMax,
  thresholds,
  ultrasoundAverageDb,
  ultrasoundPeakDb,
}) {
  if (overallJudgement === "abnormal") {
    return [
      `현재 설비는 이상 수준으로 분류됩니다. 온도 최대 ${roundOne(temperatureMax)}℃, 초음파 피크 ${roundOne(ultrasoundPeakDb)} dB 기준으로 임계치 초과 여부를 우선 확인해야 합니다.`,
      `이상 또는 요주의 관심 영역 ${assetPartRows.filter((row) => row.judgement !== "normal").length}개가 확인되므로 현장 점검과 센서 원천 데이터 재확인을 권장합니다.`,
    ];
  }
  if (overallJudgement === "caution") {
    return [
      `현재 설비는 요주의 상태입니다. 평균 온도 ${roundOne(averageTemperature)}℃, 평균 초음파 ${roundOne(ultrasoundAverageDb)} dB가 임계치에 근접한 구간을 중심으로 추이를 관찰해야 합니다.`,
      "관심 영역별 변화가 반복되면 점검 주기를 단축하고, 다음 수집 주기에서 동일 패턴이 유지되는지 확인하는 것이 좋습니다.",
    ];
  }
  if (!thresholds.temperature || !thresholds.ultrasoundDb) {
    return [
      "설비 임계치가 충분히 설정되지 않았습니다. 온도와 초음파 기준값을 먼저 등록하면 보고서 판정 신뢰도가 높아집니다.",
      "현재 수집 값은 참고 수치로 표시되며, 운영 기준 확정 전까지는 추이 중심으로 해석하는 것이 안전합니다.",
    ];
  }
  return [
    `현재 설비는 정상 범위입니다. 평균 온도 ${roundOne(averageTemperature)}℃와 평균 초음파 ${roundOne(ultrasoundAverageDb)} dB가 설정 임계치 이내에 있습니다.`,
    "단기 급상승 구간과 관심 영역별 피크 값은 예방 점검 기준으로 계속 추적하는 것이 좋습니다.",
  ];
}

function buildPartOpinion(part, state, judgement) {
  if (judgement === "abnormal") {
    return `${part.name} 영역에서 임계치 초과 가능성이 있습니다. 온도 ${roundOne(state.temperatureMax ?? 0)}℃, 초음파 ${roundOne(state.ultrasoundPeakDb ?? 0)} dB 기준으로 즉시 확인이 필요합니다.`;
  }
  if (judgement === "caution") {
    return `${part.name} 영역은 주의 관찰 대상입니다. 추이 재확인 후 동일 상승 패턴이 반복되면 점검 항목으로 전환하세요.`;
  }
  return `${part.name} 영역은 현재 정상 범위로 판단됩니다. 기준값 대비 안정적이나 주기적인 추이 확인은 유지하세요.`;
}

function buildSvgChart(data, yAxisMax, referenceLines) {
  const values = data.map((point) => readNumber(point.average, 0));
  const referenceMax = Math.max(
    0,
    ...referenceLines.map((line) => readNumber(line.value, 0)),
  );
  const maxValue = Math.max(yAxisMax, referenceMax * 1.15, ...values, 1);
  const plot = { height: 88, width: 370, x: 34, y: 12 };
  const valueToY = (value) =>
    plot.y + plot.height - (readNumber(value, 0) / maxValue) * plot.height;
  const points = values.map((value, index) => ({
    x: plot.x + (plot.width * index) / Math.max(values.length - 1, 1),
    y: valueToY(value),
  }));
  const linePath = points.length
    ? points
        .map(
          (point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
        )
        .join(" ")
    : "";
  const areaPath = points.length
    ? `${linePath} L ${points.at(-1).x} ${plot.y + plot.height} L ${points[0].x} ${plot.y + plot.height} Z`
    : "";
  const yAxisLabelX = plot.x - 6;
  const yAxisLabels = [
    {
      key: "max",
      value: roundOne(maxValue),
      variant: "axis",
      y: plot.y + 5,
    },
    ...referenceLines.map((line, index) => ({
      key: `threshold-${index}`,
      value: roundOne(line.value),
      variant: "threshold",
      y: clamp(
        valueToY(line.value) + 2.4,
        plot.y + 9,
        plot.y + plot.height - 4,
      ),
    })),
    {
      key: "min",
      value: 0,
      variant: "axis",
      y: plot.y + plot.height + 2,
    },
  ];
  return {
    areaPath,
    axisY: plot.y + plot.height,
    horizontalLines: Array.from({ length: 5 }, (_, index) => ({
      y: plot.y + (plot.height * index) / 4,
    })),
    legendY: plot.y + plot.height + 32,
    linePath,
    maxValue,
    plot,
    points,
    valueToY,
    xTickY: plot.y + plot.height + 14,
    yAxisLabelX,
    yAxisLabels,
  };
}

function normalizeReferenceLines(referenceLines, fallbackValue, fallbackLabel) {
  if (referenceLines?.length) {
    return referenceLines.filter((line) => Number.isFinite(line.value));
  }
  return Number.isFinite(fallbackValue) && fallbackValue > 0
    ? [{ label: fallbackLabel, value: fallbackValue }]
    : [];
}

function getReportRange(rangeId) {
  return TREND_RANGES.find((range) => range.id === rangeId) ?? TREND_RANGES[0];
}

function buildEmptyTrendData(range) {
  return Array.from({ length: range.points }, (_, index) => ({
    average: 0,
    max: 0,
    min: 0,
    peakFrequency: 0,
    spread: 0,
    time: `-${range.points - index - 1}`,
  }));
}

function getTemperatureYAxisMax(temperatureMax, threshold) {
  const max = Math.max(temperatureMax, threshold ?? 0);
  if (max > 150) {
    return 300;
  }
  if (max > 100) {
    return 200;
  }
  return 120;
}

function getLatestTrendPoint(points) {
  return points.at(-1);
}

function classifyByThreshold(
  value,
  warningThreshold,
  criticalThreshold,
  cautionMargin,
) {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isFinite(warningThreshold) ||
    warningThreshold <= 0
  ) {
    return "normal";
  }
  if (
    Number.isFinite(criticalThreshold) &&
    criticalThreshold > 0 &&
    value >= criticalThreshold
  ) {
    return "abnormal";
  }
  if (value >= warningThreshold) {
    return "abnormal";
  }
  if (value >= warningThreshold - cautionMargin) {
    return "caution";
  }
  return "normal";
}

function mergeJudgements(judgements) {
  if (judgements.includes("abnormal")) {
    return "abnormal";
  }
  if (judgements.includes("caution")) {
    return "caution";
  }
  if (judgements.includes("unconfigured")) {
    return "unconfigured";
  }
  return "normal";
}

function getAssetPartModeLabel(part) {
  if (part.source === "3d") {
    return part.viewer3DTarget?.kind === "area" ? "3D 영역" : "3D 포인트";
  }
  return part.mode === "area" ? "카메라 ROI" : "관찰 포인트";
}

function getRoiCenterPoint(roi) {
  if (!roi) {
    return undefined;
  }
  return {
    id: "roi-center",
    x: roi.x + roi.width / 2,
    y: roi.y + roi.height / 2,
  };
}

function readNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundOne(value) {
  return Math.round(readNumber(value, 0) * 10) / 10;
}
