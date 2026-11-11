/**
 * 서버 전용 모듈 표시.
 *
 * CLAUDE.md 7장은 `server-only` import를 요구하지만, 그 패키지는 Next 번들러가
 * `react-server` 조건으로 바꿔 주는 전용 모듈이라 Vitest(node) 환경에서는 그대로 읽히면
 * 예외를 던진다. 통합 테스트가 실제 DB에 붙어야 하므로 같은 목적(서버 모듈이 브라우저로
 * 넘어가지 않게 막기)을 런타임 가드로 대신한다. // ASM-020
 *
 * 조정자가 Vitest 설정에 `server-only` 별칭을 넣어 주면 이 파일을 지우고
 * `import "server-only"`로 되돌린다. (docs/reports/phase-4-be-notes.md 참고)
 */
if (typeof window !== "undefined") {
  throw new Error("SERVER_ONLY_MODULE_LOADED_IN_BROWSER");
}

export {};
