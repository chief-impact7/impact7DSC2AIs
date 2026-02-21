# AIM Dashboard — AI 인수인계 문서 (최종 갱신: 2026-02-22)

## 프로젝트 개요

Impact7 학원 학생 관리 시스템 (Academy Integrated Management)

| 항목 | 내용 |
|---|---|
| Firebase 프로젝트 ID | `impact7db` |
| GitHub 저장소 | https://github.com/chief-impact7/impact7DB |
| 개발 서버 실행 | `npm run dev` → http://localhost:5174 |
| 스택 | Vite + Firebase v9 모듈 SDK + Vanilla JS |
| 메인 파일 | `index.html`, `app.js`, `style.css` |

---

## 파일 구조

```
impact7DB2AIs/
├── index.html           # 메인 UI (사이드바 + 목록 패널 + 상세/폼 패널)
├── app.js               # 메인 로직 (인증, 목록, 필터, 등록/수정 폼, 메모)
├── style.css            # 스타일 (Material Design 3 스타일 + 메모 카드 스타일)
├── firebase-config.js   # Firebase 초기화 (import.meta.env.VITE_* 사용)
├── auth.js              # Google 로그인/로그아웃
├── vite.config.js       # Vite 번들러 설정
├── .env                 # VITE_FIREBASE_* 환경변수 (git 제외됨)
├── .gitignore
├── import-students.js   # CSV → Firestore 대량 import (node로 실행)
├── students.csv         # 학생 명단 (399명)
├── firestore.rules      # Firestore 보안 규칙
├── PATCH_NOTES.js       # 변경 이력 (최신이 맨 위)
└── user_log.js          # 작업 로그 (AI 작업 이력)
```

---

## 핵심 아키텍처 결정사항 (반드시 숙지)

### 1. Firestore docId 방식

```
docId = 이름_부모연락처1(숫자만)_branch
예시: 김민준_01012345678_2단지
```

- `student_id` 필드 없음 (완전 제거됨)
- `branch` 값은 `level_symbol`에서 자동 파생 (`branchFromSymbol()` 참고)
- 재등록/반변경: 동일 docId → 필드만 업데이트 (중복 없음)

```js
const makeDocId = (name, parentPhone, branch) => {
    const phone = (parentPhone || '').replace(/\D/g, '');
    return `${name}_${phone}_${branch}`.replace(/\s+/g, '_');
};
```

### 2. branch 자동 결정

```js
// level_symbol 첫 자리 숫자로 소속 자동 파생
const branchFromSymbol = (sym) => {
    const first = (sym || '').trim()[0];
    if (first === '1') return '2단지';
    if (first === '2') return '10단지';
    return '';
};
```

- 폼에 단지 드롭다운 없음. 레벨기호 입력 시 자동 결정됨.
- 저장 시 `branchFromSymbol(levelSymbol)` 값을 branch 필드에 기록.

### 3. day 필드 — 배열로 저장

```js
// Firestore 저장: ["월", "수", "일"]
// 기존 문자열 → normalizeDays()로 파싱
const normalizeDays = (day) => {
    if (!day) return [];
    if (Array.isArray(day)) return day.map(d => d.replace('요일', '').trim());
    return day.split(/[,·\s]+/).map(d => d.replace('요일', '').trim()).filter(Boolean);
};
```

- 지원 요일: 월, 화, 수, 목, 금, 토, **일** (일요일 포함됨)

### 4. status 값

```
등원예정 | 재원 | 실휴원 | 가휴원 | 퇴원
```

- `실휴원` / `가휴원` 선택 시 `pause_start_date`, `pause_end_date` 입력창 표시
- 휴원 기간: 시작일은 과거 최대 1개월, 종료일은 시작일 기준 최대 1년
- 31일 초과 시 경고 알림: `window.checkDurationLimit()` 전역 함수로 처리

### 5. class_type (수업종류)

```
정규 | 특강 | 내신
```

- `특강` 선택 시 `special_start_date`, `special_end_date` 입력창 표시 (등원일 숨김)
- `정규` / `내신` 선택 시 등원일만 표시

### 6. 학교 + 학부 + 학년 축약 표시

```js
const abbreviateSchool = (s) => {
    const school = (s.school || '')
        .replace(/고등학교$/, '')
        .replace(/중학교$/, '')
        .replace(/초등학교$/, '')
        .replace(/학교$/, '')
        .trim();
    const levelShort = level === '초등' ? '초' : level === '중등' ? '중' : level === '고등' ? '고' : level;
    return `${school}${levelShort}${grade}`.trim() || '—';
};
```

- 프로필 상단 태그: `소속 · 학교축약형` 예: `2단지 · 진명여고2`

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

---

## Firestore 컬렉션 스키마

### students (컬렉션)

```
{
  name:                string,   // 이름
  level:               string,   // 학부 (초등/중등/고등)
  school:              string,   // 학교명
  grade:               string,   // 학년
  student_phone:       string,
  parent_phone_1:      string,   // docId 생성에 사용
  parent_phone_2:      string,
  branch:              string,   // 2단지 | 10단지 (자동 파생)
  level_code:          string,   // 학부기호 (예: HX)
  level_symbol:        string,   // 레벨기호 (예: 102)
  day:                 array,    // ["월", "수"] — 반드시 배열
  class_type:          string,   // 정규 | 특강 | 내신
  special_start_date:  string,   // 특강 시작일 YYYY-MM-DD (class_type=특강일 때만)
  special_end_date:    string,   // 특강 종료일 YYYY-MM-DD (class_type=특강일 때만)
  start_date:          string,   // 등원일 YYYY-MM-DD (class_type=정규/내신일 때)
  status:              string,   // 등원예정 | 재원 | 실휴원 | 가휴원 | 퇴원
  pause_start_date:    string,   // 휴원 시작일 (status=실/가휴원일 때만)
  pause_end_date:      string,   // 휴원 종료일 (status=실/가휴원일 때만)
}
```

### students/{docId}/memos (서브컬렉션)

```
{
  text:       string,     // 메모 전문
  created_at: Timestamp,  // 생성 시각
  author:     string,     // 작성자 이메일
}
```

### history_logs (컬렉션)

```
{
  doc_id:          string,
  change_type:     string,    // ENROLL | UPDATE | WITHDRAW
  before:          string,
  after:           string,
  google_login_id: string,
  timestamp:       Timestamp,
}
```

---

## 주요 전역 함수 (app.js)

| 함수 | 설명 |
|---|---|
| `window.handleLogin()` | Google 로그인/로그아웃 토글 |
| `window.selectStudent(id, data, el)` | 학생 선택 → 프로필 + 메모 로드 |
| `window.showNewStudentForm()` | 신규 등록 폼 표시 |
| `window.showEditForm()` | 정보 수정 폼 표시 (현재 선택 학생 pre-fill) |
| `window.hideForm()` | 폼 닫고 상세 뷰로 복귀 |
| `window.submitNewStudent()` | 등록/수정 저장 → Firestore + history_logs |
| `window.handleStatusChange(val)` | 상태 변경 시 휴원 기간 입력창 토글 |
| `window.handleClassTypeChange(val)` | 수업종류 변경 시 날짜 입력창 토글 |
| `window.handleLevelSymbolChange(val)` | 레벨기호 입력 시 소속(branch) 미리보기 |
| `window.checkDurationLimit()` | 휴원 기간 31일 초과 확인 + 알림 |
| `window.addMemo()` | 메모 추가 (prompt → Firestore) |
| `window.deleteMemo(studentId, memoId)` | 메모 삭제 (확인 다이얼로그) |
| `window.toggleMemo(memoId)` | 메모 카드 펼치기/접기 |
| `window.refreshStudents()` | 학생 목록 전체 재로드 |

---

## 완료된 기능 목록

- [x] Firebase Auth (Google 로그인) / `.env` 환경변수 관리
- [x] Firestore 연결 및 학생 목록 로드 + 검색 + 필터 (학부/소속/요일)
- [x] 학생 상세 프로필 뷰
- [x] 신규 등록 폼 + 정보 수정 폼 (Firestore 저장, history_logs 기록)
- [x] 실휴원 / 가휴원 상태 + 휴원 기간 날짜 입력 + 31일 초과 경고
- [x] 수업종류(정규/특강/내신) + 특강 기간 날짜 입력
- [x] 일요일 포함 월~일 요일 선택
- [x] 학교+학부+학년 축약 표시 (`진명여고2`)
- [x] 소속 자동 파생 (레벨기호 첫 자리 기반)
- [x] 다중 도메인 로그인 지원 (`gw.impact7.kr` 및 `impact7.kr`)
- [x] 날짜 포맷 통일 (YYYY-MM-DD)
- [x] 메모 카드 (추가, 접기/펼치기, 삭제, Firestore 서브컬렉션)

---

## 다음 작업 권장 목록 (우선순위 순)

### 1순위: Firestore 보안 강화
- `firestore.rules` 현재 개발용 오픈 규칙 (2026-03-23 만료)
- `auth.js`에서 `hd: 'gw.impact7.kr'` 도메인 제한 주석 해제 (현재 주석처리됨)
- 데이터 읽기/쓰기를 인증된 사용자(gw.impact7.kr 도메인)로만 제한

### 2순위: 이력 조회 탭
- 상세 패널에 탭 추가: [기본정보] [수업이력]
- `history_logs`에서 `doc_id == currentStudentId`로 쿼리
```js
import { query, where, orderBy } from 'firebase/firestore';
const q = query(
    collection(db, 'history_logs'),
    where('doc_id', '==', currentStudentId),
    orderBy('timestamp', 'desc')
);
```

### 3순위: 대량 export (Firestore → Google Sheets)
- GAS에 `pullFromFirestore()` 함수 추가
- Firestore REST API로 students 컬렉션 전체 조회 → 시트에 기록

### 4순위: 사이드바 필터 확장
- 현재: 학부(초/중/고), 소속(2단지/10단지), 요일(월~일)
- 추가 필요: 상태(재원/휴원/퇴원), 수업종류(정규/특강/내신)

---

## 주의사항

- `student_id` 필드는 Firestore에서 완전 삭제됨. 코드에서 참조하지 말 것
- `day` 필드는 반드시 배열 또는 `normalizeDays()`로 처리할 것
- 모든 쓰기 작업 후 `history_logs` 기록 필수
- `branch` 필드는 `branchFromSymbol(level_symbol)`로 자동 생성, 폼에 선택 UI 없음
- `.env` 파일은 git에 포함되지 않음. 새 환경 세팅 시 직접 생성 필요
