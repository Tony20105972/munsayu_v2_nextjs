import type { Metadata } from "next";
import Link from "next/link";

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: path }, openGraph: { title: `${title} | 문해와 사유`, description, url: path, type: "website" } };
}

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <section className="bg-[#ede4d5] px-5 py-16 md:py-24"><div className="mx-auto max-w-6xl"><p className="mb-4 text-xs font-bold tracking-[.25em] text-[#a65532]">{eyebrow}</p><h1 className="max-w-3xl text-4xl font-bold tracking-[-.08em] md:text-6xl">{title}</h1>{children && <div className="mt-6 max-w-2xl text-stone-600">{children}</div>}</div></section>;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mx-auto max-w-6xl px-5 py-12"><h2 className="mb-7 text-2xl font-bold tracking-[-.06em]">{title}</h2>{children}</section>; }
export function ActionLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="inline-flex rounded-full bg-[#a65532] px-5 py-3 text-sm font-bold text-white hover:bg-[#884224]" href={href}>{children}</Link>; }
