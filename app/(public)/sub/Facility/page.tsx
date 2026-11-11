import { PageHero, Section, pageMetadata } from "@/components/public/page";
export const metadata = pageMetadata("시설안내", "문해와 사유의 학습 공간을 소개합니다.", "/sub/Facility");
export default function Facility() { return <><PageHero eyebrow="FACILITY" title="집중과 대화를 위한 공간"/><Section title="학습 공간"><p className="max-w-2xl text-stone-600">권리 확인된 시설 사진을 확보하면 이곳에 추가합니다. 현재는 텍스트 안내만 제공합니다.</p></Section></> }
