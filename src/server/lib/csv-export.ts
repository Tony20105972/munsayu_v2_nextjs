import "server-only";
import { CSV_EXPORT_MAX_ROWS } from "@/lib/contracts";
import { exportTooLarge } from "@/server/errors";

/**
 * CSV 내보내기 공통 도구.
 *
 * 내보내기는 「현재 필터 결과 **전체**」를 담는다(ASM-006). 상한이 없으면 필터 없이 누른
 * 한 번의 요청이 표 전체를 메모리에 올려 함수가 죽을 수 있고, 개인정보가 담긴 파일이
 * 통째로 빠져나간다.
 *
 * 그렇다고 **조용히 잘라내지 않는다.** 「전체」라는 약속이 거짓이 되기 때문이다.
 * 상한을 넘으면 거절하고 범위를 좁히라고 알려 준다. // ASM-097
 *
 * 세어 보고 다시 읽는 두 번 질의 대신 **한 번에 상한+1 만큼 읽는다.**
 * - 질의 사이에 줄이 늘어나는 경합이 없다
 * - 메모리에 올라오는 양이 실제로 상한+1 로 묶인다 (세어 보는 방식은 묶이지 않는다)
 */
export async function takeForExport<TRow>(
  read: (take: number) => Promise<TRow[]>,
  max: number = CSV_EXPORT_MAX_ROWS,
): Promise<TRow[]> {
  const rows = await read(max + 1);
  if (rows.length > max) {
    throw exportTooLarge(max);
  }
  return rows;
}
