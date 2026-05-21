/**
 * 역할
 * - 관제 트리 순회 헬퍼입니다.
 *
 * 개요
 * - 전역 사이드메뉴는 펼친 트리용 재귀 노드와 접힌 아이콘 레일용 평탄화 목록을 함께 사용합니다.
 *
 * STEP 1. 루트 노드에서 시작합니다.
 * STEP 2. 화면 표시 순서대로 자식 노드를 재귀적으로 이어 붙입니다.
 *
 * 헬퍼
 * - 트리 평탄화 함수는 순수 함수라 경로 표시, 검색, 접근 제어 필터에서도 재사용할 수 있습니다.
 */
export function flattenTree(node) {
    return [node, ...(node.children?.flatMap((child) => flattenTree(child)) ?? [])];
}
