// core/auth.js
import { auth, googleProvider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// 구글 로그인 함수
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user; // 로그인된 사용자 정보 반환
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

// 로그아웃 함수
export const logout = () => signOut(auth);

// 현재 로그인 상태 감시 (UI 업데이트용)
export const getCurrentUser = (callback) => {
  onAuthStateChanged(auth, callback);
};