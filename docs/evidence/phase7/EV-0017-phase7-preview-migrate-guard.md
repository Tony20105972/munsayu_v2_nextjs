# EV-0017 — Preview 배포가 마이그레이션을 건너뛴 기록

> 등급 `OBSERVED` · 2026-11-15 · 기록자 Claude Code
> 근거: Vercel 빌드 기록 (프로젝트 `munsayu-v2-nextjs`)

## 왜 남기는가

독립 리뷰가 찾은 차단 사항의 수정이 **실제 Vercel 환경에서 동작하는지**를 확인한 기록이다.

Preview 배포를 다시 켜면서(`vercel.json` 의 `deploymentEnabled`) 빌드마다
`prisma migrate deploy` 가 돌게 했는데, 가드가 없으면 **아직 병합하지 않은 브랜치를
푸시하는 것만으로** 데이터베이스 구조가 바뀐다. 그리고 그것은 배포 되돌리기로
되돌아가지 않는다 (`docs/rollback-plan.md` 3-1). 지금은 Preview 와 Production 이
같은 Neon 데이터베이스를 쓰고 있어 더 위험하다. (ASM-099)

## 관찰한 것

| 항목 | 값 |
|---|---|
| 배포 ID | `dpl_HDmCBbarFwNt7UuWxwQiaeJgieGL` |
| 빌드 ID | `bld_lu0t9xwuy` |
| 브랜치 · 커밋 | `release/phase-7` · `4ae4374` |
| 환경 | Preview (`target: null`) |
| 결과 | `state: READY` (빌드 성공) |

빌드 기록에서 이어지는 세 줄을 그대로 옮긴다.

```
Detected Next.js version: 16.4.5
Running "node scripts/migrate-deploy.mjs && next build"
[migrate-deploy] VERCEL_ENV=preview 이라 마이그레이션을 건너뜁니다. Production 배포에서만 적용합니다.
▲ Next.js 16.4.5 (Turbopack)
```

같은 줄을 앞선 배포 `dpl_Gc1ej3Ba4vhRbsgHTVDGkwsvscBd`(빌드 `bld_jtew153l0`, 커밋
`dbd7bb4`)에서도 확인했다. 두 배포 모두 데이터베이스에 붙지 않고 빌드를 마쳤다.

## 읽을 점

- 가드가 **실제로 동작한다.** Preview 배포는 마이그레이션을 건너뛰고 바로 `next build` 로 간다.
- 건너뛰었다는 사실이 **빌드 기록에 남는다.** 조용히 넘어가지 않아 나중에 확인할 수 있다.
- 빌드가 실패하지 않는다(`exit 0`). 건너뛰는 것은 오류가 아니다.

## 이 기록으로 증명되지 않는 것

- **Production 배포에서 마이그레이션이 실제로 적용되는지.** 그 경로는 아직 한 번도
  돌지 않았다. Production 배포는 `main` 에서 나오고, Phase 7 브랜치는 병합하지 않았다.
  → Gate 1번과 함께 남아 있는 항목이다 (`docs/reports/phase-7-report.md` 3장).
- 직접 접속 주소(`DATABASE_URL_UNPOOLED`)로 붙는 쪽이 맞는지. 로컬에서는 확인했으나
  (`npm run db:deploy:direct` → `No pending migrations to apply.`) Neon 상대로는 아직이다.
