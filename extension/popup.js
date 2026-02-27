import {
    state,
    initState,
    toggleTheme,
    removeStorageData,
    setStorageData,
    getStorageData,
} from "./state.js";
import * as api from "./api.js";
import * as ui from "./ui.js";

// ---- Orchestrator Initialization ----
document.addEventListener("DOMContentLoaded", async () => {
    await initState();

    // Check Auth Status explicitly to determine initial route
    const { accessToken, user } = await getStorageData(["accessToken", "user"]);
    if (accessToken && user) {
        state.user = user;
        ui.els.userNameDisp.textContent = `Hi, ${user.email}`;
        ui.showScreen("dashboard");
        loadDashboardData();
    } else {
        ui.showScreen("login");
    }

    attachEventListeners();
});

// ---- Core Loaders ----
async function loadDashboardData() {
    try {
        const hasCache = await loadFromCache();
        if (!hasCache) {
            ui.showListLoading(); // Only show spinner if vault opens completely empty
        }
        // Always try to background revalidate, fetchAndRevalidate will decide if it needs to skip
        await fetchAndRevalidate();
    } catch (error) {
        ui.showToast(
            "Failed to load dashboard data. Assuming Session Expiry.",
            "error",
        );
        handleLogout();
    }
}

async function loadFromCache() {
    const { cachedLinks, cachedPage, cachedTotalPages } = await getStorageData([
        "cachedLinks",
        "cachedPage",
        "cachedTotalPages",
    ]);

    if (cachedLinks && cachedLinks.length > 0) {
        state.links = cachedLinks;
        state.currentPage = cachedPage || 1;
        state.totalPages = cachedTotalPages || 1;

        ui.renderLinks(handleOpenLink, handleDeleteLink);
        ui.updatePagination();
        return true;
    }
    return false;
}

async function fetchAndRevalidate(force = false, forceRender = false) {
    const { lastSyncedAt } = await (force
        ? { lastSyncedAt: 0 }
        : getStorageData(["lastSyncedAt"]));
    const now = Date.now();

    // Skip if synced within last 30 seconds unless forced
    if (!force && lastSyncedAt && now - lastSyncedAt < 30000) {
        return;
    }

    // Capture state for race condition check
    const reqSearch = state.searchQuery;
    const reqPage = state.currentPage;
    const reqSort = state.sortOrder;

    try {
        const res = await api.fetchLinks(
            reqPage,
            state.limit,
            reqSearch,
            reqSort,
        );

        // Guard against race conditions (user searched or paginated during fetch)
        if (
            state.searchQuery !== reqSearch ||
            state.currentPage !== reqPage ||
            state.sortOrder !== reqSort
        ) {
            return;
        }

        const freshLinks = res.data;
        const freshPage = res.page;
        const freshTotalPages = res.totalPages;

        const isDifferent =
            JSON.stringify(state.links) !== JSON.stringify(freshLinks) ||
            state.totalPages !== freshTotalPages;

        if (isDifferent || forceRender || state.links.length === 0) {
            state.links = freshLinks;
            state.totalPages = freshTotalPages;
            state.currentPage = freshPage;

            ui.renderLinks(handleOpenLink, handleDeleteLink);
            ui.updatePagination();

            if (state.currentPage === 1 && !state.searchQuery) {
                updateCache(freshLinks, freshPage, freshTotalPages); // Fire and forget
            }
        } else if (state.currentPage === 1 && !state.searchQuery) {
            setStorageData({ lastSyncedAt: Date.now() }); // Fire and forget
        }
    } catch (e) {
        if (state.links.length === 0) {
            ui.showToast(e.message, "error");
            ui.showEmptyState("Error loading links.");
        }
    }
}

function updateCache(links, page, totalPages) {
    setStorageData({
        cachedLinks: links,
        cachedPage: page,
        cachedTotalPages: totalPages,
        lastSyncedAt: Date.now(),
    });
}

async function reloadLinks() {
    ui.showListLoading();
    if (state.activeView === "tabs") {
        await fetchAndRevalidate(true, true);
    } else {
        await fetchSessionsAndRevalidate();
    }
}

async function fetchSessionsAndRevalidate() {
    try {
        const res = await api.fetchSessions(
            state.sessionsPage,
            state.limit,
            state.sessionsSearchQuery,
            state.sortOrder
        );
        state.sessions = res.data;
        state.sessionsTotalPages = res.totalPages;
        state.sessionsPage = res.page;

        if (state.activeView === "sessions") {
            ui.renderSessions(handleOpenSession, handleDeleteSession);
            ui.updatePagination();
        }
    } catch (e) {
        if (state.sessions.length === 0 && state.activeView === "sessions") {
            ui.showToast(e.message, "error");
            ui.showEmptyState("Error loading sessions.");
        }
    }
}

async function switchView(view) {
    if (state.activeView === view) return;
    
    state.activeView = view;
    ui.els.viewTabsBtn.classList.toggle("active", view === "tabs");
    ui.els.viewSessionsBtn.classList.toggle("active", view === "sessions");
    
    ui.els.searchInput.value = view === "tabs" ? state.searchQuery : state.sessionsSearchQuery;
    
    if (view === "tabs") {
        ui.renderLinks(handleOpenLink, handleDeleteLink);
        ui.updatePagination();
        fetchAndRevalidate();
    } else {
        ui.renderSessions(handleOpenSession, handleDeleteSession);
        ui.updatePagination();
        fetchSessionsAndRevalidate();
    }
}

// ---- Event Listeners ----
function attachEventListeners() {
    // Navigation
    ui.els.toRegisterBtn.onclick = () => ui.showScreen("register");
    ui.els.toLoginBtn.onclick = () => ui.showScreen("login");
    ui.els.themeToggle.onclick = toggleTheme;
    ui.els.logoutBtn.onclick = handleLogout;

    // Forms
    ui.els.loginForm.onsubmit = handleLogin;
    ui.els.registerForm.onsubmit = handleRegister;

    // View Toggles
    ui.els.viewTabsBtn.onclick = () => switchView("tabs");
    ui.els.viewSessionsBtn.onclick = () => switchView("sessions");

    // Modal
    ui.els.modalCloseBtn.onclick = () => ui.els.saveAllModal.classList.add("hidden");
    ui.els.modalNewSessionBtn.onclick = showNewSessionForm;
    ui.els.modalMergeSessionBtn.onclick = showMergeSessionForm;
    ui.els.newSessionForm.onsubmit = handleCreateSession;
    ui.els.mergeSessionForm.onsubmit = handleMergeSession;

    // Saving
    ui.els.saveActiveBtn.onclick = handleSaveActiveTab;
    ui.els.saveAllBtn.onclick = () => openModal();
    ui.els.exportBtn.onclick = handleExport;
    ui.els.openDashboardBtn.onclick = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
    };

    // Search
    let searchTimeout;
    ui.els.searchInput.oninput = (e) => {
        clearTimeout(searchTimeout);
        if (state.activeView === "tabs") {
            state.searchQuery = e.target.value;
        } else {
            state.sessionsSearchQuery = e.target.value;
        }
        searchTimeout = setTimeout(() => {
            if (state.activeView === "tabs") {
                state.currentPage = 1; 
            } else {
                state.sessionsPage = 1;
            }
            reloadLinks();
        }, 400); // 400ms debounce
    };

    // Pagination
    ui.els.prevPageBtn.onclick = () => {
        if (state.activeView === "tabs" && state.currentPage > 1) {
            state.currentPage--;
            reloadLinks();
        } else if (state.activeView === "sessions" && state.sessionsPage > 1) {
            state.sessionsPage--;
            reloadLinks();
        }
    };
    ui.els.nextPageBtn.onclick = () => {
        if (state.activeView === "tabs" && state.currentPage < state.totalPages) {
            state.currentPage++;
            reloadLinks();
        } else if (state.activeView === "sessions" && state.sessionsPage < state.sessionsTotalPages) {
            state.sessionsPage++;
            reloadLinks();
        }
    };
}

// ---- Event Handlers ----
async function handleLogin(e) {
    e.preventDefault();
    const btn = ui.els.loginForm.querySelector('button[type="submit"]');
    ui.setBtnLoading(btn, true);

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const res = await api.apiLogin(email, password);
        await setStorageData({
            accessToken: res.data.tokens.accessToken,
            refreshToken: res.data.tokens.refreshToken,
            user: res.data.user,
        });

        state.user = res.data.user;
        ui.els.userNameDisp.textContent = `Hi, ${state.user.email}`;
        ui.showToast("Login successful!");
        ui.showScreen("dashboard");

        document.getElementById("login-password").value = "";
        loadDashboardData();
    } catch (err) {
        ui.showToast(err.message, "error");
    } finally {
        ui.setBtnLoading(btn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = ui.els.registerForm.querySelector('button[type="submit"]');
    ui.setBtnLoading(btn, true);

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
        const res = await api.apiRegister(email, password);
        await setStorageData({
            accessToken: res.data.tokens.accessToken,
            refreshToken: res.data.tokens.refreshToken,
            user: res.data.user,
        });

        state.user = res.data.user;
        ui.els.userNameDisp.textContent = `Hi, ${state.user.email}`;
        ui.showToast("Account created!");
        ui.showScreen("dashboard");

        document.getElementById("register-password").value = "";
        loadDashboardData();
    } catch (err) {
        ui.showToast(err.message, "error");
    } finally {
        ui.setBtnLoading(btn, false);
    }
}

async function handleLogout() {
    await api.apiLogout();
    await removeStorageData(["accessToken", "refreshToken", "user"]);
    state.user = null;
    ui.showScreen("login");
}

async function handleSaveActiveTab() {
    ui.setBtnLoading(ui.els.saveActiveBtn, true);

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!tab || !tab.url) throw new Error("No valid tab found");

        const payload = { url: tab.url, title: tab.title || "Untitled" };
        if (tab.favIconUrl) payload.favicon = tab.favIconUrl;

        // 1. Optimistic Instant UI Update
        const tempLink = {
            id: `temp-${Date.now()}`,
            url: payload.url,
            title: payload.title,
            favicon: payload.favicon,
            created_at: new Date().toISOString(),
        };

        const isCleanPage = state.currentPage === 1 && !state.searchQuery;

        if (isCleanPage) {
            state.links.unshift(tempLink);
            if (state.links.length > state.limit) state.links.pop();

            ui.renderLinks(handleOpenLink, handleDeleteLink);
            ui.updatePagination();

            // Fire & forget cache update tracking with 0 timestamp
            setStorageData({
                cachedLinks: state.links,
                cachedPage: state.currentPage,
                cachedTotalPages: state.totalPages,
                lastSyncedAt: 0,
            });
        }

        // Instantly release the button visually to make it feel blazing fast
        ui.setBtnLoading(ui.els.saveActiveBtn, false);

        // 2. Fire & forget background API request
        api.saveLink(payload)
            .then((res) => {
                ui.showToast("Tab securely saved!");

                if (isCleanPage) {
                    // Swap temp ID with real ID natively to enable deletions
                    const idx = state.links.findIndex(
                        (l) => l.id === tempLink.id,
                    );
                    if (idx !== -1) {
                        state.links[idx] = res.data;
                        ui.renderLinks(handleOpenLink, handleDeleteLink);
                        setStorageData({
                            cachedLinks: state.links,
                            cachedPage: state.currentPage,
                            cachedTotalPages: state.totalPages,
                            lastSyncedAt: 0,
                        });
                    }
                    // Background bounds check
                    fetchAndRevalidate(true);
                } else {
                    // Jump to page 1 natively
                    state.currentPage = 1;
                    state.searchQuery = "";
                    ui.els.searchInput.value = "";
                    setStorageData({ lastSyncedAt: 0 });
                    reloadLinks();
                }
            })
            .catch((err) => {
                // Background fail cleanup
                ui.showToast("Failed to save: " + err.message, "error");
                if (isCleanPage) {
                    state.links = state.links.filter(
                        (l) => l.id !== tempLink.id,
                    );
                    ui.renderLinks(handleOpenLink, handleDeleteLink);
                    setStorageData({
                        cachedLinks: state.links,
                        cachedPage: state.currentPage,
                        cachedTotalPages: state.totalPages,
                        lastSyncedAt: 0,
                    });
                }
            });
    } catch (err) {
        ui.showToast(err.message, "error");
        ui.setBtnLoading(ui.els.saveActiveBtn, false);
    }
}

function openModal() {
    ui.els.saveAllModal.classList.remove("hidden");
    showNewSessionForm();
}

function showNewSessionForm() {
    ui.els.newSessionForm.classList.remove("hidden");
    ui.els.mergeSessionForm.classList.add("hidden");
    ui.els.modalNewSessionBtn.classList.add("btn-primary");
    ui.els.modalNewSessionBtn.classList.remove("outline");
    ui.els.modalMergeSessionBtn.classList.add("outline");
    ui.els.modalMergeSessionBtn.classList.remove("btn-primary");
}

async function showMergeSessionForm() {
    ui.els.newSessionForm.classList.add("hidden");
    ui.els.mergeSessionForm.classList.remove("hidden");
    ui.els.modalMergeSessionBtn.classList.add("btn-primary");
    ui.els.modalMergeSessionBtn.classList.remove("outline");
    ui.els.modalNewSessionBtn.classList.add("outline");
    ui.els.modalNewSessionBtn.classList.remove("btn-primary");

    try {
        const res = await api.fetchSessions(1, 100);
        ui.els.mergeSessionSelect.innerHTML = res.data.map(s => `<option value="${s.id}">${s.name} (${s.link_count} tabs)</option>`).join("");
        if(res.data.length === 0) ui.els.mergeSessionSelect.innerHTML = `<option value="">No sessions available</option>`;
    } catch(e) {
        ui.els.mergeSessionSelect.innerHTML = `<option value="">Error loading</option>`;
    }
}

async function handleCreateSession(e) {
    e.preventDefault();
    const btn = ui.els.newSessionForm.querySelector('button[type="submit"]');
    ui.setBtnLoading(btn, true);

    const name = ui.els.sessionNameInput.value;
    const description = ui.els.sessionDescInput.value;
    const tag = ui.els.sessionTagInput.value;

    try {
        const sessionRes = await api.createSession({ name, description, tag });
        const sessionId = sessionRes.data.id;
        
        await saveTabsToSession(sessionId);
        ui.els.saveAllModal.classList.add("hidden");
        ui.els.sessionNameInput.value = "";
        ui.els.sessionDescInput.value = "";
        ui.els.sessionTagInput.value = "";
        
        switchView("sessions");
    } catch(err) {
        ui.showToast(err.message, "error");
    } finally {
        ui.setBtnLoading(btn, false);
    }
}

async function handleMergeSession(e) {
    e.preventDefault();
    const btn = ui.els.mergeSessionForm.querySelector('button[type="submit"]');
    ui.setBtnLoading(btn, true);

    const sessionId = ui.els.mergeSessionSelect.value;
    if (!sessionId) {
        ui.showToast("No session selected", "error");
        ui.setBtnLoading(btn, false);
        return;
    }

    try {
        await saveTabsToSession(sessionId);
        ui.els.saveAllModal.classList.add("hidden");
        switchView("sessions");
    } catch(err) {
        ui.showToast(err.message, "error");
    } finally {
        ui.setBtnLoading(btn, false);
    }
}

async function saveTabsToSession(sessionId) {
    // 1. Get all tabs in the current window
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    
    // 2. Filter out extension/system tabs so they are never saved or closed
    const validTabsToSave = allTabs.filter(tab => {
        if (!tab.url) return false;
        // Ignore internal chrome pages and our own extension dashboard
        return !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://");
    });
    
    if (validTabsToSave.length === 0) {
        throw new Error("No valid web tabs found to save.");
    }

    let savedCount = 0;
    
    // 3. Save in reverse order so the first tab is saved last (appears at top of newest-first list)
    for (let i = validTabsToSave.length - 1; i >= 0; i--) {
        const tab = validTabsToSave[i];
        
        try {
            const payload = {
                url: tab.url,
                title: tab.title || "Untitled",
                session_id: sessionId
            };
            if (tab.favIconUrl) payload.favicon = tab.favIconUrl;
            
            // Await sequentially to guarantee order
            await api.saveLink(payload);
            savedCount++;
        } catch (ignored) {}
    }

    ui.showToast(`Saved ${savedCount} tabs to session!`);
    
    // Auto-close tabs and open dashboard
    try {
        const tabIdsToClose = validTabsToSave.map(t => t.id).filter(id => id !== undefined);
        
        // 1. Open Dashboard in background so popup stays alive briefly
        await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html"), active: false });
        
        // 2. Fire the remove command to close ONLY the saved tabs (this inherently closes the popup as the active tab dies)
        if (tabIdsToClose.length > 0) {
            chrome.tabs.remove(tabIdsToClose);
        }
    } catch (e) {
        console.error("Failed to close tabs or open dashboard", e);
    }
}

// Global actions passed into UI generator
function handleOpenLink(url) {
    chrome.tabs.create({ url });
}

async function handleDeleteLink(id) {
    try {
        await api.deleteLink(id);
        ui.showToast("Link deleted");

        // Remove locally
        state.links = state.links.filter((l) => l.id !== id);

        if (state.links.length === 0 && state.currentPage > 1) {
            state.currentPage--;
            await setStorageData({ lastSyncedAt: 0 });
            await reloadLinks();
        } else {
            ui.renderLinks(handleOpenLink, handleDeleteLink);

            // Optimistic Cache mutation - don't await blocking ops
            getStorageData([
                "cachedLinks",
                "cachedPage",
                "cachedTotalPages",
            ]).then(({ cachedLinks, cachedPage, cachedTotalPages }) => {
                if (cachedLinks) {
                    const newCachedLinks = cachedLinks.filter(
                        (l) => l.id !== id,
                    );
                    setStorageData({
                        cachedLinks: newCachedLinks,
                        cachedPage: cachedPage || 1,
                        cachedTotalPages: cachedTotalPages || 1,
                        lastSyncedAt: 0,
                    });
                } else {
                    setStorageData({ lastSyncedAt: 0 });
                }
            });

            // Sync blindly in background to pull missing tail item
            fetchAndRevalidate(true);
        }
    } catch (err) {
        ui.showToast("Failed to delete link", "error");
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
        ui.showToast("Export complete!");
    } catch (err) {
        ui.showToast("Export failed", "error");
    }
}

// Session Listeners
async function handleOpenSession(id) {
    try {
        // Fetch all links for this session
        const res = await api.fetchLinks(1, 100, "", "newest", id);
        if (res.data && res.data.length > 0) {
            res.data.forEach(link => {
                chrome.tabs.create({ url: link.url });
            });
            ui.showToast(`Opened ${res.data.length} tabs`);
        } else {
            ui.showToast(`No tabs in this session`);
        }
    } catch (err) {
        ui.showToast("Failed to open session", "error");
    }
}

async function handleDeleteSession(id) {
    try {
        await api.deleteSession(id);
        ui.showToast("Session deleted");
        
        state.sessions = state.sessions.filter((s) => s.id !== id);
        if (state.sessions.length === 0 && state.sessionsPage > 1) {
            state.sessionsPage--;
            await fetchSessionsAndRevalidate();
        } else {
            ui.renderSessions(handleOpenSession, handleDeleteSession);
            fetchSessionsAndRevalidate(true);
        }
    } catch (err) {
        ui.showToast("Failed to delete session", "error");
    }
}
