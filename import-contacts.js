/**
 * import-contacts.js
 * CSV → Firestore `contacts` 컬렉션 일괄 업로드 (firebase-admin SDK)
 *
 * - students에 이미 있는 학생은 건너뜀 (students 데이터가 최신)
 * - name이 없거나 parent_phone_1이 #N/A/빈값인 행은 건너뜀
 * - 같은 docId의 여러 행은 첫 행의 기본정보 사용
 *
 * Usage:
 *   node import-contacts.js                        # dry-run
 *   node import-contacts.js --commit               # 실제 업로드
 *   node import-contacts.js --commit --include-students  # students 포함 (전체)
 */

import admin from 'firebase-admin';
import { createReadStream, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commit = process.argv.includes('--commit');
const includeStudents = process.argv.includes('--include-students');

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

function normalizePhone(raw) {
    let p = (raw || '').replace(/\D/g, '');
    if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
    return p;
}

function makeDocId(name, phone) {
    const p = normalizePhone(phone);
    return `${name}_${p}`.replace(/\s+/g, '_');
}

function isInvalid(val) {
    if (!val) return true;
    const v = val.trim();
    return v === '' || v === '#N/A' || v === 'N/A' || v === '#REF!' || v === '#ERROR!';
}

// --- Firebase Admin init (service-account.json) ---
function initFirebase() {
    const saPath = resolve(__dirname, 'service-account.json');
    try {
        const sa = JSON.parse(readFileSync(saPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'impact7db' });
        console.log('Firebase Admin: service-account.json 으로 인증됨\n');
        return;
    } catch { /* file not found, try next */ }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ projectId: 'impact7db' });
        console.log('Firebase Admin: GOOGLE_APPLICATION_CREDENTIALS 로 인증됨\n');
        return;
    }

    console.error('Error: service-account.json 또는 GOOGLE_APPLICATION_CREDENTIALS 필요');
    process.exit(1);
}
initFirebase();
const db = admin.firestore();

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

// --- Main ---
async function main() {
    const csvPath = resolve(__dirname, 'contacts-raw.csv');
    const rows = await parseCSV(csvPath);
    console.log(`CSV 행 수: ${rows.length}`);

    // 1) students 컬렉션의 docId 목록 로드
    console.log('students 컬렉션 로드 중...');
    const studentsSnap = await db.collection('students').get();
    const studentDocIds = new Set();
    studentsSnap.forEach(d => studentDocIds.add(d.id));
    console.log(`  students 문서 수: ${studentDocIds.size}\n`);

    // 2) CSV → contacts 맵 구축
    const contactMap = {};
    let skippedNoName = 0;
    let skippedNoPhone = 0;
    let skippedInStudents = 0;
    let duplicateRows = 0;

    for (const raw of rows) {
        const name = raw['name'] || '';
        if (!name) { skippedNoName++; continue; }

        const parentPhone = raw['parent_phone_1'] || '';
        if (isInvalid(parentPhone)) { skippedNoPhone++; continue; }

        const docId = makeDocId(name, parentPhone);

        // students에 이미 있으면 건너뜀
        if (!includeStudents && studentDocIds.has(docId)) {
            skippedInStudents++;
            continue;
        }

        // 같은 docId가 이미 있으면 (같은 학생의 다른 enrollment 행) 건너뜀
        if (contactMap[docId]) {
            duplicateRows++;
            continue;
        }

        const clean = (v) => isInvalid(v) ? '' : v.trim();

        contactMap[docId] = {
            name,
            level: clean(raw['level']),
            school: clean(raw['school']),
            grade: clean(raw['grade']),
            student_phone: clean(raw['student_phone']),
            parent_phone_1: clean(raw['parent_phone_1']),
            parent_phone_2: clean(raw['parent_phone_2']),
            guardian_name_1: clean(raw['guardian_name_1']),
            guardian_name_2: clean(raw['guardian_name_2']),
            first_registered: clean(raw['first_registered']),
            status_history: [],
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
    }

    const entries = Object.entries(contactMap);
    console.log(`📊 결과:`);
    console.log(`  contacts 대상: ${entries.length}명`);
    console.log(`  건너뜀 — 이름 없음: ${skippedNoName}`);
    console.log(`  건너뜀 — 연락처 없음/무효: ${skippedNoPhone}`);
    console.log(`  건너뜀 — students에 존재: ${skippedInStudents}`);
    console.log(`  건너뜀 — 중복 행: ${duplicateRows}`);
    console.log('');

    if (entries.length === 0) {
        console.log('업로드할 데이터가 없습니다.');
        return;
    }

    if (!commit) {
        console.log('샘플 5건:');
        entries.slice(0, 5).forEach(([id, c]) => {
            console.log(`  ${id}: ${c.name} / ${c.level} / ${c.school} / ${c.grade} / ${c.first_registered}`);
        });
        console.log(`\n👉 실제 업로드하려면: node import-contacts.js --commit`);
        return;
    }

    // 배치 업로드
    const BATCH_SIZE = 499;
    let created = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const chunk = entries.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const [docId, contact] of chunk) {
            batch.set(db.collection('contacts').doc(docId), contact);
            created++;
        }
        await batch.commit();
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length}건`);
    }

    console.log(`\n🎉 완료: ${created}건 contacts 업로드됨`);
}

main().catch(err => {
    console.error('❌ 오류:', err);
    process.exit(1);
});
