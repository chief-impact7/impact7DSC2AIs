/**
 * dedup-students.js
 * docId 형식이 잘못된 문서(이름_전화번호_branch 아닌 것)를 찾아 삭제합니다.
 * 실행: node dedup-students.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

// 환경변수에서 읽기: node --env-file=.env dedup-students.js
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

console.log('Firestore에서 students 컬렉션 로딩 중...');
const snapshot = await getDocs(collection(db, 'students'));
const allDocs = snapshot.docs.map(d => ({ docId: d.id, ref: d.ref, ...d.data() }));

console.log(`총 문서 수: ${allDocs.length}`);

// 전화번호 정규화: 010XXXXXXXX → 10XXXXXXXX
function normalizePhone(raw) {
    let p = (raw || '').replace(/\D/g, '');
    if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
    return p;
}

// 삭제 대상: docId가 예상 형식(이름_전화번호_branch)과 다른 문서
const toDelete = allDocs.filter(d => {
    const phone = normalizePhone(d.parent_phone_1);
    const expected = `${d.name || ''}_${phone}_${d.branch || ''}`.replace(/\s+/g, '_');
    return d.docId !== expected;
});

console.log(`삭제 대상: ${toDelete.length}개 (잘못된 docId 문서)`);
console.log(`유지 대상: ${allDocs.length - toDelete.length}개\n`);

if (toDelete.length === 0) {
    console.log('정리 불필요 — 모든 문서 정상');
    process.exit(0);
}

// 삭제 전 목록 출력
toDelete.slice(0, 10).forEach(d => {
    const phone = normalizePhone(d.parent_phone_1);
    const expected = `${d.name}_${phone}_${d.branch}`.replace(/\s+/g, '_');
    console.log(`  삭제: "${d.docId}" (예상: "${expected}")`);
});
if (toDelete.length > 10) console.log(`  ... 외 ${toDelete.length - 10}건`);

// 배치 삭제 (최대 499개씩)
const BATCH_SIZE = 499;
let deleted = 0;

for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const chunk = toDelete.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(doc(db, 'students', d.docId)));
    await batch.commit();
    deleted += chunk.length;
    console.log(`  삭제 완료: ${deleted}/${toDelete.length}`);
}

console.log(`\n정리 완료. 남은 문서: ${allDocs.length - deleted}개`);
process.exit(0);
