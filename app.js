import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config.js';
import { signInWithGoogle, logout } from './auth.js';
import { logHistory } from './userlog.js';

let currentUser = null;
let currentStudentId = null;

// ---------------------------------------------------------------------------
// Auth state — updates avatar and loads student list on login
// ---------------------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const avatarBtn = document.querySelector('.avatar');

    if (user) {
        avatarBtn.textContent = user.email[0].toUpperCase();
        avatarBtn.title = `Logged in as ${user.email} (click to logout)`;
        loadStudentList();
    } else {
        avatarBtn.textContent = 'G';
        avatarBtn.title = 'Login with Google';
        document.querySelector('.list-items').innerHTML =
            '<p style="padding:16px;color:var(--text-sec)">Please log in to view students.</p>';
    }
});

// ---------------------------------------------------------------------------
// Login / Logout toggle
// ---------------------------------------------------------------------------
window.handleLogin = async () => {
    try {
        if (currentUser) {
            await logout();
        } else {
            await signInWithGoogle();
        }
    } catch (error) {
        alert(`Authentication error: ${error.message}`);
    }
};

// ---------------------------------------------------------------------------
// Load student list from Firestore
// ---------------------------------------------------------------------------
async function loadStudentList() {
    const listContainer = document.querySelector('.list-items');
    listContainer.innerHTML = '<p style="padding:16px;color:var(--text-sec)">Loading...</p>';

    try {
        const snapshot = await getDocs(collection(db, 'students'));

        if (snapshot.empty) {
            listContainer.innerHTML =
                '<p style="padding:16px;color:var(--text-sec)">No students found.</p>';
            return;
        }

        listContainer.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const s = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <span class="material-symbols-outlined icon-btn drag-icon">drag_indicator</span>
                <div class="item-main">
                    <span class="item-title">${s.name}</span>
                    <span class="item-desc">- ${s.level} (${s.branch}) - ${s.status}</span>
                </div>
            `;
            div.addEventListener('click', () => selectStudent(docSnap.id, s.name));
            listContainer.appendChild(div);
        });
    } catch (error) {
        console.error('[FIRESTORE ERROR] Failed to load students:', error);
        listContainer.innerHTML =
            '<p style="padding:16px;color:red">Failed to load students.</p>';
    }
}

// ---------------------------------------------------------------------------
// Select a student — loads today's daily_flow from Firestore
// ---------------------------------------------------------------------------
window.selectStudent = async (studentId, studentName) => {
    currentStudentId = studentId;
    document.querySelector('.detail-title').textContent = studentName || studentId;

    // Highlight active row
    document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const today = new Date().toISOString().split('T')[0];
    const flowRef = doc(db, 'daily_flow', `${studentId}_${today}`);

    try {
        const flowSnap = await getDoc(flowRef);
        if (flowSnap.exists()) {
            const data = flowSnap.data();
            document.getElementById('checkinTime').value = data.check_in || '';
            document.getElementById('checkoutTime').value = data.check_out || '';

            const checkboxes = document.querySelectorAll('.checklist input[type="checkbox"]');
            checkboxes.forEach((cb, i) => {
                cb.checked = !!data[`task_${i + 1}_done`];
            });
        } else {
            // Clear form for fresh entry
            document.getElementById('checkinTime').value = '';
            document.getElementById('checkoutTime').value = '';
            document.querySelectorAll('.checklist input[type="checkbox"]')
                .forEach(cb => { cb.checked = false; });
        }
    } catch (error) {
        console.error('[FIRESTORE ERROR] Failed to load daily flow:', error);
    }
};

// ---------------------------------------------------------------------------
// Save daily flow — writes to daily_flow + history_logs (Rules.md §2)
// ---------------------------------------------------------------------------
window.saveDailyFlow = async () => {
    if (!currentUser) {
        alert('Please log in first.');
        return;
    }
    if (!currentStudentId) {
        alert('Please select a student first.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const flowRef = doc(db, 'daily_flow', `${currentStudentId}_${today}`);

    const checkboxes = document.querySelectorAll('.checklist input[type="checkbox"]');
    const tasks = {};
    checkboxes.forEach((cb, i) => { tasks[`task_${i + 1}_done`] = cb.checked; });

    const newData = {
        student_id: currentStudentId,
        date: today,
        check_in: document.getElementById('checkinTime').value,
        check_out: document.getElementById('checkoutTime').value,
        ...tasks,
        google_login_id: currentUser.email,
        timestamp: serverTimestamp()
    };

    try {
        // Capture before-state for the audit log
        const existingSnap = await getDoc(flowRef);
        const beforeData = existingSnap.exists() ? existingSnap.data() : {};

        await setDoc(flowRef, newData, { merge: true });

        // Mandatory audit log — Rules.md §2: every write records operator + timestamp
        await logHistory(
            currentStudentId,
            'daily_flow_update',
            beforeData,
            newData,
            currentUser.email
        );

        alert('Changes saved successfully!');
    } catch (error) {
        console.error('[FIRESTORE ERROR] Failed to save:', error);
        alert(`Save failed: ${error.message}`);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('[APP] Dashboard initialized.');
});
