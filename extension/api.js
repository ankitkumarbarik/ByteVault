import { getStorageData, removeStorageData, setStorageData } from "./state.js";

const API_BASE = "https://bytevault-8jg9.onrender.com/api";

// Helper to handle API requests dynamically
export async function apiFetch(endpoint, options = {}) {
    const tokens = await getStorageData(["accessToken", "refreshToken"]);

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (tokens.accessToken) {
        headers["Authorization"] = `Bearer ${tokens.accessToken}`;
    }

    let response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle Token Expiry & Automatic Refresh
    if (response.status === 401 && tokens.refreshToken) {
        console.log("Token expired. Attempting refresh...");
        try {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: tokens.refreshToken }),
            });

            if (!refreshRes.ok) throw new Error("Refresh failed");

            const refreshData = await refreshRes.json();
            await setStorageData({
                accessToken: refreshData.data.tokens.accessToken,
                refreshToken: refreshData.data.tokens.refreshToken,
            });

            // Re-attempt original request
            headers["Authorization"] =
                `Bearer ${refreshData.data.tokens.accessToken}`;
            response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
            });
        } catch (error) {
            console.error("Session expired completely.", error);
            await removeStorageData(["accessToken", "refreshToken", "user"]);
            throw new Error("Session expired. Please log in again.");
        }
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "An API error occurred.");
    }

    return data;
}

// Authentication API
export const apiLogin = (email, password) =>
    apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

export const apiRegister = (email, password) =>
    apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

export const apiLogout = () => apiFetch("/auth/logout", { method: "POST" });

// Resource API Layer

// Links
export const fetchLinks = (
    page = 1,
    limit = 10,
    search = "",
    sort = "newest",
    session_id = "none"
) => {
    const params = { page, limit, sort };
    if (search) params.search = search;
    if (session_id) params.session_id = session_id;
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/links?${qs}`);
};

export const saveLink = (payload) =>
    apiFetch("/links", {
        method: "POST",
        body: JSON.stringify(payload),
    });

// Sessions
export const fetchSessions = (
    page = 1,
    limit = 10,
    search = "",
    sort = "newest",
) => {
    const params = { page, limit, sort };
    if (search) params.search = search;
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/sessions?${qs}`);
};

export const createSession = (payload) =>
    apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const updateSession = (id, payload) =>
    apiFetch(`/sessions/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });

export const deleteSession = (id) =>
    apiFetch(`/sessions/${id}`, { method: "DELETE" });

export const deleteLink = (id) =>
    apiFetch(`/links/${id}`, { method: "DELETE" });
export const bulkDeleteLinks = (ids) =>
    apiFetch("/links", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
    });

export const exportLinks = async () => {
    // Need raw fetch, not apiFetch because it returns binary/blob
    const tokens = await getStorageData(["accessToken"]);
    const res = await fetch(`${API_BASE}/export/json`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!res.ok) throw new Error("Export failed");
    return res.blob();
};
