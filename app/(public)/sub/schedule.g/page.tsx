import { Timetable } from "@/components/public/programs";
import { pageMetadata } from "@/components/public/page";
export const metadata = pageMetadata("분당 시간표", "분당 강좌 시간표와 수강 예약", "/sub/schedule.g"); export default function Page(){return <Timetable campus="분당"/>}
