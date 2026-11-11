import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://munsayu.com"),
  title: { default: "문해와 사유(초등독서논술학원)", template: "%s | 문해와 사유" },
  description: "문해와 사유 초등 독서논술학원",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <body className="min-h-full"><SiteShell>{children}</SiteShell></body>
    </html>
  );
}
