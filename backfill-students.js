/**
 * backfill-students.js
 * contacts에 있는 데이터로 students의 빈 필드를 채움
 *
 * 대상 필드: student_phone, parent_phone_2, guardian_name_1, guardian_name_2, first_registered
 * (students에 값이 비어있고 contacts에 값이 있으면 채움)
 *
 * Usage:
 *   node backfill-students.js              # dry-run
 *   node backfill-students.js --commit     # 실제 업데이트
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commit = process.argv.includes('--commit');

function initFirebase() {
    const saPath = resolve(__dirname, 'service-account.json');
    try {
        const sa = JSON.parse(readFileSync(saPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'impact7db' });
        console.log('Firebase Admin: service-account.json 으로 인증됨\n');
        return;
    } catch { /* file not found */ }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ projectId: 'impact7db' });
        return;
    }

    console.error('Error: service-account.json 필요');
    process.exit(1);
}
initFirebase();
const db = admin.firestore();

const BACKFILL_FIELDS = ['student_phone', 'parent_phone_2', 'guardian_name_1', 'guardian_name_2', 'first_registered'];

async function main() {
    console.log('students 로드 중...');
    const studentsSnap = await db.collection('students').get();
    console.log(`  students: ${studentsSnap.size}건`);

    console.log('contacts 로드 중...');
    const contactsSnap = await db.collection('contacts').get();
    const contactsMap = {};
    contactsSnap.forEach(d => { contactsMap[d.id] = d.data(); });
    console.log(`  contacts: ${Object.keys(contactsMap).length}건\n`);

    if (!commit) console.log('⚠️  DRY-RUN 모드\n');

    const updates = [];
    let noMatch = 0;

    studentsSnap.forEach(docSnap => {
        const student = docSnap.data();
        const contact = contactsMap[docSnap.id];
        if (!contact) { noMatch++; return; }

        const patch = {};
        for (const field of BACKFILL_FIELDS) {
            const sVal = (student[field] || '').trim();
            const cVal = (contact[field] || '').trim();
            if (!sVal && cVal) {
                patch[field] = cVal;
            }
        }

        if (Object.keys(patch).length > 0) {
            updates.push({ docId: docSnap.id, name: student.name, patch });
            const fields = Object.entries(patch).map(([k, v]) => `${k}="${v}"`).join(', ');
            console.log(`  ${student.name}: ${fields}`);
        }
    });

    console.log(`\n📊 결과:`);
    console.log(`  업데이트 대상: ${updates.length}명`);
    console.log(`  contacts 매칭 없음: ${noMatch}명`);
    console.log('');

    if (updates.length === 0) { console.log('채울 데이터가 없습니다.'); return; }
    if (!commit) { console.log('👉 실제 업데이트: node backfill-students.js --commit'); return; }

    const BATCH_SIZE = 200;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = db.batch();
        updates.slice(i, i + BATCH_SIZE).forEach(u => {
            batch.update(db.collection('students').doc(u.docId), u.patch);
        });
        await batch.commit();
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} 완료`);
    }

    console.log(`\n🎉 완료: ${updates.length}명 students 업데이트됨`);
}

main().catch(err => {
    console.error('❌ 오류:', err);
    process.exit(1);
});
