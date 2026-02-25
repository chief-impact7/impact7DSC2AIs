import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();
// Drive 읽기 권한 — Google Picker에서 시트 선택용
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

// 도메인 제한: hd 파라미터는 단일 도메인만 지원하므로 사용하지 않음.
// 실제 도메인 검증은 app.js onAuthStateChanged 내부(클라이언트)와
// firestore.rules isAuthorized()(서버)에서 이중으로 처리함.
// provider.setCustomParameters({ hd: 'gw.impact7.kr' }); // 단일 도메인만 가능

/** Google OAuth access token (Drive Picker용) */
export let googleAccessToken = null;

/**
 * Google 팝업 로그인
 * @returns {Promise<Object>} Firebase user 객체
 */
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        // OAuth access token 저장 (Google Picker에서 사용)
        const credential = GoogleAuthProvider.credentialFromResult(result);
        googleAccessToken = credential?.accessToken || null;
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
