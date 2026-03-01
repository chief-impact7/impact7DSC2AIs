/**
 * migrate-has-memo.js
 * 기존 students 문서에 has_memo 필드를 추가합니다.
 * memos 서브컬렉션이 1개 이상이면 has_memo: true, 없으면 has_memo: false
 *
 * Firebase CLI 토큰을 사용하므로 service-account.json이 필요 없습니다.
 * 먼저 `firebase login`으로 로그인되어 있어야 합니다.
 *
 * Usage:
 *   node migrate-has-memo.js              # dry-run (미리보기)
 *   node migrate-has-memo.js --run        # 실제 적용
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--run');

if (DRY_RUN) {
    console.log('DRY RUN 모드 — 실제로 Firestore에 쓰지 않습니다.');
    console.log('실제 적용하려면: node migrate-has-memo.js --run\n');
} else {
    console.log('LIVE 모드 — Firestore에 실제로 씁니다.\n');
}

// --- Firebase Admin init (Firebase CLI 토큰 사용) ---
function initFirebase() {
    // 1) service-account.json 시도
    try {
        const saPath = resolve('service-account.json');
        const sa = JSON.parse(readFileSync(saPath, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'impact7db' });
        console.log('Firebase Admin: service-account.json 으로 인증됨\n');
        return;
    } catch { /* try next */ }

    // 2) Firebase CLI 리프레시 토큰 사용
    try {
        const configPath = resolve(homedir(), '.config/configstore/firebase-tools.json');
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        const refreshToken = config.tokens?.refresh_token;
        if (refreshToken) {
            admin.initializeApp({
                credential: admin.credential.refreshToken({
                    type: 'authorized_user',
                    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
                    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
                    refresh_token: refreshToken,
                }),
                projectId: 'impact7db',
            });
            console.log('Firebase Admin: Firebase CLI 토큰으로 인증됨\n');
            return;
        }
    } catch { /* try next */ }

    // 3) GOOGLE_APPLICATION_CREDENTIALS
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ projectId: 'impact7db' });
        console.log('Firebase Admin: GOOGLE_APPLICATION_CREDENTIALS 로 인증됨\n');
        return;
    }

    console.error('오류: Firebase 인증 정보를 찾을 수 없습니다.');
    console.error('`firebase login`으로 먼저 로그인하세요.');
    process.exit(1);
}

initFirebase();
const db = admin.firestore();

async function migrate() {
    console.log('students 컬렉션 로드 중...');
    const snap = await db.collection('students').get();
    console.log(`전체 학생 수: ${snap.size}명\n`);

    let hasMemo = 0;
    let noMemo = 0;
    let alreadySet = 0;

    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const studentId = docSnap.id;

        // 이미 has_memo 필드가 있으면 스킵
        if (typeof data.has_memo === 'boolean') {
            alreadySet++;
            continue;
        }

        // memos 서브컬렉션에 문서가 있는지 확인 (1개만 가져옴)
        const memoSnap = await db.collection('students').doc(studentId).collection('memos').limit(1).get();
        const hasMemos = !memoSnap.empty;

        if (hasMemos) {
            hasMemo++;
            console.log(`  ✓ ${data.name || studentId} → has_memo: true`);
        } else {
            noMemo++;
        }

        if (!DRY_RUN) {
            batch.update(docSnap.ref, { has_memo: hasMemos });
            batchCount++;

            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                console.log(`  [batch commit: ${batchCount}건]`);
                batch = db.batch();
                batchCount = 0;
            }
        }
    }

    // 남은 배치 커밋
    if (!DRY_RUN && batchCount > 0) {
        await batch.commit();
        console.log(`  [batch commit: ${batchCount}건]`);
    }

    console.log('\n--- 결과 ---');
    console.log(`메모 있음 (has_memo: true):  ${hasMemo}명`);
    console.log(`메모 없음 (has_memo: false): ${noMemo}명`);
    console.log(`이미 설정됨 (스킵):          ${alreadySet}명`);
    console.log(`총 업데이트 대상:            ${hasMemo + noMemo}명`);

    if (DRY_RUN) {
        console.log('\n※ DRY RUN이었습니다. 실제 적용하려면: node migrate-has-memo.js --run');
    } else {
        console.log('\n✅ 마이그레이션 완료!');
    }

    process.exit(0);
}

migrate().catch(e => {
    console.error('마이그레이션 실패:', e);
    process.exit(1);
});
