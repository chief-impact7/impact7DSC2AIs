/**
 * cleanup-enrollments.js
 * Firestore students 컬렉션에서 start_date가 "2/25"인 enrollment 항목을 일괄 삭제
 *
 * Usage:
 *   node cleanup-enrollments.js              # dry-run (미리보기)
 *   node cleanup-enrollments.js --commit     # 실제 삭제
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commit = process.argv.includes('--commit');

// Firebase Admin 초기화 (upsert-students.js와 동일 패턴)
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

const mode = process.argv[2]; // 'enrollments' | 'grades' | undefined

async function main() {
    if (mode === 'grades') {
        await cleanupGrades();
    } else {
        await cleanupEnrollments();
    }
}

// --- grade 정리: 숫자가 아닌 grade 값을 순수 숫자로 변환 ---
async function cleanupGrades() {
    console.log('\n🔍 비정상 grade 값 검색 중...\n');
    if (!commit) console.log('⚠️  DRY-RUN 모드 (실제 수정하려면 --commit 추가)\n');

    const snapshot = await db.collection('students').get();
    const updates = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const grade = data.grade;
        if (grade === undefined || grade === null || grade === '') return;

        const cleaned = String(grade).replace(/[^0-9]/g, '');
        if (String(grade) !== cleaned) {
            updates.push({ docId: docSnap.id, name: data.name || '(이름없음)', from: grade, to: cleaned || '' });
            console.log(`  ${data.name || docSnap.id}: "${grade}" → "${cleaned || '(빈값)'}"`);
        }
    });

    console.log(`\n📊 총 ${updates.length}건 비정상 grade 발견\n`);

    if (updates.length === 0) { console.log('✅ 수정할 항목 없음'); return; }
    if (!commit) { console.log('👉 실제 수정하려면: node cleanup-enrollments.js grades --commit'); return; }

    const BATCH_SIZE = 200;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = db.batch();
        updates.slice(i, i + BATCH_SIZE).forEach(u => {
            batch.update(db.collection('students').doc(u.docId), { grade: u.to });
        });
        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} 완료`);
    }
    console.log(`\n🎉 완료: ${updates.length}건 grade 수정됨`);
}

// --- enrollment 정리: start_date="2/25" 삭제 ---
async function cleanupEnrollments() {
    const TARGET_START_DATE = '2/25';
    console.log(`\n🔍 start_date="${TARGET_START_DATE}" enrollment 검색 중...\n`);
    if (!commit) console.log('⚠️  DRY-RUN 모드 (실제 삭제하려면 --commit 추가)\n');

    const snapshot = await db.collection('students').get();
    let totalFound = 0;
    let totalDocs = 0;
    const updates = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const enrollments = data.enrollments || [];
        const filtered = enrollments.filter(e => e.start_date !== TARGET_START_DATE);
        const removed = enrollments.length - filtered.length;

        if (removed > 0) {
            totalFound += removed;
            totalDocs++;
            updates.push({ docId: docSnap.id, name: data.name || '(이름없음)', before: enrollments.length, after: filtered.length, removed, filtered });
            console.log(`  ${data.name || docSnap.id}: ${enrollments.length}개 → ${filtered.length}개 (${removed}개 삭제)`);
        }
    });

    console.log(`\n📊 총 ${totalDocs}명의 문서에서 ${totalFound}개 enrollment 대상\n`);
    if (totalFound === 0) { console.log('✅ 삭제할 항목 없음'); return; }
    if (!commit) { console.log('👉 실제 삭제하려면: node cleanup-enrollments.js --commit'); return; }

    const BATCH_SIZE = 200;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = db.batch();
        updates.slice(i, i + BATCH_SIZE).forEach(u => {
            batch.update(db.collection('students').doc(u.docId), { enrollments: u.filtered });
        });
        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} 완료 (${updates.slice(i, i + BATCH_SIZE).length}건)`);
    }
    console.log(`\n🎉 완료: ${totalDocs}명 문서에서 ${totalFound}개 enrollment 삭제됨`);
}

main().catch(err => {
    console.error('❌ 오류:', err);
    process.exit(1);
});
