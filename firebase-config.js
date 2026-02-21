import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCb2DKuKVjYevqDlmeL3qa07jSE5azm8Nw",
    authDomain: "impact7db.firebaseapp.com",
    projectId: "impact7db",
    storageBucket: "impact7db.firebasestorage.app",
    messagingSenderId: "485669859162",
    appId: "1:485669859162:web:2cfe866520c0b8f3f74d63"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
