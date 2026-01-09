const token = localStorage.getItem("accessToken");
const userId = localStorage.getItem("userId");

const emailList = document.getElementById("emailList");
const statusFilter = document.getElementById("statusFilter");
const searchInput = document.getElementById("searchInput");
const totalCountEl = document.getElementById("totalCount");

const PAGE_SIZE = 5;
let currentPage = 0;
let currentStatus = "";
let currentSearch = "";

// Load emails if user is logged in
if (userId) loadRepliedEmails();

// ================= EVENTS =================
statusFilter.addEventListener("change", () => {
    currentStatus = statusFilter.value;
    currentPage = 0;
    loadRepliedEmails();
});

searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
        currentSearch = searchInput.value;
        currentPage = 0;
        loadRepliedEmails();
    }
});

// ================= LOAD REPLIED EMAILS =================
async function loadRepliedEmails() {
    emailList.innerHTML = `<p class="text-muted">Loading...</p>`;

    const skipCount = currentPage * PAGE_SIZE;
    const statusParam = currentStatus ? `&status=${currentStatus}` : "";

    const url = `http://185.187.170.73:8000/email/replies/get/replied-emails?` +
        `user_id=${userId}${statusParam}&skipCount=${skipCount}&maxCount=${PAGE_SIZE}` +
        `&search=${currentSearch}`;

    try {
        const res = await fetch(url, {
            headers: {
                "accept": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();
        const emails = data?.data?.item || [];
        const total = data?.data?.totalCount || 0;

        totalCountEl.innerText = `Total Replied Emails: ${total}`;

        if (emails.length) renderEmails(emails);
        else emailList.innerHTML = `<div class="text-center text-muted"><h6><i><b>Not found</b></i></h6></div>`;

        renderPagination(total);

    } catch (e) {
        console.error(e);
            emailList.innerHTML = `<div class="text-center text-muted"><h6><i><b>Not found</b></i></h6></div>`;
        }
}

// ================= RENDER EMAILS =================
function renderEmails(emails) {
    emailList.innerHTML = "";

    emails.forEach((email, index) => {
        const threadContainer = document.createElement("div");
        threadContainer.className = "thread-container mb-2 p-3";

        // Reply email
        const replyDiv = document.createElement("div");
        replyDiv.className = "email-item mb-2 p-2 border rounded bg-white";
        replyDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong>Reply</strong>
            </div>

            <div class="fw-semibold mb-1">${email.Subject}</div>

            <div class="small text-muted mb-2">
                From: ${email.FromEmail} |
                ${email.RepliedEmailCreatedAt ? new Date(email.RepliedEmailCreatedAt).toLocaleString() : "N/A"}
            </div>

            <div class="email-body">
                ${email.RepliedEmailHtml || email.RepliedEmailText}
            </div>
        `;
        threadContainer.appendChild(replyDiv);

        emailList.appendChild(threadContainer);
    });
}

// ================= PAGINATION =================
function renderPagination(total) {
    const pages = Math.ceil(total / PAGE_SIZE);
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";

    for (let i = 0; i < pages; i++) {
        pagination.innerHTML += `
            <li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link" onclick="goToPage(${i})">${i + 1}</button>
            </li>
        `;
    }
}

window.goToPage = function (page) {
    currentPage = page;
    loadRepliedEmails();
};
