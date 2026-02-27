import {
    state,
    initState,
    toggleTheme,
    applyColorTheme,
    getStorageData
} from "./state.js";
import * as api from "./api.js";

// DOM Elements
const els = {
    layout: document.getElementById("dashboard-layout"),
    authLoading: document.getElementById("auth-loading"),
    userEmail: document.getElementById("user-email"),
    
    // Nav & Sidebar
    navTabs: document.getElementById("nav-tabs"),
    navSessions: document.getElementById("nav-sessions"),
    openSettingsBtn: document.getElementById("open-settings-btn"),
    closeSettingsBtn: document.getElementById("close-settings-btn"),
    settingsOverlay: document.getElementById("settings-overlay"),
    modeSelect: document.getElementById("mode-select"),
    paletteSelect: document.getElementById("palette-select"),
    logoutBtn: document.getElementById("logout-btn"),
    
    // Mobile Layout Toggle
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
    mobileMenuToggle: document.getElementById("mobile-menu-toggle"),
    
    // Content Headers
    topHeaderMain: document.getElementById("top-header-main"),
    topHeaderDetail: document.getElementById("top-header-detail"),
    pageTitle: document.getElementById("page-title"),
    searchInput: document.getElementById("dashboard-search"),
    
    // Detail Header specific
    backToSessionsBtn: document.getElementById("back-to-sessions-btn"),
    detailLaunchCurrent: document.getElementById("detail-launch-current"),
    detailLaunchNew: document.getElementById("detail-launch-new"),
    detailLaunchIncognito: document.getElementById("detail-launch-incognito"),
    detailPageTitle: document.getElementById("detail-page-title"),
    detailPageDesc: document.getElementById("detail-page-desc"),
    
    // Content Body
    itemsGrid: document.getElementById("items-grid"),
    loadingSpinner: document.getElementById("loading-spinner"),
    emptyState: document.getElementById("empty-state"),
    
    // Footer
    prevPageBtn: document.getElementById("prev-page"),
    nextPageBtn: document.getElementById("next-page"),
    pageIndicator: document.getElementById("page-indicator"),
    exportBtn: document.getElementById("export-btn"),

};

let currentView = "tabs"; // 'tabs' | 'sessions' | 'session_detail'
let activeSessionId = null;
let activeSessionData = null;
let activeSessionPage = 1;
let activeSessionTotalPages = 1;

// Entry point
document.addEventListener("DOMContentLoaded", async () => {
    await initState();
    
    const { accessToken, user } = await getStorageData(["accessToken", "user"]);
    if (!accessToken || !user) {
        // Not logged in, kill dashboard
        document.body.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>Please log in via the extension popup first.</h2></div>`;
        return;
    }

    state.user = user;
    els.userEmail.textContent = user.email;
    
    els.authLoading.classList.add("hidden");
    els.layout.classList.remove("hidden");

    // Initialize Dropdowns
    els.modeSelect.value = state.theme;
    els.paletteSelect.value = state.colorTheme || "orange";

    attachEvents();
    loadViewData();
});

function attachEvents() {
    els.logoutBtn.onclick = handleDashboardLogout;
    
    // Settings Modal Logic
    els.openSettingsBtn.onclick = () => {
        els.settingsOverlay.classList.add("visible");
        els.modeSelect.value = state.theme;
        els.paletteSelect.value = state.colorTheme || "orange";
    };
    
    els.closeSettingsBtn.onclick = () => els.settingsOverlay.classList.remove("visible");
    els.settingsOverlay.onclick = (e) => {
        if(e.target === els.settingsOverlay) {
            els.settingsOverlay.classList.remove("visible");
        }
    };
    
    els.modeSelect.onchange = (e) => {
        const newMode = e.target.value;
        if(state.theme !== newMode) { 
            toggleTheme(); // This will swap state.theme and call applyTheme
        }
    };
    
    els.paletteSelect.onchange = (e) => {
        const newColor = e.target.value;
        state.colorTheme = newColor;
        chrome.storage.local.set({ colorTheme: newColor });
        applyColorTheme(newColor); // Natively updates the body class
    };
    
    els.navTabs.onclick = () => {
        closeMobileSidebar();
        switchView("tabs");
    };
    els.navSessions.onclick = () => {
        closeMobileSidebar();
        switchView("sessions");
    };
    
    // Mobile Sidebar UI Link
    if(els.mobileMenuToggle) {
        els.mobileMenuToggle.onclick = openMobileSidebar;
    }
    if(els.sidebarOverlay) {
        els.sidebarOverlay.onclick = closeMobileSidebar;
    }
    
    // Search
    let searchTimeout;
    els.searchInput.oninput = (e) => {
        clearTimeout(searchTimeout);
        if (currentView === "tabs") state.searchQuery = e.target.value;
        else state.sessionsSearchQuery = e.target.value;
        
        searchTimeout = setTimeout(() => {
            if (currentView === "tabs") state.currentPage = 1;
            else state.sessionsPage = 1;
            loadViewData();
        }, 400);
    };

    // Detail Header listeners
    if (els.backToSessionsBtn) els.backToSessionsBtn.onclick = () => switchView("sessions");
    if (els.detailLaunchCurrent) els.detailLaunchCurrent.onclick = () => launchSessionDetail("current");
    if (els.detailLaunchNew) els.detailLaunchNew.onclick = () => launchSessionDetail("new");
    if (els.detailLaunchIncognito) els.detailLaunchIncognito.onclick = () => launchSessionDetail("incognito");

    // Pagination
    els.prevPageBtn.onclick = () => {
        if (currentView === "tabs" && state.currentPage > 1) {
            state.currentPage--;
            loadViewData();
        } else if (currentView === "sessions" && state.sessionsPage > 1) {
            state.sessionsPage--;
            loadViewData();
        } else if (currentView === "session_detail" && activeSessionPage > 1) {
            activeSessionPage--;
            loadViewData();
        }
    };
    els.nextPageBtn.onclick = () => {
        if (currentView === "tabs" && state.currentPage < state.totalPages) {
            state.currentPage++;
            loadViewData();
        } else if (currentView === "sessions" && state.sessionsPage < state.sessionsTotalPages) {
            state.sessionsPage++;
            loadViewData();
        } else if (currentView === "session_detail" && activeSessionPage < activeSessionTotalPages) {
            activeSessionPage++;
            loadViewData();
        }
    };

    els.exportBtn.onclick = handleExport;
}

function switchView(view) {
    if (currentView === view) return;
    currentView = view;
    
    if (view === "session_detail") {
        els.topHeaderMain.classList.add("hidden");
        els.topHeaderDetail.classList.remove("hidden");
    } else {
        els.topHeaderMain.classList.remove("hidden");
        els.topHeaderDetail.classList.add("hidden");
        
        els.navTabs.classList.toggle("active", view === "tabs");
        els.navSessions.classList.toggle("active", view === "sessions");
        els.pageTitle.textContent = view === "tabs" ? "Saved Tabs" : "Saved Sessions";
        
        els.searchInput.value = view === "tabs" ? state.searchQuery : state.sessionsSearchQuery;
    }
    
    loadViewData();
}

async function loadViewData() {
    showLoading();
    try {
        if (currentView === "tabs") {
            const res = await api.fetchLinks(state.currentPage, 20, state.searchQuery, state.sortOrder);
            state.links = res.data;
            state.totalPages = res.totalPages;
            state.currentPage = res.page;
            renderTabs();
        } else if (currentView === "sessions") {
            const res = await api.fetchSessions(state.sessionsPage, 20, state.sessionsSearchQuery, state.sortOrder);
            state.sessions = res.data;
            state.sessionsTotalPages = res.totalPages;
            state.sessionsPage = res.page;
            renderSessions();
        } else if (currentView === "session_detail") {
            const res = await api.fetchLinks(activeSessionPage, 20, "", "newest", activeSessionId);
            activeSessionTotalPages = res.totalPages || 1;
            activeSessionPage = res.page || 1;
            renderSessionDetailLinks(res.data);
        }
        updatePaginationDisplay();
    } catch (err) {
        showToast(err.message, "error");
        showEmpty("Failed to load data.");
    }
}

// Renderers
function renderTabs() {
    hideLoading();
    els.itemsGrid.innerHTML = "";
    
    if (state.links.length === 0) {
        showEmpty(state.searchQuery ? "No matching tabs found." : "No saved tabs yet.");
        return;
    }
    
    els.emptyState.classList.add("hidden");
    
    state.links.forEach(link => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.onclick = () => chrome.tabs.create({ url: link.url });
        
        let iconHtml = `<span>🌐</span>`;
        if (link.favicon) {
            iconHtml = `<img src="${link.favicon}" onerror="this.style.display='none'">`;
        }

        const date = new Date(link.created_at).toLocaleDateString();

        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon">${iconHtml}</div>
                <div class="card-title-wrap">
                    <h3 class="card-title" title="${link.url}">${link.title || new URL(link.url).hostname}</h3>
                    <p class="card-url">${link.url}</p>
                </div>
            </div>
            <div class="card-meta">
                <span>Added ${date}</span>
                ${link.session_id ? `<span class="tag-pill">In Session</span>` : `<span class="tag-pill">Standalone</span>`}
            </div>
            <div class="card-actions">
                <button title="Open" onclick="event.stopPropagation(); window.open('${link.url}', '_blank')">↗</button>
                <button class="delete-btn" title="Delete" data-id="${link.id}">🗑</button>
            </div>
        `;
        
        card.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            handleDeleteLink(link.id);
        };

        els.itemsGrid.appendChild(card);
    });
}

function renderSessions() {
    hideLoading();
    els.itemsGrid.innerHTML = "";
    
    if (state.sessions.length === 0) {
        showEmpty(state.sessionsSearchQuery ? "No matching sessions found." : "No saved sessions yet.");
        return;
    }
    
    els.emptyState.classList.add("hidden");
    
    state.sessions.forEach(session => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.onclick = () => handleOpenSession(session.id, session);
        
        const date = new Date(session.created_at).toLocaleDateString();
        
        let tagsHtml = "";
        if (session.tag) tagsHtml += `<span class="tag-pill">${session.tag}</span>`;
        if (session.is_favorite) tagsHtml += `<span class="tag-pill">⭐️ Fav</span>`;

        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon"><span>📁</span></div>
                <div class="card-title-wrap">
                    <h3 class="card-title">${session.name || "Unnamed Session"}</h3>
                    <p class="card-desc">${session.link_count || 0} tabs ${session.description ? `- ${session.description}` : ''}</p>
                </div>
            </div>
            <div class="card-meta">
                <span>Created ${date}</span>
                <div class="card-tags">
                   ${tagsHtml}
                </div>
            </div>
            <div class="session-quick-actions" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary launch-current-btn" title="Open in Current Window" style="flex: 1; padding: 6px; font-size: 12px; height: 32px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Current
                    </button>
                    <button class="btn outline launch-new-btn" title="Open in New Window" style="flex: 1; padding: 6px; font-size: 12px; height: 32px; border-color: rgba(255,255,255,0.1);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="16" height="16" rx="2" ry="2"></rect></svg> New
                    </button>
                    <button class="btn outline session-incognito-btn launch-incognito-btn" title="Open in Incognito" style="flex: 1; padding: 6px; font-size: 12px; height: 32px; border-color: rgba(255,255,255,0.1);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Incognito
                    </button>
                </div>
                <button class="btn outline expand-view-btn" style="width: 100%; height: 36px; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.03);">Expand View</button>
            </div>
            <div class="card-actions" style="top: 10px; right: 10px;">
                <button class="delete-btn" title="Delete Session" data-id="${session.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;

        card.querySelector('.launch-current-btn').onclick = (e) => {
            e.stopPropagation();
            launchSessionDirectly(session.id, 'current');
        };
        card.querySelector('.launch-new-btn').onclick = (e) => {
            e.stopPropagation();
            launchSessionDirectly(session.id, 'new');
        };
        card.querySelector('.launch-incognito-btn').onclick = (e) => {
            e.stopPropagation();
            launchSessionDirectly(session.id, 'incognito');
        };
        card.querySelector('.expand-view-btn').onclick = (e) => {
            e.stopPropagation();
            handleOpenSession(session.id, session);
        };
        card.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            handleDeleteSession(session.id);
        };

        els.itemsGrid.appendChild(card);
    });
}

function renderSessionDetailLinks(links) {
    hideLoading();
    els.itemsGrid.innerHTML = "";
    
    if (!links || links.length === 0) {
        showEmpty("No links found in this session.");
        return;
    }
    
    els.emptyState.classList.add("hidden");
    
    links.forEach(link => {
        const card = document.createElement("div");
        card.className = "url-box-card";
        card.style.position = "relative";
        
        card.onclick = () => chrome.tabs.create({ url: link.url });
        
        let iconHtml = `<span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>`;
        if (link.favicon) {
            iconHtml = `<img src="${link.favicon}" style="width:18px; height:18px; border-radius:4px;" onerror="this.style.display='none'">`;
        }

        const addedDate = link.created_at ? new Date(link.created_at).toLocaleDateString() : 'Just now';

        card.innerHTML = `
            <div class="url-box-header">
                <div class="url-box-icon">
                    ${iconHtml}
                </div>
                <div class="url-box-content">
                    <h4 class="url-box-title" title="${link.url}">${link.title || new URL(link.url).hostname}</h4>
                    <p class="url-box-url">${link.url}</p>
                    <div class="url-box-meta">
                        <span class="url-box-date">Added ${addedDate}</span>
                    </div>
                </div>
                <button class="url-box-open-btn" title="Open in new tab" onclick="event.stopPropagation(); window.open('${link.url}', '_blank')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
            </div>
            <button class="url-box-delete-btn" title="Remove from Session" data-id="${link.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        `;
        
        card.querySelector('.url-box-delete-btn').onclick = (e) => {
            e.stopPropagation();
            handleDeleteLink(link.id);
        };

        els.itemsGrid.appendChild(card);
    });
}

// Actions
async function handleDeleteLink(id) {
    try {
        await api.deleteLink(id);
        showToast("Tab deleted");
        if(currentView === "tabs" || currentView === "sessions") {
            loadViewData();
        }
    } catch(e) {
        showToast("Failed to delete tab", "error");
    }
}

async function handleOpenSession(id, sessionData) {
    activeSessionId = id;
    activeSessionData = sessionData;
    activeSessionPage = 1;

    els.detailPageTitle.textContent = sessionData.name || "Unnamed Session";
    els.detailPageDesc.textContent = sessionData.description || `${sessionData.link_count} tabs saved.`;
    
    switchView("session_detail");
}

async function launchSessionDetail(type) {
    try {
        // Fetch all tabs in the session
        const res = await api.fetchLinks(1, 1000, "", "newest", activeSessionId);
        const urls = res.data.map(l => l.url);
        
        if (urls.length === 0) {
            showToast("No tabs to launch");
            return;
        }

        if (type === "current") {
            urls.forEach(url => chrome.tabs.create({ url }));
        } else if (type === "new") {
            chrome.windows.create({ url: urls });
        } else if (type === "incognito") {
            chrome.windows.create({ url: urls, incognito: true });
        }
        
        showToast(`Launched ${urls.length} tabs`);
    } catch (e) {
        showToast("Failed to launch session", "error");
    }
}
async function launchSessionDirectly(sessionId, type) {
    try {
        const res = await api.fetchLinks(1, 1000, "", "newest", sessionId);
        const urls = res.data.map(l => l.url);
        
        if (urls.length === 0) {
            showToast("No tabs to launch in this session");
            return;
        }

        if (type === "current") {
            urls.forEach(url => chrome.tabs.create({ url }));
        } else if (type === "new") {
            chrome.windows.create({ url: urls });
        } else if (type === "incognito") {
            chrome.windows.create({ url: urls, incognito: true });
        }
        
        showToast(`Launched ${urls.length} tabs`);
    } catch (e) {
        showToast("Failed to launch session directly", "error");
    }
}

async function handleDeleteSession(id) {
    if(!confirm("Are you sure you want to delete this session? All inner tabs will be removed.")) return;
    try {
        await api.deleteSession(id);
        showToast("Session deleted");
        loadViewData();
    } catch(e) {
        showToast("Failed to delete session", "error");
    }
}

async function handleExport() {
    try {
        const blob = await api.exportLinks();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bytevault_export_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showToast("Export complete!");
    } catch (err) {
        showToast("Export failed", "error");
    }
}

async function handleDashboardLogout() {
    if(!confirm("Are you sure you want to log out?")) return;
    try {
        await api.logout();
        chrome.storage.local.remove(["accessToken", "user"]);
        window.close(); // Gracefully close the dashboard tab after logging out
    } catch (err) {
        showToast("Failed to log out cleanly", "error");
    }
}

// UI Helpers
function showLoading() {
    els.loadingSpinner.classList.remove("hidden");
    els.itemsGrid.innerHTML = "";
    els.emptyState.classList.add("hidden");
}

function hideLoading() {
    els.loadingSpinner.classList.add("hidden");
}

function showEmpty(msg) {
    els.emptyState.querySelector("p").textContent = msg;
    els.emptyState.classList.remove("hidden");
}

function updatePaginationDisplay() {
    if (currentView === "tabs") {
        els.pageIndicator.textContent = `Page ${state.currentPage} of ${Math.max(1, state.totalPages)}`;
        els.prevPageBtn.disabled = state.currentPage <= 1;
        els.nextPageBtn.disabled = state.currentPage >= state.totalPages || state.totalPages === 0;
    } else if (currentView === "sessions") {
        els.pageIndicator.textContent = `Page ${state.sessionsPage} of ${Math.max(1, state.sessionsTotalPages)}`;
        els.prevPageBtn.disabled = state.sessionsPage <= 1;
        els.nextPageBtn.disabled = state.sessionsPage >= state.sessionsTotalPages || state.sessionsTotalPages === 0;
    } else if (currentView === "session_detail") {
        els.pageIndicator.textContent = `Page ${activeSessionPage} of ${Math.max(1, activeSessionTotalPages)}`;
        els.prevPageBtn.disabled = activeSessionPage <= 1;
        els.nextPageBtn.disabled = activeSessionPage >= activeSessionTotalPages || activeSessionTotalPages === 0;
    }
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Create container if not exists on dashboard
    let container = document.getElementById("toast-container");
    if(!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    container.appendChild(toast);
    setTimeout(() => (toast.style.opacity = "1"), 10);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Mobile Sidebar Orchestration
function openMobileSidebar() {
    if(els.sidebar) els.sidebar.classList.add("active");
    if(els.sidebarOverlay) els.sidebarOverlay.classList.add("active");
}

function closeMobileSidebar() {
    if(els.sidebar) els.sidebar.classList.remove("active");
    if(els.sidebarOverlay) els.sidebarOverlay.classList.remove("active");
}
