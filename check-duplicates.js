/**
 * check-duplicates.js
 * Firestore students 컬렉션에서 중복 및 데이터 이상을 리포트합니다.
 * 실행: node check-duplicates.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// 환경변수에서 읽기: node --env-file=.env check-duplicates.js
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

const snapshot = await getDocs(collection(db, 'students'));
const docs = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));

console.log(`\n총 Firestore 문서 수: ${docs.length}\n`);

// 1) 이름 기준 중복 확인
const byName = {};
docs.forEach(d => {
    const key = d.name || '(이름없음)';
    if (!byName[key]) byName[key] = [];
    byName[key].push(d);
});

const nameDups = Object.entries(byName).filter(([, arr]) => arr.length > 1);
console.log(`▶ 이름 중복: ${nameDups.length}건`);
nameDups.forEach(([name, arr]) => {
    console.log(`  "${name}" → ${arr.length}개 문서`);
    arr.forEach(d => console.log(`    docId: ${d.docId} | branch: ${d.branch} | enrollments: ${(d.enrollments || []).length}개`));
});

// 2) docId 형식 점검 (이름_전화번호_branch)
function normalizePhone(raw) {
    let p = (raw || '').replace(/\D/g, '');
    if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
    return p;
}

const badDocId = docs.filter(d => {
    const phone = normalizePhone(d.parent_phone_1);
    const expected = `${d.name || ''}_${phone}_${d.branch || ''}`.replace(/\s+/g, '_');
    return d.docId !== expected;
});

console.log(`\n▶ docId 형식 불일치: ${badDocId.length}건`);
badDocId.slice(0, 10).forEach(d => {
    const phone = normalizePhone(d.parent_phone_1);
    const expected = `${d.name}_${phone}_${d.branch}`.replace(/\s+/g, '_');
    console.log(`  실제: "${d.docId}" ≠ 예상: "${expected}"`);
});
if (badDocId.length > 10) console.log(`  ... 외 ${badDocId.length - 10}건`);

// 3) enrollments 상태 확인
let withEnroll = 0, withoutEnroll = 0;
docs.forEach(d => {
    if (d.enrollments && Array.isArray(d.enrollments) && d.enrollments.length > 0) withEnroll++;
    else withoutEnroll++;
});
console.log(`\n▶ enrollments 현황: 있음 ${withEnroll}명 | 없음 ${withoutEnroll}명`);

process.exit(0);
