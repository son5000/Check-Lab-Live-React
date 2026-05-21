"use client";
import { useEffect, useMemo, useState } from "react";
import { defaultThresholds, assetJudgementItems, assetMetrics, trendRanges, } from "../data/asset-monitoring-data";
import { buildTrendData, buildWaveformData } from "../helpers/chart-data";
import { buildTemperatureReferenceLines, buildThresholdMetrics, buildUltrasonicReferenceLines, countExceededMetrics, getDataJudgement, getAssetJudgement, } from "../helpers/thresholds";
/**
 * 역할
 * - 대시보드 본문 영역의 클라이언트 텔레메트리 상태 파이프라인입니다.
 *
 * 개요
 * - 타이머, 생성 시리즈, 임계치 편집, 파생 판정 값을 한 곳에서 관리합니다.
 *
 * STEP 1. 차트와 파형 clock을 각자의 주기로 갱신합니다.
 * STEP 2. 표시 추이 범위를 30초마다 순환합니다.
 * STEP 3. 현재 상태에서 차트 시리즈와 임계치 뷰 모델을 생성합니다.
 *
 * 헬퍼
 * - 화면 섹션은 이미 정리된 속성만 받아 렌더링 전용으로 유지됩니다.
 */
export function useDashboardTelemetry() {
    const [thresholds, setThresholds] = useState(defaultThresholds);
    const [rangeIndex, setRangeIndex] = useState(0);
    const [chartTick, setChartTick] = useState(0);
    const [waveformTick, setWaveformTick] = useState(0);
    const activeRange = trendRanges[rangeIndex];
    const judgementCounts = useMemo(() => ({
        normal: assetJudgementItems.filter((judgementItem) => judgementItem.judgement === "정상").length,
        caution: assetJudgementItems.filter((judgementItem) => judgementItem.judgement === "요주의").length,
        abnormal: assetJudgementItems.filter((judgementItem) => judgementItem.judgement === "이상").length,
    }), []);
    const ultrasonicTrendData = useMemo(() => buildTrendData(activeRange, chartTick, "ultrasonic"), [activeRange, chartTick]);
    const temperatureTrendData = useMemo(() => buildTrendData(activeRange, chartTick, "temperature"), [activeRange, chartTick]);
    const waveformData = useMemo(() => buildWaveformData(waveformTick), [waveformTick]);
    const thresholdMetrics = useMemo(() => buildThresholdMetrics(assetMetrics, thresholds), [thresholds]);
    const exceededMetricCount = useMemo(() => countExceededMetrics(thresholdMetrics), [thresholdMetrics]);
    const currentDataJudgement = getDataJudgement(exceededMetricCount);
    const currentAssetJudgement = getAssetJudgement(exceededMetricCount);
    const ultrasonicReferenceLines = useMemo(() => buildUltrasonicReferenceLines(thresholds), [thresholds]);
    const temperatureReferenceLines = useMemo(() => buildTemperatureReferenceLines(thresholds), [thresholds]);
    const handleThresholdChange = (id, value) => {
        setThresholds((currentThresholds) => ({
            ...currentThresholds,
            [id]: value,
        }));
    };
    useEffect(() => {
        const timerId = window.setInterval(() => {
            setChartTick((currentTick) => currentTick + 1);
        }, 2000);
        return () => window.clearInterval(timerId);
    }, []);
    useEffect(() => {
        const timerId = window.setInterval(() => {
            setWaveformTick((currentTick) => currentTick + 1);
        }, 500);
        return () => window.clearInterval(timerId);
    }, []);
    useEffect(() => {
        const timerId = window.setInterval(() => {
            setRangeIndex((currentIndex) => (currentIndex + 1) % trendRanges.length);
        }, 30000);
        return () => window.clearInterval(timerId);
    }, []);
    return {
        activeRange,
        currentDataJudgement,
        currentAssetJudgement,
        exceededMetricCount,
        judgementCounts,
        temperatureReferenceLines,
        temperatureTrendData,
        thresholdMetrics,
        ultrasonicReferenceLines,
        ultrasonicTrendData,
        waveformData,
        onThresholdChange: handleThresholdChange,
    };
}
