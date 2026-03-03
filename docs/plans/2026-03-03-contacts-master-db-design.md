# Contacts 마스터 DB 설계

## 목적

15년간 축적된 약 16,000건의 학생/학부모 데이터를 Firestore `contacts` 컬렉션에 통합하여:
1. 복귀 학생 기본정보 재입력 방지
2. 전체 누적 데이터 한곳에서 검색/조회
3. 학기 초 데이터 준비 간소화
4. 등원/퇴원/재등원 이력 일견 파악

## 아키텍처

```
같은 Firestore (impact7db 프로젝트)
├── contacts         ← 16,000건 마스터 (기본 인적정보 + 등퇴원 이력)
├── students         ← 재원생 관리 (학기별 수업/출결/메모)
├── daily_checks     ← 일일 체크 (impact7DSC)
├── daily_records    ← 일일 기록 (impact7DSC)
└── ...
```

- `contacts`: 학생의 영구적 기본정보 + 등퇴원 타임라인
- `students`: 현재/최근 학기 재원생의 수업 상세 (enrollments, status 등)
- 두 컬렉션은 같은 Firestore에 있으므로 impact7DB, impact7DSC 모두 접근 가능

## contacts 문서 구조

```
docId: "{name}_{parent_phone_1_normalized}"
예: "김민준_1012345678"

{
  name: string              // 학생이름 (필수)
  student_phone: string     // 학생연락처
  parent_phone_1: string    // 부모연락처1 (필수)
  parent_phone_2: string    // 부모연락처2
  guardian_name_1: string   // 보호자명1 (신규 필드)
  guardian_name_2: string   // 보호자명2 (신규 필드)
  school: string            // 학교
  grade: string             // 학년
  level: string             // 학부 (초등/중등/고등)
  first_registered: string  // 최초등록일 (상담/등록) YYYY-MM-DD
  first_attended: string    // 첫등원일 (첫 반배정) YYYY-MM-DD
  status_history: [         // 등원/퇴원 이력 타임라인
    {
      type: string          // '등원' | '퇴원' | '재등원'
      date: string          // YYYY-MM-DD
      class_code: string    // 해당 시점의 반코드 (예: HA101)
      reason: string        // 퇴원 사유 (퇴원일 때만)
    }
  ]
  created_at: timestamp     // contacts DB 최초 등록 시각
  updated_at: timestamp     // 마지막 수정 시각
}
```

## UI 표시 예시

```
김민준 (현재: 재원 · HS101)
──────────────────────────────────
최초등록: 2020-02-15 (상담)
첫등원:   2020-03-01
──────────────────────────────────
[등원]   2020-03  HA101
[퇴원]   2020-12  HA103  사유: 타학원 이동
         ── 1년 3개월 공백 ──
[재등원] 2022-03  I201
[퇴원]   2023-06  AX202  사유: 유학
         ── 1년 7개월 공백 ──
[재등원] 2025-01  HS101 ~ 현재
```

## 연동 흐름

### 1. 최초 16,000건 임포트
- 엑셀 → CSV 변환 → 임포트 스크립트로 contacts에 일괄 업로드
- 엑셀의 `등록일` → `first_registered`로 매핑
- status_history는 엑셀 데이터에서 가능한 범위 내로 초기화

### 2. 학생 신규 등록 시 (앱에서)
- 이름/연락처 입력 → contacts에서 자동 검색
- 매칭되면: 기본정보 자동 채움 (학교, 학년, 보호자명 등)
- 매칭 안 되면: 새로 입력 → students + contacts 동시 생성
- contacts.status_history에 '등원' 이벤트 자동 추가

### 3. 학생 퇴원 시
- students에서 퇴원 처리
- contacts.status_history에 '퇴원' 이벤트 + 사유 자동 추가

### 4. 학기 초 CSV 업로드 시
- CSV의 학생을 contacts에서 매칭 → 빠진 기본정보 자동 보완
- 신규 학생은 contacts에도 자동 추가

### 5. 학년 자동 승격 (매년 3월)
- contacts + students 모두에서 grade +1
- 학부(level) 자동 변경: 초6→중1(중등), 중3→고1(고등)
- 승격 스크립트 또는 앱 내 일괄 승격 기능

### 6. 검색 기능
- contacts에서 이름/연락처/학교로 검색
- 검색 결과에 status_history 타임라인 표시
- 현재 재원 중이면 students 데이터(수업 상세)도 함께 표시

## Firestore 보안 규칙

```
match /contacts/{docId} {
  allow read: if isAuthorized();

  allow create: if isAuthorized()
    && request.resource.data.keys().hasAll(['name', 'parent_phone_1'])
    && request.resource.data.name is string
    && request.resource.data.name.size() > 0
    && withinFieldLimit(20);

  allow update: if isAuthorized()
    && withinFieldLimit(20);

  allow delete: if isAuthorized();
}
```

## 학년 승격 로직

```
매년 3월 실행:
  grade 매핑:
    "초1" → "초2", ..., "초5" → "초6"
    "초6" → "중1" (level도 "초등" → "중등")
    "중1" → "중2", "중2" → "중3"
    "중3" → "고1" (level도 "중등" → "고등")
    "고1" → "고2", "고2" → "고3"
    "고3" → "졸업"
```

## 구현 범위

### Phase 1: 기반 구축
- contacts 컬렉션 Firestore 보안 규칙 추가
- 엑셀 → contacts 임포트 스크립트 작성
- 16,000건 일괄 업로드

### Phase 2: 앱 연동
- 학생 등록 폼에 contacts 자동 검색/채움 추가
- 학생 퇴원 시 contacts status_history 자동 업데이트
- 학생 상세 뷰에 contacts 이력 타임라인 표시

### Phase 3: 학년 승격
- 일괄 학년 승격 기능 (contacts + students)
- 매년 3월 실행하는 버튼 또는 자동 트리거

### Phase 4: 검색/조회
- contacts 전용 검색 UI (16,000건 대상)
- 검색 결과에 등퇴원 타임라인 + 현재 상태 표시
