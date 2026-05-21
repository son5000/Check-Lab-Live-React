/**
 * 역할
 * - 관제 대시보드용 합성 차트 데이터 생성기입니다.
 *
 * 개요
 * - 갱신값을 기준으로 재현 가능한 시리즈를 만들어 화면 컴포넌트는 렌더링만 담당하게 합니다.
 *
 * STEP 1. 선택된 추이 범위에 맞춰 라벨을 포맷합니다.
 * STEP 2. 초음파 또는 온도 추이 포인트를 생성합니다.
 * STEP 3. 오디오 차트에 사용할 고주파 파형 포인트를 생성합니다.
 *
 * 헬퍼
 * - 실시간 텔레메트리가 연결되면 이 헬퍼를 연동 데이터 정규화 함수로 교체합니다.
 */
function formatChartLabel(range, index, total) {
    const reverseIndex = total - index - 1;
    if (range.id === "1m") {
        return `${reverseIndex * 5}초전`;
    }
    if (range.id === "30m") {
        return `${reverseIndex * 2}분전`;
    }
    if (range.id === "1h") {
        return `${reverseIndex * 5}분전`;
    }
    if (range.id === "24h") {
        return `${reverseIndex * 2}시간전`;
    }
    return `${reverseIndex}일전`;
}
export function buildTrendData(range, tick, kind) {
    return Array.from({ length: range.points }, (_, index) => {
        const wave = Math.sin((index + tick) / 2);
        const pulse = Math.cos((index + tick) / 3);
        if (kind === "ultrasonic") {
            const average = 64 + wave * 4 + pulse * 1.5;
            return {
                time: formatChartLabel(range, index, range.points),
                average: Number(average.toFixed(1)),
                max: Number((average + 8 + Math.abs(pulse) * 4).toFixed(1)),
            };
        }
        const average = 48 + wave * 3 + pulse * 1.2;
        return {
            time: formatChartLabel(range, index, range.points),
            average: Number(average.toFixed(1)),
            max: Number((average + 8 + Math.abs(wave) * 3).toFixed(1)),
            min: Number((average - 7 - Math.abs(pulse) * 2).toFixed(1)),
        };
    });
}
export function buildWaveformData(tick) {
    return Array.from({ length: 96 }, (_, index) => {
        const carrier = Math.sin((index + tick * 5) / 3.7);
        const harmonic = Math.sin((index + tick * 8) / 1.85) * 0.34;
        const modulation = Math.cos((index + tick) / 10) * 0.18;
        return {
            sample: index,
            amplitude: Number(((carrier + harmonic) * (0.72 + modulation)).toFixed(3)),
        };
    });
}
