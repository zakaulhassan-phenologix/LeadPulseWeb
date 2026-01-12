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

    } catch (err) {
        console.error("LinkedIn profile error:", err);
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
   LinkedIn Connect Flow
================================ */
async function connectLinkedIn() {
    const token = localStorage.getItem("accessToken");
    if (!token) return redirectToLogin();

    try {
        const res = await fetch(
            "http://185.187.170.73:8000/auth/linkedin/signin-url",
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!res.ok) {
            throw new Error("Failed to generate LinkedIn auth URL");
        }

        const result = await res.json();

        if (!result?.data?.auth_url || !result?.data?.state) {
            throw new Error("Invalid LinkedIn auth response");
        }

        // Save state for callback validation / user mapping
        localStorage.setItem("linkedin_oauth_state", result.data.state);

        // Redirect in SAME TAB
        window.location.href = result.data.auth_url;

    } catch (err) {
        console.error("LinkedIn connect error:", err);
        alert("Unable to connect LinkedIn. Please try again.");
    }
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
