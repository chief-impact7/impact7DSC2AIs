/**
 * upsert-students.js
 * CSV → Firestore `students` Upsert (Insert or Update)
 *
 * Uses firebase-admin SDK (bypasses security rules, uses project credentials)
 *
 * - New student (docId not in Firestore)      → INSERT
 * - Existing student with changes             → UPDATE (merge enrollments + update info)
 * - Existing student, no changes (duplicate)  → SKIP
 * - All INSERT/UPDATE actions logged to history_logs
 *
 * Usage:
 *   node upsert-students.js                     # live run
 *   node upsert-students.js --dry-run           # preview only
 *   node upsert-students.js --file new_data.csv # custom CSV file
 *
 * docId: 이름_부모연락처숫자_branch
 */

import admin from 'firebase-admin';
import { createReadStream, readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const fileIdx = args.indexOf('--file');
const csvFileName = fileIdx !== -1 && args[fileIdx + 1] ? args[fileIdx + 1] : 'students.csv';

if (DRY_RUN) console.log('🔍 DRY RUN 모드 — Firestore에 쓰지 않습니다.\n');

// --- Firebase Admin init ---
// Priority: 1) service-account.json  2) GOOGLE_APPLICATION_CREDENTIALS  3) CI token  4) Firebase CLI token
function initFirebase() {
    // 1) Local service account key file
    const saPath = resolve(__dirname, 'service-account.json');
    try {
        const sa = JSON.parse(readFileSync(saPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'impact7db' });
        console.log('Firebase Admin: service-account.json 으로 인증됨\n');
        return;
    } catch { /* file not found, try next */ }

    // 2) GOOGLE_APPLICATION_CREDENTIALS env var
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ projectId: 'impact7db' });
        console.log('Firebase Admin: GOOGLE_APPLICATION_CREDENTIALS 로 인증됨\n');
        return;
    }

    // 3) CI token (.firebase-ci-token file or FIREBASE_TOKEN env)
    const ciTokenPaths = [
        resolve(__dirname, '.firebase-ci-token'),
    ];
    const ciToken = process.env.FIREBASE_TOKEN
        || ciTokenPaths.reduce((t, p) => { try { return readFileSync(p, 'utf8').trim(); } catch { return t; } }, '');

    if (ciToken) {
        const adcPayload = {
            type: 'authorized_user',
            client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
            client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
            refresh_token: ciToken,
        };
        const adcPath = resolve(tmpdir(), '.firebase-adc-tmp.json');
        writeFileSync(adcPath, JSON.stringify(adcPayload));
        process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
        admin.initializeApp({ projectId: 'impact7db' });
        console.log('Firebase Admin: CI 토큰으로 인증됨\n');
        return;
    }

    console.error('❌ 인증 방법을 찾을 수 없습니다.');
    console.error('   1) service-account.json 파일을 프로젝트 폴더에 넣거나');
    console.error('   2) firebase login:ci 로 토큰 생성 후 .firebase-ci-token 에 저장');
    process.exit(1);
}

initFirebase();
const db = admin.firestore();

// --- Helpers ---

function branchFromClassNumber(num) {
    const first = (num || '').toString().trim().charAt(0);
    if (first === '1') return '2단지';
    if (first === '2') return '10단지';
    return '';
}

function makeDocId(name, phone, branch) {
    let p = (phone || '').replace(/\D/g, '');
    // 한국 전화번호 정규화: 010XXXXXXXX → 10XXXXXXXX (기존 데이터 형식에 맞춤)
    if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
    return `${name}_${p}_${branch}`.replace(/\s+/g, '_');
}

/** Enrollment identity key for dedup: class_type + level_symbol + class_number */
function enrollmentKey(e) {
    return `${e.class_type || '정규'}|${e.level_symbol || ''}|${e.class_number || ''}`;
}

/** Human-readable enrollment code: "HA104(정규)" */
function enrollmentCode(e) {
    const sym = e.level_symbol || '';
    const num = e.class_number || '';
    const ct = e.class_type && e.class_type !== '정규' ? `(${e.class_type})` : '';
    return `${sym}${num}${ct}`;
}

/** Compare two enrollment objects for equality (ignoring key order) */
function enrollmentsEqual(a, b) {
    if (enrollmentKey(a) !== enrollmentKey(b)) return false;
    const aDays = (a.day || []).slice().sort().join(',');
    const bDays = (b.day || []).slice().sort().join(',');
    if (aDays !== bDays) return false;
    if ((a.start_date || '') !== (b.start_date || '')) return false;
    if ((a.end_date || '') !== (b.end_date || '')) return false;
    return true;
}

/** Compare basic info fields between existing and new */
function diffBasicInfo(existing, incoming) {
    const fields = ['name', 'level', 'school', 'grade', 'student_phone',
                    'parent_phone_1', 'parent_phone_2', 'branch', 'status'];
    const changes = {};
    for (const f of fields) {
        const oldVal = (existing[f] || '').toString().trim();
        const newVal = (incoming[f] || '').toString().trim();
        if (newVal && newVal !== oldVal) {
            changes[f] = { old: oldVal, new: newVal };
        }
    }
    return changes;
}

/**
 * Merge new enrollments into existing enrollments.
 * - Same key (class_type+level_symbol+class_number) → update if different
 * - New key → add
 * Returns { merged: [...], added: [...], updated: [...] }
 */
function mergeEnrollments(existingArr, incomingArr) {
    const merged = existingArr.map(e => ({ ...e })); // deep copy
    const added = [];
    const updated = [];

    for (const inc of incomingArr) {
        const key = enrollmentKey(inc);
        const idx = merged.findIndex(e => enrollmentKey(e) === key);

        if (idx === -1) {
            // New enrollment — add it
            merged.push({ ...inc });
            added.push(inc);
        } else {
            // Existing enrollment — check if anything changed
            if (!enrollmentsEqual(merged[idx], inc)) {
                updated.push({ before: { ...merged[idx] }, after: { ...inc } });
                merged[idx] = { ...inc };
            }
            // else: exact match, skip
        }
    }

    return { merged, added, updated };
}

// --- CSV parsing ---
async function parseCSV(filePath) {
    const rows = [];
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    let headers = null;

    for await (const line of rl) {
        if (!line.trim()) continue;
        const values = line.split(',');
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

// --- Fetch all existing students ---
async function fetchExistingStudents() {
    const snap = await db.collection('students').get();
    const map = {};
    snap.forEach(d => { map[d.id] = d.data(); });
    return map;
}

// --- Main ---
async function upsertStudents() {
    const csvPath = resolve(__dirname, csvFileName);
    console.log(`CSV 파일: ${csvPath}`);
    const rows = await parseCSV(csvPath);
    console.log(`CSV 행 수: ${rows.length}\n`);

    // 1) Group CSV rows by docId (same student → merge enrollments)
    const studentMap = {};

    for (const raw of rows) {
        const name = raw['이름'];
        const parentPhone = raw['학부모연락처1'] || raw['학생연락처'] || '';
        if (!name) continue;

        const classNumber = raw['레벨기호'] || '';
        const branch = raw['branch'] || branchFromClassNumber(classNumber);
        const docId = makeDocId(name, parentPhone, branch);

        const dayRaw = raw['요일'] || '';
        const dayArr = dayRaw.split(/[,\s]+/)
            .map(d => d.replace(/요일$/, ''))
            .filter(d => d);

        const enrollment = {
            class_type: '정규',
            level_symbol: raw['학부기호'] || '',
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
    console.log(`CSV 학생 수: ${entries.length}명`);

    // 2) Fetch existing Firestore data
    console.log('Firestore 기존 데이터 로드 중...');
    const existing = await fetchExistingStudents();
    console.log(`기존 학생 수: ${Object.keys(existing).length}명\n`);

    // 3) Compare and classify
    const results = { inserted: [], updated: [], skipped: [] };
    const writes = [];    // { docId, data, type: 'set'|'update' }
    const logEntries = []; // history_log records

    for (const [docId, incoming] of entries) {
        const ex = existing[docId];

        if (!ex) {
            // ── INSERT: new student ──
            results.inserted.push(docId);
            writes.push({ docId, data: incoming, type: 'set' });
            logEntries.push({
                doc_id: docId,
                change_type: 'ENROLL',
                before: '—',
                after: `신규 등록: ${incoming.name} (${incoming.enrollments.map(enrollmentCode).join(', ') || '수업없음'})`,
            });
        } else {
            // ── Existing student: check for differences ──
            const infoDiff = diffBasicInfo(ex, incoming);

            // REPLACE enrollments — 새 데이터가 현재 상태를 나타냄
            const oldCodes = (ex.enrollments || []).map(enrollmentCode).sort().join(',');
            const newCodes = (incoming.enrollments || []).map(enrollmentCode).sort().join(',');
            const enrollChanged = oldCodes !== newCodes;

            const hasInfoChange = Object.keys(infoDiff).length > 0;

            if (!hasInfoChange && !enrollChanged) {
                results.skipped.push(docId);
                continue;
            }

            const updateData = {};
            for (const [field, val] of Object.entries(infoDiff)) {
                updateData[field] = val.new;
            }
            if (enrollChanged) {
                updateData.enrollments = incoming.enrollments;
            }

            results.updated.push({ docId, infoDiff, oldCodes, newCodes, enrollChanged });
            writes.push({ docId, data: updateData, type: 'merge' });

            const beforeParts = [];
            const afterParts = [];
            for (const [field, val] of Object.entries(infoDiff)) {
                beforeParts.push(`${field}:${val.old || '—'}`);
                afterParts.push(`${field}:${val.new}`);
            }
            if (enrollChanged) {
                beforeParts.push(`수업: ${oldCodes || '—'}`);
                afterParts.push(`수업: ${newCodes}`);
            }

            logEntries.push({
                doc_id: docId,
                change_type: 'UPDATE',
                before: beforeParts.join(', ') || '—',
                after: afterParts.join(', '),
            });
        }
    }

    // 4) Report
    console.log('━'.repeat(50));
    console.log(`📥 INSERT (신규):  ${results.inserted.length}명`);
    console.log(`📝 UPDATE (변경):  ${results.updated.length}명`);
    console.log(`⏭️  SKIP   (동일):  ${results.skipped.length}명`);
    console.log('━'.repeat(50));

    if (results.inserted.length > 0) {
        console.log('\n🆕 신규 학생:');
        for (const docId of results.inserted) {
            const s = studentMap[docId];
            console.log(`  + ${s.name} (${docId}) — ${s.enrollments.map(enrollmentCode).join(', ') || '수업없음'}`);
        }
    }

    if (results.updated.length > 0) {
        console.log('\n✏️  변경 학생:');
        for (const { docId, infoDiff, oldCodes, newCodes, enrollChanged } of results.updated) {
            const parts = [];
            for (const [field, val] of Object.entries(infoDiff)) {
                parts.push(`${field}: "${val.old}" → "${val.new}"`);
            }
            if (enrollChanged) parts.push(`수업: ${oldCodes || '—'} → ${newCodes}`);
            console.log(`  ~ ${docId}: ${parts.join(', ')}`);
        }
    }

    // 5) Write to Firestore (unless dry run)
    if (DRY_RUN) {
        console.log('\n🔍 DRY RUN 완료. Firestore에 기록되지 않았습니다.');
        process.exit(0);
    }

    if (writes.length === 0) {
        console.log('\n변경사항 없음. 종료.');
        process.exit(0);
    }

    console.log(`\nFirestore 기록 중... (${writes.length} writes + ${logEntries.length} logs)`);

    const BATCH_SIZE = 249; // each write = 1 student + 1 log = 2 ops, keep under 500
    for (let i = 0; i < writes.length; i += BATCH_SIZE) {
        const chunk = writes.slice(i, i + BATCH_SIZE);
        const logChunk = logEntries.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const w of chunk) {
            const ref = db.collection('students').doc(w.docId);
            if (w.type === 'set') {
                batch.set(ref, w.data);
            } else {
                batch.set(ref, w.data, { merge: true });
            }
        }

        for (const log of logChunk) {
            const logRef = db.collection('history_logs').doc();
            batch.set(logRef, {
                ...log,
                google_login_id: 'system@import',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} students written`);
    }

    console.log(`\n✅ 완료. INSERT: ${results.inserted.length}, UPDATE: ${results.updated.length}, SKIP: ${results.skipped.length}`);
    process.exit(0);
}

upsertStudents().catch(err => {
    console.error('Upsert 실패:', err.message);
    process.exit(1);
});
