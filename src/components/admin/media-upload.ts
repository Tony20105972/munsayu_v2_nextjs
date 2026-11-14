"use client";

import type { ActionResult } from "@/lib/action-result";
import type { MediaAssetRow } from "@/lib/contracts";
import {
  finalizeMediaUploadAction,
  requestMediaUploadTicketAction,
} from "@/lib/actions/media";

/**
 * AD-015 브라우저에서 사진 한 장을 올린다. 올리는 자리는 모두 이 함수를 쓴다
 * (이미지 보관함, 강사 사진, 배너, 시설 사진, 공지 본문).
 *
 * 세 걸음으로 나뉘어 있다.
 *  1. 서버에 티켓을 받는다 (관리자 권한 확인 · 용량 상한 결정)
 *  2. 파일 바이트를 저장소로 **직접** 보낸다
 *  3. 서버가 저장된 것을 읽어 형식·용량을 다시 검사하고 줄여서 보관함에 넣는다
 *
 * 2번이 서버 함수를 지나가지 않기 때문에 20MB 사진도 함수 본문 상한(4.5MB)에 걸리지 않는다.
 * 검사는 1·3번에서 서버가 한다. 브라우저가 보낸 형식·크기 값은 믿지 않는다. (ADR-008)
 */

const NETWORK_MESSAGE =
  "사진을 올리지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.";

/** 저장소가 돌려준 오류에서 사용자용 문구만 꺼낸다. 내부 내용은 쓰지 않는다. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
  } catch {
    // 본문이 JSON 이 아니면 공통 문구를 쓴다.
  }
  return NETWORK_MESSAGE;
}

export async function uploadImageToLibrary(
  file: File,
  alt: string,
): Promise<ActionResult<MediaAssetRow>> {
  const ticketForm = new FormData();
  ticketForm.set("filename", file.name);
  ticketForm.set("sizeBytes", String(file.size));

  const ticket = await requestMediaUploadTicketAction(ticketForm);
  if (!ticket.ok) return ticket;

  let response: Response;
  try {
    response = await fetch(ticket.data.url, {
      method: ticket.data.method,
      headers: ticket.data.headers,
      body: file,
    });
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }

  if (!response.ok) {
    return { ok: false, message: await readErrorMessage(response) };
  }

  const finalizeForm = new FormData();
  finalizeForm.set("stagingKey", ticket.data.stagingKey);
  finalizeForm.set("filename", file.name);
  finalizeForm.set("alt", alt);

  return finalizeMediaUploadAction(finalizeForm);
}
