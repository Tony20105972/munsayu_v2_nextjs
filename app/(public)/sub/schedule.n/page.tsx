import { Timetable } from "@/components/public/programs";
import { pageMetadata } from "@/components/public/page";
export const metadata = pageMetadata("대치 시간표", "대치본원 강좌 시간표와 수강 예약", "/sub/schedule.n"); export default function Page(){return <Timetable campus="대치본원"/>}
