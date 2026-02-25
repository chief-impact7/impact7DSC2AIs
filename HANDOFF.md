# impact7DB Dashboard — AI 인수인계 문서 (최종 갱신: 2026-02-25)

## 프로젝트 개요

Impact7 학원 학생 관리 시스템 (impact7DB)

| 항목 | 내용 |
|---|---|
| Firebase 프로젝트 ID | `impact7db` |
| GitHub 저장소 | https://github.com/chief-impact7/impact7DB |
| 개발 서버 실행 | `npm run dev` → http://localhost:5174 (WSL: `--host` 옵션으로 Network 주소 사용) |
| 스택 | Vite + Firebase v9 모듈 SDK + Vanilla JS |
| 메인 파일 | `index.html`, `app.js`, `style.css` |

---

## 파일 구조

```
impact7DB2AIs/
├── index.html           # 메인 UI (사이드바 + 목록 패널 + 상세/폼 패널 + 메모 모달)
├── app.js               # 메인 로직 (인증, 목록, AND 복합필터, 등록/수정 폼, 메모 모달, 이력 탭, CSV/시트 upsert)
├── style.css            # 스타일 (MD3 + 필터 칩 + 메모 카드 + 모달 + 이력)
├── firebase-config.js   # Firebase 초기화 (import.meta.env.VITE_* 사용)
├── auth.js              # Google 로그인/로그아웃 (다중 도메인 지원, Drive scope 포함)
├── vite.config.js       # Vite 번들러 설정 (host: true, usePolling: true for WSL)
├── .env                 # VITE_FIREBASE_* 환경변수 (git 제외됨)
├── .firebase-ci-token   # Firebase CI 토큰 (firebase-admin 인증용, git 제외됨)
├── .gitignore
├── firestore.rules      # Firestore 보안 규칙 (email_verified + 도메인 regex 검증)
├── firestore.indexes.json # 복합 인덱스 (history_logs: doc_id + timestamp)
├── import-students.js   # CSV → Firestore 대량 import (파괴적: 전체 삭제 후 재업로드)
├── upsert-students.js   # ★ NEW: CSV → Firestore Upsert (신규/변경/동일 분류, firebase-admin 사용)
├── check-duplicates.js  # 중복 데이터 검사
├── dedup-students.js    # 중복 데이터 병합
├── students.csv         # 학생 명단 (399명)
├── PATCH_NOTES.js       # 변경 이력
└── gas/                 # Google Apps Script 연동 (백업/감사/export/import 등)
```

---

## ★ 2026-02-25 변경사항 (Gemini 커밋 필요)

### 변경된 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `upsert-students.js` | **신규 파일** — CLI용 CSV Upsert 스크립트 (firebase-admin SDK) |
| `app.js` | 브라우저 CSV/구글시트 Upsert 기능 추가, makeDocId 전화번호 정규화 |
| `auth.js` | Google Drive scope 추가 (`drive.readonly`), OAuth accessToken export |
| `index.html` | Google Picker API 스크립트 로드, 업로드 버튼 통합 |
| `gas/Code.gs` | `importFromSheetById()` 함수 추가, `doGet`에 `action=import` 지원 |
| `package.json` | `upsert`, `upsert:dry` npm scripts 추가 |
| `.gitignore` | `service-account.json`, `.firebase-ci-token` 추가 |

### 1. Upsert (Update or Insert) 기능 구현

**목적**: 기존 데이터가 있는 상태에서 새 배치 데이터를 안전하게 가져오기

**동작 방식**:
- 같은 학생 (docId 매칭) → **UPDATE** (기본정보 + enrollments 교체)
- 새 학생 (docId 없음) → **INSERT**
- 동일한 데이터 → **SKIP**
- 모든 변경은 `history_logs`에 자동 기록

**Enrollment 처리 방식**: 새 데이터의 enrollments로 **통째로 교체** (추가가 아님).
예: 기존 HA104 → 새 데이터 HX108 이면 HA104 삭제, HX108로 교체.

### 2. 전화번호 정규화 (makeDocId)

```js
// 변경 전
const phone = (parentPhone || '').replace(/\D/g, '');

// 변경 후
let phone = (parentPhone || '').replace(/\D/g, '');
if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
```

기존 DB의 전화번호가 10자리(`1012345678`)로 저장되어 있고, 구글시트에서 `01012345678`(11자리)로 입력하면 docId가 불일치하는 문제 해결.

### 3. 브라우저 업로드 통합 (upload 버튼)

업로드 버튼 클릭 → 3가지 선택:

| 번호 | 기능 | 구현 방식 |
|---|---|---|
| 1 | 구글시트에서 가져오기 | Google Picker → Sheets API로 직접 읽기 → 클라이언트 upsert |
| 2 | CSV 파일 업로드 | File API → CSV 파싱 → 클라이언트 upsert |
| 3 | 빈 템플릿 시트 만들기 | GAS Web App 호출 |

**구글시트 가져오기 흐름**:
1. Google Picker로 드라이브에서 시트 선택
2. Google Sheets API (`sheets.googleapis.com/v4`)로 데이터 직접 읽기
3. GAS 경유 없이 브라우저에서 Firestore에 직접 upsert

**필요한 설정**:
- Google Cloud Console에서 **Google Sheets API** 활성화 필요 (이미 완료)
- 로그인 시 `drive.readonly` scope 동의 필요 (첫 로그인 시 한 번)

### 4. CLI Upsert 스크립트 (`upsert-students.js`)

```bash
npm run upsert:dry                              # dry-run (미리보기)
npm run upsert                                  # 실행
node upsert-students.js --file new_data.csv     # 다른 CSV 파일
```

- `firebase-admin` SDK 사용 (Firestore Rules 무시)
- 인증 우선순위: `service-account.json` → `GOOGLE_APPLICATION_CREDENTIALS` → `.firebase-ci-token`
- `.firebase-ci-token`에 `firebase login:ci` 토큰 저장됨 (영구)

### 5. GAS 변경사항 (`gas/Code.gs`)

`importFromSheetById(sheetId)` 함수 추가 및 `doGet`에 `action=import&sheetId=XXX` 지원 추가.
**단, 현재 브라우저에서는 GAS 경유 없이 Sheets API 직접 호출 방식을 사용 중.**
GAS 경로가 필요하면 Apps Script에서 `Code.gs` 업데이트 후 **기존 배포 수정 → 새 버전**으로 배포 필요 (새 배포 X, URL 변경 안 되도록).

### 6. 구글시트 템플릿 헤더 → Firestore 필드 매핑

| 구글시트 헤더 | → | Firestore / 내부 필드 |
|---|---|---|
| 이름 | → | name |
| 학부 | → | level |
| 학교 | → | school |
| 학년 | → | grade |
| 학생연락처 | → | student_phone |
| 학부모연락처1 | → | parent_phone_1 |
| 학부모연락처2 | → | parent_phone_2 |
| **소속** | → | **branch** |
| **레벨기호** | → | **level_symbol** (예: HA, I, AX) |
| **반넘버** | → | **class_number** (예: 104, 202) |
| 수업종류 | → | class_type |
| 시작일 | → | start_date |
| 요일 | → | day (배열로 변환) |
| 상태 | → | status |

---

## 핵심 아키텍처 결정사항 (반드시 숙지)

### 1. Firestore docId 방식

```
docId = 이름_부모연락처1(숫자만, 앞0제거)_branch
예시: 김민준_1012345678_2단지
```

- `student_id` 필드 없음 (완전 제거됨)
- `branch` 값은 기존 필드를 유지하거나 첫 번째 `enrollment`의 `class_number`에서 자동 파생 (`branchFromClassNumber()` 참고)
- 재등록/반변경: 동일 docId → 필드만 업데이트 (중복 없음)
- **전화번호 정규화**: 11자리 `010...` → 10자리 `10...`으로 자동 변환

```js
const makeDocId = (name, parentPhone, branch) => {
    let phone = (parentPhone || '').replace(/\D/g, '');
    if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
    return `${name}_${phone}_${branch}`.replace(/\s+/g, '_');
};
```

### 2. branch 자동 결정

```js
const branchFromSymbol = (sym) => {
    const first = (sym || '').trim()[0];
    if (first === '1') return '2단지';
    if (first === '2') return '10단지';
    return '';
};
```

- 폼에 단지 드롭다운 없음. 레벨기호 입력 시 자동 결정됨.

### 3. enrollments[] 배열 (다중 수업 지원)

1명의 학생이 여러 수업을 수강할 수 있도록 `enrollments` 배열 사용.
기존의 flat 필드(`level_code`, `class_type`, `day`, `start_date` 등)는 모두 등록 객체 안에 들어감.
```js
// Firestore 저장 구조 예시
enrollments: [
  {
    class_type: "정규",
    level_symbol: "HA",
    class_number: "104",
    day: ["월", "수"],
    start_date: "2026-01-05"
  }
]
```
`day` 필드는 배열(`.replace('요일', '')` 처리)로 저장됨.

### 4. status 값

```
등원예정 | 재원 | 실휴원 | 가휴원 | 퇴원
```

- 휴원 선택 시 `pause_start_date`, `pause_end_date` 입력창 표시
- 휴원 기간 31일 초과 시 경고: `window.checkDurationLimit()`

### 5. class_type (수업종류)

```
정규 | 특강 | 내신
```

- `특강` 선택 시 `special_start_date`, `special_end_date` 입력창 표시 (등원일 숨김)

### 6. 인증 (이중 보안)

**클라이언트 (app.js):**
```js
const allowedDomain = email.endsWith('@gw.impact7.kr') || email.endsWith('@impact7.kr');
if (!user.emailVerified || !allowedDomain) { /* 로그아웃 처리 */ }
```

**서버 (firestore.rules):**
```
function isAuthorized() {
    return request.auth != null
        && request.auth.token.email_verified == true
        && (request.auth.token.email.matches('.*@gw\\.impact7\\.kr')
            || request.auth.token.email.matches('.*@impact7\\.kr'));
}
```

- `auth.js`의 `hd` 파라미터는 단일 도메인만 지원하므로 주석 처리됨
- 실제 보안은 app.js + firestore.rules 이중 검증
- `auth.js`에 `drive.readonly` scope 추가됨 (Google Picker용)

### 7. history_logs 필수 기록

모든 Firestore 쓰기 시 반드시 함께 기록:

```js
await addDoc(collection(db, 'history_logs'), {
    doc_id:          docId,
    change_type:     'ENROLL' | 'UPDATE' | 'WITHDRAW',
    before:          '이전값',
    after:           '변경값',
    google_login_id: currentUser?.email || 'system',
    timestamp:       serverTimestamp(),
});
```

### 8. AND 복합 필터 (사이드바)

```js
let activeFilters = { level: null, branch: null, day: null, status: null, class_type: null };
```

- 각 카테고리(학부, 소속, 요일, 상태, 수업종류) 독립 선택
- 같은 타입 재클릭 → 해제 (토글)
- 다른 타입 조합 → AND 결합 (예: 2단지 + 정규 + 수요일)
- 필터 칩(chips)으로 활성 필터 표시 + 전체 해제 버튼

### 9. XSS 방지

```js
const esc = (str) => {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
};
```

- 사용자 입력(메모, 이력)을 innerHTML에 삽입할 때 반드시 `esc()` 사용

---

## Firestore 컬렉션 스키마

### students (컬렉션)

```
{
  name, level, school, grade,
  student_phone, parent_phone_1, parent_phone_2,
  branch,
  status,           // 등원예정 | 재원 | 실휴원 | 가휴원 | 퇴원
  pause_start_date, pause_end_date,      // 휴원일 때만
  enrollments: [    // 다중 수업 배열
    {
      class_type,         // 정규 | 특강 | 내신
      level_symbol,
      class_number,
      day: array,         // ["월", "수"]
      start_date,         // 등원일/시작일
      end_date            // (선택) 특강 등 종료일
    }
  ]
}
```

### students/{docId}/memos (서브컬렉션)

```
{ text: string, created_at: Timestamp, author: string }
```

### history_logs (컬렉션)

```
{ doc_id, change_type, before, after, google_login_id, timestamp }
```

**복합 인덱스** (firestore.indexes.json에 정의):
- `doc_id ASC` + `timestamp DESC` → 학생별 이력 조회

---

## 주요 전역 함수 (app.js)

| 함수 | 설명 |
|---|---|
| `window.handleLogin()` | Google 로그인/로그아웃 토글 |
| `window.selectStudent(id, data, el)` | 학생 선택 → 프로필 + 메모 + 이력 로드 |
| `window.showNewStudentForm()` | 신규 등록 폼 표시 |
| `window.showEditForm()` | 정보 수정 폼 표시 (pre-fill) |
| `window.hideForm()` | 폼 닫고 상세 뷰로 복귀 |
| `window.submitNewStudent()` | 등록/수정 저장 → Firestore + history_logs |
| `window.handleUpload()` | ★ 업로드 메뉴 (구글시트/CSV/템플릿) |
| `window.handleSheetPicker()` | ★ Google Picker → 시트 선택 → upsert |
| `window.handleCsvUpsert()` | ★ CSV 파일 선택 → upsert |
| `window.handleSheetTemplate()` | 빈 구글시트 템플릿 생성 |
| `window.handleSheetExport()` | Firestore → 구글시트 내보내기 |
| `window.handleStatusChange(val)` | 상태 변경 시 휴원 기간 입력창 토글 |
| `window.handleClassTypeChange(val)` | 수업종류 변경 시 날짜 입력창 토글 |
| `window.handleLevelSymbolChange(val)` | 레벨기호 입력 시 소속 미리보기 |
| `window.checkDurationLimit()` | 휴원 기간 31일 초과 확인 |
| `window.openMemoModal(context)` | 메모 모달 열기 ('view' \| 'form') |
| `window.closeMemoModal(e)` | 메모 모달 닫기 |
| `window.saveMemoFromModal()` | 모달에서 메모 저장 → Firestore |
| `window.deleteMemo(studentId, memoId)` | 메모 삭제 (확인 다이얼로그) |
| `window.toggleMemo(memoId)` | 메모 카드 펼치기/접기 |
| `window.clearFilters()` | 모든 필터 해제 |
| `window.refreshStudents()` | 학생 목록 전체 재로드 |

---

## NPM Scripts

| 스크립트 | 명령어 | 설명 |
|---|---|---|
| `dev` | `npm run dev` | Vite 개발 서버 |
| `build` | `npm run build` | 프로덕션 빌드 |
| `import` | `npm run import` | CSV → Firestore 전체 초기화 (파괴적) |
| `upsert` | `npm run upsert` | ★ CSV → Firestore Upsert (안전) |
| `upsert:dry` | `npm run upsert:dry` | ★ Upsert 미리보기 (Firestore 변경 없음) |
| `check` | `npm run check` | 데이터 정합성 검사 |
| `dedup` | `npm run dedup` | 중복 문서 정리 |

---

## 완료된 기능 목록

- [x] Firebase Auth (Google 로그인) + email_verified 검증
- [x] 이중 도메인 보안 (`gw.impact7.kr` + `impact7.kr`) — 클라이언트 + 서버 규칙
- [x] Firestore 연결 및 학생 목록 로드 + 검색
- [x] AND 복합 필터 (학부/소속/요일/상태/수업종류) + 필터 칩 + 전체 해제
- [x] 학생 상세 프로필 뷰 + 탭 (기본정보 / 수업이력)
- [x] 수업이력 탭 — history_logs 쿼리 + 복합 인덱스
- [x] 신규 등록 폼 + 정보 수정 폼 (Firestore 저장, history_logs 기록)
- [x] 실휴원 / 가휴원 상태 + 휴원 기간 날짜 입력 + 31일 초과 경고
- [x] 학생 초성 검색 지원 (ㄱㄴㄷ 매칭)
- [x] 반별/소속별 학생 그룹 뷰 구현
- [x] 기존 데이터 enrollments 배열로 마이그레이션 (`migrateToEnrollments()`) 완료 (100%)
- [x] Firestore 보안 규칙 강화 (history_logs 수정 차단, 필드 whitelist 검증)
- [x] GAS 연동 완료 (dailyBackup, doGet Web App 등)
- [x] 레거시 코드 정리 파일 삭제 (apps/, core/, userlog.js 등) 및 .env 적용
- [x] ★ CSV/구글시트 Upsert 기능 (브라우저 + CLI)
- [x] ★ Google Picker 연동 (드라이브에서 시트 선택 → 가져오기)
- [x] ★ 전화번호 정규화 (010 → 10 자동 변환)

---

## 다음 작업 권장 목록

### 1순위: 추가 개선 (검색 및 UI)
- **출결 관리 시스템 기반 작업**: 날짜별 출결을 저장할 수 있는 서브컬렉션 생성 및 뷰 디자인

---

## 주의사항

- `student_id` 필드는 Firestore에서 완전 삭제됨. 코드에서 참조하지 말 것.
- 수업 정보(단지, 요일, 시작일 등)는 `enrollments[]` 배열로 모두 이관됨.
- 모든 쓰기 작업 후 `history_logs` 기록 필수, 이 기록은 생성만 가능하고 수정/삭제가 서버단에서 차단됨.
- `branch` 필드는 첫 번째 등록된 `class_number`를 기반으로 자동 생성, 폼에 선택 UI 없음.
- `.env` 파일은 git에 포함되지 않음. Node.js 스크립트 실행 시 필요함.
- `.firebase-ci-token`은 git에 포함되지 않음. `firebase login:ci`로 생성.
- Upsert 시 enrollments는 **교체** 방식 (추가 아님). 새 데이터 = 현재 상태.
- 전화번호는 앞자리 `0` 제거 후 저장 (10자리). 구글시트에서 `010...` 입력해도 자동 정규화.
