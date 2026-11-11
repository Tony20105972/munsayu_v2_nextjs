import "@/server/server-only";

export type StoredObject = {
  key: string;
  url: string;
};

/**
 * 이미지·파일 저장소 자리. 이번 Phase에 업로드 기능은 없고 인터페이스만 둔다. (ASM-008)
 */
export interface StorageAdapter {
  readonly name: "local";
  put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject>;
  urlFor(key: string): string;
}

/** 로컬 자리표시 구현. 실제 쓰기는 업로드 기능이 생길 때 채운다. */
class LocalStorageAdapter implements StorageAdapter {
  readonly name = "local" as const;

  async put(): Promise<StoredObject> {
    throw new Error("STORAGE_UPLOAD_NOT_IMPLEMENTED");
  }

  urlFor(key: string): string {
    return `/uploads/${key}`;
  }
}

const localAdapter = new LocalStorageAdapter();

export function getStorageAdapter(): StorageAdapter {
  return localAdapter;
}
