import { state } from "./state.js";

// DOM Selectors cached
const els = {
    // Modals & Screens
    loginScreen: document.getElementById("login-screen"),
    registerScreen: document.getElementById("register-screen"),
    dashboardScreen: document.getElementById("dashboard-screen"),

    // Auth
    loginForm: document.getElementById("login-form"),
    registerForm: document.getElementById("register-form"),
    toRegisterBtn: document.getElementById("to-register"),
    toLoginBtn: document.getElementById("to-login"),
    logoutBtn: document.getElementById("logout-btn"),
    userNameDisp: document.getElementById("user-name-disp"),

    // Theme
    themeToggle: document.getElementById("theme-toggle"),

    // Inputs
    searchInput: document.getElementById("search-input"),

    // Save Actions
    saveActiveBtn: document.getElementById("save-active-btn"),
    saveAllBtn: document.getElementById("save-all-btn"),
    exportBtn: document.getElementById("export-btn"),
    openDashboardBtn: document.getElementById("open-dashboard-btn"),

    // Links List
    linksList: document.getElementById("links-list"),
    loadingSpinner: document.getElementById("loading-spinner"),
    emptyState: document.getElementById("empty-state"),

    // Pagination
    prevPageBtn: document.getElementById("prev-page"),
    nextPageBtn: document.getElementById("next-page"),
    pageIndicator: document.getElementById("page-indicator"),

    // View Toggle
    viewTabsBtn: document.getElementById("view-tabs-btn"),
    viewSessionsBtn: document.getElementById("view-sessions-btn"),

    // Modal
    saveAllModal: document.getElementById("save-all-modal"),
    modalNewSessionBtn: document.getElementById("modal-new-session"),
    modalMergeSessionBtn: document.getElementById("modal-merge-session"),
    newSessionForm: document.getElementById("new-session-form"),
    mergeSessionForm: document.getElementById("merge-session-form"),
    modalCloseBtn: document.getElementById("modal-close"),
    sessionNameInput: document.getElementById("session-name"),
    sessionDescInput: document.getElementById("session-desc"),
    sessionTagInput: document.getElementById("session-tag"),
    mergeSessionSelect: document.getElementById("merge-session-select"),
};

// Toast Notifications
export function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    const container = document.getElementById("toast-container");
    container.appendChild(toast);

    // Animate in
    setTimeout(() => (toast.style.opacity = "1"), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// View Switches
export function showScreen(screenId) {
    els.loginScreen.classList.add("hidden");
    els.registerScreen.classList.add("hidden");
    els.dashboardScreen.classList.add("hidden");

    document.getElementById(`${screenId}-screen`).classList.remove("hidden");
}

// Set Loading States on Buttons
export function setBtnLoading(btn, isLoading) {
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = `<span class="spinner"></span>`;
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.originalText;
        btn.disabled = false;
    }
}

// Toggle List Visibility States
export function showListLoading() {
    els.loadingSpinner.classList.remove("hidden");
    els.linksList.innerHTML = "";
    els.emptyState.classList.add("hidden");
}

export function hideListLoading() {
    els.loadingSpinner.classList.add("hidden");
}

export function showEmptyState(msg) {
    els.emptyState.textContent = msg;
    els.emptyState.classList.remove("hidden");
    els.linksList.innerHTML = "";
}

// Render Link Cards
export function renderLinks(onOpen, onDelete) {
    hideListLoading();
    els.linksList.innerHTML = "";

    if (state.links.length === 0) {
        showEmptyState(
            state.searchQuery
                ? "No matching links found."
                : "Your vault is empty.",
        );
        return;
    }

    els.emptyState.classList.add("hidden");

    state.links.forEach((link) => {
        const card = document.createElement("div");
        card.className = "link-card";

        // Image Container
        const imgDiv = document.createElement("div");
        imgDiv.className = "link-icon";
        if (link.favicon) {
            const img = document.createElement("img");
            img.src = link.favicon;
            img.onerror = () => {
                img.style.display = "none";
            };
            imgDiv.appendChild(img);
        }

        // Content Container
        const contentDiv = document.createElement("div");
        contentDiv.className = "link-content";

        const title = document.createElement("h3");
        title.className = "link-title";
        title.textContent = link.title || new URL(link.url).hostname;
        title.title = link.url;
        title.onclick = () => onOpen(link.url);

        const urlPath = document.createElement("p");
        urlPath.className = "link-url";
        urlPath.textContent = link.url;

        // Tags List
        const metaDiv = document.createElement("div");
        metaDiv.className = "link-meta";

        const dateSpan = document.createElement("span");
        dateSpan.className = "link-date";
        dateSpan.textContent = new Date(link.created_at).toLocaleDateString();
        metaDiv.appendChild(dateSpan);

        contentDiv.appendChild(title);
        contentDiv.appendChild(urlPath);
        contentDiv.appendChild(metaDiv);

        // Actions Container
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "link-actions";

        const openBtn = document.createElement("button");
        openBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`; // Setup basic icon
        openBtn.title = "Open Link";
        openBtn.onclick = () => onOpen(link.url);

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
        deleteBtn.title = "Delete Link";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = () => onDelete(link.id);

        actionsDiv.appendChild(openBtn);
        actionsDiv.appendChild(deleteBtn);

        card.appendChild(imgDiv);
        card.appendChild(contentDiv);
        card.appendChild(actionsDiv);

        els.linksList.appendChild(card);
    });
}

export function renderSessions(onOpen, onDelete) {
    hideListLoading();
    els.linksList.innerHTML = "";

    if (state.sessions.length === 0) {
        showEmptyState(
            state.sessionsSearchQuery
                ? "No matching sessions found."
                : "No saved sessions yet.",
        );
        return;
    }

    els.emptyState.classList.add("hidden");

    state.sessions.forEach((session) => {
        const card = document.createElement("div");
        card.className = "link-card";

        const iconDiv = document.createElement("div");
        iconDiv.className = "link-icon";
        iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
        card.appendChild(iconDiv);

        const contentDiv = document.createElement("div");
        contentDiv.className = "link-content";

        const title = document.createElement("h3");
        title.className = "link-title";
        title.textContent = session.name || "Unnamed Session";
        title.onclick = () => onOpen(session.id); // Or view session details

        const desc = document.createElement("p");
        desc.className = "link-url";
        let descText = `${session.link_count || 0} tabs`;
        if (session.tag) descText += ` • ${session.tag}`;
        if (session.description) descText += ` - ${session.description}`;
        desc.textContent = descText;

        const metaDiv = document.createElement("div");
        metaDiv.className = "link-meta";

        const dateSpan = document.createElement("span");
        dateSpan.className = "link-date";
        const dateObj = new Date(session.created_at);
        dateSpan.textContent = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        metaDiv.appendChild(dateSpan);

        if (session.is_favorite) {
            const favSpan = document.createElement("span");
            favSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
            metaDiv.appendChild(favSpan);
        }

        contentDiv.appendChild(title);
        contentDiv.appendChild(desc);
        contentDiv.appendChild(metaDiv);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "link-actions";

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
        deleteBtn.title = "Delete Session";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            onDelete(session.id);
        };

        const openBtn = document.createElement("button");
        openBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        openBtn.title = "Open Details";
        openBtn.onclick = (e) => {
            e.stopPropagation();
            onOpen(session.id);
        };

        actionsDiv.appendChild(openBtn);
        actionsDiv.appendChild(deleteBtn);

        card.appendChild(contentDiv);
        card.appendChild(actionsDiv);

        els.linksList.appendChild(card);
    });
}

export function updatePagination() {
    if (state.activeView === "tabs") {
        els.pageIndicator.textContent = `Page ${state.currentPage} of ${Math.max(1, state.totalPages)}`;
        els.prevPageBtn.disabled = state.currentPage <= 1;
        els.nextPageBtn.disabled = state.currentPage >= state.totalPages || state.totalPages === 0;
    } else {
        els.pageIndicator.textContent = `Page ${state.sessionsPage} of ${Math.max(1, state.sessionsTotalPages)}`;
        els.prevPageBtn.disabled = state.sessionsPage <= 1;
        els.nextPageBtn.disabled = state.sessionsPage >= state.sessionsTotalPages || state.sessionsTotalPages === 0;
    }
}

export { els };
