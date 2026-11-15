"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  AdminCheckboxField,
  AdminFieldGrid,
  AdminInlineNumber,
  AdminInlineText,
  AdminSelectField,
  AdminTextArea,
  AdminTextField,
  type AdminOption,
} from "@/components/admin/fields";
import {
  AdminActionForm,
  AdminConfirmButton,
  AdminInlineForm,
} from "@/components/admin/forms";
import { uploadImageToLibrary } from "@/components/admin/media-upload";
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminEmptyRow,
  AdminTableScroll,
} from "@/components/admin/ui";
import {
  describeMediaDeleteResult,
  FACILITY_CAMPUS_KEYS,
  MEDIA_BULK_DELETE_MAX,
  MEDIA_FILE_INPUT_ACCEPT,
  MEDIA_SOURCE_LABELS,
  type AdminFacilityPhotoRow,
  type AdminHomeBannerRow,
  type MediaAssetRow,
} from "@/lib/contracts";
import { formatDateTime } from "@/lib/view-models";
import {
  deleteFacilityPhotoAction,
  deleteHomeBannerAction,
  deleteMediaAssetAction,
  deleteMediaAssetsAction,
  registerLegacyMediaAction,
  setMediaHiddenAction,
  updateMediaAltAction,
  upsertFacilityPhotoAction,
  upsertHomeBannerAction,
} from "@/lib/actions/media";

/** AD-015 이미지 관리 화면의 입력 부분. */

/** 보관함 고르기 상자에 넣는 사진 1건. */
export type MediaChoice = {
  id: string;
  url: string;
  alt: string;
  filename: string;
  replaceRecommended: boolean;
};

function mediaOptions(choices: readonly MediaChoice[]): AdminOption[] {
  return choices.map((choice) => ({
    value: choice.id,
    label: `${choice.filename} — ${choice.alt}${choice.replaceRecommended ? " (교체 권장)" : ""}`,
  }));
}

/* ------------------------------------------------------------------ *
 * 사진 올리기
 * ------------------------------------------------------------------ */

/**
 * 사진 한 장을 보관함에 올린다.
 *
 * 대체 텍스트를 받아야 올릴 수 있다. 사진을 볼 수 없는 분께 읽어 주는 설명이라
 * 비워 두면 서버가 돌려보낸다.
 */
export function MediaUploadForm({ maxBytes }: { maxBytes: number }) {
  const router = useRouter();
  const fileId = useId();
  const altId = useId();

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const maxMegabytes = Math.floor(maxBytes / (1024 * 1024));

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const file = data.get("image");
        const alt = String(data.get("alt") ?? "");

        if (!(file instanceof File) || file.size === 0) {
          setMessage({ tone: "error", text: "올릴 사진을 골라 주세요." });
          return;
        }

        setPending(true);
        setMessage(null);

        const result = await uploadImageToLibrary(file, alt);
        setPending(false);

        if (!result.ok) {
          const fieldMessages = Object.values(result.fieldErrors ?? {})
            .flat()
            .join(" ");
          setMessage({ tone: "error", text: fieldMessages || result.message });
          return;
        }

        form.reset();
        setMessage({
          tone: "ok",
          text: `사진을 올렸습니다. (${result.data.width}×${result.data.height})`,
        });
        router.refresh();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={fileId} className="block text-xs font-bold text-ink">
            사진 파일<span className="ml-1 text-accent">*</span>
          </label>
          <p className="mt-0.5 text-xs text-muted">
            JPG, PNG, WebP, GIF. 한 장에 {maxMegabytes}MB까지. 올리면 긴 변 2000px로
            줄이고 촬영 위치 정보를 지웁니다.
          </p>
          <input
            id={fileId}
            name="image"
            type="file"
            accept={MEDIA_FILE_INPUT_ACCEPT}
            required
            className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor={altId} className="block text-xs font-bold text-ink">
            대체 텍스트<span className="ml-1 text-accent">*</span>
          </label>
          <p className="mt-0.5 text-xs text-muted">
            사진에 무엇이 있는지 한 문장으로 적습니다. 예) 대치본원 2층 교실
          </p>
          <input
            id={altId}
            name="alt"
            type="text"
            required
            maxLength={200}
            className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "올리는 중…" : "사진 올리기"}
        </button>
        {message ? (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={
              message.tone === "error"
                ? "text-sm font-bold text-red-700"
                : "text-sm font-bold text-brand"
            }
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** 레거시에서 가져와 `public/` 에 커밋한 사진을 보관함에 등록한다. */
export function LegacyMediaRegisterForm() {
  return (
    <AdminActionForm
      action={registerLegacyMediaAction}
      submitLabel="기존 사이트 사진 등록"
      successMessage="기존 사이트 사진을 보관함에 등록했습니다."
    >
      {() => (
        <p className="text-xs leading-relaxed text-muted">
          지금 홈페이지가 쓰고 있는 사진(기존 사이트에서 가져온 것)을 보관함 목록에
          올립니다. 이미 등록된 사진은 그대로 둡니다. 여러 번 눌러도 사진이 늘어나지
          않습니다.
        </p>
      )}
    </AdminActionForm>
  );
}

/* ------------------------------------------------------------------ *
 * 보관함 한 줄 — 대체 텍스트 수정 · 삭제
 * ------------------------------------------------------------------ */

export function MediaAltForm({ media }: { media: MediaAssetRow }) {
  return (
    <AdminInlineForm action={updateMediaAltAction} submitLabel="설명 저장">
      <input type="hidden" name="mediaId" value={media.id} />
      <AdminInlineText
        name="alt"
        label="대체 텍스트"
        defaultValue={media.alt}
        maxLength={200}
      />
    </AdminInlineForm>
  );
}

/** 쓰는 자리를 한 줄 문구로 만든다. 확인 창과 안내에 같은 모양으로 쓴다. */
function describeUsages(media: MediaAssetRow): string {
  return media.usages.map((usage) => `${usage.area} — ${usage.label}`).join(", ");
}

/**
 * 사진 한 장 지우기. 확인 창을 거친다.
 *
 * 쓰는 중인 사진과 기존 사이트 사진은 서버가 막는다. 화면에서도 미리 이유를 보여 주고
 * 버튼을 막아 눌러 봐야 아무 일도 일어나지 않는 상황을 만들지 않는다.
 */
export function MediaDeleteButton({ media }: { media: MediaAssetRow }) {
  const inUse = media.usages.length > 0;
  const legacy = media.source === "LEGACY";

  return (
    <AdminConfirmButton
      action={deleteMediaAssetAction}
      hiddenFields={{ mediaId: media.id }}
      buttonLabel="사진 지우기"
      disabled={inUse || legacy}
      dialogTitle="이 사진을 지우시겠습니까?"
      confirmLabel="지우기"
      dialogBody={
        inUse ? (
          <>
            <p>
              이 사진은 지금 화면에서 쓰는 중입니다:{" "}
              <strong className="font-bold text-ink">{describeUsages(media)}</strong>
            </p>
            <p>먼저 그 화면에서 사진을 바꾸거나 빼야 지울 수 있습니다.</p>
          </>
        ) : legacy ? (
          <>
            <p>
              <strong className="font-bold text-ink">{media.filename}</strong> 는 기존
              사이트에서 가져와 홈페이지 안에 함께 올려 둔 사진입니다. 파일을 지울 수
              없습니다.
            </p>
            <p>「숨기기」를 누르면 목록과 사진 고르기에서 빠집니다.</p>
          </>
        ) : (
          <>
            <p>
              <strong className="font-bold text-ink">{media.filename}</strong> 를
              보관함에서 지웁니다.
            </p>
            <p>저장된 파일도 함께 지웁니다. 되돌릴 수 없습니다.</p>
          </>
        )
      }
    />
  );
}

/**
 * 사진을 보관함에서 숨기거나 다시 보이게 한다.
 *
 * 기존 사이트 사진은 지울 수 없으므로 이 버튼이 「지우기」 자리를 대신한다.
 * 다시 보이게 하는 것은 되돌릴 수 있는 일이라 확인 창 없이 버튼 하나로 처리한다.
 */
export function MediaHideButton({ media }: { media: MediaAssetRow }) {
  const inUse = media.usages.length > 0;

  if (media.hidden) {
    return (
      <AdminInlineForm action={setMediaHiddenAction} submitLabel="다시 보이기">
        <input type="hidden" name="mediaId" value={media.id} />
        <input type="hidden" name="hidden" value="false" />
      </AdminInlineForm>
    );
  }

  return (
    <AdminConfirmButton
      action={setMediaHiddenAction}
      hiddenFields={{ mediaId: media.id, hidden: "true" }}
      buttonLabel="숨기기"
      tone="normal"
      disabled={inUse}
      dialogTitle="이 사진을 숨기시겠습니까?"
      confirmLabel="숨기기"
      dialogBody={
        inUse ? (
          <>
            <p>
              이 사진은 지금 화면에서 쓰는 중입니다:{" "}
              <strong className="font-bold text-ink">{describeUsages(media)}</strong>
            </p>
            <p>먼저 그 화면에서 사진을 바꾸거나 빼야 숨길 수 있습니다.</p>
          </>
        ) : (
          <>
            <p>
              <strong className="font-bold text-ink">{media.filename}</strong> 를 목록과
              사진 고르기에서 빼 둡니다. 파일과 기록은 지우지 않습니다.
            </p>
            <p>
              「보기 조건」에서{" "}
              <strong className="font-bold text-ink">숨긴 사진</strong>을 고르면 다시
              보이게 할 수 있습니다.
            </p>
          </>
        )
      }
    />
  );
}

/* ------------------------------------------------------------------ *
 * 보관함 목록 — 고르기 · 선택 삭제
 * ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** 고른 사진을 한 번에 지운다. 지울 수 있는 사진이 없으면 안내만 둔다. */
function MediaBulkActions({
  items,
  selected,
  onDone,
}: {
  items: readonly MediaAssetRow[];
  selected: readonly string[];
  onDone: (message: string) => void;
}) {
  if (selected.length === 0) {
    return (
      <p className="text-xs text-muted">
        왼쪽 상자로 사진을 고르면 한 번에 지울 수 있습니다. 고른 사진 중 쓰는 중인
        사진과 기존 사이트 사진은 지우지 않고 그대로 둡니다.
      </p>
    );
  }

  const chosen = items.filter((media) => selected.includes(media.id));
  const blocked = chosen.filter(
    (media) => media.usages.length > 0 || media.source === "LEGACY",
  );
  const removable = chosen.length - blocked.length;
  const tooMany = selected.length > MEDIA_BULK_DELETE_MAX;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2">
      <span className="text-xs font-bold text-ink">{selected.length}장 선택됨</span>

      <AdminConfirmButton
        action={deleteMediaAssetsAction}
        hiddenFields={{ mediaIds: selected }}
        buttonLabel="선택 삭제"
        disabled={tooMany}
        dialogTitle={`고른 사진 ${selected.length}장을 지우시겠습니까?`}
        confirmLabel="지우기"
        onSuccess={(result) => onDone(describeMediaDeleteResult(result))}
        dialogBody={
          <>
            <p>
              지울 수 있는 사진{" "}
              <strong className="font-bold text-ink">{removable}장</strong>의 기록과
              저장된 파일을 함께 지웁니다. 되돌릴 수 없습니다.
            </p>
            {blocked.length > 0 ? (
              <>
                <p>
                  <strong className="font-bold text-ink">{blocked.length}장</strong>은
                  지우지 않고 그대로 둡니다:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {blocked.map((media) => (
                    <li key={media.id}>
                      {media.filename} —{" "}
                      {media.usages.length > 0
                        ? `쓰는 중 (${describeUsages(media)})`
                        : "기존 사이트 사진 (숨기기만 됩니다)"}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        }
      />

      {tooMany ? (
        <span role="alert" className="text-xs font-bold text-red-700">
          한 번에 {MEDIA_BULK_DELETE_MAX}장까지 지울 수 있습니다. 선택을 줄여 주세요.
        </span>
      ) : null}
    </div>
  );
}

/**
 * 보관함 목록 표.
 *
 * 고른 사진을 한 번에 지우려면 어느 줄이 골라졌는지 화면이 들고 있어야 해서 표 전체를
 * 클라이언트 쪽에 둔다. 표시에 쓰는 값은 모두 서버에서 받은 것을 그대로 보여 준다.
 */
export function MediaLibraryTable({
  items,
  visibility,
}: {
  items: readonly MediaAssetRow[];
  /** `hidden` 이면 숨긴 사진만 모아 본 화면이다. 빈 목록 안내 문구가 달라진다. */
  visibility: "visible" | "hidden";
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  function toggle(id: string, checked: boolean): void {
    setSelected((current) =>
      checked ? [...new Set([...current, id])] : current.filter((one) => one !== id),
    );
  }

  const allChecked = items.length > 0 && selected.length === items.length;

  return (
    <div className="space-y-3">
      <MediaBulkActions
        items={items}
        selected={selected}
        onDone={(message) => {
          setSelected([]);
          setNotice(message);
        }}
      />

      {notice ? (
        <p
          role="status"
          className="rounded-md border border-line bg-canvas px-3 py-2 text-sm font-bold text-ink"
        >
          {notice}
        </p>
      ) : null}

      <AdminTableScroll>
        <table className={ADMIN_TABLE_CLASS}>
          <caption className="sr-only">이미지 보관함 목록</caption>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand"
                    checked={allChecked}
                    disabled={items.length === 0}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked ? items.map((media) => media.id) : [],
                      )
                    }
                  />
                  <span className="sr-only">이 쪽의 사진 전체 선택</span>
                </label>
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                미리보기
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                파일 이름
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                크기
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                대체 텍스트
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                쓰는 곳
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                올린 날짜
              </th>
              <th scope="col" className={ADMIN_TH_CLASS}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <AdminEmptyRow
                colSpan={8}
                label={
                  visibility === "hidden"
                    ? "숨긴 사진이 없습니다."
                    : "보관함에 사진이 없습니다. 위에서 사진을 올리거나 「기존 사이트 사진 등록」을 눌러 주세요."
                }
              />
            ) : (
              items.map((media) => (
                <tr key={media.id}>
                  <td className={ADMIN_TD_CLASS}>
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand"
                        checked={selected.includes(media.id)}
                        onChange={(event) => toggle(media.id, event.target.checked)}
                      />
                      <span className="sr-only">{media.filename} 선택</span>
                    </label>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <Image
                      src={media.url}
                      alt={media.alt}
                      width={96}
                      height={72}
                      className="h-18 w-24 rounded-md object-cover"
                    />
                  </td>
                  <th scope="row" className={`${ADMIN_TD_CLASS} font-bold`}>
                    <span className="block break-all">{media.filename}</span>
                    <span className="mt-1 block text-xs font-normal text-muted">
                      {MEDIA_SOURCE_LABELS[media.source]}
                    </span>
                    {media.hidden ? (
                      <span className="mt-1 block text-xs font-bold text-muted">
                        숨긴 사진
                      </span>
                    ) : null}
                    {media.replaceRecommended ? (
                      <span className="mt-1 block text-xs font-bold text-accent">
                        교체 권장
                      </span>
                    ) : null}
                    {media.rightsNote ? (
                      <span className="mt-1 block max-w-60 text-xs font-normal text-muted">
                        {media.rightsNote}
                      </span>
                    ) : null}
                  </th>
                  <td className={ADMIN_TD_CLASS}>
                    {media.width}×{media.height}
                    <span className="mt-1 block text-xs text-muted">
                      {formatBytes(media.sizeBytes)}
                    </span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <MediaAltForm media={media} />
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    {media.usages.length === 0 ? (
                      <span className="text-muted">쓰지 않음</span>
                    ) : (
                      <ul className="space-y-1">
                        {media.usages.map((usage, index) => (
                          <li key={`${usage.area}-${usage.label}-${index}`}>
                            <Link
                              href={usage.adminHref}
                              className="font-bold text-brand hover:underline"
                            >
                              {usage.area}
                            </Link>
                            <span className="text-muted"> — {usage.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={ADMIN_TD_CLASS}>{formatDateTime(media.uploadedAt)}</td>
                  <td className={ADMIN_TD_CLASS}>
                    {/* 숨긴 사진도 올린 사진이면 그대로 지울 수 있다. 「지우기」는
                        쓰는 중·기존 사이트 사진에서만 막힌다. */}
                    <div className="flex flex-wrap gap-1">
                      <MediaHideButton media={media} />
                      <MediaDeleteButton media={media} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableScroll>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 메인 배너
 * ------------------------------------------------------------------ */

const BANNER_HREF_HINT = "`/sub/about` 처럼 사이트 안 주소나 https:// 주소를 넣습니다.";

export function HomeBannerForm({
  banner,
  choices,
}: {
  /** 비우면 새 배너 추가 폼이 된다. */
  banner?: AdminHomeBannerRow;
  choices: readonly MediaChoice[];
}) {
  return (
    <AdminActionForm
      action={upsertHomeBannerAction}
      submitLabel={banner ? "배너 저장" : "배너 추가"}
      successMessage={banner ? "배너를 저장했습니다." : "배너를 추가했습니다."}
      resetOnSuccess={!banner}
    >
      {({ fieldErrors }) => (
        <>
          {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
          <AdminFieldGrid>
            <AdminSelectField
              name="mediaId"
              label="배경 사진"
              hint="고르지 않으면 단색 배경으로 보입니다."
              options={mediaOptions(choices)}
              defaultValue={banner?.mediaId ?? ""}
              placeholder="사진 없음(단색 배경)"
              errors={fieldErrors.mediaId}
            />
            <AdminTextField
              name="eyebrow"
              label="작은 윗글"
              defaultValue={banner?.eyebrow ?? ""}
              hint="제목 위에 작게 들어가는 한 줄입니다."
              errors={fieldErrors.eyebrow}
            />
            <AdminTextField
              name="displayOrder"
              label="노출 순서"
              type="number"
              min={0}
              max={999}
              defaultValue={String(banner?.displayOrder ?? 0)}
              hint="숫자가 작을수록 먼저 보입니다."
              errors={fieldErrors.displayOrder}
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <AdminTextArea
                name="headline"
                label="제목"
                rows={2}
                required
                hint="줄을 바꾸면 화면에서도 줄이 바뀝니다."
                defaultValue={banner?.headline ?? ""}
                errors={fieldErrors.headline}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <AdminTextArea
                name="body"
                label="설명"
                rows={3}
                defaultValue={banner?.body ?? ""}
                errors={fieldErrors.body}
              />
            </div>
            <AdminTextField
              name="primaryLabel"
              label="버튼 1 문구"
              defaultValue={banner?.primaryLabel ?? ""}
              errors={fieldErrors.primaryLabel}
            />
            <AdminTextField
              name="primaryHref"
              label="버튼 1 주소"
              hint={BANNER_HREF_HINT}
              defaultValue={banner?.primaryHref ?? ""}
              errors={fieldErrors.primaryHref}
            />
            <AdminTextField
              name="secondaryLabel"
              label="버튼 2 문구"
              defaultValue={banner?.secondaryLabel ?? ""}
              errors={fieldErrors.secondaryLabel}
            />
            <AdminTextField
              name="secondaryHref"
              label="버튼 2 주소"
              hint={BANNER_HREF_HINT}
              defaultValue={banner?.secondaryHref ?? ""}
              errors={fieldErrors.secondaryHref}
            />
            <AdminCheckboxField
              name="isVisible"
              label="홈에 보이기"
              hint="끄면 저장은 되지만 홈에 나오지 않습니다."
              defaultChecked={banner ? banner.isVisible : true}
              errors={fieldErrors.isVisible}
            />
          </AdminFieldGrid>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            버튼은 문구와 주소를 둘 다 적어야 나옵니다. 배너를 하나도 두지 않으면 홈은
            처음 모양(3장)으로 보입니다.
          </p>
        </>
      )}
    </AdminActionForm>
  );
}

export function HomeBannerDeleteButton({ banner }: { banner: AdminHomeBannerRow }) {
  return (
    <AdminConfirmButton
      action={deleteHomeBannerAction}
      hiddenFields={{ bannerId: banner.id }}
      buttonLabel="배너 삭제"
      dialogTitle="이 배너를 지우시겠습니까?"
      confirmLabel="지우기"
      dialogBody={
        <>
          <p>
            <strong className="font-bold text-ink">{banner.headline}</strong> 배너를
            지웁니다.
          </p>
          <p>사진은 보관함에 그대로 남습니다. 홈에서는 바로 사라집니다.</p>
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ *
 * 시설안내 사진
 * ------------------------------------------------------------------ */

const CAMPUS_OPTIONS: AdminOption[] = [
  { value: "daechi", label: "대치본원" },
  { value: "bundang", label: "분당점" },
];

export function FacilityPhotoForm({
  photo,
  choices,
}: {
  photo?: AdminFacilityPhotoRow;
  choices: readonly MediaChoice[];
}) {
  return (
    <AdminActionForm
      action={upsertFacilityPhotoAction}
      submitLabel={photo ? "사진 저장" : "사진 추가"}
      successMessage={photo ? "사진 정보를 저장했습니다." : "사진을 추가했습니다."}
      resetOnSuccess={!photo}
    >
      {({ fieldErrors }) => (
        <>
          {photo ? <input type="hidden" name="id" value={photo.id} /> : null}
          <AdminFieldGrid>
            <AdminSelectField
              name="campusKey"
              label="지점"
              options={CAMPUS_OPTIONS}
              defaultValue={photo?.campusKey ?? FACILITY_CAMPUS_KEYS[0]}
              required
              errors={fieldErrors.campusKey}
            />
            <AdminSelectField
              name="mediaId"
              label="사진"
              options={mediaOptions(choices)}
              defaultValue={photo?.mediaId ?? ""}
              placeholder="사진 선택"
              required
              errors={fieldErrors.mediaId}
            />
            <AdminTextField
              name="displayOrder"
              label="노출 순서"
              type="number"
              min={0}
              max={999}
              defaultValue={String(photo?.displayOrder ?? 0)}
              hint="숫자가 작을수록 먼저 보입니다."
              errors={fieldErrors.displayOrder}
            />
            <div className="sm:col-span-2">
              <AdminTextField
                name="caption"
                label="설명"
                hint="비워 두면 장식용 사진으로 봅니다(기존 사이트와 같습니다)."
                defaultValue={photo?.caption ?? ""}
                errors={fieldErrors.caption}
              />
            </div>
            <AdminCheckboxField
              name="isVisible"
              label="시설안내에 보이기"
              defaultChecked={photo ? photo.isVisible : true}
              errors={fieldErrors.isVisible}
            />
          </AdminFieldGrid>
        </>
      )}
    </AdminActionForm>
  );
}

/** 한 줄에서 순서와 설명만 고친다. */
export function FacilityPhotoInlineForm({ photo }: { photo: AdminFacilityPhotoRow }) {
  return (
    <AdminInlineForm action={upsertFacilityPhotoAction} submitLabel="저장">
      <input type="hidden" name="id" value={photo.id} />
      <input type="hidden" name="campusKey" value={photo.campusKey} />
      <input type="hidden" name="mediaId" value={photo.mediaId} />
      <input type="hidden" name="isVisible" value={String(photo.isVisible)} />
      <AdminInlineNumber
        name="displayOrder"
        label="노출 순서"
        defaultValue={photo.displayOrder}
      />
      <AdminInlineText
        name="caption"
        label="설명"
        defaultValue={photo.caption}
        maxLength={200}
        widthClass="w-48"
      />
    </AdminInlineForm>
  );
}

export function FacilityPhotoDeleteButton({ photo }: { photo: AdminFacilityPhotoRow }) {
  return (
    <AdminConfirmButton
      action={deleteFacilityPhotoAction}
      hiddenFields={{ photoId: photo.id }}
      buttonLabel="빼기"
      dialogTitle="시설안내에서 이 사진을 뺄까요?"
      confirmLabel="빼기"
      dialogBody={
        <>
          <p>시설안내 화면에서 이 사진을 뺍니다.</p>
          <p>사진은 보관함에 그대로 남아 다른 자리에 다시 쓸 수 있습니다.</p>
        </>
      }
    />
  );
}
