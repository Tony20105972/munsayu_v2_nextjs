import Link from "next/link";
import {
  LegacyMediaRegisterForm,
  MediaLibraryTable,
  MediaUploadForm,
} from "@/components/admin/media-panels";
import { MediaTabs } from "@/components/admin/media-tabs";
import { AdminPageHeading, AdminPanel } from "@/components/admin/ui";
import {
  MEDIA_SOURCE_LABELS,
  mediaListSchema,
  type MediaListInput,
} from "@/lib/contracts";
import { getMediaUploadMaxBytes, listMediaAssets } from "@/server/services/media";

/**
 * AD-015 이미지 보관함.
 *
 * 공개 화면이 쓰는 사진을 한곳에서 본다. 올리기·대체 텍스트 수정·삭제·숨기기를 하고,
 * 어느 화면에서 쓰는지 함께 보여 준다. 쓰는 중인 사진은 지울 수 없다.
 *
 * 기존 사이트에서 가져와 `public/` 에 커밋한 사진도 「기존 사이트 사진 등록」으로
 * 목록에 올려 화면에서 한 장씩 새 사진으로 바꿀 수 있다. 그 사진은 배포된 파일을
 * 실행 중에 지울 수 없으므로 「숨기기」로 목록과 사진 고르기에서 뺀다. (AD-015)
 */
export const instant = false;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pick(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "" ? undefined : first;
}

export default async function AdminMediaPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const candidate: Record<string, string> = {};
  for (const key of ["keyword", "source", "usage", "visibility", "page"]) {
    const value = pick(raw[key]);
    if (value !== undefined) candidate[key] = value;
  }

  const parsed = mediaListSchema.safeParse(candidate);
  const filter: MediaListInput = parsed.success
    ? parsed.data
    : mediaListSchema.parse({});

  const [list, maxBytes] = await Promise.all([
    listMediaAssets(filter),
    getMediaUploadMaxBytes(),
  ]);
  const lastPage = Math.max(1, Math.ceil(list.total / list.pageSize));

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (filter.keyword) params.set("keyword", filter.keyword);
    if (filter.source) params.set("source", filter.source);
    if (filter.usage) params.set("usage", filter.usage);
    if (filter.visibility === "hidden") params.set("visibility", "hidden");
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/admin/media?${query}` : "/admin/media";
  }

  return (
    <>
      <AdminPageHeading
        featureId="AD-015"
        title="이미지 관리"
        description="홈페이지에 쓰는 사진을 올리고, 설명을 고치고, 바꾸거나 지웁니다. 지울 수 없는 기존 사이트 사진은 숨겨서 목록에서 뺄 수 있습니다. 사진을 올리면 자동으로 크기를 줄이고 촬영 위치 정보를 지웁니다."
      />

      <MediaTabs />

      <AdminPanel
        title="사진 올리기"
        headingId="media-upload"
        description="휴대폰 사진도 그대로 올릴 수 있습니다. 아이폰 사진(HEIC)은 JPG로 바꿔서 올려 주세요."
      >
        <MediaUploadForm maxBytes={maxBytes} />
      </AdminPanel>

      <AdminPanel
        title="보기 조건"
        headingId="media-filter"
        description={`보관함 전체 ${list.counts.total}장 — 올린 사진 ${list.counts.uploaded}장 / 기존 사이트 사진 ${list.counts.legacy}장 / 교체 권장 ${list.counts.replaceRecommended}장 / 숨긴 사진 ${list.counts.hidden}장`}
      >
        <form
          method="get"
          action="/admin/media"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div>
            <label htmlFor="keyword" className="block text-xs font-bold text-ink">
              파일 이름 · 설명 검색
            </label>
            <input
              id="keyword"
              name="keyword"
              type="search"
              defaultValue={filter.keyword ?? ""}
              maxLength={60}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-xs font-bold text-ink">
              사진 출처
            </label>
            <select
              id="source"
              name="source"
              defaultValue={filter.source ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              <option value="UPLOAD">{MEDIA_SOURCE_LABELS.UPLOAD}</option>
              <option value="LEGACY">{MEDIA_SOURCE_LABELS.LEGACY}</option>
            </select>
          </div>

          <div>
            <label htmlFor="usage" className="block text-xs font-bold text-ink">
              사용 여부
            </label>
            <select
              id="usage"
              name="usage"
              defaultValue={filter.usage ?? ""}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">전체</option>
              <option value="used">화면에서 쓰는 중</option>
              <option value="unused">쓰지 않는 사진</option>
            </select>
          </div>

          <div>
            <label htmlFor="visibility" className="block text-xs font-bold text-ink">
              숨긴 사진
            </label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={filter.visibility}
              className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="visible">보이는 사진만</option>
              <option value="hidden">숨긴 사진만</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              찾기
            </button>
            <Link
              href="/admin/media"
              className="rounded-md border border-line px-4 py-2 text-sm font-bold text-ink hover:bg-canvas"
            >
              조건 지우기
            </Link>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title={`사진 목록 (${list.total}장)`}
        headingId="media-list"
        description={
          filter.visibility === "hidden"
            ? "숨긴 사진입니다. 「다시 보이기」를 누르면 목록과 사진 고르기로 돌아옵니다."
            : undefined
        }
      >
        <MediaLibraryTable items={list.items} visibility={filter.visibility} />

        {lastPage > 1 ? (
          <nav aria-label="목록 쪽 이동" className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: lastPage }, (_, index) => index + 1).map((page) => (
              <Link
                key={page}
                href={pageHref(page)}
                aria-current={page === list.page ? "page" : undefined}
                className={
                  page === list.page
                    ? "rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-white"
                    : "rounded-md border border-line px-3 py-1.5 text-sm font-bold text-ink hover:bg-canvas"
                }
              >
                {page}
              </Link>
            ))}
          </nav>
        ) : null}
      </AdminPanel>

      <AdminPanel title="기존 사이트 사진 등록" headingId="media-legacy">
        <LegacyMediaRegisterForm />
      </AdminPanel>
    </>
  );
}
