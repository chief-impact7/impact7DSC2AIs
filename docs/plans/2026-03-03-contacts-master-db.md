# Contacts 마스터 DB 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 16,000건 학생/학부모 데이터를 `contacts` 마스터 DB로 통합하여, 학생 등록 시 자동 채움, 등퇴원 이력 추적, 학년 자동 승격을 구현한다.

**Architecture:** 기존 `students` 컬렉션과 별개로 `contacts` 컬렉션을 추가. contacts는 영구적 인적정보 + 등퇴원 타임라인을 담고, students는 현재 학기 수업 관리를 담당. 두 컬렉션은 같은 docId 패턴(`이름_연락처`)으로 연결.

**Tech Stack:** Firebase/Firestore, Vanilla JS (app.js), Vite 빌드, firebase-admin SDK (임포트 스크립트)

---

## Task 1: Firestore 보안 규칙 — contacts 컬렉션 추가

**Files:**
- Modify: `firestore.rules` (teachers 규칙 뒤, 기본 거부 앞에 추가)

**Step 1: contacts 컬렉션 보안 규칙 추가**

`firestore.rules`의 `match /teachers/{email}` 블록 뒤, `match /{document=**}` 블록 앞에 추가:

```javascript
    // =========================================================================
    // [MASTER] Contacts (학생 마스터 DB — 16,000건 기본 인적정보)
    // =========================================================================
    match /contacts/{docId} {

      function hasRequiredContactFields() {
        let data = request.resource.data;
        return data.keys().hasAll(['name', 'parent_phone_1'])
          && data.name is string
          && data.name.size() > 0
          && data.parent_phone_1 is string
          && data.parent_phone_1.size() > 0;
      }

      function hasOnlyAllowedContactFields() {
        let allowed = [
          'name', 'student_phone', 'parent_phone_1', 'parent_phone_2',
          'guardian_name_1', 'guardian_name_2',
          'school', 'grade', 'level',
          'first_registered', 'first_attended',
          'status_history',
          'created_at', 'updated_at'
        ];
        return request.resource.data.keys().hasOnly(allowed);
      }

      allow read: if isAuthorized();

      allow create: if isAuthorized()
        && hasRequiredContactFields()
        && hasOnlyAllowedContactFields()
        && withinFieldLimit(20);

      allow update: if isAuthorized()
        && hasRequiredContactFields()
        && hasOnlyAllowedContactFields()
        && withinFieldLimit(20);

      allow delete: if isAuthorized();
    }
```

**Step 2: 규칙 배포**

```bash
npx firebase deploy --only firestore:rules
```

Expected: `✔ firestore: released rules firestore.rules to cloud.firestore`

**Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add contacts collection security rules for master DB"
```

---

## Task 2: 엑셀 → contacts 임포트 스크립트

**Files:**
- Create: `import-contacts.js`

**Step 1: 임포트 스크립트 작성**

엑셀에서 CSV 변환 후 사용하는 스크립트. firebase-admin SDK 사용 (보안 규칙 우회).

```javascript
/**
 * import-contacts.js
 * 엑셀 CSV → Firestore `contacts` 일괄 업로드
 *
 * CSV 헤더: 학생이름, 학생휴대폰, 부모휴대폰1, 부모휴대폰2, 보호자명1, 보호자명2, 학교, 학년, 등록일
 *
 * Usage:
 *   node import-contacts.js                        # dry-run
 *   node import-contacts.js --execute              # 실제 업로드
 *   node import-contacts.js --file custom.csv      # 커스텀 CSV
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const fileArg = process.argv.find(a => a.startsWith('--file'));
const CSV_FILE = fileArg ? fileArg.split('=')[1] || process.argv[process.argv.indexOf('--file') + 1] : 'contacts.csv';

// Firebase Admin init
function initFirebase() {
    const saPath = resolve(__dirname, 'service-account.json');
    try {
        const sa = JSON.parse(readFileSync(saPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'impact7db' });
        return;
    } catch { /* fallback */ }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ projectId: 'impact7db' });
        return;
    }
    console.error('Error: No Firebase credentials found.');
    process.exit(1);
}

initFirebase();
const db = admin.firestore();

// Phone normalization (010XXXXXXXX → 10XXXXXXXX)
function normalizePhone(raw) {
    let phone = (raw || '').replace(/\D/g, '');
    if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
    return phone;
}

function makeDocId(name, parentPhone) {
    const phone = normalizePhone(parentPhone);
    return `${name}_${phone}`.replace(/\s+/g, '_');
}

// Grade → Level 매핑
function levelFromGrade(grade) {
    if (!grade) return '';
    if (grade.startsWith('초')) return '초등';
    if (grade.startsWith('중')) return '중등';
    if (grade.startsWith('고')) return '고등';
    return '';
}

// RFC 4180 CSV parser
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else current += ch;
        } else {
            if (ch === '"') inQuotes = true;
            else if (ch === ',') { result.push(current.trim()); current = ''; }
            else current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

async function importContacts() {
    console.log(`📂 CSV 파일: ${CSV_FILE}`);
    if (!EXECUTE) console.log('🔍 DRY RUN 모드 — --execute 플래그로 실제 실행\n');

    const raw = readFileSync(resolve(__dirname, CSV_FILE), 'utf8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { console.error('CSV가 비어있습니다.'); process.exit(1); }

    const headers = parseCSVLine(lines[0]);
    console.log(`헤더: ${headers.join(', ')}`);

    // 헤더 매핑
    const fieldMap = {
        '학생이름': 'name', '이름': 'name',
        '학생휴대폰': 'student_phone', '학생연락처': 'student_phone',
        '부모휴대폰1': 'parent_phone_1', '학부모연락처1': 'parent_phone_1', '학부모연락처': 'parent_phone_1',
        '부모휴대폰2': 'parent_phone_2', '학부모연락처2': 'parent_phone_2',
        '보호자명1': 'guardian_name_1', '보호자명': 'guardian_name_1',
        '보호자명2': 'guardian_name_2',
        '학교': 'school',
        '학년': 'grade',
        '등록일': 'first_registered',
    };

    const colMap = {};
    headers.forEach((h, i) => {
        const key = fieldMap[h.trim()];
        if (key) colMap[key] = i;
    });

    if (colMap.name === undefined || colMap.parent_phone_1 === undefined) {
        console.error('필수 헤더 누락: 학생이름, 부모휴대폰1 (또는 학부모연락처1)');
        process.exit(1);
    }

    // Parse rows
    const contacts = {};
    let skippedRows = 0;

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const get = (field) => (colMap[field] !== undefined ? (cols[colMap[field]] || '').trim() : '');

        const name = get('name');
        const parentPhone1 = get('parent_phone_1');
        if (!name || !parentPhone1) { skippedRows++; continue; }

        const docId = makeDocId(name, parentPhone1);
        if (contacts[docId]) continue; // 중복 건너뜀

        const grade = get('grade');
        contacts[docId] = {
            name,
            student_phone: normalizePhone(get('student_phone')),
            parent_phone_1: normalizePhone(parentPhone1),
            parent_phone_2: normalizePhone(get('parent_phone_2')),
            guardian_name_1: get('guardian_name_1'),
            guardian_name_2: get('guardian_name_2'),
            school: get('school'),
            grade,
            level: levelFromGrade(grade),
            first_registered: get('first_registered'),
            first_attended: '',
            status_history: [],
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
    }

    const entries = Object.entries(contacts);
    console.log(`\n파싱 완료: ${entries.length}건 (건너뜀: ${skippedRows}행)\n`);

    // 기존 contacts 확인
    console.log('기존 contacts 문서 확인 중...');
    const existing = {};
    const snapshot = await db.collection('contacts').get();
    snapshot.forEach(doc => { existing[doc.id] = true; });
    console.log(`기존 contacts: ${Object.keys(existing).length}건\n`);

    const toInsert = entries.filter(([id]) => !existing[id]);
    const toSkip = entries.filter(([id]) => existing[id]);

    console.log(`📥 신규: ${toInsert.length}건`);
    console.log(`⏭️  기존 (건너뜀): ${toSkip.length}건`);

    if (toInsert.length > 0) {
        console.log(`\n🆕 신규 (처음 20건):`);
        for (const [docId, data] of toInsert.slice(0, 20)) {
            console.log(`  + ${data.name} (${docId}) — ${data.school} ${data.grade}`);
        }
        if (toInsert.length > 20) console.log(`  ... 외 ${toInsert.length - 20}건`);
    }

    if (!EXECUTE) {
        console.log('\n🔍 DRY RUN 완료. 실행: node import-contacts.js --execute');
        process.exit(0);
    }

    // Batch write
    const BATCH_SIZE = 400;
    let written = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const chunk = toInsert.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const [docId, data] of chunk) {
            batch.set(db.collection('contacts').doc(docId), data);
        }
        await batch.commit();
        written += chunk.length;
        console.log(`  Batch: ${written}/${toInsert.length}`);
    }

    console.log(`\n✅ 완료. 업로드: ${written}건`);
    process.exit(0);
}

importContacts().catch(err => {
    console.error('Import 실패:', err.message);
    process.exit(1);
});
```

**Step 2: 테스트 (dry-run)**

```bash
node import-contacts.js --file contacts.csv
```

Expected: 파싱 결과 출력, Firestore 기록 없음

**Step 3: 실행**

```bash
node import-contacts.js --file contacts.csv --execute
```

Expected: 16,000건 업로드 완료

**Step 4: Commit**

```bash
git add import-contacts.js
git commit -m "feat: add contacts import script for 16K master DB"
```

---

## Task 3: students 필드 추가 — guardian_name_1/2

**Files:**
- Modify: `firestore.rules` — students 허용 필드에 `guardian_name_1`, `guardian_name_2` 추가
- Modify: `index.html` — 학생 등록/수정 폼에 보호자명 입력 필드 추가
- Modify: `app.js` — 저장 로직에 guardian_name 포함, 상세 뷰에 보호자명 표시

**Step 1: firestore.rules — students 허용 필드 추가**

`hasOnlyAllowedStudentFields()` 함수의 `allowed` 배열에 추가:

```javascript
let allowed = [
    'name', 'level', 'school', 'grade',
    'student_phone', 'parent_phone_1', 'parent_phone_2',
    'guardian_name_1', 'guardian_name_2',  // ← 추가
    'branch', 'status', 'enrollments',
    'pause_start_date', 'pause_end_date',
    'day', 'class_type', 'level_code', 'level_symbol', 'class_number',
    'start_date', 'special_start_date', 'special_end_date',
    'has_memo'
];
```

**Step 2: index.html — 연락처 카드에 보호자명 입력 추가**

연락처 카드(Contact card)에 `parent_phone_1`, `parent_phone_2` 필드 아래 보호자명 필드 추가. 정확한 위치는 index.html의 연락처 섹션.

**Step 3: app.js — 저장/표시 로직 수정**

- `saveStudent()`: studentData에 `guardian_name_1`, `guardian_name_2` 추가
- `selectStudent()`: 상세 뷰에 보호자명 표시
- `showEditForm()`: 편집 시 보호자명 값 채우기

**Step 4: 배포 및 Commit**

```bash
npx vite build && npx firebase deploy --only firestore:rules,hosting
git add firestore.rules index.html app.js
git commit -m "feat: add guardian_name fields to student form and detail view"
```

---

## Task 4: 학생 등록 시 contacts 자동 검색/채움

**Files:**
- Modify: `app.js` — 등록 폼에서 이름+연락처 입력 시 contacts 검색, 자동 채움

**Step 1: contacts 검색 함수 추가**

app.js에 contacts 컬렉션 검색 함수 추가:

```javascript
// contacts 마스터 DB에서 학생 검색 (이름 + 부모연락처로 매칭)
async function searchContacts(name, parentPhone) {
    const docId = makeDocId(name, parentPhone);
    const docSnap = await getDoc(doc(db, 'contacts', docId));
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    return null;
}
```

**Step 2: 등록 폼에 자동 채움 트리거 추가**

`parent_phone_1` 필드에 `blur` 이벤트 리스너 추가. 이름과 연락처가 모두 입력되면 contacts 검색 후 매칭 시 나머지 필드 자동 채움:

```javascript
// 등록 폼 — 부모연락처 입력 후 contacts 자동 검색
async function tryAutoFillFromContacts() {
    const form = document.getElementById('student-form');
    const name = form.name.value.trim();
    const phone = form.parent_phone_1.value.trim();
    if (!name || !phone) return;

    const contact = await searchContacts(name, phone);
    if (!contact) return;

    // 자동 채움 (빈 필드만)
    const fillIfEmpty = (field, value) => {
        if (value && !form[field]?.value?.trim()) form[field].value = value;
    };
    fillIfEmpty('student_phone', contact.student_phone);
    fillIfEmpty('parent_phone_2', contact.parent_phone_2);
    fillIfEmpty('guardian_name_1', contact.guardian_name_1);
    fillIfEmpty('guardian_name_2', contact.guardian_name_2);
    fillIfEmpty('school', contact.school);
    fillIfEmpty('grade', contact.grade);
    if (contact.level) form.level.value = contact.level;

    // 안내 표시
    showToast(`📋 마스터 DB에서 "${name}" 정보를 불러왔습니다.`);
}
```

**Step 3: 학생 저장 시 contacts 동시 생성/업데이트**

`saveStudent()` 함수 내에서 학생 저장 성공 후 contacts 문서도 업데이트:

```javascript
// 학생 저장 후 contacts 마스터 DB 동기화
async function syncToContacts(docId, studentData) {
    const contactRef = doc(db, 'contacts', docId);
    const contactSnap = await getDoc(contactRef);

    const contactUpdate = {
        name: studentData.name,
        student_phone: studentData.student_phone || '',
        parent_phone_1: studentData.parent_phone_1,
        parent_phone_2: studentData.parent_phone_2 || '',
        guardian_name_1: studentData.guardian_name_1 || '',
        guardian_name_2: studentData.guardian_name_2 || '',
        school: studentData.school || '',
        grade: studentData.grade || '',
        level: studentData.level || '',
        updated_at: serverTimestamp(),
    };

    if (!contactSnap.exists()) {
        // 신규 contacts 생성
        contactUpdate.first_registered = new Date().toISOString().slice(0, 10);
        contactUpdate.first_attended = studentData.enrollments?.[0]?.start_date || '';
        contactUpdate.status_history = [
            { type: '등원', date: new Date().toISOString().slice(0, 10), class_code: enrollmentCode(studentData.enrollments?.[0]) || '' }
        ];
        contactUpdate.created_at = serverTimestamp();
    }

    await setDoc(contactRef, contactUpdate, { merge: true });
}
```

**Step 4: Commit**

```bash
npx vite build && npx firebase deploy --only hosting
git add app.js
git commit -m "feat: auto-fill from contacts on registration, sync on save"
```

---

## Task 5: 퇴원 시 contacts status_history 자동 업데이트

**Files:**
- Modify: `app.js` — 퇴원 처리 함수들에 contacts 업데이트 추가

**Step 1: contacts 퇴원 이력 추가 함수**

```javascript
// contacts에 퇴원 이벤트 추가
async function addContactWithdrawal(studentId, classCode, reason) {
    const contactRef = doc(db, 'contacts', studentId);
    const contactSnap = await getDoc(contactRef);
    if (!contactSnap.exists()) return;

    const data = contactSnap.data();
    const history = data.status_history || [];
    history.push({
        type: '퇴원',
        date: new Date().toISOString().slice(0, 10),
        class_code: classCode || '',
        reason: reason || '',
    });

    await setDoc(contactRef, { status_history: history, updated_at: serverTimestamp() }, { merge: true });
}
```

**Step 2: 퇴원 사유 입력 UI 추가**

퇴원 처리 모달에 사유 입력 필드 추가 (간단한 text input 또는 select):

```html
<label>퇴원 사유</label>
<select id="withdraw-reason">
    <option value="">선택</option>
    <option value="타학원 이동">타학원 이동</option>
    <option value="이사">이사</option>
    <option value="유학">유학</option>
    <option value="성적 불만">성적 불만</option>
    <option value="비용 문제">비용 문제</option>
    <option value="기타">기타</option>
</select>
<input type="text" id="withdraw-reason-text" placeholder="기타 사유 입력" style="display:none">
```

**Step 3: confirmEndEnrollmentSingle(), confirmEndClass()에 연동**

퇴원 처리 로직에서 `addContactWithdrawal()` 호출 추가. 학생의 마지막 수업이 종료되어 status가 '퇴원'으로 변경될 때 실행.

**Step 4: 재등원 시 contacts 이벤트 추가**

기존에 퇴원 상태였던 학생에게 새 enrollment 추가 시, contacts에 '재등원' 이벤트 추가.

**Step 5: Commit**

```bash
npx vite build && npx firebase deploy --only hosting
git add app.js index.html
git commit -m "feat: auto-track withdrawal/re-enrollment in contacts history"
```

---

## Task 6: 학생 상세 뷰 — contacts 이력 타임라인 표시

**Files:**
- Modify: `index.html` — 상세 뷰에 이력 타임라인 섹션 추가
- Modify: `app.js` — contacts 데이터 로드 후 타임라인 렌더링

**Step 1: index.html — 타임라인 섹션 추가**

학생 상세 뷰(detail panel)의 enrollment 카드 아래에 타임라인 섹션 추가:

```html
<div id="contact-timeline" class="card" style="display:none">
    <h3 style="font-size:0.9em;color:var(--text-sec)">등퇴원 이력</h3>
    <div id="timeline-content"></div>
</div>
```

**Step 2: app.js — 타임라인 렌더링 함수**

```javascript
async function renderContactTimeline(studentId) {
    const container = document.getElementById('contact-timeline');
    const content = document.getElementById('timeline-content');
    if (!container || !content) return;

    const contactSnap = await getDoc(doc(db, 'contacts', studentId));
    if (!contactSnap.exists()) { container.style.display = 'none'; return; }

    const data = contactSnap.data();
    const history = data.status_history || [];

    if (history.length === 0 && !data.first_registered) {
        container.style.display = 'none';
        return;
    }

    let html = '';

    // 최초등록일 / 첫등원일
    if (data.first_registered) {
        html += `<div class="timeline-header">최초등록: ${data.first_registered}</div>`;
    }
    if (data.first_attended) {
        html += `<div class="timeline-header">첫등원: ${data.first_attended}</div>`;
    }

    // 이력 타임라인
    for (let i = 0; i < history.length; i++) {
        const e = history[i];
        const typeClass = e.type === '퇴원' ? 'withdraw' : 'enroll';
        const reasonText = e.reason ? ` — 사유: ${e.reason}` : '';
        html += `<div class="timeline-item ${typeClass}">`;
        html += `<span class="timeline-type">[${e.type}]</span> `;
        html += `<span class="timeline-date">${e.date}</span> `;
        html += `<span class="timeline-class">${e.class_code || ''}</span>`;
        html += `<span class="timeline-reason">${reasonText}</span>`;
        html += `</div>`;

        // 공백 기간 계산
        if (e.type === '퇴원' && i + 1 < history.length) {
            const gap = monthsBetween(e.date, history[i + 1].date);
            if (gap) html += `<div class="timeline-gap">── ${gap} 공백 ──</div>`;
        }
    }

    content.innerHTML = html;
    container.style.display = '';
}
```

**Step 3: selectStudent()에서 호출**

`selectStudent()` 함수 끝에 `renderContactTimeline(studentId)` 호출 추가.

**Step 4: CSS 스타일 추가**

타임라인 스타일을 index.html의 `<style>` 섹션에 추가.

**Step 5: Commit**

```bash
npx vite build && npx firebase deploy --only hosting
git add app.js index.html
git commit -m "feat: show contacts enrollment/withdrawal timeline in detail view"
```

---

## Task 7: 학년 자동 승격 기능

**Files:**
- Modify: `app.js` — 학년 승격 함수 + UI 버튼 추가
- Modify: `index.html` — 승격 버튼 추가

**Step 1: 학년 승격 로직**

```javascript
const GRADE_PROMOTION = {
    '초1': '초2', '초2': '초3', '초3': '초4', '초4': '초5', '초5': '초6',
    '초6': '중1', // level도 변경: 초등 → 중등
    '중1': '중2', '중2': '중3',
    '중3': '고1', // level도 변경: 중등 → 고등
    '고1': '고2', '고2': '고3',
    '고3': '졸업',
};

const LEVEL_CHANGE = { '초6': '중등', '중3': '고등' };

window.promoteAllGrades = async function () {
    if (!confirm('전체 학생의 학년을 1단계 승격합니다.\n(초6→중1, 중3→고1 포함)\n\n진행하시겠습니까?')) return;

    const batch = writeBatch(db);
    let promoted = 0, skipped = 0;

    // students 승격
    for (const s of allStudents) {
        const newGrade = GRADE_PROMOTION[s.grade];
        if (!newGrade) { skipped++; continue; }
        const update = { grade: newGrade };
        if (LEVEL_CHANGE[s.grade]) update.level = LEVEL_CHANGE[s.grade];
        batch.update(doc(db, 'students', s.id), update);

        // contacts도 동기화
        batch.update(doc(db, 'contacts', s.id), {
            grade: newGrade,
            level: LEVEL_CHANGE[s.grade] || s.level || '',
            updated_at: serverTimestamp(),
        });

        promoted++;
    }

    await batch.commit();
    alert(`✅ 학년 승격 완료\n승격: ${promoted}명\n건너뜀: ${skipped}명`);
    await loadStudentList();
};
```

참고: 실제 구현 시 batch 500개 제한 고려하여 분할 필요.

**Step 2: UI — 승격 버튼 추가**

설정/관리 메뉴에 "학년 일괄 승격" 버튼 추가.

**Step 3: Commit**

```bash
npx vite build && npx firebase deploy --only hosting
git add app.js index.html
git commit -m "feat: add grade promotion for all students and contacts"
```

---

## Task 8: contacts 검색 UI

**Files:**
- Modify: `index.html` — contacts 검색 모달 추가
- Modify: `app.js` — 검색 로직 (이름/연락처/학교)

**Step 1: 검색 모달 HTML**

```html
<div id="contacts-search-modal" style="display:none">
    <input type="text" id="contacts-search-input" placeholder="이름, 연락처, 학교로 검색...">
    <div id="contacts-search-results"></div>
</div>
```

**Step 2: 검색 로직**

- 이름 검색: Firestore `where` 쿼리 사용 (정확 일치 + 부분 일치)
- 연락처 검색: `parent_phone_1` 또는 `student_phone`으로 검색
- 검색 결과에 status_history 요약 표시
- 결과 클릭 시: students에 있으면 상세 뷰, 없으면 등록 폼에 자동 채움

**Step 3: UI 진입점 — 사이드바에 "마스터 DB 검색" 버튼 추가**

**Step 4: Commit**

```bash
npx vite build && npx firebase deploy --only hosting
git add app.js index.html
git commit -m "feat: add contacts master DB search UI"
```

---

## Task 9: CSV 업로드 시 contacts 연동

**Files:**
- Modify: `app.js` — `runUpsertFromRows()` 함수에서 contacts 자동 매칭/동기화

**Step 1: CSV 업로드 후 contacts 동기화**

`runUpsertFromRows()` 함수의 Firestore 기록 단계에서, 각 학생 저장 시 `syncToContacts()` 도 호출하여 contacts 마스터 DB도 업데이트.

**Step 2: 신규 학생(insert)은 contacts에도 자동 추가**

**Step 3: Commit**

```bash
npx vite build && npx firebase deploy --only hosting
git add app.js
git commit -m "feat: sync contacts on CSV/Sheet upsert"
```

---

## 구현 순서 요약

| 순서 | Task | 설명 | 의존 |
|:---:|:---:|------|:---:|
| 1 | Task 1 | Firestore 보안 규칙 추가 | — |
| 2 | Task 2 | 임포트 스크립트 + 16,000건 업로드 | Task 1 |
| 3 | Task 3 | guardian_name 필드 추가 | — |
| 4 | Task 4 | 등록 시 contacts 자동 검색/채움 | Task 1 |
| 5 | Task 5 | 퇴원 시 contacts 이력 업데이트 | Task 4 |
| 6 | Task 6 | 상세 뷰 타임라인 표시 | Task 4 |
| 7 | Task 7 | 학년 자동 승격 | Task 1 |
| 8 | Task 8 | contacts 검색 UI | Task 4 |
| 9 | Task 9 | CSV 업로드 연동 | Task 4 |
