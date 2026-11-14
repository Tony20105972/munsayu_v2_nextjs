import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  /**
   * AD-015 사진 저장 위치.
   * 로컬은 `/uploads/...`(같은 출처)라 설정이 필요 없고, 운영에서 Vercel Blob 어댑터로
   * 바꾸면 `https://<store>.public.blob.vercel-storage.com/...` 주소가 나온다.
   * `next/image` 가 그 주소를 쓸 수 있게 미리 허용해 둔다. (ADR-008, Phase 7)
   */
  /**
   * E2E·시각 회귀는 `--hostname 127.0.0.1` 로 띄운 개발 서버를 `http://127.0.0.1:3000`
   * 으로 연다. Next 16 은 이것을 `localhost` 기준의 **교차 출처**로 보고 `/_next/hmr`
   * 을 막는다. 그러면 개발용 런타임이 붙지 못해 **수화(hydration)가 끝나지 않고**,
   * 폼이 Server Action 대신 기본 GET 제출로 떨어진다. 실제로 로그인·신청 흐름
   * E2E 17건이 `.../login?loginId=&password=` 로 넘어가며 깨졌다. (EV-0015)
   *
   * 개발 서버에만 적용되는 설정이고 운영 빌드와는 무관하다.
   */
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  /**
   * Next 16 개발 서버는 Server Function 호출을 **인자까지 그대로** 터미널에 찍는다.
   *   └─ ƒ adminLoginAction({"loginId":"admin","password":"...","rememberMe":false})
   * 비밀번호와 신청자 개인정보(이름·연락처)가 그대로 남는다. 운영 빌드에서는 찍히지
   * 않는 것을 확인했지만, 개발 중에도 남겨 둘 이유가 없다. (CLAUDE.md 4장)
   *
   * 이 옵션을 끄면 `POST /admin/login 200 in 94ms` 처럼 경로·상태만 남는다.
   * 어떤 Server Action 이 느린지 보려면 이 줄을 잠시 지워서 쓰고 되돌린다.
   */
  logging: {
    serverFunctions: false,
  },
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
