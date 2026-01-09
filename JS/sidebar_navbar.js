/* ===============================
   Load Sidebar + Init
================================ */
document.addEventListener("DOMContentLoaded", loadSidebarNavbar);

async function loadSidebarNavbar() {
    try {
        const resp = await fetch("sidebar_navbar.html");
        if (!resp.ok) throw new Error("Sidebar load failed");

        document.body.insertAdjacentHTML("afterbegin", await resp.text());

        setupLogout();
        highlightSidebar();
        initCollapse();

        const token = localStorage.getItem("accessToken");
        if (token) loadAppUserProfile(token);
        else redirectToLogin();

    } catch (err) {
        console.error(err);
    }
}

/* ===============================
   Load Logged-in User
================================ */
async function loadAppUserProfile(token) {
    try {
        const res = await fetch("http://185.187.170.73:8000/user/profile", {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        // If token expired or unauthorized
        if (!res.status) return logout();

        const result = await res.json();

        // Also check if API returns unauthorized in message
        const msg = (result.message || '').toLowerCase();
        if (msg.includes('unauthorized') || msg.includes('token expired')) {
            return logout();
        }

        const data = result.data;
        if (!data) return;

        // Display user info
        document.getElementById("displayUserName").textContent = data.Name;
        document.getElementById("userAvatar").src =
            `https://ui-avatars.com/api/?name=${encodeURIComponent(data.Name)}&background=234b8c&color=fff`;

    } catch (err) {
        console.error("User profile error:", err);
        // Optional: logout on network error if you want
        // logout();
    }
}

/* ===============================
   Logout Function
================================ */
function logout() {
    // Clear user info
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');

    // Redirect to login page
    window.location.href = '../login.html';
}


/* ===============================
   Highlight Active Link
================================ */
function highlightSidebar() {
    const page = window.location.pathname.split("/").pop();
    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === page);
    });
}

/* ===============================
   Logout
================================ */
function setupLogout() {
    document.querySelectorAll("[data-logout]").forEach(btn => {
        btn.addEventListener("click", e => {
            e.preventDefault();
            logout();
        });
    });
}

async function logout() {
    const token = localStorage.getItem("accessToken");

    try {
        if (token) {
            await fetch("http://185.187.170.73:8000/user/logout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
        }
    } catch (err) {
        console.error("Logout error:", err);
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        redirectToLogin();
    }
}

function redirectToLogin() {
    window.location.href = "Auth/login.html";
}

/* ===============================
   Bootstrap Collapse
================================ */
function initCollapse() {
    document.querySelectorAll(".collapse").forEach(el => {
        new bootstrap.Collapse(el, { toggle: false });
    });
}
