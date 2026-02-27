// Storage Wrapper Functions
export function getStorageData(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => resolve(result));
    });
}

export function setStorageData(data) {
    return new Promise((resolve) => {
        chrome.storage.local.set(data, () => resolve());
    });
}

export function removeStorageData(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => resolve());
    });
}

// Memory State
export const state = {
    user: null,
    theme: "light",
    colorTheme: "orange",
    links: [],
    sessions: [],

    // Dashboard UI State
    activeView: "tabs", // 'tabs' | 'sessions'
    currentPage: 1,
    limit: 10,
    totalPages: 1,
    searchQuery: "",
    sortOrder: "newest",

    sessionsPage: 1,
    sessionsTotalPages: 1,
    sessionsSearchQuery: "",
};

export async function initState() {
    const data = await getStorageData(["user", "theme", "colorTheme"]);
    if (data.user) {
        state.user = data.user;
    }

    if(data.colorTheme) {
        state.colorTheme = data.colorTheme;
    }

    if (data.theme) {
        state.theme = data.theme;
    } else {
        // Check OS preference
        if (
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
        ) {
            state.theme = "dark";
        }
    }

    applyTheme(state.theme);
    applyColorTheme(state.colorTheme);
}

export function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    setStorageData({ theme: state.theme });
    applyTheme(state.theme);
}

function applyTheme(theme) {
    if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark"); // Dashboard body explicitly needs this
    } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
    }
}

export function applyColorTheme(colorTheme) {
    document.body.className = `${state.theme === "dark" ? "dark" : ""} theme-${colorTheme}`.trim();
}
