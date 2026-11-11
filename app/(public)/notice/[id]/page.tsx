import Link from "next/link";
import { PageHero, Section, pageMetadata } from "@/components/public/page";
export const metadata = pageMetadata("공지사항", "문해와 사유 공지사항 상세", "/notice");
export const instant = false;
export default async function Notice({params}:{params:Promise<{id:string}>}){const {id}=await params; return <><PageHero eyebrow="NOTICE" title="공지사항"/><Section title={`공지 ${id}`}><article className="max-w-3xl"><h2 className="text-2xl font-bold">문해와 사유 홈페이지 안내</h2><p className="mt-3 text-sm text-stone-500">2026.11.11</p><p className="mt-9 leading-8 text-stone-700">공지 내용은 관리자에서 관리합니다. 현재 화면은 콘텐츠 연동 전의 공개 표시 영역입니다.</p><Link className="mt-10 inline-block text-sm underline" href="/notice">목록으로</Link></article></Section></>}
