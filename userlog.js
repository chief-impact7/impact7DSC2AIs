/**
 * userlog.js — Mandatory audit middleware (Rules.md §2)
 *
 * Every Firestore write operation in this project MUST go through logHistory()
 * to record the operator's google_login_id and timestamp in history_logs.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase-config.js';

/**
 * Writes a record to the history_logs collection.
 *
 * @param {string} studentId      - The affected student's ID
 * @param {string} changeType     - e.g. 'daily_flow_update', 'status_change'
 * @param {Object} before         - Data snapshot before the change
 * @param {Object} after          - Data snapshot after the change
 * @param {string} googleLoginId  - Operator's Google email (from Firebase Auth)
 */
export const logHistory = async (studentId, changeType, before, after, googleLoginId) => {
    await addDoc(collection(db, 'history_logs'), {
        student_id: studentId,
        change_type: changeType,
        before,
        after,
        google_login_id: googleLoginId,
        timestamp: serverTimestamp()
    });
};
