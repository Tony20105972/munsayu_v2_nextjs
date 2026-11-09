# REA inspect_web_page — 게시판·인증·예약조회 주소 형식 대표

모든 관찰은 Chrome CDP 탭 하나씩 GET으로 열고 닫았다. 입력·제출·가입·로그인은 하지 않았다. REA는 저장소 값을 보관하지 않으며, 이 요약에도 값은 기록하지 않는다.

| 형식 | 대표 URL | REA evidence_id | 결과 |
|---|---|---|---|
| 게시판 목록 | `/bbs/board.php?bo_table=notice` | `ev_7bd5c42fbe45ce686394b9d7000cfc6688dde6973f090fd6d0bc9ff188823d1c` | 성공 |
| 게시판 상세 | `/bbs/board.php?bo_table=notice&wr_id=2` | `ev_5aee9d716a267cf1a3f9e5e50fc61ccbfa6771abe3a28816a8b178fcfcb79a09` | 성공 |
| 로그인 | `/bbs/login.php` | `ev_42e2824688f736dbb7446aae558b09c8c5381c8d72fc9630604771c5d32d6051` | 성공 |
| 회원가입 약관 | `/bbs/register.php` | `ev_a45adc59847b15aabadfd2811dbf5746c4a903a7051ce6535c653fd08978a076` | 성공 |
| 아이디/비밀번호 찾기 | `/bbs/password_lost.php` | `ev_e6dae2573da6ac0b6ba32c6edadf718ff0903d32bbfd9915a9f5e68d3a113122` | 성공 |
| 설명회 예약 조회/취소 | `/sub/Check` | `ev_99f40fa434295330a4c567b7b8203e25359bf643960d94f4bd384839cae1f36c` | 성공 |
