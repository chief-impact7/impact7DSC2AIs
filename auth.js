import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();

// 도메인 제한: 학원 Google Workspace 계정만 허용
// 개발/테스트 중 다른 계정으로 로그인하려면 아래 줄을 주석 처리하세요
// provider.setCustomParameters({ hd: 'gw.impact7.kr' });

/**
 * Google 팝업 로그인
 * @returns {Promise<Object>} Firebase user 객체
 */
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        console.log(`[AUTH SUCCESS] 로그인 성공: ${result.user.email}`);
        return result.user;
    } catch (error) {
        console.error('[AUTH ERROR]', error.code, error.message);
        throw error;
    }
};

/**
 * 로그아웃
 */
export const logout = async () => {
    try {
        await signOut(auth);
        console.log('[AUTH SUCCESS] 로그아웃 완료');
    } catch (error) {
        console.error('[AUTH ERROR] 로그아웃 실패:', error);
        throw error;
    }
};
