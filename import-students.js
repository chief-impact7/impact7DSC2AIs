/**
 * import-students.js
 * CSV → Firestore `students` 컬렉션 일괄 업로드 (enrollments[] 모델)
 *
 * docId: 이름_부모연락처숫자_branch
 * 같은 학생의 여러 CSV 행 → enrollments[] 배열로 병합
 *
 * Run: node import-students.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- RFC 4180 compliant CSV line parser ---
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { current += ch; }
        } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { result.push(current.trim()); current = ''; }
            else { current += ch; }
        }
    }
    result.push(current.trim());
    return result;
}

// --- 전화번호 정규화: 010XXXXXXXX → 10XXXXXXXX ---
function normalizePhone(raw) {
    let p = (raw || '').replace(/\D/g, '');
    if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
    return p;
}

// --- Firebase init (환경변수에서 읽기: node --env-file=.env import-students.js) ---
const firebaseConfig = {
    apiKey:            process.env.VITE_FIREBASE_API_KEY,
    authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- class_number 첫 자리 → branch 파생 ---
function branchFromClassNumber(num) {
    const first = (num || '').toString().trim().charAt(0);
    if (first === '1') return '2단지';
    if (first === '2') return '10단지';
    return '';
}

// --- docId: 이름_부모연락처숫자_branch ---
function makeDocId(name, phone, branch) {
    const p = normalizePhone(phone);
    return `${name}_${p}_${branch}`.replace(/\s+/g, '_');
}

// --- CSV 파싱 ---
async function parseCSV(filePath) {
    const rows = [];
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    let headers = null;

    for await (const line of rl) {
        if (!line.trim()) continue;
        const values = parseCSVLine(line);
        if (!headers) {
            headers = values.map(h => h.trim());
        } else {
            const raw = {};
            headers.forEach((h, i) => { raw[h] = (values[i] || '').trim(); });
            rows.push(raw);
        }
    }
    return rows;
}

// --- 기존 문서 전체 삭제 ---
async function clearCollection(colName) {
    const snap = await getDocs(collection(db, colName));
    if (snap.empty) return 0;
    const BATCH_SIZE = 499;
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += Math.min(BATCH_SIZE, snap.docs.length - i);
    }
    return deleted;
}

// --- Main ---
async function importStudents() {
    const csvPath = resolve(__dirname, 'students.csv');
    const rows = await parseCSV(csvPath);
    console.log(`CSV 행 수: ${rows.length}\n`);

    // 학생별 그룹핑 (같은 docId → enrollments[] 병합)
    const studentMap = {};

    for (const raw of rows) {
        const name = raw['이름'];
        const parentPhone = raw['학부모연락처1'] || raw['학생연락처'] || '';
        if (!name) continue;

        const classNumber = raw['레벨기호'] || '';   // CSV '레벨기호' = class_number
        const branch = raw['branch'] || branchFromClassNumber(classNumber);
        const docId = makeDocId(name, parentPhone, branch);

        // 요일: "월요일" → ["월"], "월,수" → ["월","수"]
        const dayRaw = raw['요일'] || '';
        const dayArr = dayRaw.split(/[,\s]+/)
            .map(d => d.replace(/요일$/, ''))
            .filter(d => d);

        const enrollment = {
            class_type: '정규',
            level_symbol: raw['학부기호'] || '',     // CSV '학부기호' = level_symbol
            class_number: classNumber,
            day: dayArr,
            start_date: raw['시작일'] || ''
        };

        if (!studentMap[docId]) {
            studentMap[docId] = {
                name,
                level: raw['학부'] || '',
                school: raw['학교'] || '',
                grade: raw['학년'] || '',
                student_phone: raw['학생연락처'] || '',
                parent_phone_1: parentPhone,
                parent_phone_2: raw['학부모연락처2'] || '',
                branch,
                status: raw['상태'] || '재원',
                enrollments: []
            };
        }

        const hasData = enrollment.level_symbol || enrollment.class_number
            || enrollment.start_date || dayArr.length > 0;
        if (hasData) {
            studentMap[docId].enrollments.push(enrollment);
        }
    }

    const entries = Object.entries(studentMap);
    console.log(`학생 수: ${entries.length}명\n`);

    // 기존 문서 삭제
    console.log('기존 문서 삭제 중...');
    const deleted = await clearCollection('students');
    console.log(`  삭제 완료: ${deleted}개\n`);

    // 배치 업로드
    const BATCH_SIZE = 499;
    let created = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const chunk = entries.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const [docId, student] of chunk) {
            batch.set(doc(db, 'students', docId), student);
            created++;
        }
        await batch.commit();
        console.log(`  Batch: ${i + 1}–${Math.min(i + BATCH_SIZE, entries.length)}`);
    }

    console.log(`\n완료. 업로드: ${created}명`);
    process.exit(0);
}

importStudents().catch(err => {
    console.error('Import 실패:', err.message);
    process.exit(1);
});
