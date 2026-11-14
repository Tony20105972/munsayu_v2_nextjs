import Image from "next/image";
import { Suspense } from "react";
import { connection } from "next/server";
import { loadFacilityPhotos } from "@/lib/data/public-content";
import {
  DEFAULT_FACILITY_PHOTOS,
  FACILITY_FEATURE_PHOTOS,
  type FacilityPhotoView,
} from "@/lib/images";
import { CAMPUSES, EXTERNAL_LINKS, type Campus } from "@/lib/site-config";

/**
 * 시설안내 지점 패널.
 *
 * 레거시는 지점 탭마다 학원 사진 4장 슬라이드와 공간 카드 4칸을 두었다. (EV-0012)
 * 대치본원 문구는 docs/evidence/dom/phase1-facility.yml 관찰값 그대로다.
 *
 * 분당점 탭은 Phase 3 때 화면에서 접혀 있어 본문을 보지 못했고 카드 제목만 이미지
 * `alt` 로 알 수 있었다(ASM-081). Phase 5 동등성 검증에서 레거시 HTML 을 직접 받아
 * **두 탭의 본문이 모두 문서 안에 있다는 것**을 확인했고, 분당점 묶음 이름·제목·본문과
 * 마지막 안내 블록을 관찰값으로 채웠다. ASM-081 해소. (EV-0015)
 *
 * 공간 카드 사진은 레거시가 Unsplash 를 핫링크하던 자리다. 같은 사진을 내려받아
 * 커밋했고, 원본이 404 인 `책과 글을 위한 교실` 칸만 사진 없이 CSS 처리로 둔다. // ASM-079
 *
 * 지점별 사진 갤러리는 관리자가 「이미지 관리 → 시설안내 사진」에서 추가·삭제·순서
 * 변경·설명 수정을 한다. (AD-015) 등록된 사진이 없거나 DB 를 읽지 못하면 지금
 * 커밋돼 있는 4장으로 그린다. 공간 카드 4칸 사진은 카드 제목과 1:1로 묶여 있어
 * 코드에 그대로 둔다. // ASM-093
 */

type FeatureCard = {
  eyebrow: string;
  /** 레거시 카드 제목. 이미지 `alt` 와 같은 문구다. */
  title: string;
  body?: string;
};

const DAECHI_FEATURES: readonly FeatureCard[] = [
  {
    eyebrow: "ATMOSPHERE",
    title: "절제된 색감과 따뜻한 소재",
    body: "밝은 중성색에 목재의 질감을 더했습니다. 간결한 선과 차분한 색감이 어우러져, 아이가 오래 머물기에도 부담스럽지 않은 분위기입니다.",
  },
  {
    eyebrow: "PERSPECTIVE",
    title: "시야가 이어지는 공간",
    body: "유리 파티션으로 공간의 연결감을 살렸습니다. 교실과 공용 공간의 구분을 유지하면서, 교실로 이어지는 흐름이 한눈에 들어옵니다.",
  },
  {
    eyebrow: "CLASSROOM",
    title: "책과 글을 위한 교실",
    body: "개별 책상과 정돈된 배치로 자신의 읽기와 쓰기에 집중하는 자리를 마련했습니다. 아이의 책과 글이 공간의 중심이 됩니다.",
  },
  {
    eyebrow: "FLOW OF MOVEMENT",
    title: "역할이 분명한 동선",
    body: "안내 데스크, 교무 공간, 교실의 역할을 나누었습니다. 방문과 안내, 수업 준비와 학습이 각자의 자리에서 이어집니다.",
  },
];

/** 분당점 카드. 묶음 이름·제목·본문 모두 레거시 관찰값이다. (EV-0015) */
const BUNDANG_FEATURES: readonly FeatureCard[] = [
  {
    eyebrow: "BOOK CAFE",
    title: "책과 가까워지는 북카페",
    body: "서가에서 책을 고르고 곁에 앉아 읽는 공간. 수업과 이어지는 일상 속에서 아이가 책을 자연스럽게 만날 수 있습니다.",
  },
  {
    eyebrow: "READING ZONE",
    title: "편안하게 머무는 독서 자리",
    body: "테이블과 서가 벤치 등 다양한 읽기 자리. 책을 펼친 뒤 여유 있게 머물며 읽을 수 있는 공간을 마련했습니다.",
  },
  {
    eyebrow: "SAFETY & FLOW",
    title: "아이의 움직임까지 세심하게",
    body: "입구에서 독서 공간, 교실로 이어지는 길을 살폈습니다. 학습 자리와 이동 동선을 구분하고, 학생들의 오가는 흐름과 안전을 공간 구성의 중요한 기준으로 삼았습니다.",
  },
  {
    eyebrow: "AIR CARE SYSTEM",
    title: "머무는 시간 내내 쾌적하게",
    body: "아이들이 머무는 운영 시간 동안 공기청정기를 상시 가동합니다. 책을 읽고 공부하는 시간이 편안하게 이어지도록 실내 공기 관리에도 꾸준히 신경 씁니다.",
  },
];

const CAMPUS_INTRO: Record<
  Campus["id"],
  {
    eyebrow: string;
    heading: string;
    body: string;
    /** 슬라이드 묶음 제목. 지점마다 다르다. */
    slideHeading: string;
    sliderNote: string;
    /** 탭 마지막 안내 블록. 대치와 분당의 문구가 서로 다르다. */
    contactHeading: string;
    contactBody: string;
  }
> = {
  daechi: {
    eyebrow: "문해와 사유 대치",
    heading: "단정한 공간, 깊이 있는 배움",
    body: "문해와 사유 대치는 밝은 색조와 투명한 시야, 절제된 목재의 온기를 담았습니다. 책과 글에 마음을 기울 이는 교실부터 안내가 시작되는 입구까지. 필요한 자리를 단정하게 정리해 아이의 배움이 공간의 중심에 놓이도록 했습니다.",
    // 레거시 슬라이드 첫 장의 제목과 설명. (EV-0015)
    slideHeading: "공간은 간결하게, 생각은 깊이 있게.",
    sliderNote:
      "문해와 사유 대치는 밝은 색조와 투명한 시야, 절제된 목재의 온기를 담았습니다",
    contactHeading: "문해와 사유 대치를 만나보세요",
    contactBody:
      "공간과 방문에 관해 궁금한 점을 들려주세요. 카카오톡으로 문의하시면 안내해 드립니다.",
  },
  bundang: {
    eyebrow: "문해와 사유 분당",
    heading: "책과 함께 머무는 공간",
    body: "문해와 사유 분당은 북카페와 독서 자리를 중심으로 책이 가까운 일상을 만듭니다. 서가에서 책을 고르 고, 편안한 자리에 앉아 읽고, 교실로 향하는 시간. 아이의 하루가 자연스럽게 이어지도록 동선과 안전까 지 세심하게 살폈습니다.",
    slideHeading: "분책을 가까이, 배움을 편안하게.",
    sliderNote:
      "문해와 사유 분당은 북카페와 독서 자리를 중심으로 책이 가까운 일상을 만듭니다.",
    // 레거시 분당 탭 마지막 블록은 대치와 문구가 다르다. (EV-0015)
    contactHeading: "함께 읽고, 함께 머무는 공간",
    contactBody:
      "다른 아이의 읽는 시간을 배려하고, 함께 사용하는 책과 자리를 소중히 여깁니다. 공간과 방문에 관한 궁금한 점은 카카오톡으로 문의해 주세요.",
  },
};

function FeatureList({ features }: { features: readonly FeatureCard[] }) {
  return (
    <ul className="mt-8 grid gap-5 md:grid-cols-2">
      {features.map((feature) => {
        const photo = FACILITY_FEATURE_PHOTOS[feature.title];

        return (
          <li
            key={feature.eyebrow}
            className="overflow-hidden rounded-xl border border-line bg-surface"
          >
            {photo ? (
              <div className="relative aspect-16/9 w-full bg-canvas">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 768px) 24rem, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              /*
                레거시가 쓰던 원본 사진이 지금은 내려받을 수 없다(Unsplash 404).
                레거시 화면에서도 이 칸은 깨져 있다. 사진 대신 색으로 자리를 채운다. // ASM-079
              */
              <div
                aria-hidden="true"
                className="aspect-16/9 w-full bg-linear-to-br from-banner-start/15 to-accent/15"
              />
            )}
            <div className="p-6">
              <p className="text-xs font-bold tracking-[0.2em] text-accent">
                {feature.eyebrow}
              </p>
              <h3 className="mt-3 text-base font-bold text-ink">{feature.title}</h3>
              {feature.body ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {feature.body}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SlidePhotos({ photos }: { photos: readonly FacilityPhotoView[] }) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((photo) => (
        <li
          key={photo.id}
          className="relative aspect-4/3 overflow-hidden rounded-md bg-canvas"
        >
          {/* 설명을 비워 두면 레거시처럼 장식용 사진으로 본다(빈 alt). */}
          <Image
            src={photo.url}
            alt={photo.caption}
            fill
            sizes="(min-width: 640px) 12rem, 45vw"
            className="object-cover"
          />
        </li>
      ))}
    </ul>
  );
}

/** 관리자가 등록한 사진을 읽는다. 기다리는 동안에는 커밋된 기본 사진을 보여 준다. */
async function ManagedSlidePhotos({ campusId }: { campusId: Campus["id"] }) {
  await connection();
  return <SlidePhotos photos={await loadFacilityPhotos(campusId)} />;
}

function ContactCard({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mt-10 rounded-xl border border-line bg-surface p-6 text-center">
      <h3 className="text-base font-bold text-ink">{heading}</h3>
      <p className="mt-3 text-sm text-muted">{body}</p>
      <a
        href={EXTERNAL_LINKS.kakaoChannel}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-5 inline-block rounded-md bg-accent px-6 py-3 text-sm font-bold text-ink hover:bg-accent-soft"
      >
        카카오톡 상담
      </a>
    </div>
  );
}

export function FacilityPanel({ campusId }: { campusId: Campus["id"] }) {
  const campus = CAMPUSES.find((item) => item.id === campusId);

  if (!campus) {
    return null;
  }

  const intro = CAMPUS_INTRO[campusId];
  const features = campusId === "daechi" ? DAECHI_FEATURES : BUNDANG_FEATURES;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="text-xs font-bold tracking-[0.3em] text-accent">{intro.eyebrow}</p>
      <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
        {intro.heading}
      </h2>
      <p className="mt-5 text-sm leading-relaxed text-muted">{intro.body}</p>

      <div className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h3 className="text-lg font-bold text-ink">{intro.slideHeading}</h3>
        <p className="mt-3 text-sm text-muted">{intro.sliderNote}</p>
        <Suspense
          fallback={<SlidePhotos photos={DEFAULT_FACILITY_PHOTOS[campusId] ?? []} />}
        >
          <ManagedSlidePhotos campusId={campusId} />
        </Suspense>
        <p className="mt-4 text-xs text-muted">
          {campus.address} · 방문 상담 {campus.phone}
        </p>
      </div>

      <FeatureList features={features} />

      <ContactCard heading={intro.contactHeading} body={intro.contactBody} />
    </div>
  );
}
