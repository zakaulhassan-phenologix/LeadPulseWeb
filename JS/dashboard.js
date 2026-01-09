/* ===============================
   App Initialization
================================ */
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return redirectToLogin();

    await Promise.all([
        loadAppUserProfile(token),
        loadLinkedInProfile(token)
    ]);
});

/* ===============================
   LinkedIn Profile
================================ */
async function loadLinkedInProfile(token) {
    try {
        const res = await fetch("http://185.187.170.73:8000/auth/linkedin/user", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401) return showLinkedInConnect();

        const result = await res.json();
        result?.data ? renderLinkedInProfile(result.data) : showLinkedInConnect();

    } catch {
        showLinkedInConnect();
    }
}

function renderLinkedInProfile(user) {
    document.getElementById("linkedinConnectSection").style.display = "none";
    document.getElementById("linkedinProfileSection").style.display = "block";

    document.getElementById("liAvatar").src = user.PictureUrl;
    document.getElementById("liName").textContent = user.Name;
    document.getElementById("liEmail").textContent = user.Email || "";
}

function showLinkedInConnect() {
    document.getElementById("linkedinConnectSection").style.display = "block";
    document.getElementById("linkedinProfileSection").style.display = "none";
}

/* ===============================
   Page Navigation
================================ */
function openCompanyPage() {
    window.location.href = "company.html";
}
function openEmailPage() {
    window.location.href = "email_settings.html";
}
function openLinkedUploadsPage() {
    window.location.href = "linkedin_post_upload.html";
}
function openLinkedPostsPage() {
    window.location.href = "linkedin_posts.html";
}
