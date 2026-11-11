/**
 * 서버에서 자료를 읽는 동안 보여 주는 자리표시.
 *
 * `cacheComponents: true` 환경에서는 캐시하지 않는 읽기를 `Suspense` 경계 안에 둬야 한다.
 * 그 경계의 공통 대체 화면이다. 레이아웃이 흔들리지 않도록 높이를 정해 둔다.
 */
export function LoadingBlock({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p role="status" className="text-sm text-muted">
        {label}
      </p>
      <div className="mt-4 space-y-3" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="h-24 rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
