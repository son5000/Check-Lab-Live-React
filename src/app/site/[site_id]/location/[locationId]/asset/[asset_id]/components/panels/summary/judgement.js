export function getJudgementDetail(parts, partStates, judgement) {
    if (judgement === "unconfigured") {
        return "설비 임계치 설정 대기";
    }
    if (judgement === "normal") {
        return "이상 감지 지점 없음 · 모든 파트 안정";
    }
    const targetStates = partStates.filter((partState) => partState.judgement === judgement);
    const prefix = judgement === "abnormal" ? "이상 감지" : "요주의 감지";
    if (!targetStates.length) {
        return `${prefix}: 상세 지점 산출 대기`;
    }
    return `${prefix}: ${targetStates
        .map((partState) => formatJudgementPart(parts, partState))
        .join(", ")}`;
}
function formatJudgementPart(parts, partState) {
    const part = parts.find((currentPart) => currentPart.id === partState.partId);
    const partName = part?.name ?? partState.partId;
    const reasons = [];
    if (part && partState.temperatureMax >= part.thresholds.temperature) {
        reasons.push(`온도 ${partState.temperatureMax}℃`);
    }
    if (part && partState.ultrasoundPeakDb >= part.thresholds.ultrasoundDb) {
        reasons.push(`초음파 ${partState.ultrasoundPeakDb} dB`);
    }
    if (!reasons.length && partState.temperatureMax > 0) {
        reasons.push(`최고 ${partState.temperatureMax}℃`);
    }
    if (!reasons.length && partState.ultrasoundPeakDb > 0) {
        reasons.push(`피크 ${partState.ultrasoundPeakDb} dB`);
    }
    return reasons.length ? `${partName} ${reasons.join(" · ")}` : partName;
}
export const judgementLabel = {
    unconfigured: "임계치 미설정",
    normal: "정상",
    caution: "요주의",
    abnormal: "이상",
};
export const judgementClassName = {
    unconfigured: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    normal: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    caution: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    abnormal: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};
