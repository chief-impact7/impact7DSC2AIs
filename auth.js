import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();
// Restrict login to the academy's Google Workspace domain
provider.setCustomParameters({ hd: 'gw.impact7.kr' });

/**
 * Sign in via Google popup, restricted to gw.impact7.kr accounts.
 * @returns {Promise<Object>} Firebase user object
 */
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        console.log(`[AUTH SUCCESS] Logged in as: ${result.user.email}`);
        return result.user;
    } catch (error) {
        console.error('[AUTH ERROR] Google Sign-In failed:', error.code, error.message);
        throw error;
    }
};

/**
 * Sign out the current user.
 */
export const logout = async () => {
    try {
        await signOut(auth);
        console.log('[AUTH SUCCESS] User logged out.');
    } catch (error) {
        console.error('[AUTH ERROR] Logout failed:', error);
        throw error;
    }
};
