import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config.js';
import { signInWithGoogle, logout } from './auth.js';

let currentUser = null;
let currentStudentId = null;
let allStudents = [];
let activeFilter = { type: 'all', value: null };
let isEditMode = false;

// 학부기호 + 레벨기호 → 반기호 (예: HA + 101 = HA101)
const classCode = (s) => `${s.level_code || ''}${s.level_symbol || ''}`;

// 레벨기호 쪸 번째 숫자로 단지 자동 파생: '1xx' → '2단지', '2xx' → '10단지'
const branchFromSymbol = (sym) => {
    const first = (sym || '').trim()[0];
    if (first === '1') return '2단지';
    if (first === '2') return '10단지';
    return '';
};

// 학교명 축약 표시 (예: 진명여자고등학교 고등 2학년 → 진명여고2)
const abbreviateSchool = (s) => {
    // 더 긴 접미사를 먼저 체크해야 부분 일치 오류를 제거할 수 있음
    const school = (s.school || '')
        .replace(/고등학교$/, '')
        .replace(/중학교$/, '')
        .replace(/초등학교$/, '')
        .replace(/학교$/, '')
        .trim();
    const level = (s.level || '');
    const levelShort = level === '초등' ? '초' : level === '중등' ? '중' : level === '고등' ? '고' : level;
    const grade = s.grade ? `${s.grade}` : '';
    return `${school}${levelShort}${grade}`.trim() || '—';
};

// day 필드 정규화 → 배열 (예: "월요일" → ["월"], ["월","수"] → ["월","수"])
const normalizeDays = (day) => {
    if (!day) return [];
    if (Array.isArray(day)) return day.map(d => d.replace('요일', '').trim());
    return day.split(/[,·\s]+/).map(d => d.replace('요일', '').trim()).filter(Boolean);
};

// day 배열 → 표시용 문자열 (예: ["월","수"] → "월, 수")
const displayDays = (day) => {
    const days = normalizeDays(day);
    return days.length ? days.join(', ') : 'N/A';
};

const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '?') return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// ---------------------------------------------------------------------------
// Auth state
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
        updateCount(null);
    }
});

// ---------------------------------------------------------------------------
// Login / Logout
// ---------------------------------------------------------------------------
window.handleLogin = async () => {
    try {
        if (currentUser) await logout();
        else await signInWithGoogle();
    } catch (error) {
        const messages = {
            'auth/api-key-not-valid': '❌ API 키 오류 — Firebase Console에서 API 키를 확인하세요',
            'auth/unauthorized-domain': '❌ 인증되지 않은 도메인 — Firebase Auth > 승인된 도메인에 localhost를 추가하세요',
            'auth/popup-blocked': '❌ 팝업이 차단됨 — 브라우저에서 팝업을 허용해주세요',
            'auth/popup-closed-by-user': '팝업이 닫혔습니다. 다시 시도하세요.',
            'auth/cancelled-popup-request': '이미 로그인 팝업이 열려 있습니다.',
        };
        const msg = messages[error.code] || `❌ 로그인 실패: ${error.code}`;
        console.error('[AUTH ERROR]', error.code, error.message);
        alert(msg);
    }
};

// ---------------------------------------------------------------------------
// Load all students from Firestore, sort by name (Korean-aware)
// ---------------------------------------------------------------------------
async function loadStudentList() {
    const listContainer = document.querySelector('.list-items');
    listContainer.innerHTML = '<p style="padding:16px;color:var(--text-sec)">Loading...</p>';

    try {
        const snapshot = await getDocs(collection(db, 'students'));
        allStudents = [];
        snapshot.forEach((docSnap) => {
            allStudents.push({ id: docSnap.id, ...docSnap.data() });
        });
        allStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
        applyFilterAndRender();
    } catch (error) {
        console.error('[FIRESTORE ERROR] Failed to load students:', error);
        listContainer.innerHTML = '<p style="padding:16px;color:red">Failed to load students.</p>';
    }
}

window.refreshStudents = loadStudentList;

// ---------------------------------------------------------------------------
// Filter + search then render
// ---------------------------------------------------------------------------
function applyFilterAndRender() {
    let filtered = allStudents;

    if (activeFilter.type === 'level') {
        filtered = filtered.filter(s => s.level === activeFilter.value);
    } else if (activeFilter.type === 'branch') {
        filtered = filtered.filter(s => s.branch === activeFilter.value);
    } else if (activeFilter.type === 'day') {
        filtered = filtered.filter(s => normalizeDays(s.day).includes(activeFilter.value));
    }

    const term = document.getElementById('studentSearchInput')?.value.trim().toLowerCase() || '';
    if (term) {
        filtered = filtered.filter(s =>
            (s.name && s.name.toLowerCase().includes(term)) ||
            (s.school && s.school.toLowerCase().includes(term)) ||
            (s.student_phone && s.student_phone.includes(term)) ||
            (s.parent_phone_1 && s.parent_phone_1.includes(term)) ||
            classCode(s).toLowerCase().includes(term)   // 반기호로도 검색
        );
    }

    renderStudentList(filtered);
}

function renderStudentList(students) {
    const listContainer = document.querySelector('.list-items');
    listContainer.innerHTML = '';
    updateCount(students.length);

    if (students.length === 0) {
        listContainer.innerHTML = '<p style="padding:16px;color:var(--text-sec)">No matches found.</p>';
        return;
    }

    students.forEach(s => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.dataset.id = s.id;
        div.innerHTML = `
            <span class="material-symbols-outlined drag-icon">person</span>
            <div class="item-main">
                <span class="item-title">${s.name || '—'}</span>
                <span class="item-desc">${s.school || ''} &middot; ${s.level || ''} ${s.grade || ''}학년 &middot; ${s.branch || ''}</span>
            </div>
            <span class="item-tag">${classCode(s)}</span>
        `;
        div.addEventListener('click', (e) => selectStudent(s.id, s, e.currentTarget));
        listContainer.appendChild(div);
    });
}

function updateCount(n) {
    const el = document.getElementById('student-count');
    if (!el) return;
    el.textContent = n === null ? '—' : `${n}명`;
}

// ---------------------------------------------------------------------------
// Sidebar filter nav
// ---------------------------------------------------------------------------
document.querySelectorAll('.nav-item[data-filter-type]').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        activeFilter = {
            type: item.dataset.filterType,
            value: item.dataset.filterValue || null
        };
        applyFilterAndRender();
    });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
document.getElementById('studentSearchInput')?.addEventListener('input', applyFilterAndRender);

// ---------------------------------------------------------------------------
// Select a student — populate detail panel
// ---------------------------------------------------------------------------
window.selectStudent = (studentId, studentData, targetElement) => {
    currentStudentId = studentId;

    document.getElementById('profile-initial').textContent = studentData.name?.[0] || 'S';
    document.getElementById('profile-name').textContent = studentData.name || studentId;
    const branch = studentData.branch || branchFromSymbol(studentData.level_symbol) || '';
    const schoolShort = abbreviateSchool(studentData);
    document.getElementById('profile-school').textContent = branch && schoolShort !== '—'
        ? `${branch} · ${schoolShort}`
        : branch || schoolShort;
    document.getElementById('profile-status').textContent = studentData.status || '—';

    document.getElementById('profile-student-phone').textContent = studentData.student_phone || 'N/A';
    document.getElementById('profile-parent-phone-1').textContent = studentData.parent_phone_1 || 'N/A';
    document.getElementById('profile-parent-phone-2').textContent = studentData.parent_phone_2 || 'N/A';

    // 반기호 = 학부기호 + 레벨기호 (예: HA101)
    document.getElementById('profile-level').textContent = classCode(studentData) || 'N/A';
    document.getElementById('profile-branch').textContent = studentData.branch || branchFromSymbol(studentData.level_symbol) || 'N/A';
    document.getElementById('profile-day').textContent = displayDays(studentData.day);

    document.getElementById('profile-class-type').textContent = studentData.class_type || '정규';
    const specRow = document.getElementById('profile-special-class-row');
    if (specRow) {
        if (studentData.class_type === '특강') {
            const sStart = studentData.special_start_date || '?';
            const sEnd = studentData.special_end_date || '?';
            document.getElementById('profile-special-period').textContent = `${formatDate(sStart)} ~ ${formatDate(sEnd)}`;
            specRow.style.display = 'flex';
        } else {
            specRow.style.display = 'none';
        }
    }

    document.getElementById('profile-start-date').textContent = formatDate(studentData.start_date);
    const startDateRow = document.getElementById('profile-start-date-row');
    if (startDateRow) startDateRow.style.display = (studentData.class_type === '특강') ? 'none' : 'flex';

    const pauseRow = document.getElementById('profile-pause-row');
    if (pauseRow) {
        if (studentData.status === '실휴원' || studentData.status === '가휴원') {
            const pStart = studentData.pause_start_date || '?';
            const pEnd = studentData.pause_end_date || '?';
            document.getElementById('profile-pause-period').textContent = `${formatDate(pStart)} ~ ${formatDate(pEnd)}`;
            pauseRow.style.display = 'flex';
        } else {
            pauseRow.style.display = 'none';
        }
    }

    document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
    if (targetElement) targetElement.classList.add('active');

    // 메모 로드
    loadMemos(studentId);
};

// ---------------------------------------------------------------------------
// docId generator (import-students.js와 동일한 방식)
// ---------------------------------------------------------------------------
const makeDocId = (name, parentPhone, branch) => {
    const phone = (parentPhone || '').replace(/\D/g, '');
    return `${name}_${phone}_${branch}`.replace(/\s+/g, '_');
};

// ---------------------------------------------------------------------------
// 신규 등록 폼 표시 / 숨김
// ---------------------------------------------------------------------------
window.showNewStudentForm = () => {
    isEditMode = false;
    currentStudentId = null;
    document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
    document.getElementById('detail-header').style.display = 'none';
    document.getElementById('form-header').style.display = 'flex';
    document.getElementById('form-title').textContent = '신규 등록';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('detail-form').style.display = 'block';
    document.getElementById('new-student-form').reset();
    document.getElementById('opt-withdraw').style.display = 'none';

    // 오늘 날짜를 기본값으로
    const today = new Date().toISOString().slice(0, 10);
    document.querySelector('[name="start_date"]').value = today;

    document.querySelector('[name="class_type"]').value = '정규';
    if (window.handleClassTypeChange) window.handleClassTypeChange('정규');

    if (window.handleStatusChange) window.handleStatusChange('재원');
};

window.handleStatusChange = (val) => {
    const el = document.getElementById('pause-period-container');
    if (el) {
        el.style.display = (val === '실휴원' || val === '가휴원') ? 'block' : 'none';
        if (val === '실휴원' || val === '가휴원') {
            const startInput = document.querySelector('[name="pause_start_date"]');
            if (startInput) {
                const minStart = new Date();
                minStart.setMonth(minStart.getMonth() - 1);
                startInput.min = minStart.toISOString().split('T')[0];
            }
        }
    }
};

// ---------------------------------------------------------------------------
// 정보 수정 폼 표시
// ---------------------------------------------------------------------------
window.showEditForm = () => {
    if (!currentStudentId) return;
    const student = allStudents.find(s => s.id === currentStudentId);
    if (!student) return;

    isEditMode = true;
    document.getElementById('detail-header').style.display = 'none';
    document.getElementById('form-header').style.display = 'flex';
    document.getElementById('form-title').textContent = '정보 수정';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('detail-form').style.display = 'block';
    document.getElementById('opt-withdraw').style.display = 'block';

    const f = document.getElementById('new-student-form');
    f.reset();

    // Pre-fill data
    f.name.value = student.name || '';
    f.level.value = student.level || '초등';
    f.school.value = student.school || '';
    f.grade.value = student.grade || '';
    f.student_phone.value = student.student_phone || '';
    f.parent_phone_1.value = student.parent_phone_1 || '';
    f.parent_phone_2.value = student.parent_phone_2 || '';
    f.level_code.value = student.level_code || '';
    f.level_symbol.value = student.level_symbol || '';
    f.start_date.value = student.start_date || '';

    f.class_type.value = student.class_type || '정규';
    f.special_start_date.value = student.special_start_date || '';
    f.special_end_date.value = student.special_end_date || '';
    if (window.handleClassTypeChange) window.handleClassTypeChange(f.class_type.value);

    f.status.value = student.status || '재원';
    f.pause_start_date.value = student.pause_start_date || '';
    f.pause_end_date.value = student.pause_end_date || '';
    if (window.handleStatusChange) window.handleStatusChange(f.status.value);

    // Pre-fill days
    const days = normalizeDays(student.day);
    f.querySelectorAll('[name="day"]').forEach(cb => {
        cb.checked = days.includes(cb.value);
    });
};

window.hideForm = () => {
    isEditMode = false;
    document.getElementById('form-header').style.display = 'none';
    document.getElementById('detail-header').style.display = 'flex';
    document.getElementById('detail-form').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
};

// ---------------------------------------------------------------------------
// 신규 등록 / 정보 수정 저장
// ---------------------------------------------------------------------------
window.submitNewStudent = async () => {
    const f = document.getElementById('new-student-form');
    const name = f.name.value.trim();
    const levelSymbol = f.level_symbol.value.trim();
    const branch = branchFromSymbol(levelSymbol);
    const parentPhone1 = f.parent_phone_1.value.trim();

    if (!name) { alert('이름을 입력하세요.'); return; }
    if (!branch) { alert('레벨기호를 입력하세요. (1xx: 2단지, 2xx: 10단지)'); return; }
    if (!parentPhone1) { alert('학부모 연락처를 입력하세요.'); return; }

    const days = Array.from(f.querySelectorAll('[name="day"]:checked')).map(cb => cb.value);

    const studentData = {
        name,
        level: f.level.value,
        school: f.school.value.trim(),
        grade: f.grade.value.trim(),
        student_phone: f.student_phone.value.trim(),
        parent_phone_1: parentPhone1,
        parent_phone_2: f.parent_phone_2.value.trim(),
        branch,
        level_code: f.level_code.value.trim(),
        level_symbol: levelSymbol,
        class_type: f.class_type.value,
        special_start_date: f.special_start_date.value,
        special_end_date: f.special_end_date.value,
        day: days,
        start_date: f.start_date.value,
        status: f.status.value,
        pause_start_date: f.pause_start_date.value,
        pause_end_date: f.pause_end_date.value,
    };

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
        if (isEditMode) {
            const docId = currentStudentId;
            const oldStudent = allStudents.find(s => s.id === docId) || {};

            const beforeStr = `상태:${oldStudent.status || ''}, 분류:${oldStudent.class_type || '정규'}, 반:${classCode(oldStudent)}, 요일:${displayDays(oldStudent.day)}`;
            const afterStr = `상태:${studentData.status}, 분류:${studentData.class_type}, 반:${classCode(studentData)}, 요일:${displayDays(studentData.day)}`;

            await setDoc(doc(db, 'students', docId), studentData, { merge: true });
            await addDoc(collection(db, 'history_logs'), {
                doc_id: docId,
                change_type: 'UPDATE',
                before: beforeStr,
                after: afterStr,
                google_login_id: currentUser?.email || 'system',
                timestamp: serverTimestamp(),
            });
        } else {
            const docId = makeDocId(name, parentPhone1, branch);
            await setDoc(doc(db, 'students', docId), studentData);
            await addDoc(collection(db, 'history_logs'), {
                doc_id: docId,
                change_type: 'ENROLL',
                before: '—',
                after: `신규 등록: ${name} (${studentData.level_code}${studentData.level_symbol})`,
                google_login_id: currentUser?.email || 'system',
                timestamp: serverTimestamp(),
            });
            currentStudentId = docId;
        }

        hideForm();
        await loadStudentList();

        // 저장한 학생 자동 선택
        const savedStudent = allStudents.find(s => s.id === currentStudentId);
        if (savedStudent) {
            const targetEl = document.querySelector(`.list-item[data-id="${currentStudentId}"]`);
            selectStudent(savedStudent.id, savedStudent, targetEl);
        }
    } catch (err) {
        console.error('[SAVE ERROR]', err);
        alert('저장 실패: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '저장';
    }
};

window.handleClassTypeChange = (val) => {
    const specialEl = document.getElementById('special-period-container');
    const startDateEl = document.getElementById('start-date-container');
    if (specialEl) specialEl.style.display = (val === '특강') ? 'block' : 'none';
    if (startDateEl) startDateEl.style.display = (val === '특강') ? 'none' : 'block';
};

window.handleLevelSymbolChange = (val) => {
    // 레벨기호 청 번째 숫자로 소속 자동 표시
    const branch = branchFromSymbol(val);
    const branchPreview = document.getElementById('branch-preview');
    if (branchPreview) branchPreview.textContent = branch ? `(${branch})` : '';
};

let pauseAlertTriggered = false;

window.checkDurationLimit = () => {
    const startInput = document.querySelector('[name="pause_start_date"]');
    const endInput = document.querySelector('[name="pause_end_date"]');

    if (startInput && endInput) {
        if (startInput.value) {
            endInput.min = startInput.value;
            const startDate = new Date(startInput.value);
            const maxDate = new Date(startDate);
            maxDate.setFullYear(startDate.getFullYear() + 1);
            endInput.max = maxDate.toISOString().split('T')[0];
        }

        if (startInput.value && endInput.value) {
            const start = new Date(startInput.value);
            const end = new Date(endInput.value);
            const diffTime = end - start;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 31) {
                if (!pauseAlertTriggered) {
                    alert('휴원은 한달까지만 가능합니다.');
                    pauseAlertTriggered = true;
                }
            } else {
                pauseAlertTriggered = false;
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('[AIM] Dashboard initialized.');
});

// ---------------------------------------------------------------------------
// 메모 관리 (Firestore 서브컬렉션: students/{docId}/memos/{memoId})
// ---------------------------------------------------------------------------
async function loadMemos(studentId) {
    const container = document.getElementById('memo-list');
    if (!container) return;
    container.innerHTML = '<p style="color:var(--text-sec);font-size:0.85em;padding:4px 0;">로딩 중...</p>';

    try {
        const snap = await getDocs(collection(db, 'students', studentId, 'memos'));
        const memos = [];
        snap.forEach(d => memos.push({ id: d.id, ...d.data() }));
        memos.sort((a, b) => (a.created_at?.seconds || 0) - (b.created_at?.seconds || 0));
        renderMemos(memos, studentId);
    } catch (e) {
        container.innerHTML = '<p style="color:red;font-size:0.85em;">메모 로드 실패</p>';
    }
}

function renderMemos(memos, studentId) {
    const container = document.getElementById('memo-list');
    if (!container) return;
    container.innerHTML = '';

    if (memos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-sec);font-size:0.85em;padding:4px 0;">메모가 없습니다. + 버튼으로 추가하세요.</p>';
        return;
    }

    memos.forEach(memo => {
        const preview = (memo.text || '').slice(0, 40) + ((memo.text || '').length > 40 ? '…' : '');
        const card = document.createElement('div');
        card.className = 'memo-card';
        card.dataset.memoId = memo.id;
        card.innerHTML = `
            <div class="memo-preview" onclick="window.toggleMemo('${memo.id}')">
                <span class="memo-preview-text">${preview}</span>
                <div class="memo-actions">
                    <button class="memo-delete-btn" onclick="event.stopPropagation(); window.deleteMemo('${studentId}','${memo.id}')" title="삭제">
                        <span class="material-symbols-outlined" style="font-size:16px;">close</span>
                    </button>
                </div>
            </div>
            <div class="memo-full" style="display:none;">
                <div class="memo-text">${(memo.text || '').replace(/\n/g, '<br>')}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.toggleMemo = (memoId) => {
    const card = document.querySelector(`.memo-card[data-memo-id="${memoId}"]`);
    if (!card) return;
    const full = card.querySelector('.memo-full');
    const isOpen = full.style.display !== 'none';
    full.style.display = isOpen ? 'none' : 'block';
    card.classList.toggle('expanded', !isOpen);
};

window.deleteMemo = async (studentId, memoId) => {
    if (!confirm('이 메모를 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'students', studentId, 'memos', memoId));
        await loadMemos(studentId);
    } catch (e) {
        alert('삭제 실패: ' + e.message);
    }
};

window.addMemo = async () => {
    if (!currentStudentId) return;
    const text = prompt('메모 내용을 입력하세요:');
    if (!text || !text.trim()) return;
    try {
        await addDoc(collection(db, 'students', currentStudentId, 'memos'), {
            text: text.trim(),
            created_at: serverTimestamp(),
            author: currentUser?.email || 'system',
        });
        await loadMemos(currentStudentId);
    } catch (e) {
        alert('메모 저장 실패: ' + e.message);
    }
};
