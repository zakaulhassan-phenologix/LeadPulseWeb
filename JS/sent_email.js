const token = localStorage.getItem("accessToken");
const userId = localStorage.getItem("userId");

const emailList = document.getElementById("emailList");
const statusFilter = document.getElementById("statusFilter");
const searchInput = document.getElementById("searchInput");
const totalCountEl = document.getElementById("totalCount");

const PAGE_SIZE = 6;
let currentPage = 0;
let currentStatus = ""; // Default to All
let currentSearch = "";

// Load emails on page load
if (userId) loadSentEmails();

// ================= EVENTS =================
statusFilter.addEventListener("change", () => {
    // "All" value resets status filter
    currentStatus = statusFilter.value === "All" ? "" : statusFilter.value;
    currentPage = 0;
    loadSentEmails();
});

searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        currentSearch = searchInput.value.trim();
        currentPage = 0;
        loadSentEmails();
    }
});


// ================= LOAD EMAILS =================
async function loadSentEmails() {
    emailList.innerHTML = `<p class="text-muted">Loading...</p>`;

    const skipCount = currentPage * PAGE_SIZE;
    const statusParam = currentStatus ? `&status=${currentStatus}` : "";

    const url =
        `http://185.187.170.73:8000/email/send/get/sent-emails?` +
        `user_id=${userId}` +
        statusParam +
        `&skipCount=${skipCount}&maxCount=${PAGE_SIZE}` +
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

        totalCountEl.innerText = `Total Emails: ${total}`;

        if (emails.length) {
            renderEmailsByThread(emails);
        } else {
            emailList.innerHTML = `<div class="text-center text-muted"><h6><i><b>Not found</b></i></h6></div>`;
        }

        renderPagination(total);

    } catch (e) {
        console.error(e);
        emailList.innerHTML = `<div class="text-center text-muted"><h6><i><b>Not found</b></i></h6></div>`;
    }
}

// ================= RENDER EMAILS BY THREAD =================
function renderEmailsByThread(emails) {
    emailList.innerHTML = "";

    // Group emails by ThreadId
    const threads = {};
    emails.forEach(email => {
        if (!threads[email.ThreadId]) threads[email.ThreadId] = [];
        threads[email.ThreadId].push(email);
    });

    // Render each thread
    Object.values(threads).forEach(threadEmails => {
        // Sort emails by SentAt or ScheduledTime ascending
        threadEmails.sort((a, b) => {
            const timeA = new Date(a.SentAt || a.ScheduledTime);
            const timeB = new Date(b.SentAt || b.ScheduledTime);
            return timeA - timeB;
        });

        const threadContainer = document.createElement("div");
        threadContainer.className = "thread-container mb-4 p-3 border rounded shadow-sm";

        threadEmails.forEach((email, index) => {
            const emailDiv = document.createElement("div");
            emailDiv.className = "email-item mb-3 p-2 border rounded";

            const label = index === 0 ? "Email" : `Follow Up ${index}`;

            // Convert UTC to local time
            const sentTime = email.SentAt ? new Date(email.SentAt).toLocaleString() : null;
            const scheduledTime = email.ScheduledTime ? new Date(email.ScheduledTime).toLocaleString() : null;

            let timeDisplay = "";
            if (email.Status.toLowerCase() === "scheduled") {
                timeDisplay = `<strong>Scheduled At:</strong> ${scheduledTime || "N/A"}`;
            } else {
                timeDisplay = `<strong>Sent At:</strong> ${sentTime || "N/A"}`;
            }

            emailDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong>${label}</strong>
                    <span class="badge bg-${email.Status.toLowerCase() === 'sent' ? 'success' : 'warning'}">
                        ${email.Status}
                    </span>
                </div>

                <div class="fw-semibold mb-1">${email.Subject}</div>

                <div class="small text-muted mb-1">
                    <strong>From:</strong> ${email.FromEmail.join(", ")}<br>
                    <strong>To:</strong> ${email.ToEmail.join(", ")}<br>
                    ${timeDisplay}
                </div>

                <div class="email-body border-top pt-2">
                    ${email.Body}
                </div>
            `;

            threadContainer.appendChild(emailDiv);
        });

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
            </li>`;
    }
}

window.goToPage = function (page) {
    currentPage = page;
    loadSentEmails();
};
