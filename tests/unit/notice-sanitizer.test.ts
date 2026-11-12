import { describe, expect, test } from "vitest";
import { noticePlainText, sanitizeNoticeHtml } from "@/server/lib/sanitize-notice-html";
import { csvCell, csvRows } from "@/server/lib/csv";

/**
 * AD-014 공지 본문 HTML 정리.
 * 허용 목록 밖의 태그·속성·주소가 저장되지 않는지 확인한다. (ADR-006)
 */
describe("AD-014 공지 본문 XSS 방어", () => {
  test("script 태그는 통째로 지운다", () => {
    const result = sanitizeNoticeHtml('<p>안내</p><script>alert("xss")</script>');
    expect(result).toContain("<p>안내</p>");
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
  });

  test("on* 이벤트 속성은 지운다", () => {
    const result = sanitizeNoticeHtml('<p onclick="steal()">눌러보세요</p>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("눌러보세요");
  });

  test("javascript: 주소는 지운다", () => {
    const result = sanitizeNoticeHtml('<a href="javascript:alert(1)">링크</a>');
    expect(result).not.toContain("javascript:");
  });

  test("이미지의 onerror 와 data: 주소는 지운다", () => {
    const result = sanitizeNoticeHtml(
      '<img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(1)" />',
    );
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("data:text/html");
  });

  test("iframe·object·embed·svg 는 남지 않는다", () => {
    const result = sanitizeNoticeHtml(
      '<iframe src="https://evil.test"></iframe><object data="x"></object>' +
        '<embed src="x" /><svg><script>alert(1)</script></svg>',
    );
    expect(result).not.toMatch(/iframe|object|embed|svg|script/i);
  });

  test("style 속성은 남기지 않는다", () => {
    const result = sanitizeNoticeHtml(
      '<p style="position:fixed;top:0">덮어쓰기 시도</p>',
    );
    expect(result).not.toContain("style=");
  });

  test("허용한 서식은 그대로 둔다", () => {
    const result = sanitizeNoticeHtml(
      "<h3>제목</h3><p><strong>굵게</strong> 와 <em>기울임</em></p><ul><li>항목</li></ul>",
    );
    expect(result).toContain("<h3>제목</h3>");
    expect(result).toContain("<strong>굵게</strong>");
    expect(result).toContain("<li>항목</li>");
  });

  test("바깥 링크에는 안전한 rel 을 붙인다", () => {
    const result = sanitizeNoticeHtml('<a href="https://example.test">바깥</a>');
    expect(result).toContain('rel="noreferrer noopener"');
    expect(result).toContain('target="_blank"');
  });

  test("미리보기 평문에는 태그가 남지 않는다", () => {
    expect(noticePlainText("<p>가나다</p><p>라마바</p>")).toBe("가나다 라마바");
  });
});

describe("AD-013 CSV 내보내기 규칙", () => {
  test("따옴표는 두 번 적어 감싼다", () => {
    expect(csvCell('가"나')).toBe('"가""나"');
  });

  test("수식으로 읽힐 수 있는 값은 글자로 고정한다", () => {
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
    expect(csvCell("+82-10-0000-0000")).toBe('"\'+82-10-0000-0000"');
    expect(csvCell("@cmd")).toBe('"\'@cmd"');
  });

  test("머리글과 줄은 CRLF 로 잇는다", () => {
    expect(csvRows(["가", "나"], [["1", "2"]])).toBe('"가","나"\r\n"1","2"');
  });
});
