import { PageHero, Section, pageMetadata } from "@/components/public/page";
export const metadata = pageMetadata("오시는 길", "문해와 사유 대치·분당 학원 안내", "/sub/Location");
export default function Location() { return <><PageHero eyebrow="LOCATION" title="문해와 사유를 찾아오세요"/><Section title="캠퍼스"><div className="grid gap-5 md:grid-cols-2">{["대치본원","분당"].map(x=><article key={x} className="rounded-2xl border border-stone-200 p-7"><h2 className="text-xl font-bold">{x}</h2><p className="mt-3 text-sm text-stone-600">상세 주소와 교통 안내는 학원에 문의해 주세요.</p></article>)}</div></Section></> }
