"use client";
import { useEffect, useMemo, useState } from "react";
import { createDashboardDateFormatter, createDashboardTimeFormatter, } from "@/app/layouts/helpers/time-formatters";
/**
 * 역할
 * - 대시보드 헤더의 실시간 시계 상태를 관리합니다.
 *
 * 개요
 * - 1초 간격 타이머를 관리하고 포맷된 라벨을 셸에 제공합니다.
 *
 * STEP 1. 안정적인 한국어 날짜/시간 포맷터를 생성합니다.
 * STEP 2. 클라이언트에서 현재 `Date` 값을 1초마다 갱신합니다.
 * STEP 3. 초기 클라이언트 연결 이후 날짜가 준비될 때까지 로딩 라벨을 반환합니다.
 *
 * 헬퍼
 * - 시계 반복 타이머 로직이 대시보드 레이아웃에 섞이지 않도록 분리합니다.
 */
export function useDashboardClock() {
    const [now, setNow] = useState(null);
    const dateFormatter = useMemo(() => createDashboardDateFormatter(), []);
    const timeFormatter = useMemo(() => createDashboardTimeFormatter(), []);
    useEffect(() => {
        setNow(new Date());
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => window.clearInterval(timerId);
    }, []);
    return {
        currentDate: now ? dateFormatter.format(now) : "날짜 확인 중",
        currentTime: now ? timeFormatter.format(now) : "시간 확인 중",
    };
}
