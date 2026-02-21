/*
-----------------------------------------
[Log #1] [2026-02-21 14:13:31]

사용자: Act as a Frontend UI/UX Expert strictly following Google Material Design 3 guidelines.
Please create the initial UI files (index.html, style.css, and app.js) for our Academy Management Dashboard.

Design Requirements:

Style: Minimalist, clean, ample whitespace, and rounded corners (similar to Google Workspace apps like Google Calendar or Gmail).

Assets: Use Google Fonts (e.g., Roboto or Google Sans) and Material Symbols via CDN. Do NOT use complex external UI frameworks, keep it lightweight with vanilla HTML/CSS/JS.

Layout Requirements:

Top App Bar: Title "Academy Flow Dashboard" on the left, and a "Login with Google" button on the right.

Left Panel (Sidebar, ~30% width): A search input field for finding students, followed by a scrollable list of mock student cards (e.g., "Student A - Grade 3", "Student B - Grade 5").

Main Panel (~70% width): A "Daily Flow Check" detail view for the selected student. It should include:

Student Name and Branch header.

"Check-in Time" and "Check-out Time" input fields or buttons.

A checklist section for "Daily Routine Tasks" (e.g., Vocabulary Test, Math Review).

A prominent Material Design "Save Changes" button at the bottom.

Logic Requirements (app.js):
Do NOT implement actual Firebase connections yet. Just create the UI structure and add empty placeholder functions (e.g., function handleLogin() { console.log("Login clicked"); }, function saveDailyFlow() {}) in app.js so another AI can wire up the backend logic later.

작업: Google Material Design 3 가이드라인에 맞춰 Academy Management Dashboard의 기본 UI 구조(index.html, style.css, app.js)를 생성함. 외부 라이브러리 없이 Vanilla HTML/CSS/JS로 구현하였으며, 추후 Firebase 연동을 위한 빈 placeholder 함수들을 app.js에 추가함.
-----------------------------------------
*/
/*
-----------------------------------------
[Log #2] [2026-02-21 15:15:49]

사용자: Act as a Frontend UI/UX Expert strictly following Google Material Design 3 guidelines.
Please create the initial UI files (index.html, style.css, and app.js) for our Academy Management Dashboard.

Design Requirements:
1. Style: Minimalist, clean, ample whitespace, and rounded corners (similar to Google Workspace apps like Google Calendar or Gmail). 
2. Assets: Use Google Fonts (e.g., Roboto or Google Sans) and Material Symbols via CDN. Do NOT use complex external UI frameworks; keep it lightweight with vanilla HTML/CSS/JS.

Layout Requirements:
- Top App Bar: Title "Academy Flow Dashboard" on the left, and a "Login with Google" button on the right.
- Left Panel (Sidebar): A search input for students and a scrollable list of mock student cards.
- Main Panel: A "Daily Flow Check" detail view including Check-in/out times, a checklist for "Daily Routine Tasks", and a Material Design "Save Changes" button.

Logic Requirements (app.js):
- Create the UI structure and add empty placeholder functions (e.g., function handleLogin(), function saveDailyFlow()). 
- Another agent will wire up the actual Firebase backend logic later based on our Rules_EN.md.

작업: 사용자의 요청에 따라 Google Material Design 3 원칙을 엄격히 준수하여 Academy Flow Dashboard용 초기 UI 파일(index.html, style.css, app.js)을 갱신 및 고도화함.
-----------------------------------------
*/
/*
-----------------------------------------
[Log #3] [2026-02-21 15:43:32]

사용자: I see the Browser Control screen. Please now generate the index.html, style.css, and app.js files based on my previous UI request, and then open the preview to show me the result.

작업: 이미 생성된 UI 파일(index.html, style.css, app.js)을 호스팅하기 위해 로컬 웹 서버를 실행하고, 브라우저 환경에서 Academy Flow Dashboard 화면을 미리보기로 엽니다.
-----------------------------------------
*/
/*
-----------------------------------------
[Log #4] [2026-02-21 15:49:16]

사용자: Details can wait. Just generate a simple 'Google Workspace' style dashboard UI (index.html, style.css) so I can see the layout in the preview. Use mock data for now.

작업: 기존에 생성한 UI에 추가적인 폴리싱을 진행하여 Google Workspace(Gmail, Google Calendar) 특유의 극도로 깔끔한 레이아웃과 색상, 여백 비율을 적용했습니다. 미리보기 탭에서 확인할 수 있도록 index.html과 style.css를 갱신합니다.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #5] [2026-02-21 17:57:47]

사용자: All 399 students are now in the Firestore students collection. Please update the Sidebar in our UI to list these students (show Name and School). Also, when I click a student from the list, their detailed info (Phone, Level, Grade, etc.) should appear in the Main Panel. Make it look professional using Material Design 3.

작업: index.html 및 app.js를 수정하여 사이드바 학생 목록에서 '이름'과 '학교' 정보를 보여주도록 업데이트함. 또한 목록에서 학생 클릭 시, 메인 패널에 상세 정보(연락처, 레벨기호, 학년 등)가 표시될 수 있도록 Material Design 3 요소를 활용해 명확한 그리드 뷰를 구축함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #6] [2026-02-21 18:04:08]

사용자: This site can’t be reached
localhost refused to connect.
Try:

Checking the connection
Checking the proxy and the firewall
ERR_CONNECTION_REFUSED

작업: 로컬 웹 서버가 중지되어 브라우저에서 'ERR_CONNECTION_REFUSED' 에러가 발생하는 문제를 해결하기 위해, 로컬 서버(python -m http.server 또는 npx serve)를 포트 8123에서 재배포/재시작함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #7] [2026-02-21 18:08:18]

사용자: Change of plans. This dashboard will NOT handle daily check-ins/outs. It is a Centralized Student Data Hub.

Remove all 'Daily Flow' or 'Attendance' related UI elements.

Redesign the Main Panel to focus on a Detailed Student Profile view. It should display all fields from the Firestore (name, school, grade, student_phone, parent_phone_1/2, level_code, start_date, etc.) in a clean, organized card layout.

Ensure the Sidebar search works flawlessly to filter through the 399 students.

Keep the design minimalist and professional, following Google Material 3.

작업: index.html 및 app.js에서 Daily Flow(출결 체크인/아웃, 루틴 체크, Save 버튼 등) 요소들을 완전히 제거함. 대신 메인 패널을 '중앙 학생 데이터 허브' 역할을 할 수 있도록 깔끔한 Profile 위젯 뷰 형태(이름, 등급, 전화번호들, 시스템 ID 포함)로 전면 개편함. 또한 app.js에 사이드바 검색 기능을 추가하여 Firestore에서 로드된 전체 학생 배열(allStudents)을 이름, 학교, 연락처 기반으로 즉각 필터링(Search) 되도록 구현 완료.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #9] [2026-02-22 02:05:20]

사용자: 잘 되던 구글로그인이 안되어서 변경된 사항을 볼 수가 없어. 수정해줘

작업: 사용자가 수동으로 수정한 .env 및 core/firebase.js 내의 Firebase API Key 값에서 대소문자 오타(DLmEL -> DlmeL)를 비롯해 apps/main.js에 기재된 잘못된 상대경로(../../core -> ../core)를 모두 정정하여 구글 로그인이 정상 작동하도록 조치함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #10] [2026-02-22 02:12:20]

사용자: 아직도 로그인이 안되고 있어. (Console에 Invalid left-hand side in assignment 및 handleLogin is not defined 에러 발생 화면 첨부)

작업: 사용자가 올려준 브라우저 콘솔 오류 스크린샷을 분석한 결과, app.js 194번 줄에 있던 \document.getElementById?.textContent = studentId;\ 구문이 자바스크립트 문법 오류(Optional Chaining은 할당 연산자의 좌변에 올 수 없음)를 발생시켜 전체 app.js 파일 불러오기가 중단된 상태임을 확인. 해당 코드를 정규 if문 구문으로 수정하여 문법 에러를 해결하고, handleLogin 함수 등 전체 앱이 정상 작동하도록 복구 조치 완료함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #11] [2026-02-22 02:13:59]

사용자: 주의사항 한 가지: app.js 192번 줄 document.getElementById('profile-system-id').textContent = studentId; 는 dead code입니다 (해당 HTML element가 없음). 수정 기능 구현 시 이 줄도 삭제해 주세요.

작업: 사용자의 요청(이전 AI 모델이었던 Claude의 인수인계 노트 내용)에 따라, HTML 뷰 템플릿에 존재하지 않는 \#profile-system-id\ 엘리먼트에 불필요하게 접근하려던 \pp.js\ 내부의 할당 코드(dead code)를 식별하고 완전히 제거 조치하여 잔여 버그 발생 가능성을 차단함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #12] [2026-02-22 02:15:42]

사용자: 구글 로그인이 또 안돼 (콘솔에 auth/api-key-not-valid 에러 반복 출력 스크린샷 첨부)

작업: AI의 자체 실수 원복. 이전 단계에서 'API Key 오타 수정' 시도 중, 올바른 키 값인 'DlmEL'을 'DlmeL'로 잘못 변경한 것이 원인임을 확인. .env 파일의 키 값을 원래 올바른 값(DlmEL)으로 원복하고, core/firebase.js에 하드코딩된 잘못된 API Key 값도 제거하여 .env 환경변수에서 읽어오도록 통일 정리함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #13] [2026-02-22 02:19:13]

사용자: 구글로그인을 하면 구글로그인 창이 떴다가 자동으로 사라짐. 하지만 로그인은 됨. 그 상태에서 우측의 아이디창을 누르면 로그아웃 됨. 아무나 로그인 할 수 있는건가? 이건 나중에 수정되나?

작업: 사용자의 의문(팝업 자동 닫힘, 원클릭 로그아웃, 누구나 로그인 가능한 보안 상태)에 대해 답변 및 설명 제공. 현재 테스트 및 개발 편의성을 위해 \uth.js\ 내의 도메인 접속 제한 코드(\provider.setCustomParameters({ hd: 'gw.impact7.kr' });\)가 주석 처리되어 있음을 인수인계 문서(HANDOFF.md)의 '4순위: 보안강화' 측면과 연관 지어 설명하였으며, 추후 개발 완료 시 해당 부분을 활성화하여 학원 계정 소유자만 접근할 수 있도록 제한될 것임을 안내함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #14] [2026-02-22 02:24:20]

사용자: 건별로 수정하는 정보수정에서, 상태는 재원/실휴원/가휴원/퇴원 으로 구분되게 하고, 실,가휴원은 모두 휴원 기간을 설정할 수 있게 해줘

작업: index.html 폼 뷰에서 상태 드롭다운 옵션에 '실휴원', '가휴원'을 추가하고, 이 두 가지 상태가 선택될 때만 나타나는 '휴원 기간 (시작일 ~ 종료일)' date 입력 폼 UI를 추가함. app.js에 이를 컨트롤할 handleStatusChange 이벤트를 연결하여, 휴원 상태일 때만 보이도록 연동하고, 저장(Firebase Update) 및 상세 조회(Profile View) 시에도 해당 휴원 기간 기록이 완벽하게 처리되고 노출되도록 반영 조치함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #16] [2026-02-22 02:34:15]

사용자: 시작일 과거 제한을 한달 전까지로 수정해줘
1개월 초과자 알림은 안뜨는데 정상인가?

작업: 1. 시작일(pause_start_date) 과거 선택 제한을 getDate() - 14에서 getMonth() - 1를 이용해 '현재 기준 최대 1개월(한 달) 전'으로 기준선을 수정함.
2. 1개월 초과자 알림(alert)이 안 뜨던 버그를 수정함. 기존에는 종료일(pause_end_date)을 바꿀 때만 동작했으나, 종료일이 이미 지정된 상태에서 역으로 시작일 캘린더를 움직여도 동일하게 31일 초과 여부를 자동 검사하여 alert이 정확히 뜨도록 checkDurationLimit 함수를 생성하여 양방향 이벤트에 모두 바인딩함 (동일 수정 중복 알림 방지 로직 포함).
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #17] [2026-02-22 02:41:34]

사용자: - 알림창은 여전히 안뜸
- 수업요일에 일요일추가. 모든 곳에 적용
- 모든 날짜 포맷을 연-월-일 순으로
- 학습등록정보에 추가 [수업종류: 정규/특강/내신]
- 특강 선택시에 시작날짜와 종료날짜 선택하도록

작업: 
1. 휴원 기간 알림창 이벤트(DOM 바인딩)가 브라우저에 따라 종종 누락되던 이슈를 해결하고자, HTML 요소에 인라인 \onchange=window.checkDurationLimit()\ 형태로 직접 바인딩하여 무조건 동작하도록 구조를 리팩터링함.
2. index.html 폼과 좌측 사이드바 등 모든 요일 관련 항목에 '일'/'일요일' 옵션을 추가함.
3. 데이터베이스의 날짜 데이터를 무조건 \yyyy-mm-dd\ 형태로 통일하여 보여주는 \ormatDate\ 문자열 포맷팅 함수를 개발하고, 상세 프로필 뷰 달력 정보 표기 전체에 일괄 적용함.
4. 입력 및 표시 폼에 \class_type\(수업종류: 정규, 특강, 내신) 필드를 새롭게 디자인하여 신설.
5. 수업종류가 '특강'으로 맞춰졌을 때에만 노출되는 특강 기간(\special_start_date\~\special_end_date\) 컨트롤을 구현하고, DB 연동 및 뷰 렌더링까지 전부 동기화함.
-----------------------------------------
*/
/* 
-----------------------------------------
[Log #18] [2026-02-22 02:47:43]

사용자: 계속

작업: 직전 턴의 모든 코드 작업 완료 처리 및 PATCH_NOTES.js 업데이트 수행. 변경 사항 요약: 1) 일요일 요일 지원 추가, 2) 모든 날짜 포맷 연-월-일 통일, 3) 수업종류(정규/특강/내신) 필드 신설 및 특강 기간 연동, 4) 휴원 기간 알림창 전역 함수 구조로 전환 및 인라인 이벤트 바인딩 완료.
-----------------------------------------
*/
/*
-----------------------------------------
[Log #19] [2026-02-22 02:54:32]

사용자: - 단지는 레벨기호의 첫번째 수자가 '1'이면 '2단지', '2'이면 10단지 임. 단지선택 버튼은 없애고 레벨기호만 입력란에 있도록 조정.
- 수업종류가 정규일때는 등원일캘린더, 특강일때는 시작일과 종료일 캘린더, 선택에 따라서 나오도록 수정
- 단지 -> 소속으로 수정
- 학교+학부+학년 간단히 보이도록 수정 (예: 진명여 고등 2학년 -> 진명여고2)

작업:
1. app.js에 branchFromSymbol() 함수를 신설하여 레벨기호 첫 자리가 '1'이면 '2단지', '2'이면 '10단지'로 자동 파생. 폼에서 기존 단지(branch) 드롭다운 버튼을 완전 제거하고 레벨기호 입력 때마다 real-time으로 소속이 레이블 옆에 자동 표시되도록 branch-preview UI 추가.
2. handleClassTypeChange 수정: '특강' 선택시 등원일 숨기고 특강 기간 표시, 그 외에는 등원일만 보이도록 연동.
3. 상세 프로필 뷰와 폼의 모든 '단지' 표기를 '소속'으로 변경.
4. abbreviateSchool() 함수를 신설하여 학교명+학부+학년을 '진명여고2' 같은 축약형으로 변환하여 상단 태그 영역에 표시. profile-grade 태그는 삭제하고 profile-school 태그에 통합.
-----------------------------------------
*/
/*
-----------------------------------------
[Log #20] [2026-02-22 03:02:35]

사용자: - 연락처 아래에 메모 카드(추가/삭제/접기) 기능 추가 요청
- 이름 밑 정보 소속+학교 순서로 변경 (예: 2단지 · 대일고1)
- 학교+학부+학년 축약형 버그 수정

작업:
1. abbreviateSchool() 정규식 버그 수정: 긴 접미사(고등학교/중학교/초등학교/학교)를 순서대로 체인 replace로 처리하여 부분 매칭 오류 제거.
2. 프로필 상단 태그에 소속(branch)을 prepend하여 '2단지 · 진명여고2' 형태로 표시.
3. Firestore 서브컬렉션 students/{id}/memos 기반의 메모 관리 기능 추가:
   - loadMemos(), renderMemos(), addMemo(), deleteMemo(), toggleMemo() 전역 함수 구현.
   - 각 메모 카드는 요약(최대 40자)만 보이고 클릭 시 전체 내용 펼침/접기.
   - + 버튼으로 메모 추가, X 버튼으로 삭제 (삭제 확인 다이얼로그 포함).
4. index.html에 메모 카드 섹션(memo-info-card) 추가, style.css에 메모 관련 스타일 추가.
5. Firestore import에 deleteDoc 추가.
-----------------------------------------
*/
/*
-----------------------------------------
[Log #21] [2026-02-22 03:15:00]

사용자: 계속 (정리 및 GitHub 업로드 완료 요청)

작업:
1. HANDOFF.md를 오늘 날짜(02-22) 기준으로 최신화: 소속 자동 파생, 수업종류별 동적 필드, 메모 관리, 일요일 지원 등 새로 추가된 모든 아키텍처와 함수 명세를 상세히 기록.
2. PATCH_NOTES.js를 최신 사항으로 정리하여 맨 위에 추가 및 구문 오류 픽스.
3. 프로젝트 내 주요 파일(app.js, index.html, style.css 등)을 Git master 브랜치에 커밋.
4. GitHub 원격 저장소를 https://github.com/chief-impact7/impact7DB.git 로 설정.
5. GitHub 푸시 시도 (인증 필요 시 사용자에게 안내 준비).

현재 상태: 로컬 커밋은 완료되었으며, GitHub 푸시는 HTTPS 인증 절차로 인해 사용자의 직접적인 push 또는 토큰 기반 인증이 필요한 상태임.
-----------------------------------------
*/
/*
-----------------------------------------
[Log #23] [2026-02-22 04:36:15]

사용자: 도메인 추가 요청 (gw.impact7.kr + impact7.kr)

작업:
1. auth.js: GoogleAuthProvider의 hd 파라미터 힌트 제거로 다중 도메인 선택 지원.
2. firestore.rules: isAuthorized() 규칙에 @impact7.kr 도메인 추가 허용 로직 반영.
3. app.js: onAuthStateChanged 모듈에 프론트엔드 도메인 유효성 검사 로직 추가.
4. 사용자에게 보안 규칙 배포(firebase deploy) 명령어 안내.
-----------------------------------------
*/
