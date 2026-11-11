import { PageHero, Section, pageMetadata } from "@/components/public/page";
export const metadata = pageMetadata("학원안내", "문해와 사유의 교육 방향을 소개합니다.", "/sub/about");
export default function About() { return <><PageHero eyebrow="ABOUT" title="아이의 생각이 자라는 수업"><p>정답을 빠르게 찾기보다, 읽고 질문하며 자기 언어를 만들어 갑니다.</p></PageHero><Section title="교육의 방향"><div className="grid gap-5 md:grid-cols-2"><p>문해력은 모든 배움의 바탕입니다. 문해와 사유는 글을 정확히 읽는 힘에서 출발합니다.</p><p>대화와 글쓰기를 통해 아이가 타인의 생각을 이해하고 자신의 생각을 책임 있게 표현하도록 돕습니다.</p></div></Section></> }
