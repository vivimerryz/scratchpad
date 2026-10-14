(() => {
  const workspace = document.querySelector('#workspace');
  const workspaceWrap = document.querySelector('.workspace-wrap');
  const paper = document.querySelector('#paper');
  const notesLayer = document.querySelector('#notesLayer');
  const canvas = document.querySelector('#drawingCanvas');
  const emptyHint = document.querySelector('#emptyHint');
  const addNoteButton = document.querySelector('#addNoteBtn');
  const toast = document.querySelector('#toast');
  const saveStatus = document.querySelector('#saveStatus');
  const template = document.querySelector('#noteTemplate');
  const boardTitle = document.querySelector('h1');
  const breadcrumbTitle = document.querySelector('.breadcrumb strong');
  const boardList = document.querySelector('.sidebar-section');
  const accountModal = document.querySelector('#accountModal');
  const accountForm = document.querySelector('#accountForm');
  const accountButton = document.querySelector('#accountButton');
  const accountFirstNameInput = document.querySelector('#accountFirstName');
  const accountLastNameInput = document.querySelector('#accountLastName');
  const addImageButton = document.querySelector('#addImageBtn');
  const imageInput = document.querySelector('#imageInput');
  const addContentButton = document.querySelector('#addContentButton');
  const addContentMenu = document.querySelector('#addContentMenu');
  const toolbarScroll = document.querySelector('.workspace-toolbar-scroll');
  const paletteButtons = [...document.querySelectorAll('.palette-swatch')];
  const imageModal = document.querySelector('#imageModal');
  const imageSearchForm = document.querySelector('#imageSearchForm');
  const imageSearchQuery = document.querySelector('#imageSearchQuery');
  const imageSearchResults = document.querySelector('#imageSearchResults');
  const boardSearchButton = document.querySelector('#boardSearchButton');
  const boardSearchModal = document.querySelector('#boardSearchModal');
  const boardSearchForm = document.querySelector('#boardSearchForm');
  const boardSearchInput = document.querySelector('#boardSearchInput');
  const boardSearchResults = document.querySelector('#boardSearchResults');
  const boardSettingsButton = document.querySelector('#boardSettingsButton');
  const boardSettingsMenu = document.querySelector('#boardSettingsMenu');
  const collabModal = document.querySelector('#collabModal');
  const inviteLink = document.querySelector('#inviteLink');
  const friendName = document.querySelector('#friendName');
  const collaboratorList = document.querySelector('#collaboratorList');
  const chatButton = document.querySelector('#chatButton');
  const chatModal = document.querySelector('#chatModal');
  const chatMessages = document.querySelector('#chatMessages');
  const chatForm = document.querySelector('#chatForm');
  const chatNameInput = document.querySelector('#chatName');
  const chatMessageInput = document.querySelector('#chatMessage');
  const customItemModal = document.querySelector('#customItemModal');
  const customItemForm = document.querySelector('#customItemForm');
  const customItemText = document.querySelector('#customItemText');
  const notificationButton = document.querySelector('#notificationButton');
  const notificationsPanel = document.querySelector('#notificationsPanel');
  const notificationBadge = document.querySelector('#notificationBadge');
  const notificationSummary = document.querySelector('#notificationSummary');
  const notificationList = document.querySelector('#notificationList');
  const undoButton = document.querySelector('#undoAction');
  const redoButton = document.querySelector('#redoAction');
  const ctx = canvas.getContext('2d');
  let activeTool = 'select';
  let drawColor = '#528b6c';
  let noteCount = 0;
  let highestZ = 10;
  let drawing = false;
  let lastPoint = null;
  let hasDrawing = false;
  let zoom = 1;
  let toastTimer;
  let profile = null;
  let collaborators = [];
  let imageSearchTimer;
  let chatEntries = [];
  let notifications = [];
  let boardSaveTimer;
  let historyTimer;
  let undoStack = [];
  let redoStack = [];
  let isApplyingHistory = false;
  let spaceHeld = false;
  let panState = null;
  const boardStateKey = 'pinboard-board-state-v1';
  const boardStatesKey = 'pinboard-board-states-v1';
  const boardListKey = 'pinboard-board-list-v1';
  const chatStateKey = 'pinboard-chat-v1';
  const drawingStateKey = 'pinboard-drawing-state-v1';
  const boardDrawingsKey = 'pinboard-board-drawings-v1';
  const notificationsKey = 'pinboard-notifications-v1';
  const wiredResizeHandles = new WeakSet();

  const corrections = {
    teh: 'the',
    adn: 'and',
    dont: "don't",
    doesnt: "doesn't",
    cant: "can't",
    wont: "won't",
    becuase: 'because',
    recieve: 'receive',
    seperate: 'separate',
    definately: 'definitely',
    tommorrow: 'tomorrow',
    thier: 'their',
    alot: 'a lot',
    wierd: 'weird',
    truely: 'truly'
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  }

  function loadProfile() {
    try {
      profile = JSON.parse(localStorage.getItem('pinboard-profile') || 'null');
    } catch {
      profile = null;
    }
    if (profile?.name) updateProfileUI(profile.name);
  }

  function updateProfileUI(name) {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    accountButton.textContent = initials || 'JM';
    accountButton.setAttribute('aria-label', `Open ${name}'s account`);
  }

  function openAccountModal() {
    accountModal.hidden = false;
    if (profile?.firstName || profile?.lastName) {
      accountFirstNameInput.value = profile.firstName || '';
      accountLastNameInput.value = profile.lastName || '';
    } else if (profile?.name) {
      const nameParts = profile.name.trim().split(/\s+/);
      accountFirstNameInput.value = nameParts.shift() || '';
      accountLastNameInput.value = nameParts.join(' ');
    }
    accountFirstNameInput.focus();
  }

  function closeAccountModal() {
    accountModal.hidden = true;
  }

  function openImageModal() {
    imageModal.hidden = false;
    imageSearchQuery.focus();
  }

  function closeImageModal() {
    imageModal.hidden = true;
  }

  function openBoardSearch() {
    boardSearchModal.hidden = false;
    boardSearchInput.value = '';
    boardSearchResults.innerHTML = '<span class="search-placeholder">Type a word to find it on your board.</span>';
    boardSearchInput.focus();
  }

  function closeBoardSearch() {
    boardSearchModal.hidden = true;
    document.querySelectorAll('.is-search-match, .is-search-current').forEach((element) => {
      element.classList.remove('is-search-match', 'is-search-current');
    });
  }

  function searchBoard(query) {
    const normalizedQuery = query.trim().toLowerCase();
    document.querySelectorAll('.is-search-match, .is-search-current').forEach((element) => {
      element.classList.remove('is-search-match', 'is-search-current');
    });
    if (!normalizedQuery) {
      boardSearchResults.innerHTML = '<span class="search-placeholder">Type a word to find it on your board.</span>';
      return;
    }

    const matches = [...notesLayer.children].filter((element) => element.textContent.toLowerCase().includes(normalizedQuery));
    if (!matches.length) {
      boardSearchResults.innerHTML = '<span class="search-status">No ideas match that search yet.</span>';
      return;
    }

    matches.forEach((element) => element.classList.add('is-search-match'));
    const resultList = document.createElement('div');
    resultList.className = 'board-search-list';
    matches.forEach((element, index) => {
      const result = document.createElement('button');
      result.type = 'button';
      result.className = 'board-search-result';
      const label = element.querySelector('.note-body, .text-card-body, .object-caption, .image-caption, .checklist-title, .object-label');
      result.textContent = (label?.textContent || element.textContent).trim().replace(/\s+/g, ' ').slice(0, 90) || `Board item ${index + 1}`;
      result.addEventListener('click', () => {
        closeBoardSearch();
        element.classList.add('is-search-current');
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        window.setTimeout(() => element.classList.remove('is-search-current'), 1800);
      });
      resultList.appendChild(result);
    });
    boardSearchResults.replaceChildren(resultList);
  }

  function openCustomItemModal() {
    customItemModal.hidden = false;
    customItemText.focus();
  }

  function closeCustomItemModal() {
    customItemModal.hidden = true;
  }

  function getInitials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
  }

  function loadCollaborators() {
    try {
      collaborators = JSON.parse(localStorage.getItem('pinboard-collaborators') || '[]');
      if (!Array.isArray(collaborators)) collaborators = [];
    } catch {
      collaborators = [];
    }
  }

  function saveCollaborators() {
    try { localStorage.setItem('pinboard-collaborators', JSON.stringify(collaborators)); } catch { /* local storage may be unavailable */ }
  }

  function renderCollaborators() {
    const ownerName = profile?.name || 'You';
    collaboratorList.replaceChildren();
    const owner = document.createElement('div');
    owner.className = 'collaborator-row';
    owner.innerHTML = '<span class="collaborator-avatar"></span><span class="collaborator-name"></span><span class="collaborator-status">You</span>';
    owner.querySelector('.collaborator-avatar').textContent = getInitials(ownerName);
    owner.querySelector('.collaborator-name').textContent = ownerName;
    collaboratorList.appendChild(owner);
    collaborators.forEach((name) => {
      const row = document.createElement('div');
      row.className = 'collaborator-row';
      row.innerHTML = '<span class="collaborator-avatar"></span><span class="collaborator-name"></span><span class="collaborator-status">Invited</span>';
      row.querySelector('.collaborator-avatar').textContent = getInitials(name);
      row.querySelector('.collaborator-name').textContent = name;
      collaboratorList.appendChild(row);
    });
  }

  function openCollabModal() {
    inviteLink.value = window.location.href;
    renderCollaborators();
    collabModal.hidden = false;
    friendName.focus();
  }

  function closeCollabModal() {
    collabModal.hidden = true;
  }

  function loadChatMessages() {
    try {
      const saved = JSON.parse(localStorage.getItem(chatStateKey) || '[]');
      chatEntries = Array.isArray(saved) ? saved.filter((entry) => entry && entry.text) : [];
    } catch {
      chatEntries = [];
    }
  }

  function saveChatMessages() {
    try {
      localStorage.setItem(chatStateKey, JSON.stringify(chatEntries.slice(-100)));
    } catch {
      // Keep chat usable if local storage is unavailable.
    }
  }

  function formatChatTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function renderChatMessages() {
    chatMessages.replaceChildren();
    if (!chatEntries.length) {
      const empty = document.createElement('span');
      empty.className = 'chat-empty';
      empty.textContent = 'Start the conversation about this board.';
      chatMessages.appendChild(empty);
      return;
    }

    chatEntries.forEach((entry) => {
      const message = document.createElement('article');
      message.className = 'chat-message';
      const avatar = document.createElement('span');
      avatar.className = 'chat-avatar';
      avatar.textContent = getInitials(entry.name || 'You');
      const content = document.createElement('div');
      content.className = 'chat-message-content';
      const meta = document.createElement('div');
      meta.className = 'chat-message-meta';
      const name = document.createElement('span');
      name.className = 'chat-message-name';
      name.textContent = entry.name || 'You';
      const time = document.createElement('span');
      time.className = 'chat-message-time';
      time.textContent = formatChatTime(entry.createdAt);
      const text = document.createElement('div');
      text.className = 'chat-message-text';
      text.textContent = entry.text;
      meta.append(name, time);
      content.append(meta, text);
      message.append(avatar, content);
      chatMessages.appendChild(message);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function openChatModal() {
    if (!chatNameInput.value) chatNameInput.value = profile?.name || '';
    renderChatMessages();
    chatModal.hidden = false;
    chatMessageInput.focus();
  }

  function closeChatModal() {
    chatModal.hidden = true;
  }

  function loadNotifications() {
    try {
      const parsed = JSON.parse(localStorage.getItem(notificationsKey) || '[]');
      notifications = Array.isArray(parsed) ? parsed.filter((notification) => notification.id !== 'sample-invite') : [];
    } catch {
      notifications = [];
    }
  }

  function saveNotifications() {
    try { localStorage.setItem(notificationsKey, JSON.stringify(notifications)); } catch { /* local storage may be unavailable */ }
  }

  function renderNotifications() {
    const viewer = (profile?.name || '').trim().toLowerCase();
    const visibleNotifications = notifications.filter((notification) => notification.recipient && viewer && notification.recipient.toLowerCase() === viewer);
    const unread = visibleNotifications.filter((notification) => !notification.read && notification.status === 'pending').length;
    notificationBadge.textContent = unread > 9 ? '9+' : String(unread);
    notificationBadge.hidden = unread === 0;
    notificationSummary.textContent = unread ? `${unread} new invitation${unread === 1 ? '' : 's'}` : 'No new invites';
    notificationList.replaceChildren();
    if (!visibleNotifications.length) {
      notificationList.innerHTML = '<div class="notification-empty">No invitations from real people yet.</div>';
      return;
    }
    visibleNotifications.slice().reverse().forEach((notification) => {
      const row = document.createElement('article');
      row.className = `notification-row${!notification.read && notification.status === 'pending' ? ' is-unread' : ''}`;
      const inviter = notification.inviter || 'Someone';
      row.innerHTML = '<span class="notification-avatar"></span><div class="notification-content"><div class="notification-message"><strong></strong> invited you to collaborate.</div><div class="notification-board"></div><div class="notification-actions"><button class="notification-accept" type="button">Accept</button><button class="notification-decline" type="button">Decline</button></div><span class="notification-status"></span></div>';
      row.querySelector('.notification-avatar').textContent = getInitials(inviter);
      row.querySelector('.notification-message strong').textContent = inviter;
      row.querySelector('.notification-board').textContent = `Board · ${notification.board || 'Shared ideas'}`;
      const actions = row.querySelector('.notification-actions');
      const status = row.querySelector('.notification-status');
      if (notification.status !== 'pending') {
        actions.hidden = true;
        status.textContent = notification.status === 'accepted' ? 'Joined' : 'Declined';
      }
      row.querySelector('.notification-accept').addEventListener('click', () => respondToNotification(notification.id, 'accepted'));
      row.querySelector('.notification-decline').addEventListener('click', () => respondToNotification(notification.id, 'declined'));
      notificationList.appendChild(row);
    });
  }

  function respondToNotification(id, status) {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;
    notification.status = status;
    notification.read = true;
    saveNotifications();
    renderNotifications();
    showToast(status === 'accepted' ? `You joined ${notification.board || 'the board'}.` : 'Invite declined.');
  }

  function toggleNotifications() {
    const willOpen = notificationsPanel.hidden;
    notificationsPanel.hidden = !willOpen;
    notificationButton.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) renderNotifications();
  }

  function updateEmptyState() {
    emptyHint.hidden = notesLayer.children.length > 0;
  }

  function updateSavedStatus() {
    saveStatus.textContent = 'Saving…';
    saveBoardState();
    scheduleBoardSave();
    scheduleHistorySnapshot();
    setTimeout(() => { saveStatus.textContent = 'Saved just now'; }, 600);
  }

  function scheduleBoardSave() {
    clearTimeout(boardSaveTimer);
    boardSaveTimer = setTimeout(saveBoardState, 300);
  }

  function saveBoardState(boardName = '') {
    const activeBoard = document.querySelector('.board-item.is-active');
    const name = boardName || activeBoard?.dataset.boardName || boardTitle.textContent.trim() || 'Morning ideas';
    const state = {
      html: notesLayer.innerHTML,
      noteCount,
      highestZ,
      boardName: name
    };
    try {
      const savedStates = JSON.parse(localStorage.getItem(boardStatesKey) || '{}');
      const states = savedStates && typeof savedStates === 'object' && !Array.isArray(savedStates) ? savedStates : {};
      states[name] = state;
      localStorage.setItem(boardStatesKey, JSON.stringify(states));
      localStorage.setItem(boardStateKey, JSON.stringify(state));
    } catch {
      // Keep the board usable if local storage is unavailable or full.
    }
    try {
      const savedDrawings = JSON.parse(localStorage.getItem(boardDrawingsKey) || '{}');
      const drawings = savedDrawings && typeof savedDrawings === 'object' && !Array.isArray(savedDrawings) ? savedDrawings : {};
      if (hasDrawing) {
        drawings[name] = canvas.toDataURL('image/png');
        localStorage.setItem(drawingStateKey, drawings[name]);
      } else {
        delete drawings[name];
        localStorage.removeItem(drawingStateKey);
      }
      localStorage.setItem(boardDrawingsKey, JSON.stringify(drawings));
    } catch {
      // Drawing persistence is optional when the browser storage limit is reached.
    }
  }

  function captureBoardSnapshot() {
    let drawing = null;
    if (hasDrawing) {
      try { drawing = canvas.toDataURL('image/png'); } catch { drawing = null; }
    }
    return {
      html: notesLayer.innerHTML,
      drawing,
      noteCount,
      highestZ,
      boardName: boardTitle.textContent
    };
  }

  function snapshotsMatch(first, second) {
    return Boolean(first && second && first.html === second.html && first.drawing === second.drawing && first.noteCount === second.noteCount && first.highestZ === second.highestZ && first.boardName === second.boardName);
  }

  function updateHistoryButtons() {
    const locked = isApplyingHistory;
    undoButton.disabled = locked || undoStack.length <= 1;
    redoButton.disabled = locked || redoStack.length === 0;
  }

  function commitHistorySnapshot() {
    if (isApplyingHistory) return;
    const snapshot = captureBoardSnapshot();
    const lastSnapshot = undoStack[undoStack.length - 1];
    if (snapshotsMatch(snapshot, lastSnapshot)) {
      updateHistoryButtons();
      return;
    }
    undoStack.push(snapshot);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
  }

  function scheduleHistorySnapshot() {
    if (isApplyingHistory) return;
    clearTimeout(historyTimer);
    historyTimer = setTimeout(commitHistorySnapshot, 350);
  }

  function initializeHistory() {
    undoStack = [captureBoardSnapshot()];
    redoStack = [];
    updateHistoryButtons();
  }

  function updateRestoredBoardName(name) {
    if (!name) return;
    boardTitle.textContent = name;
    breadcrumbTitle.textContent = name;
    const activeBoard = document.querySelector('.board-item.is-active');
    if (activeBoard) {
      activeBoard.dataset.boardName = name;
      activeBoard.querySelector('.board-name').textContent = name;
    }
  }

  function saveBoardList() {
    try {
      const names = [...document.querySelectorAll('.board-item')].map((item) => item.dataset.boardName).filter(Boolean);
      const activeBoard = document.querySelector('.board-item.is-active');
      localStorage.setItem(boardListKey, JSON.stringify({ names, activeName: activeBoard?.dataset.boardName || boardTitle.textContent.trim() }));
    } catch {
      // Keep the board usable if local storage is unavailable.
    }
  }

  function restoreBoardList() {
    let savedList;
    try {
      savedList = JSON.parse(localStorage.getItem(boardListKey) || 'null');
    } catch {
      return;
    }
    if (!savedList || !Array.isArray(savedList.names) || !savedList.names.length) return;

    const newBoardButton = document.querySelector('#newBoardBtn');
    document.querySelectorAll('.board-item').forEach((item) => item.remove());
    savedList.names.forEach((name, index) => {
      const board = document.createElement('button');
      board.type = 'button';
      board.className = `board-item${name === savedList.activeName || (!savedList.activeName && index === 0) ? ' is-active' : ''}`;
      board.dataset.boardName = name;
      board.innerHTML = `<span class="board-icon board-icon--${index === 0 ? 'sun' : 'peach'}" aria-hidden="true"></span><span class="board-name"></span>`;
      board.querySelector('.board-name').textContent = name;
      boardList.insertBefore(board, newBoardButton);
    });
  }

  function migrateEditableBoardItems() {
    notesLayer.querySelectorAll('.shape-card').forEach((element) => {
      const shape = element.querySelector('.shape');
      if (shape && !shape.querySelector('.shape-text')) {
        const text = document.createElement('span');
        text.className = 'shape-text';
        text.contentEditable = 'true';
        text.spellcheck = true;
        text.dataset.placeholder = 'Type here…';
        shape.appendChild(text);
      }
    });
    notesLayer.querySelectorAll('.emoji-stamp').forEach((element) => {
      const icon = element.querySelector('.stamp-icon') || element.querySelector('span:not(.element-resize-handle)');
      if (icon) icon.classList.add('stamp-icon');
      if (element.classList.contains('emoji-stamp--heart')) {
        element.querySelector('.stamp-text')?.remove();
      } else if (!element.querySelector('.stamp-text')) {
        const text = document.createElement('span');
        text.className = 'stamp-text';
        text.contentEditable = 'true';
        text.spellcheck = true;
        text.dataset.placeholder = 'Type here…';
        element.appendChild(text);
      }
    });
    notesLayer.querySelectorAll('.clear-text-box').forEach((element) => {
      if (element.querySelector('.clear-text-drag-handle')) return;
      const handle = document.createElement('span');
      handle.className = 'clear-text-drag-handle';
      handle.title = 'Drag text box';
      handle.setAttribute('aria-label', 'Drag text box');
      handle.textContent = '⠿';
      element.prepend(handle);
    });
    const oldBrainrotCards = notesLayer.querySelectorAll('.brainrot-card');
    oldBrainrotCards.forEach((element) => element.remove());
    if (oldBrainrotCards.length) scheduleBoardSave();
  }

  function wireRestoredBoardElements() {
    migrateEditableBoardItems();
    notesLayer.querySelectorAll('.sticky-note').forEach((note) => wireNote(note));
    notesLayer.querySelectorAll('.image-card').forEach((imageCard) => {
      enableElementResize(imageCard);
      wireImageCard(imageCard);
    });
    notesLayer.querySelectorAll('.text-card, .clear-text-box, .checklist-card, .shape-card, .emoji-stamp, .custom-object').forEach((element) => {
      enableElementResize(element);
      wireBoardElement(element);
    });
  }

  function applyBoardSnapshot(snapshot) {
    notesLayer.innerHTML = snapshot.html;
    noteCount = Number(snapshot.noteCount) || notesLayer.querySelectorAll('.sticky-note').length;
    highestZ = Number(snapshot.highestZ) || 10;
    updateRestoredBoardName(snapshot.boardName);
    wireRestoredBoardElements();
    updateEmptyState();
  }

  function restoreCanvasData(data, onComplete = () => {}) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawing = Boolean(data);
    if (!data) {
      onComplete();
      return;
    }
    const image = new Image();
    image.addEventListener('load', () => {
      const rect = canvas.getBoundingClientRect();
      ctx.drawImage(image, 0, 0, rect.width, rect.height);
      onComplete();
    });
    image.addEventListener('error', onComplete);
    image.src = data;
  }

  function applyHistorySnapshot(snapshot, message) {
    isApplyingHistory = true;
    updateHistoryButtons();
    applyBoardSnapshot(snapshot);
    restoreCanvasData(snapshot.drawing, () => {
      isApplyingHistory = false;
      saveBoardState();
      saveStatus.textContent = 'Saved just now';
      updateHistoryButtons();
      showToast(message);
    });
  }

  function undoBoard() {
    clearTimeout(historyTimer);
    commitHistorySnapshot();
    if (undoStack.length <= 1) {
      showToast('Nothing to undo yet.');
      return;
    }
    redoStack.push(undoStack.pop());
    applyHistorySnapshot(undoStack[undoStack.length - 1], 'Undid the last change.');
  }

  function redoBoard() {
    clearTimeout(historyTimer);
    commitHistorySnapshot();
    if (!redoStack.length) {
      showToast('Nothing to redo yet.');
      return;
    }
    const snapshot = redoStack.pop();
    undoStack.push(snapshot);
    applyHistorySnapshot(snapshot, 'Redid the change.');
  }

  function restoreBoardState(boardName = '') {
    const activeBoard = document.querySelector('.board-item.is-active');
    const name = boardName || activeBoard?.dataset.boardName || boardTitle.textContent.trim();
    let savedState = null;
    try {
      const savedStates = JSON.parse(localStorage.getItem(boardStatesKey) || '{}');
      if (savedStates && typeof savedStates === 'object' && !Array.isArray(savedStates)) savedState = savedStates[name] || null;
      if (!savedState && !boardName) savedState = JSON.parse(localStorage.getItem(boardStateKey) || 'null');
    } catch {
      return false;
    }
    if (!savedState || typeof savedState.html !== 'string') return false;

    applyBoardSnapshot({ ...savedState, boardName: name || savedState.boardName });
    return true;
  }

  function restoreDrawingState(onComplete, boardName = '') {
    const activeBoard = document.querySelector('.board-item.is-active');
    const name = boardName || activeBoard?.dataset.boardName || boardTitle.textContent.trim();
    let savedDrawing = null;
    try {
      const savedDrawings = JSON.parse(localStorage.getItem(boardDrawingsKey) || '{}');
      if (savedDrawings && typeof savedDrawings === 'object' && !Array.isArray(savedDrawings)) savedDrawing = savedDrawings[name] || null;
      if (!savedDrawing && !boardName) savedDrawing = localStorage.getItem(drawingStateKey);
    } catch {
      onComplete?.();
      return;
    }
    restoreCanvasData(savedDrawing, onComplete);
  }

  function clearBoard() {
    notesLayer.replaceChildren();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    noteCount = 0;
    highestZ = 10;
    hasDrawing = false;
    updateEmptyState();
  }

  function enableElementResize(element) {
    const handle = element.querySelector('.element-resize-handle') || document.createElement('span');
    if (!handle.parentElement) {
      handle.className = 'element-resize-handle';
      handle.setAttribute('role', 'img');
      handle.setAttribute('aria-label', 'Resize item');
      handle.title = 'Resize item';
      element.appendChild(handle);
    }
    if (!wiredResizeHandles.has(handle)) {
      handle.addEventListener('pointerdown', (event) => startResizing(event, element));
      wiredResizeHandles.add(handle);
    }
  }

  function selectBoard(button, isNew = false) {
    const previousBoard = document.querySelector('.board-item.is-active');
    if (previousBoard && previousBoard !== button) saveBoardState(previousBoard.dataset.boardName);
    const name = button.dataset.boardName;
    document.querySelectorAll('.board-item').forEach((item) => item.classList.toggle('is-active', item === button));
    boardTitle.textContent = name;
    breadcrumbTitle.textContent = name;
    if (isNew || !restoreBoardState(name)) clearBoard();
    restoreDrawingState(() => {
      saveBoardState(name);
      initializeHistory();
      saveStatus.textContent = 'Saved just now';
    }, name);
    saveBoardList();
    showToast(`${name} is ready for new ideas.`);
  }

  function renameSelectedBoard() {
    const activeBoard = document.querySelector('.board-item.is-active');
    const currentName = boardTitle.textContent.trim();
    const nextName = window.prompt('What should we call this board?', currentName);
    if (!nextName || !nextName.trim()) return;
    const name = nextName.trim();
    activeBoard.dataset.boardName = name;
    activeBoard.querySelector('.board-name').textContent = name;
    boardTitle.textContent = name;
    breadcrumbTitle.textContent = name;
    updateSavedStatus();
    saveBoardList();
    showToast('Board name updated.');
  }

  function deleteSelectedBoard() {
    const activeBoard = document.querySelector('.board-item.is-active');
    const boards = [...document.querySelectorAll('.board-item')];
    if (!activeBoard || boards.length <= 1) {
      showToast('Keep at least one board available.');
      return;
    }
    const name = activeBoard.dataset.boardName;
    if (!window.confirm(`Delete “${name}” and all of its ideas?`)) return;

    try {
      const savedStates = JSON.parse(localStorage.getItem(boardStatesKey) || '{}');
      if (savedStates && typeof savedStates === 'object' && !Array.isArray(savedStates)) {
        delete savedStates[name];
        localStorage.setItem(boardStatesKey, JSON.stringify(savedStates));
      }
      const savedDrawings = JSON.parse(localStorage.getItem(boardDrawingsKey) || '{}');
      if (savedDrawings && typeof savedDrawings === 'object' && !Array.isArray(savedDrawings)) {
        delete savedDrawings[name];
        localStorage.setItem(boardDrawingsKey, JSON.stringify(savedDrawings));
      }
    } catch {
      // The board can still be removed from the current session if storage is unavailable.
    }

    const nextBoard = boards.find((board) => board !== activeBoard);
    activeBoard.remove();
    selectBoard(nextBoard);
    saveBoardList();
    showToast(`${name} deleted.`);
  }

  function closeBoardSettingsMenu() {
    boardSettingsMenu.hidden = true;
    boardSettingsButton.setAttribute('aria-expanded', 'false');
  }

  function addBoard(name) {
    const board = document.createElement('button');
    board.type = 'button';
    board.className = 'board-item';
    board.dataset.boardName = name;
    board.innerHTML = '<span class="board-icon board-icon--peach" aria-hidden="true"></span><span class="board-name"></span>';
    board.querySelector('.board-name').textContent = name;
    boardList.insertBefore(board, document.querySelector('#newBoardBtn'));
    board.addEventListener('click', () => selectBoard(board));
    selectBoard(board, true);
    saveBoardList();
  }

  function randomNoteClass() {
    const styles = ['', 'is-blue', 'is-lilac', 'is-peach'];
    return styles[noteCount % styles.length];
  }

  function addNote(text = '', position = null) {
    noteCount += 1;
    const note = template.content.firstElementChild.cloneNode(true);
    const noteBody = note.querySelector('.note-body');
    const noteStyle = randomNoteClass();
    if (noteStyle) note.classList.add(noteStyle);
    note.dataset.noteId = `note-${Date.now()}-${noteCount}`;
    noteBody.textContent = text;

    const paperRect = paper.getBoundingClientRect();
    const left = position ? position.x : Math.min(52 + ((noteCount - 1) % 3) * 190, paperRect.width - 180);
    const top = position ? position.y : Math.min(74 + ((noteCount - 1) % 2) * 182, paperRect.height - 178);
    note.style.left = `${Math.max(12, left)}px`;
    note.style.top = `${Math.max(22, top)}px`;
    note.style.zIndex = ++highestZ;
    notesLayer.appendChild(note);
    enableElementResize(note);
    wireNote(note);
    updateEmptyState();
    updateSavedStatus();
    noteBody.focus();
    showToast('A fresh thought, ready for you.');
    return note;
  }

  function placeElement(element, offset = 0) {
    notesLayer.appendChild(element);
    const itemNumber = notesLayer.children.length;
    const maxLeft = Math.max(12, paper.clientWidth - (element.offsetWidth || 190) - 12);
    const maxTop = Math.max(24, paper.clientHeight - (element.offsetHeight || 150) - 12);
    element.style.left = `${Math.max(12, Math.min(62 + ((itemNumber + offset) % 4) * 175, maxLeft))}px`;
    element.style.top = `${Math.max(24, Math.min(76 + ((itemNumber + offset) % 3) * 142, maxTop))}px`;
    element.style.zIndex = ++highestZ;
    enableElementResize(element);
    wireBoardElement(element);
    updateEmptyState();
    updateSavedStatus();
    return element;
  }

  function wireBoardElement(element) {
    element.addEventListener('pointerdown', (event) => {
      if (activeTool !== 'select' || event.target.closest('button, input, [contenteditable="true"]')) return;
      startDragging(event, element);
    });
    const clearTextDragHandle = element.querySelector('.clear-text-drag-handle');
    if (clearTextDragHandle && clearTextDragHandle.dataset.wired !== 'true') {
      clearTextDragHandle.dataset.wired = 'true';
      clearTextDragHandle.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        startDragging(event, element);
      });
    }
    element.addEventListener('focus', () => { element.style.zIndex = ++highestZ; }, true);
    element.querySelectorAll('[contenteditable="true"]').forEach((editable) => {
      editable.addEventListener('input', updateSavedStatus);
      editable.addEventListener('blur', () => {
        autoCorrect(editable);
        updateSavedStatus();
      });
      editable.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) event.preventDefault();
      });
    });
    const removeButton = element.querySelector('.element-remove');
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        element.remove();
        updateEmptyState();
        updateSavedStatus();
        showToast('Element removed.');
      });
    }
  }

  function addTextCard() {
    const card = document.createElement('article');
    card.className = 'text-card';
    card.tabIndex = 0;
    card.innerHTML = '<span class="element-kicker">THOUGHT</span><button class="element-remove" type="button" aria-label="Remove text card">×</button><div class="text-card-body" contenteditable="true" data-placeholder="Write a longer thought…"></div>';
    placeElement(card, 1);
    card.querySelector('[contenteditable="true"]').focus();
    showToast('A bigger space for a bigger thought.');
  }

  function addClearTextBox() {
    const card = document.createElement('article');
    card.className = 'clear-text-box';
    card.tabIndex = 0;
    card.innerHTML = '<span class="clear-text-drag-handle" title="Drag text box" aria-label="Drag text box">⠿</span><button class="element-remove" type="button" aria-label="Remove clear text box">×</button><div class="clear-text-body" contenteditable="true" spellcheck="true" data-placeholder="Type freely…"></div>';
    placeElement(card, 2);
    card.querySelector('.clear-text-body').focus();
    showToast('A clear text box is ready.');
  }

  function addChecklist() {
    const card = document.createElement('article');
    card.className = 'checklist-card';
    card.tabIndex = 0;
    card.innerHTML = '<span class="element-kicker">CHECKLIST</span><button class="element-remove" type="button" aria-label="Remove checklist">×</button><div class="checklist-title" contenteditable="true">Next steps</div><label><input type="checkbox"><span contenteditable="true">First small step</span></label><label><input type="checkbox"><span contenteditable="true">Ask a curious question</span></label><label><input type="checkbox"><span contenteditable="true">Make it visible</span></label>';
    placeElement(card, 2);
    showToast('A checklist for turning ideas into motion.');
  }

  function addShape() {
    const card = document.createElement('article');
    card.className = 'shape-card';
    card.tabIndex = 0;
    card.innerHTML = '<button class="element-remove" type="button" aria-label="Remove shape">×</button><span class="shape shape--circle"><span class="shape-text" contenteditable="true" spellcheck="true" data-placeholder="Type here…"></span></span>';
    placeElement(card, 3);
    card.querySelector('.shape-text').focus();
    showToast('A shape for grouping or connecting ideas.');
  }

  function addIdeaStamp(icon = '💡', message = 'A little spark for the board.') {
    const stamp = document.createElement('article');
    stamp.className = `emoji-stamp${icon === '♥' ? ' emoji-stamp--heart' : ''}`;
    stamp.tabIndex = 0;
    stamp.innerHTML = `<button class="element-remove" type="button" aria-label="Remove idea stamp">×</button><span class="stamp-icon" aria-hidden="true">${icon}</span>${icon === '♥' ? '' : '<span class="stamp-text" contenteditable="true" spellcheck="true" data-placeholder="Type here…"></span>'}`;
    stamp.querySelector('.stamp-icon').textContent = icon;
    placeElement(stamp, 4);
    stamp.querySelector('.stamp-text')?.focus();
    showToast(message);
  }

  function addCustomCard(text) {
    const card = document.createElement('article');
    const normalized = text.toLowerCase().replace(/[-_]+/g, ' ');
    let visualType = 'generic';
    let visualLabel = 'CUSTOM IDEA';
    if (/sketch\s*book/.test(normalized)) {
      visualType = 'sketchbook';
      visualLabel = 'SKETCHBOOK';
    } else if (/calendar|schedule|planner/.test(normalized)) {
      visualType = 'calendar';
      visualLabel = 'CALENDAR';
    } else if (/book|novel|journal/.test(normalized)) {
      visualType = 'book';
      visualLabel = 'BOOK';
    } else if (/camera|photo|picture/.test(normalized)) {
      visualType = 'camera';
      visualLabel = 'CAMERA';
    } else if (/phone|mobile/.test(normalized)) {
      visualType = 'phone';
      visualLabel = 'PHONE';
    } else if (/map|location|place/.test(normalized)) {
      visualType = 'map';
      visualLabel = 'MAP';
    } else if (/music|song|playlist/.test(normalized)) {
      visualType = 'music';
      visualLabel = 'MUSIC';
    }
    card.className = `custom-object custom-object--${visualType}`;
    card.tabIndex = 0;
    const openBookPages = visualType === 'book' || visualType === 'sketchbook'
      ? '<span class="open-page open-page--left"></span><span class="open-page open-page--right"></span><span class="object-pencil">✎</span>'
      : '';
    card.innerHTML = `<span class="object-drag-handle" title="Drag this object" aria-label="Drag this object">⠿</span><button class="element-remove" type="button" aria-label="Remove custom item">×</button><div class="object-art" aria-hidden="true">${openBookPages}</div><span class="object-label"></span><span class="object-caption" contenteditable="true"></span>`;
    card.querySelector('.object-label').textContent = visualLabel;
    card.querySelector('.object-caption').textContent = text;
    placeElement(card, 5);
    card.querySelector('.object-caption').focus();
    showToast(`${visualLabel[0] + visualLabel.slice(1).toLowerCase()} added to the board.`);
  }

  function wireImageCard(imageCard) {
    imageCard.addEventListener('pointerdown', (event) => {
      if (activeTool !== 'select' || event.target.closest('.image-remove')) return;
      startDragging(event, imageCard);
    });
    imageCard.querySelector('.image-remove').addEventListener('click', () => {
      imageCard.remove();
      updateEmptyState();
      updateSavedStatus();
      showToast('Image removed.');
    });
  }

  function addImage(dataUrl, fileName) {
    const imageCard = document.createElement('article');
    imageCard.className = 'image-card';
    imageCard.tabIndex = 0;
    imageCard.innerHTML = '<img alt="Uploaded brainstorming image"><button class="image-remove" type="button" aria-label="Remove image">×</button><span class="image-caption"></span>';
    imageCard.querySelector('img').src = dataUrl;
    imageCard.querySelector('img').alt = fileName || 'Brainstorming image';
    imageCard.querySelector('.image-caption').textContent = fileName || 'image';
    const itemNumber = notesLayer.children.length;
    imageCard.style.left = `${Math.max(12, Math.min(120 + (itemNumber % 3) * 195, paper.clientWidth - 210))}px`;
    imageCard.style.top = `${Math.max(24, Math.min(92 + (itemNumber % 2) * 186, paper.clientHeight - 205))}px`;
    imageCard.style.zIndex = ++highestZ;
    notesLayer.appendChild(imageCard);
    enableElementResize(imageCard);
    wireImageCard(imageCard);
    updateEmptyState();
    updateSavedStatus();
  }

  function wireNote(note) {
    const body = note.querySelector('.note-body');
    const menu = note.querySelector('.note-menu');
    note.addEventListener('pointerdown', (event) => {
      if (activeTool !== 'select' || event.target.closest('[contenteditable="true"]') || event.target.closest('.note-menu')) return;
      startDragging(event, note);
    });
    note.addEventListener('focus', () => { note.style.zIndex = ++highestZ; }, true);
    body.addEventListener('input', () => { updateSavedStatus(); });
    body.addEventListener('blur', () => {
      autoCorrect(body);
      updateSavedStatus();
    });
    body.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') event.preventDefault();
    });
    menu.addEventListener('click', (event) => {
      event.stopPropagation();
      if (confirm('Remove this sticky note?')) {
        note.remove();
        updateEmptyState();
        updateSavedStatus();
        showToast('Note removed.');
      }
    });
  }

  function autoCorrect(element) {
    const original = element.textContent;
    const corrected = original.replace(/\b([a-zA-Z']+)\b/g, (word) => {
      const replacement = corrections[word.toLowerCase()];
      if (!replacement) return word;
      if (word[0] === word[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
      return replacement;
    });
    if (corrected !== original) {
      element.textContent = corrected;
      showToast('Tiny typo tidied up.');
    }
  }

  function startDragging(event, element) {
    event.preventDefault();
    event.stopPropagation();
    element.classList.add('is-dragging');
    element.style.zIndex = ++highestZ;
    element.setPointerCapture?.(event.pointerId);
    const paperRect = paper.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scaleX = paperRect.width / paper.clientWidth || 1;
    const scaleY = paperRect.height / paper.clientHeight || 1;
    const offsetX = (event.clientX - elementRect.left) / scaleX;
    const offsetY = (event.clientY - elementRect.top) / scaleY;
    const move = (moveEvent) => {
      const x = Math.max(8, Math.min(paper.clientWidth - element.offsetWidth - 8, (moveEvent.clientX - paperRect.left) / scaleX - offsetX));
      const y = Math.max(18, Math.min(paper.clientHeight - element.offsetHeight - 8, (moveEvent.clientY - paperRect.top) / scaleY - offsetY));
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    };
    const finish = () => {
      element.classList.remove('is-dragging');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', finish);
      element.removeEventListener('pointercancel', finish);
      updateSavedStatus();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish, { once: true });
    document.addEventListener('pointercancel', finish, { once: true });
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', finish, { once: true });
    element.addEventListener('pointercancel', finish, { once: true });
  }

  function startResizing(event, element) {
    if (activeTool !== 'select') return;
    event.preventDefault();
    event.stopPropagation();
    element.classList.add('is-resizing');
    element.style.zIndex = ++highestZ;
    const paperRect = paper.getBoundingClientRect();
    const scaleX = paperRect.width / paper.clientWidth || 1;
    const scaleY = paperRect.height / paper.clientHeight || 1;
    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;
    const startX = event.clientX;
    const startY = event.clientY;
    const isIdeaStamp = element.classList.contains('emoji-stamp');
    const isImageCard = element.classList.contains('image-card');
    const image = isImageCard ? element.querySelector('img') : null;
    const minWidth = isIdeaStamp ? 48 : (element.classList.contains('custom-object') ? 190 : (isImageCard ? 170 : 145));
    const minHeight = isIdeaStamp ? 48 : (element.classList.contains('custom-object') ? 180 : (isImageCard ? 145 : 105));
    const stampIcon = isIdeaStamp ? element.querySelector('span:not(.element-resize-handle)') : null;
    const elementLeft = parseFloat(element.style.left) || 0;
    const elementTop = parseFloat(element.style.top) || 0;
    const maxWidth = Math.max(minWidth, paper.clientWidth - elementLeft - 12);
    const maxHeight = Math.max(minHeight, paper.clientHeight - elementTop - 12);
    const move = (moveEvent) => {
      const nextWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + (moveEvent.clientX - startX) / scaleX));
      const nextHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + (moveEvent.clientY - startY) / scaleY));
      element.style.width = `${nextWidth}px`;
      element.style.height = `${nextHeight}px`;
      if (image) {
        image.style.maxHeight = 'none';
        image.style.height = `${Math.max(45, nextHeight - 48)}px`;
      }
      if (stampIcon) stampIcon.style.fontSize = `${Math.max(24, Math.min(nextWidth, nextHeight) * .65)}px`;
    };
    const finish = () => {
      element.classList.remove('is-resizing');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      updateSavedStatus();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish, { once: true });
    document.addEventListener('pointercancel', finish, { once: true });
  }

  function setCanvasSize() {
    const rect = paper.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2.4;
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (activeTool === 'select') return;
    drawing = true;
    hasDrawing = true;
    lastPoint = getCanvasPoint(event);
    canvas.setPointerCapture(event.pointerId);
    if (activeTool === 'erase') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 2.4;
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const point = getCanvasPoint(event);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint = point;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => canvas.addEventListener(eventName, () => {
    if (!drawing) return;
    drawing = false;
    ctx.restore();
    updateSavedStatus();
  }));

  workspace.addEventListener('pointerdown', (event) => {
    if (!spaceHeld || activeTool !== 'select') return;
    event.preventDefault();
    event.stopPropagation();
    panState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: workspace.scrollLeft,
      scrollTop: workspace.scrollTop
    };
    workspace.setPointerCapture(event.pointerId);
    workspace.classList.add('is-panning');
  }, true);
  workspace.addEventListener('pointermove', (event) => {
    if (!panState || event.pointerId !== panState.pointerId) return;
    workspace.scrollLeft = panState.scrollLeft - (event.clientX - panState.startX);
    workspace.scrollTop = panState.scrollTop - (event.clientY - panState.startY);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((eventName) => {
    workspace.addEventListener(eventName, () => {
      panState = null;
      workspace.classList.remove('is-panning');
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.target.matches('input, textarea, [contenteditable="true"]')) return;
    spaceHeld = true;
    workspace.classList.add('is-panning');
    event.preventDefault();
  });
  document.addEventListener('keyup', (event) => {
    if (event.code !== 'Space') return;
    spaceHeld = false;
    if (!panState) workspace.classList.remove('is-panning');
  });

  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.addEventListener('click', () => {
      activeTool = button.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach((item) => item.classList.toggle('is-selected', item === button));
      workspace.classList.toggle('is-drawing', activeTool === 'draw');
      workspace.classList.toggle('is-erasing', activeTool === 'erase');
      paper.classList.toggle('is-drawing', activeTool === 'draw');
      paper.classList.toggle('is-erasing', activeTool === 'erase');
      if (activeTool === 'draw') showToast('Draw directly on your notepad.');
      if (activeTool === 'erase') showToast('Erase strokes as you go.');
    });
  });

  paletteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      drawColor = button.dataset.color;
      paletteButtons.forEach((swatch) => swatch.classList.toggle('is-active', swatch === button));
      showToast(`${button.title} ink selected.`);
    });
  });

  function closeAddContentMenu() {
    addContentMenu.hidden = true;
    addContentButton.setAttribute('aria-expanded', 'false');
  }

  function positionAddContentMenu() {
    if (addContentMenu.hidden) return;
    const buttonRect = addContentButton.getBoundingClientRect();
    const menuWidth = addContentMenu.offsetWidth || 165;
    const menuHeight = addContentMenu.offsetHeight || 300;
    const left = Math.max(8, Math.min(buttonRect.left, window.innerWidth - menuWidth - 8));
    let top = buttonRect.bottom + 7;
    if (top + menuHeight > window.innerHeight - 8) top = buttonRect.top - menuHeight - 7;
    addContentMenu.style.left = `${left}px`;
    addContentMenu.style.top = `${Math.max(8, top)}px`;
  }

  addContentButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = !addContentMenu.hidden;
    if (isOpen) {
      closeAddContentMenu();
      return;
    }
    addContentMenu.hidden = false;
    addContentButton.setAttribute('aria-expanded', 'true');
    positionAddContentMenu();
  });
  toolbarScroll.addEventListener('scroll', positionAddContentMenu);
  window.addEventListener('resize', positionAddContentMenu);
  window.addEventListener('scroll', positionAddContentMenu, true);
  addContentMenu.querySelectorAll('[data-add-item]').forEach((button) => {
    button.addEventListener('click', () => {
      closeAddContentMenu();
      const itemType = button.dataset.addItem;
      if (itemType === 'note') addNote();
      if (itemType === 'text') addTextCard();
      if (itemType === 'clear-text') addClearTextBox();
      if (itemType === 'checklist') addChecklist();
      if (itemType === 'shape') addShape();
      if (itemType === 'emoji') addIdeaStamp();
      if (itemType === 'heart') addIdeaStamp('♥', 'A heart for the board.');
      if (itemType === 'image') openImageModal();
      if (itemType === 'other') openCustomItemModal();
    });
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.add-content-wrap')) closeAddContentMenu();
    if (!event.target.closest('.board-settings-wrap')) closeBoardSettingsMenu();
  });

  addNoteButton.addEventListener('click', () => addNote());
  addImageButton.addEventListener('click', openImageModal);
  document.querySelector('.edit-title').addEventListener('click', renameSelectedBoard);
  boardSettingsButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = !boardSettingsMenu.hidden;
    boardSettingsMenu.hidden = isOpen;
    boardSettingsButton.setAttribute('aria-expanded', String(!isOpen));
  });
  boardSettingsMenu.querySelectorAll('[data-board-setting]').forEach((button) => {
    button.addEventListener('click', () => {
      const setting = button.dataset.boardSetting;
      closeBoardSettingsMenu();
      if (setting === 'rename') renameSelectedBoard();
      if (setting === 'view') document.querySelector('#resetView').click();
      if (setting === 'clear') document.querySelector('#resetIdeas').click();
      if (setting === 'delete') deleteSelectedBoard();
    });
  });
  boardSearchButton.addEventListener('click', openBoardSearch);
  document.querySelector('#boardSearchClose').addEventListener('click', closeBoardSearch);
  boardSearchModal.addEventListener('click', (event) => {
    if (event.target === boardSearchModal) closeBoardSearch();
  });
  boardSearchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    searchBoard(boardSearchInput.value);
  });
  boardSearchInput.addEventListener('input', () => searchBoard(boardSearchInput.value));
  document.querySelector('#customItemClose').addEventListener('click', closeCustomItemModal);
  customItemModal.addEventListener('click', (event) => {
    if (event.target === customItemModal) closeCustomItemModal();
  });
  customItemForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = customItemText.value.trim();
    if (!text) return;
    addCustomCard(text);
    customItemText.value = '';
    closeCustomItemModal();
  });
  document.querySelector('#imageModalClose').addEventListener('click', closeImageModal);
  document.querySelector('#chooseImageButton').addEventListener('click', () => {
    closeImageModal();
    imageInput.click();
  });
  imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal) closeImageModal();
  });
  function showImageSearchFallback(query, message) {
    const fallback = document.createElement('div');
    fallback.className = 'search-fallback';

    const status = document.createElement('span');
    status.className = 'search-fallback-message';
    status.textContent = message;

    const webSearchButton = document.createElement('button');
    webSearchButton.type = 'button';
    webSearchButton.className = 'search-fallback-button';
    webSearchButton.textContent = 'Open image search';
    webSearchButton.addEventListener('click', () => {
      const searchUrl = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(query)}&title=Special:MediaSearch&type=image`;
      window.open(searchUrl, '_blank', 'noopener');
    });

    fallback.append(status, webSearchButton);
    imageSearchResults.replaceChildren(fallback);
  }

  imageSearchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = imageSearchQuery.value.trim();
    if (!query) return;
    const submitButton = imageSearchForm.querySelector('button[type="submit"]');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    submitButton.disabled = true;
    imageSearchResults.innerHTML = '<span class="search-status">Searching for visual references…</span>';
    try {
      const endpoint = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=320&format=json&origin=*';
      const response = await fetch(`${endpoint}&gsrsearch=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Search unavailable');
      const data = await response.json();
      const results = Object.values(data.query?.pages || []).map((page) => ({
        title: page.title.replace(/^File:/, ''),
        url: page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url
      })).filter((result) => result.url);
      if (!results.length) {
        showImageSearchFallback(query, 'No matching pictures were found here.');
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'search-results-grid';
      results.forEach((result) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-result';
        button.title = `Add ${result.title}`;
        button.innerHTML = `<img loading="lazy" alt=""><span></span>`;
        button.querySelector('img').src = result.url;
        button.querySelector('img').alt = result.title;
        button.querySelector('span').textContent = result.title;
        button.addEventListener('click', () => {
          addImage(result.url, result.title);
          closeImageModal();
          showToast('Image added to your board.');
        });
        grid.appendChild(button);
      });
      imageSearchResults.replaceChildren(grid);
    } catch {
      showImageSearchFallback(query, 'The picture search took too long or is unavailable.');
    } finally {
      window.clearTimeout(timeoutId);
      submitButton.disabled = false;
    }
  });
  imageSearchQuery.addEventListener('input', () => {
    clearTimeout(imageSearchTimer);
    const query = imageSearchQuery.value.trim();
    if (!query) {
      imageSearchResults.innerHTML = '<span class="search-placeholder">Type a word or letter to see matching pictures.</span>';
      return;
    }
    imageSearchTimer = setTimeout(() => imageSearchForm.requestSubmit(), 450);
  });
  document.querySelector('#imageUrlForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#imageUrlInput');
    const url = input.value.trim();
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('Unsupported URL');
      addImage(parsed.href, 'Linked image');
      input.value = '';
      closeImageModal();
      showToast('Image added to your board.');
    } catch {
      input.setCustomValidity('Please enter a valid image URL.');
      input.reportValidity();
      input.setCustomValidity('');
    }
  });
  imageInput.addEventListener('change', (event) => {
    const files = [...event.target.files].filter((file) => file.type.startsWith('image/'));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => addImage(reader.result, file.name));
      reader.readAsDataURL(file);
    });
    if (files.length) showToast(`${files.length} image${files.length === 1 ? '' : 's'} added to your board.`);
    event.target.value = '';
  });
  restoreBoardList();
  document.querySelectorAll('.board-item').forEach((button) => button.addEventListener('click', () => selectBoard(button)));
  document.querySelector('#newBoardBtn').addEventListener('click', () => {
    const suggestedName = `New board ${document.querySelectorAll('.board-item').length + 1}`;
    const name = window.prompt('What should we call this board?', suggestedName);
    if (name && name.trim()) addBoard(name.trim());
  });
  accountButton.addEventListener('click', openAccountModal);
  document.querySelector('#accountClose').addEventListener('click', closeAccountModal);
  document.querySelector('#guestButton').addEventListener('click', () => {
    closeAccountModal();
    showToast('You’re brainstorming as a guest.');
  });
  accountModal.addEventListener('click', (event) => {
    if (event.target === accountModal) closeAccountModal();
  });
  accountForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(accountForm);
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const password = String(formData.get('password') || '').trim();
    if (!firstName || !lastName) return;
    if (!/^\d{6}$/.test(password)) {
      document.querySelector('#accountPassword').setCustomValidity('Use exactly 6 digits.');
      document.querySelector('#accountPassword').reportValidity();
      document.querySelector('#accountPassword').setCustomValidity('');
      return;
    }
    const name = `${firstName} ${lastName}`;
    profile = { name, firstName, lastName };
    try { localStorage.setItem('pinboard-profile', JSON.stringify(profile)); } catch { /* local storage may be unavailable */ }
    updateProfileUI(name);
    loadNotifications();
    renderNotifications();
    closeAccountModal();
    showToast(`Welcome, ${name.split(/\s+/)[0]}. Your account is ready.`);
  });
  document.querySelector('#shareBtn').addEventListener('click', openCollabModal);
  notificationButton.addEventListener('click', toggleNotifications);
  document.querySelector('#markNotificationsRead').addEventListener('click', () => {
    const viewer = (profile?.name || '').trim().toLowerCase();
    notifications.forEach((notification) => {
      if (notification.recipient && viewer && notification.recipient.toLowerCase() === viewer) notification.read = true;
    });
    saveNotifications();
    renderNotifications();
    showToast('Notifications marked as read.');
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.notifications-wrap')) {
      notificationsPanel.hidden = true;
      notificationButton.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelector('#collabModalClose').addEventListener('click', closeCollabModal);
  collabModal.addEventListener('click', (event) => {
    if (event.target === collabModal) closeCollabModal();
  });
  chatButton.addEventListener('click', openChatModal);
  document.querySelector('#chatModalClose').addEventListener('click', closeChatModal);
  chatModal.addEventListener('click', (event) => {
    if (event.target === chatModal) closeChatModal();
  });
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = chatMessageInput.value.trim();
    if (!text) return;
    chatEntries.push({
      name: chatNameInput.value.trim() || profile?.name || 'You',
      text,
      createdAt: new Date().toISOString()
    });
    saveChatMessages();
    renderChatMessages();
    chatMessageInput.value = '';
    chatMessageInput.focus();
  });
  document.querySelector('#copyInviteLink').addEventListener('click', () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteLink.value).then(() => showToast('Invite link copied.')).catch(() => {
        inviteLink.select();
        showToast('Invite link ready to copy.');
      });
      return;
    }
    inviteLink.select();
    showToast('Invite link ready to copy.');
  });
  document.querySelector('#inviteFriendForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = friendName.value.trim();
    if (!name) return;
    if (collaborators.some((person) => person.toLowerCase() === name.toLowerCase())) {
      showToast(`${name} is already invited.`);
      return;
    }
    collaborators.push(name);
    notifications.push({
      id: `invite-${Date.now()}`,
      inviter: profile?.name || 'You',
      recipient: name,
      board: boardTitle.textContent.trim() || 'Morning ideas',
      read: false,
      status: 'pending'
    });
    saveCollaborators();
    saveNotifications();
    renderCollaborators();
    friendName.value = '';
    showToast(`Invite ready for ${name}.`);
  });

  document.querySelector('#zoomIn').addEventListener('click', () => setZoom(Math.min(1.2, zoom + .1)));
  document.querySelector('#zoomOut').addEventListener('click', () => setZoom(Math.max(.8, zoom - .1)));
  undoButton.addEventListener('click', undoBoard);
  redoButton.addEventListener('click', redoBoard);
  document.querySelector('#fitBoard').addEventListener('click', () => {
    paper.style.transition = 'none';
    setZoom(1);
    workspace.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    workspaceWrap.scrollIntoView({ behavior: 'auto', block: 'start' });
    window.requestAnimationFrame(() => {
      paper.style.transition = '';
    });
  });
  document.querySelector('#resetView').addEventListener('click', () => {
    setZoom(1);
    document.querySelector('[data-tool="select"]').click();
    showToast('View reset. Your ideas stayed put.');
  });
  document.querySelector('#resetIdeas').addEventListener('click', () => {
    if (!notesLayer.children.length && !hasDrawing) {
      showToast('This board is already clear.');
      return;
    }
    if (window.confirm('Clear all notes and drawings from this board?')) {
      clearBoard();
      updateSavedStatus();
      showToast('Board reset. Ready for a fresh start.');
    }
  });
  function setZoom(value) {
    zoom = value;
    paper.style.transform = `scale(${zoom})`;
    document.querySelector('#zoomLabel').textContent = `${Math.round(zoom * 100)}%`;
  }

  document.addEventListener('keydown', (event) => {
    if (event.target.matches('[contenteditable="true"], input, textarea')) return;
    if (event.key.toLowerCase() === 'n') addNote();
    if (event.key.toLowerCase() === 'd') document.querySelector('[data-tool="draw"]').click();
    if (event.key === 'Escape') document.querySelector('[data-tool="select"]').click();
  });

  const starterNotes = [
    { text: 'What would make today feel lighter?', x: 66, y: 70 },
    { text: 'Make space for the weird ideas.', x: 270, y: 160 },
    { text: 'A tiny step is still a step.', x: 490, y: 72 },
    { text: 'What if we tried the opposite?', x: 690, y: 220 },
    { text: 'Collect the sparks before judging them.', x: 170, y: 360 },
    { text: 'Leave room for a happy accident.', x: 470, y: 390 }
  ];
  setCanvasSize();
  const restoredBoard = restoreBoardState();
  if (!restoredBoard) starterNotes.forEach((item) => addNote(item.text, item));
  restoreDrawingState(initializeHistory);
  window.addEventListener('resize', setCanvasSize);
  window.addEventListener('beforeunload', saveBoardState);
  window.addEventListener('pagehide', () => saveBoardState());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveBoardState();
  });
  loadProfile();
  loadCollaborators();
  loadNotifications();
  renderNotifications();
  loadChatMessages();
  try {
    if (!localStorage.getItem('pinboard-profile') && !localStorage.getItem('pinboard-guest')) openAccountModal();
  } catch {
    openAccountModal();
  }
  document.querySelector('#guestButton').addEventListener('click', () => {
    try { localStorage.setItem('pinboard-guest', 'true'); } catch { /* local storage may be unavailable */ }
  }, { once: true });
})();
