// core/userlog.js
import { serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db, auth } from "./firebase.js";

/**
 * 데이터를 저장하고 동시에 history_logs에 기록을 남기는 통합 함수
 * @param {string} colName - 컬렉션 이름 (예: 'students')
 * @param {object} data - 저장할 데이터
 */
export const secureWrite = async (colName, data) => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error("로그인이 필요합니다. (Authentication Required)");
  }

  const logData = {
    ...data,
    google_login_id: user.email, // 수정자 이메일
    timestamp: serverTimestamp()  // 서버 시간
  };

  // 1. 실제 데이터 저장 (예: students 컬렉션에 추가)
  const docRef = await addDoc(collection(db, colName), logData);

  // 2. 이력을 별도 history_logs 컬렉션에도 남김 (rules.md 준수)
  await addDoc(collection(db, "history_logs"), {
    action_type: "CREATE",
    target_collection: colName,
    target_id: docRef.id,
    google_login_id: user.email,
    timestamp: serverTimestamp(),
    payload: data // 변경된 원본 내용
  });

  return docRef.id;
};