"use client";

import { useEffect, useId, useRef, useState } from "react";
import { uploadNoticeImageAction } from "@/lib/actions/admin-intake";

/**
 * AD-014 공지 본문 편집기.
 *
 * 새 편집기 라이브러리를 넣지 않고 `contenteditable` 로 최소 기능만 만든다. (ADR-006)
 * 여기서 만든 HTML 은 믿지 않는다. 저장 전에 서버가 허용 목록으로 다시 정리한다.
 * (`sanitizeNoticeHtml`)
 */

/** 도구 단추 목록. 실행은 누를 때 하고, 그리는 동안에는 편집기를 건드리지 않는다. */
type Command = {
  label: string;
  title: string;
  /** `document.execCommand` 이름. `link` 는 주소를 물어본 뒤 실행한다. */
  command: string;
  value?: string;
};

const COMMANDS: readonly Command[] = [
  { label: "굵게", title: "굵게", command: "bold" },
  { label: "기울임", title: "기울임", command: "italic" },
  { label: "밑줄", title: "밑줄", command: "underline" },
  { label: "제목", title: "제목 단락", command: "formatBlock", value: "h3" },
  { label: "본문", title: "보통 단락", command: "formatBlock", value: "p" },
  { label: "목록", title: "글머리 목록", command: "insertUnorderedList" },
  { label: "번호", title: "번호 목록", command: "insertOrderedList" },
  { label: "링크", title: "링크 넣기", command: "link" },
  { label: "서식 지우기", title: "서식 지우기", command: "removeFormat" },
];

export function NoticeEditor({
  name,
  label,
  defaultValue = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const editorId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 처음 한 번만 넣는다. 그 뒤로는 편집기가 DOM 을 직접 갖는다.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = defaultValue;
    }
  }, [defaultValue]);

  function sync() {
    setHtml(editorRef.current?.innerHTML ?? "");
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  function runCommand(command: Command) {
    if (command.command !== "link") {
      exec(command.command, command.value);
      return;
    }

    const url = window.prompt("연결할 주소를 입력하세요 (http:// 또는 https://)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("http:// 또는 https:// 로 시작하는 주소만 넣을 수 있습니다.");
      return;
    }
    exec("createLink", url);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.set("image", file);

    const result = await uploadNoticeImageAction(formData);
    setUploading(false);

    if (!result.ok) {
      setUploadError(result.message);
      return;
    }

    // 올린 이미지는 우리 저장소 주소다. 본문에는 상대 경로만 들어간다.
    exec("insertHTML", `<img src="${result.data.url}" alt="" loading="lazy" />`);
  }

  return (
    <div>
      <label htmlFor={editorId} className="block text-xs font-bold text-ink">
        {label}
      </label>

      <div
        role="toolbar"
        aria-label="본문 서식"
        aria-controls={editorId}
        className="mt-1 flex flex-wrap gap-1 rounded-t-md border border-line bg-canvas px-2 py-1.5"
      >
        {COMMANDS.map((command) => (
          <button
            key={command.label}
            type="button"
            title={command.title}
            onClick={() => runCommand(command)}
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-bold text-ink hover:bg-line/40"
          >
            {command.label}
          </button>
        ))}

        <label className="cursor-pointer rounded-md border border-line bg-surface px-2 py-1 text-xs font-bold text-ink hover:bg-line/40">
          {uploading ? "올리는 중…" : "이미지"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void uploadImage(file);
            }}
          />
        </label>
      </div>

      <div
        id={editorId}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={sync}
        onBlur={sync}
        className="min-h-48 rounded-b-md border border-t-0 border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-offset-[-2px] focus:outline-accent"
      />

      {/* 실제 제출 값. 서버가 이 값을 허용 목록으로 정리한 뒤 저장한다. */}
      <input type="hidden" name={name} value={html} readOnly />

      {uploadError ? (
        <p role="alert" className="mt-1 text-xs font-bold text-red-700">
          {uploadError}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted">
        저장할 때 서버가 허용하지 않는 태그·속성을 지웁니다. SVG 이미지는 올릴 수
        없습니다.
      </p>
    </div>
  );
}
