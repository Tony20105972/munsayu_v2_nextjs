import Link from "next/link";
import { PageHero, Section, pageMetadata } from "@/components/public/page";
export const metadata = pageMetadata("공지사항 페이지", "문해와 사유 공지사항", "/notice");
const notices = [{id:"1",title:"문해와 사유 홈페이지 안내",date:"2026.11.11"},{id:"2",title:"수강 및 설명회 문의 안내",date:"2026.11.11"}];
export default function Notices(){return <><PageHero eyebrow="NOTICE" title="공지사항"/><Section title="새 소식"><div className="border-t border-stone-800">{notices.map(x=><Link key={x.id} href={`/notice/${x.id}`} className="flex justify-between border-b border-stone-200 py-5 hover:text-[#a65532]"><span>{x.title}</span><time className="text-sm text-stone-500">{x.date}</time></Link>)}</div></Section></>}
