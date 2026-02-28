/**
 * migrate-semester.js
 * 기존 Firestore students 컬렉션의 모든 enrollments에
 * semester 필드가 없으면 지정한 학기명을 추가합니다.
 *
 * Usage:
 *   node migrate-semester.js                        # dry-run (미리보기)
 *   node migrate-semester.js --run                  # 실제 적용
 *   node migrate-semester.js --run --semester 2026winter  # 학기명 지정
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--run');
const semIdx = args.indexOf('--semester');
const SEMESTER = semIdx !== -1 && args[semIdx + 1] ? args[semIdx + 1] : '2026winter';

console.log(`학기명: "${SEMESTER}"`);
if (DRY_RUN) {
    console.log('DRY RUN 모드 — 실제로 Firestore에 쓰지 않습니다.');
    console.log('실제 적용하려면: node migrate-semester.js --run\n');
} else {
    console.log('LIVE 모드 — Firestore에 실제로 씁니다.\n');
}

// --- Firebase Admin init ---
function initFirebase() {
    const saPath = resolve(__dirname, 'service-account.json');
    try {
        const sa = JSON.parse(readFileSync(saPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'impact7db' });
        console.log('Firebase Admin: service-account.json 으로 인증됨\n');
        return;
    } catch { /* try next */ }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ projectId: 'impact7db' });
        console.log('Firebase Admin: GOOGLE_APPLICATION_CREDENTIALS 로 인증됨\n');
        return;
    }

    console.error('오류: Firebase 인증 정보를 찾을 수 없습니다.');
    console.error('service-account.json 파일을 프로젝트 루트에 두거나');
    console.error('GOOGLE_APPLICATION_CREDENTIALS 환경변수를 설정하세요.');
    process.exit(1);
}

initFirebase();
const db = admin.firestore();

async function migrateSemester() {
    console.log('students 컬렉션 로드 중...');
    const snap = await db.collection('students').get();
    console.log(`전체 학생 수: ${snap.size}명\n`);

    let needUpdate = 0;
    let alreadyDone = 0;
    let noEnrollments = 0;

    const batch_size = 400;
    let batchNum = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const enrollments = data.enrollments;

        if (!enrollments || enrollments.length === 0) {
            noEnrollments++;
            continue;
        }

        // semester 필드가 없는 enrollment가 하나라도 있으면 업데이트 대상
        const needsFix = enrollments.some(e => !e.semester);

        if (!needsFix) {
            alreadyDone++;
            continue;
        }

        // semester 필드가 없는 항목에만 추가 (이미 있는 건 유지)
        const updated = enrollments.map(e => ({
            ...e,
            semester: e.semester || SEMESTER,
        }));

        needUpdate++;

        if (DRY_RUN) {
            const name = data.name || docSnap.id;
            const fixed = updated.filter((e, i) => !enrollments[i].semester);
            console.log(`  [예정] ${name} — ${fixed.length}개 enrollment에 semester 추가`);
        } else {
            batch.update(docSnap.ref, { enrollments: updated });
            batchCount++;

            if (batchCount >= batch_size) {
                await batch.commit();
                batchNum++;
                console.log(`  Batch ${batchNum} 완료 (${batchCount}건)`);
                batch = db.batch();
                batchCount = 0;
            }
        }
    }

    // 남은 배치 처리
    if (!DRY_RUN && batchCount > 0) {
        await batch.commit();
        batchNum++;
        console.log(`  Batch ${batchNum} 완료 (${batchCount}건)`);
    }

    console.log('\n' + '━'.repeat(50));
    console.log(`업데이트 대상:  ${needUpdate}명`);
    console.log(`이미 완료:      ${alreadyDone}명`);
    console.log(`수업 없음:      ${noEnrollments}명`);
    console.log('━'.repeat(50));

    if (DRY_RUN) {
        console.log('\nDRY RUN 완료. 실제 적용하려면 --run 옵션을 추가하세요.');
    } else {
        console.log(`\n완료. ${needUpdate}명의 학생 데이터에 semester: "${SEMESTER}" 추가됨.`);
    }

    process.exit(0);
}

migrateSemester().catch(err => {
    console.error('마이그레이션 실패:', err.message);
    process.exit(1);
});
