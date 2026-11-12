import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * AD-014 공지 본문 HTML 정리.
 *
 * 허용 목록 방식이다. 저장 전에 한 번, 공개 화면에 내보낼 때 한 번 같은 기준으로 돌린다.
 * 직접 만든 정리기 대신 검증된 `sanitize-html` 을 쓴다. 정리기는 보안 경계라
 * 손으로 만들면 우회 경로를 놓치기 쉽다. (ADR-006)
 */

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "pre",
  "code",
  "span",
] as const;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    span: ["class"],
    p: ["class"],
    figure: ["class"],
  },
  // `javascript:` 같은 주소를 막는다. 본문 이미지는 우리 저장소에 올린 뒤 상대 경로가 된다.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  // 스타일 속성은 통째로 받지 않는다. 표현은 class 로만 한다.
  allowedClasses: {
    span: ["notice-highlight"],
    p: ["notice-lead"],
    figure: ["notice-figure"],
  },
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
  transformTags: {
    // 바깥 링크는 항상 안전한 rel 을 붙인다.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const isExternal = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(isExternal
            ? { target: "_blank", rel: "noreferrer noopener" }
            : { rel: "noopener" }),
        },
      };
    },
  },
};

export function sanitizeNoticeHtml(raw: string): string {
  return sanitizeHtml(raw, SANITIZE_OPTIONS).trim();
}

/**
 * 목록 미리보기와 검색에 쓰는 평문. 태그를 모두 지운다.
 * 단락·줄바꿈 자리에는 공백을 넣는다. 그냥 지우면 앞뒤 낱말이 붙어 버린다.
 */
const BLOCK_BOUNDARY = /<\/?(?:p|div|br|li|tr|h[1-6]|blockquote|pre|figure)\b[^>]*>/gi;

export function noticePlainText(raw: string): string {
  return sanitizeHtml(raw.replace(BLOCK_BOUNDARY, " "), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
}
