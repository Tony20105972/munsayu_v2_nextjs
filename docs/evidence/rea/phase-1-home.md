# Phase 1 홈 화면 REA 관찰

- 대상: `https://munsayu.com/`
- REA `list_browser_targets`: `ev_492ced74990bb1efb70acdf08b4ffebc12c5deb6fc32c3396030c4f0c90846aa`
- REA `inspect_web_page`: `ev_77ec7e67e28ceadded6ddb4ea5ca182c52649643c85cc2b08541e17554dbb595`
- 관찰: 공개 홈 DOM에서 `/bbs/login.php`, `/bbs/register.php`, 공지 게시판과 `/sub/*` 공개 경로 후보를 확인했다.
- 한계: REA 관찰은 attach 이후부터이며, 네트워크의 이전 활동은 수집하지 않는다.
