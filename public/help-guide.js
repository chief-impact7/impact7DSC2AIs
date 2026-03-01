/* ── Help Guide Modal ─────────────────────────────────────────────────── */
(function () {
  'use strict';

  const TABS = [
    { id: 'basics', label: '기본 사용법', icon: 'play_circle' },
    { id: 'data', label: '데이터 관리', icon: 'database' },
    { id: 'sidebar', label: '사이드바/필터', icon: 'filter_list' },
    { id: 'faq', label: 'FAQ', icon: 'quiz' },
  ];

  /* ── Content builders ──────────────────────────────────────────────── */

  function buildBasics() {
    return `
      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">login</span>
          로그인
        </h3>
        <ol class="help-guide-steps">
          <li>우측 상단의 <strong>G</strong> 아바타를 클릭합니다.</li>
          <li>Google 계정으로 로그인합니다. (승인된 계정만 접속 가능)</li>
          <li>로그인에 성공하면 아바타가 이메일 첫 글자로 바뀌고, 학생 목록이 로드됩니다.</li>
        </ol>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">search</span>
          학생 검색
        </h3>
        <p class="help-guide-desc">상단 검색창에서 다양한 방식으로 학생을 찾을 수 있습니다.</p>
        <ul class="help-guide-list">
          <li><strong>이름</strong> &mdash; 학생 이름 전체 또는 일부 입력 (예: 김민준)</li>
          <li><strong>전화번호</strong> &mdash; 학부모 또는 학생 연락처 입력</li>
          <li><strong>초성 검색</strong> &mdash; 한글 초성만 입력 (예: ㄱㅁㅈ &rarr; 김민준)</li>
          <li><strong>학교명</strong> &mdash; 학교 이름으로 검색 (예: 진명여고)</li>
        </ul>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">person</span>
          학생 상세보기
        </h3>
        <ol class="help-guide-steps">
          <li>메인 화면의 학생 카드(또는 목록 행)를 클릭합니다.</li>
          <li>우측에 학생 상세 정보 패널이 열립니다.</li>
          <li>이름, 상태, 연락처, 수업 정보, 메모 등을 확인할 수 있습니다.</li>
        </ol>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">view_module</span>
          뷰 전환
        </h3>
        <p class="help-guide-desc">
          상단 뷰 전환 버튼으로 <strong>기본 목록</strong>, <strong>소속별 그룹</strong>, <strong>반별 그룹</strong> 뷰를 순환 전환할 수 있습니다.
          기본 목록은 리스트 형태로, 소속별/반별 그룹은 각각 지점 또는 반 단위로 묶어서 보여줍니다.
        </p>
      </section>
    `;
  }

  function buildDataManagement() {
    return `
      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">person_add</span>
          신규 학생 등록
        </h3>
        <ol class="help-guide-steps">
          <li>사이드바의 <strong>Registration</strong> 버튼을 클릭합니다.</li>
          <li>필수 항목을 입력합니다: <strong>이름</strong>, <strong>학부모 연락처 1</strong></li>
          <li>나머지 항목(학교, 반, 수업종류, 등원요일 등)을 입력합니다.</li>
          <li><strong>저장</strong> 버튼을 클릭하면 등록이 완료됩니다.</li>
        </ol>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">edit</span>
          학생 정보 수정
        </h3>
        <ol class="help-guide-steps">
          <li>학생 상세 패널에서 <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">edit</span> 아이콘을 클릭합니다.</li>
          <li>수정 폼이 열리며 기존 데이터가 자동으로 채워집니다.</li>
          <li>원하는 항목을 수정한 뒤 <strong>저장</strong>을 클릭합니다.</li>
          <li>모든 변경 이력은 자동으로 기록됩니다.</li>
        </ol>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">add_circle</span>
          수업 추가 / 종강 처리
        </h3>
        <ul class="help-guide-list">
          <li><strong>수업 추가</strong> &mdash; 학생 상세 패널에서 수업 추가 버튼을 클릭하여 새로운 수업을 등록합니다.</li>
          <li><strong>종강 처리</strong> &mdash; 해당 수업의 종강 버튼을 클릭하면 수업이 종강 상태로 변경됩니다.</li>
        </ul>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">sticky_note_2</span>
          메모 관리
        </h3>
        <ul class="help-guide-list">
          <li><strong>메모 추가</strong> &mdash; 메모 카드 제목 옆의 <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">add</span> 버튼을 클릭하면 메모 작성 모달이 열립니다.</li>
          <li><strong>메모 삭제</strong> &mdash; 각 메모의 <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">close</span> 버튼으로 삭제합니다.</li>
        </ul>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">checklist</span>
          일괄 선택 모드
        </h3>
        <ol class="help-guide-steps">
          <li>목록 상단의 일괄 선택(체크박스) 모드를 활성화합니다.</li>
          <li>변경할 학생들을 선택합니다.</li>
          <li>일괄 변경 가능 항목: <strong>상태</strong>, <strong>반</strong>, <strong>등원요일</strong></li>
          <li>일괄 삭제도 가능합니다. (삭제 시 확인 대화상자가 표시됩니다)</li>
        </ol>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">upload_file</span>
          데이터 업로드
        </h3>
        <p class="help-guide-desc">다양한 방식으로 학생 데이터를 일괄 업로드할 수 있습니다.</p>
        <ul class="help-guide-list">
          <li><strong>드라이브에서 선택</strong> &mdash; Google Picker로 내 드라이브에서 구글시트 파일을 직접 선택</li>
          <li><strong>URL</strong> &mdash; 공유된 스프레드시트 URL 입력</li>
          <li><strong>CSV 파일</strong> &mdash; CSV 파일 직접 업로드</li>
          <li><strong>템플릿</strong> &mdash; 내 구글 드라이브에 업로드 양식 템플릿이 생성됩니다. 데이터를 입력한 후 URL 또는 드라이브에서 선택으로 가져옵니다.</li>
        </ul>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">download</span>
          구글시트 다운로드
        </h3>
        <p class="help-guide-desc">
          전체 학생 데이터를 구글 스프레드시트로 내보냅니다.
          내 구글 드라이브에 새 시트가 생성되어 자동으로 열립니다. 데이터 백업이나 외부 공유가 필요할 때 사용하세요.
        </p>
      </section>
    `;
  }

  function buildSidebarFilters() {
    return `
      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">calendar_month</span>
          학기 선택
        </h3>
        <p class="help-guide-desc">
          사이드바 최상단의 드롭다운에서 학기를 선택합니다. 선택한 학기는 브라우저에 저장되어
          다음 접속 시에도 유지됩니다. "전체 학기"를 선택하면 학기에 관계없이 모든 학생을 볼 수 있습니다.
        </p>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">toggle_on</span>
          상태 필터
        </h3>
        <p class="help-guide-desc">All Students 아래의 <strong>상태</strong> 메뉴를 펼쳐 학생 상태별로 필터링합니다.</p>
        <ul class="help-guide-list">
          <li><strong>등원예정</strong> &mdash; 등원확정의사를 밝혔으나 등록을 하지 않은 학생</li>
          <li><strong>재원</strong> &mdash; 등록을 하고 수업에 참여하는 학생</li>
          <li><strong>실휴원</strong> &mdash; 잔존수업료가 있는 상태에서 휴원한 학생 (공식휴원)</li>
          <li><strong>가휴원</strong> &mdash; 잔존수업료가 없는 상태에서 휴원한 학생 (비공식조치)</li>
          <li><strong>퇴원</strong> &mdash; 등록을 하지 않고 수업에 참여하지도 않는 학생</li>
        </ul>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">menu_book</span>
          수업종류 필터
        </h3>
        <ul class="help-guide-list">
          <li><strong>정규</strong> &mdash; 정규 수업 학생</li>
          <li><strong>특강</strong> &mdash; 특강 수업 학생</li>
          <li><strong>내신</strong> &mdash; 내신 대비 수업 학생</li>
        </ul>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">school</span>
          학부 필터
        </h3>
        <ul class="help-guide-list">
          <li><strong>초등</strong> &mdash; 초등학생</li>
          <li><strong>중등</strong> &mdash; 중학생</li>
          <li><strong>고등</strong> &mdash; 고등학생</li>
        </ul>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">location_city</span>
          지점 필터
        </h3>
        <ul class="help-guide-list">
          <li><strong>2단지</strong> &mdash; 2단지 지점 학생</li>
          <li><strong>10단지</strong> &mdash; 10단지 지점 학생</li>
        </ul>
        <p class="help-guide-desc" style="margin-top:8px;">
          지점은 반넘버의 첫 자리 숫자로 자동 결정됩니다. (1xx &rarr; 2단지, 2xx &rarr; 10단지)
        </p>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">class</span>
          반별 필터
        </h3>
        <p class="help-guide-desc">
          Class 메뉴를 펼치면 현재 학기에 존재하는 반 목록이 표시됩니다.
          원하는 반을 클릭하면 해당 반 학생만 필터링됩니다.
        </p>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">calendar_month</span>
          등원요일 필터
        </h3>
        <p class="help-guide-desc">
          Scheduled 메뉴에서 월~일 중 특정 요일을 선택하면 해당 요일에 등원하는 학생만 표시됩니다.
        </p>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">hotel</span>
          휴원 관리
        </h3>
        <p class="help-guide-desc">On Leave 메뉴에서 휴원 학생을 세분화하여 관리할 수 있습니다.</p>
        <ul class="help-guide-list">
          <li><strong>Expected (복귀 예정)</strong> &mdash; 휴원 종료일이 다가오는 학생</li>
          <li><strong>Non-Return (미복귀)</strong> &mdash; 휴원 종료일이 지났으나 복귀하지 않은 학생</li>
        </ul>
        <p class="help-guide-desc" style="margin-top:8px;">
          각 항목은 실휴원(Actual)과 가휴원(Pending)으로 세분화됩니다.
        </p>
      </section>

      <section class="help-guide-section">
        <h3 class="help-guide-section-title">
          <span class="material-symbols-outlined">bar_chart</span>
          일별 통계
        </h3>
        <p class="help-guide-desc">
          Daily Stats를 클릭하면 오늘 날짜 기준의 등원/휴원 현황 통계를 확인할 수 있습니다.
        </p>
      </section>
    `;
  }

  function buildFAQ() {
    const faqs = [
      {
        q: '데이터가 안 보여요',
        a: '먼저 우측 상단에서 <strong>Google 로그인</strong>이 되어 있는지 확인하세요. 로그인 후에도 목록이 비어 있다면, 사이드바 상단의 <strong>학기 선택</strong> 드롭다운에서 올바른 학기가 선택되어 있는지 확인하세요. "전체 학기"를 선택하면 모든 학생이 표시됩니다.',
      },
      {
        q: '검색이 안 돼요',
        a: '검색창에서는 <strong>이름</strong>, <strong>학교명</strong>, <strong>전화번호</strong>, <strong>초성</strong>으로 검색할 수 있습니다. 초성 검색은 한글 자음만 입력하면 됩니다. (예: "ㄱㅁㅈ" &rarr; 김민준) 전화번호는 하이픈(-) 없이 숫자만 입력해도 검색됩니다.',
      },
      {
        q: '학생 정보를 잘못 입력했어요',
        a: '해당 학생 카드를 클릭하여 상세 패널을 연 뒤, 상단의 <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">edit</span> (수정) 아이콘을 클릭하세요. 수정 폼에서 정보를 고친 후 저장하면 됩니다. 모든 수정 이력은 자동으로 기록됩니다.',
      },
      {
        q: '여러 학생을 한번에 바꾸고 싶어요',
        a: '목록 상단에서 <strong>일괄 선택 모드</strong>를 활성화하세요. 체크박스로 원하는 학생들을 선택한 뒤, 상태/반/등원요일을 한꺼번에 변경하거나, 선택한 학생들을 일괄 삭제할 수 있습니다.',
      },
      {
        q: '데이터 백업은 어떻게 하나요?',
        a: '상단의 <strong>구글시트로 다운로드</strong> 버튼을 사용하세요. 전체 학생 데이터가 내 구글 드라이브에 새 스프레드시트로 생성됩니다. 정기적으로 백업해 두는 것을 권장합니다.',
      },
      {
        q: '휴원 학생은 어떻게 관리하나요?',
        a: '사이드바의 <strong>On Leave</strong> 메뉴를 펼치면 복귀 예정(Expected)과 미복귀(Non-Return) 학생을 분류하여 볼 수 있습니다. 각 항목은 실휴원과 가휴원으로 세분화되며, 휴원 종료일이 지난 학생을 쉽게 파악할 수 있습니다.',
      },
    ];

    return faqs
      .map(
        (f) => `
      <details class="help-guide-faq-item">
        <summary class="help-guide-faq-q">
          <span class="material-symbols-outlined">help</span>
          ${f.q}
          <span class="material-symbols-outlined help-guide-faq-chevron">expand_more</span>
        </summary>
        <div class="help-guide-faq-a">${f.a}</div>
      </details>
    `
      )
      .join('');
  }

  const CONTENT_MAP = {
    basics: buildBasics,
    data: buildDataManagement,
    sidebar: buildSidebarFilters,
    faq: buildFAQ,
  };

  /* ── Modal creation ────────────────────────────────────────────────── */

  function createModal() {
    const overlay = document.createElement('div');
    overlay.className = 'help-guide-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '사용 가이드');

    const tabsHTML = TABS.map(
      (t, i) => `
      <button class="help-guide-tab${i === 0 ? ' help-guide-tab--active' : ''}"
              id="help-tab-${t.id}" data-tab="${t.id}" role="tab" aria-selected="${i === 0}">
        <span class="material-symbols-outlined">${t.icon}</span>
        <span>${t.label}</span>
      </button>`
    ).join('');

    overlay.innerHTML = `
      <div class="help-guide-modal">
        <header class="help-guide-header">
          <h2 class="help-guide-title">
            <span class="material-symbols-outlined">menu_book</span>
            사용 가이드
          </h2>
          <button class="help-guide-close" aria-label="닫기">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <nav class="help-guide-tabs" role="tablist">${tabsHTML}</nav>
        <div class="help-guide-body" role="tabpanel" aria-labelledby="help-tab-basics"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  /* ── Controller ────────────────────────────────────────────────────── */

  let overlayEl = null;
  let activeTab = TABS[0].id;

  function renderContent() {
    const body = overlayEl.querySelector('.help-guide-body');
    body.innerHTML = CONTENT_MAP[activeTab]();
    body.scrollTop = 0;
  }

  function switchTab(tabId) {
    activeTab = tabId;
    overlayEl.querySelectorAll('.help-guide-tab').forEach((btn) => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('help-guide-tab--active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    overlayEl.querySelector('.help-guide-body').setAttribute('aria-labelledby', `help-tab-${tabId}`);
    renderContent();
  }

  let _previousFocus = null;

  function openModal() {
    if (!overlayEl) {
      overlayEl = createModal();

      /* Tab clicks */
      overlayEl.querySelector('.help-guide-tabs').addEventListener('click', (e) => {
        const tab = e.target.closest('.help-guide-tab');
        if (tab) switchTab(tab.dataset.tab);
      });

      /* Close button */
      overlayEl.querySelector('.help-guide-close').addEventListener('click', closeModal);

      /* Backdrop click */
      overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl) closeModal();
      });
    }

    _previousFocus = document.activeElement;
    activeTab = TABS[0].id;
    switchTab(activeTab);
    overlayEl.classList.add('help-guide-overlay--visible');
    document.body.style.overflow = 'hidden';
    overlayEl.querySelector('.help-guide-close').focus();
  }

  function closeModal() {
    if (!overlayEl) return;
    overlayEl.classList.remove('help-guide-overlay--visible');
    document.body.style.overflow = '';
    if (_previousFocus) { _previousFocus.focus(); _previousFocus = null; }
  }

  /* ── Keyboard ──────────────────────────────────────────────────────── */

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl && overlayEl.classList.contains('help-guide-overlay--visible')) {
      closeModal();
    }
  });

  /* ── Bind to help button ───────────────────────────────────────────── */

  function bindHelpButton() {
    const btn = document.querySelector('[title="사용 가이드"]');
    if (btn) {
      btn.addEventListener('click', openModal);
    }
  }

  /* ── Inject styles ─────────────────────────────────────────────────── */

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── Overlay ── */
      .help-guide-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.45);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
      }
      .help-guide-overlay--visible {
        opacity: 1;
        visibility: visible;
      }

      /* ── Modal ── */
      .help-guide-modal {
        background: var(--surface-container, #fff);
        border-radius: 16px;
        width: min(640px, calc(100vw - 32px));
        max-height: calc(100vh - 64px);
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        transform: translateY(12px);
        transition: transform 0.2s;
      }
      .help-guide-overlay--visible .help-guide-modal {
        transform: translateY(0);
      }

      /* ── Header ── */
      .help-guide-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 12px;
      }
      .help-guide-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-heading, 'Google Sans', sans-serif);
        font-size: 20px;
        font-weight: 500;
        color: var(--text-main, #1f1f1f);
      }
      .help-guide-title .material-symbols-outlined {
        color: var(--primary, #0b57d0);
        font-size: 24px;
      }
      .help-guide-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
        color: var(--text-sec, #444746);
        transition: background 0.15s;
      }
      .help-guide-close:hover {
        background: rgba(60, 64, 67, 0.08);
      }
      .help-guide-close:focus-visible {
        outline: 2px solid var(--primary, #0b57d0);
        outline-offset: 2px;
      }

      /* ── Tabs ── */
      .help-guide-tabs {
        display: flex;
        gap: 4px;
        padding: 0 24px;
        border-bottom: 1px solid var(--border, #e0e0e0);
      }
      .help-guide-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border: none;
        border-bottom: 2px solid transparent;
        background: transparent;
        font-family: var(--font-body, 'Roboto', sans-serif);
        font-size: 13px;
        font-weight: 500;
        color: var(--text-sec, #444746);
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
        white-space: nowrap;
      }
      .help-guide-tab .material-symbols-outlined {
        font-size: 18px;
      }
      .help-guide-tab:hover {
        color: var(--primary, #0b57d0);
      }
      .help-guide-tab--active {
        color: var(--primary, #0b57d0);
        border-bottom-color: var(--primary, #0b57d0);
      }

      /* ── Body ── */
      .help-guide-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px 28px;
      }

      /* ── Sections ── */
      .help-guide-section {
        margin-bottom: 24px;
      }
      .help-guide-section:last-child {
        margin-bottom: 0;
      }
      .help-guide-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-heading, 'Google Sans', sans-serif);
        font-size: 15px;
        font-weight: 500;
        color: var(--text-main, #1f1f1f);
        margin-bottom: 10px;
      }
      .help-guide-section-title .material-symbols-outlined {
        font-size: 20px;
        color: var(--primary, #0b57d0);
      }

      /* ── Lists & Steps ── */
      .help-guide-desc {
        font-size: 13.5px;
        line-height: 1.65;
        color: var(--text-sec, #444746);
      }
      .help-guide-steps,
      .help-guide-list {
        margin: 0;
        padding-left: 20px;
        font-size: 13.5px;
        line-height: 1.75;
        color: var(--text-sec, #444746);
      }
      .help-guide-steps li,
      .help-guide-list li {
        margin-bottom: 4px;
      }
      .help-guide-steps li::marker {
        color: var(--primary, #0b57d0);
        font-weight: 500;
      }
      .help-guide-list {
        list-style: disc;
      }

      /* ── FAQ ── */
      .help-guide-faq-item {
        border: 1px solid var(--border, #e0e0e0);
        border-radius: 10px;
        margin-bottom: 10px;
        overflow: hidden;
        transition: border-color 0.15s;
      }
      .help-guide-faq-item[open] {
        border-color: var(--primary, #0b57d0);
      }
      .help-guide-faq-q {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 16px;
        font-family: var(--font-heading, 'Google Sans', sans-serif);
        font-size: 14px;
        font-weight: 500;
        color: var(--text-main, #1f1f1f);
        cursor: pointer;
        list-style: none;
        user-select: none;
      }
      .help-guide-faq-q::-webkit-details-marker {
        display: none;
      }
      .help-guide-faq-q .material-symbols-outlined:first-child {
        font-size: 20px;
        color: var(--primary, #0b57d0);
      }
      .help-guide-faq-chevron {
        margin-left: auto;
        font-size: 20px !important;
        color: var(--text-sec, #444746) !important;
        transition: transform 0.2s;
      }
      .help-guide-faq-item[open] .help-guide-faq-chevron {
        transform: rotate(180deg);
      }
      .help-guide-faq-a {
        padding: 0 16px 16px 44px;
        font-size: 13.5px;
        line-height: 1.7;
        color: var(--text-sec, #444746);
      }

      /* ── Mobile ── */
      @media (max-width: 600px) {
        .help-guide-modal {
          width: 100vw;
          max-height: 100dvh;
          border-radius: 0;
        }
        .help-guide-tabs {
          overflow-x: auto;
          padding: 0 16px;
        }
        .help-guide-tab {
          padding: 10px 12px;
          font-size: 12px;
        }
        .help-guide-header {
          padding: 16px 16px 10px;
        }
        .help-guide-body {
          padding: 16px 16px 24px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Init ───────────────────────────────────────────────────────────── */

  function init() {
    injectStyles();
    bindHelpButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
