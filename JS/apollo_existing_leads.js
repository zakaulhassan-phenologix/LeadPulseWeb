let leadsData = [];
let currentPage = 1;
let pageSize = 10;
let totalItems = 0;

// Get user ID from localStorage
const userId = localStorage.getItem("userId") || 0;
const token = localStorage.getItem("accessToken") || "";


// Fetch leads from API
async function fetchLeads(skip = 0, maxCount = pageSize) {
    const filters = $("#filterForm").serializeArray();

    // Build query with userId
    let query = `user_id=${userId}&skipCount=${skip}&maxCount=${maxCount}`;

    filters.forEach(f => {
        if (f.value) query += `&${f.name}=${encodeURIComponent(f.value)}`;
    });

    try {
        const res = await fetch(`http://185.187.170.73:8000/apollo/get-enriched-leads?${query}`);
        const data = await res.json();
        if (data.status) {
            leadsData = data.data.items;
            totalItems = data.data.total;
            renderTable();
            renderPagination();
        } else {
            toastr.error(data.message || "Failed to fetch leads");
        }
    } catch (err) {
        console.error(err);
        toastr.error("Error fetching leads");
    }
}


// Render leads table
function renderTable() {
    const tbody = $("#leadsTableBody");
    tbody.empty();

    if (!leadsData.length) {
        tbody.append(`<tr><td colspan="10" class="text-center">No leads found</td></tr>`);
        return;
    }

    leadsData.forEach((lead, idx) => {
        tbody.append(`
            <tr>
                <td>${(currentPage - 1) * pageSize + idx + 1}</td>
                <td>${lead.FullName || "-"}</td>
                <td>${lead.Email || "-"}</td>
                <td>${lead.JobTitle || "-"}</td>
                <td>${lead.OrganizationName || "-"}</td>
                <td>${lead.City || "-"}</td>
                <td>${lead.Country || "-"}</td>
                <td>
                    ${lead.LinkedinUrl ? `<a href="${lead.LinkedinUrl}" target="_blank"><i class="bi bi-linkedin"></i></a>` : "-"}
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="showLeadDetails('${lead.LeadId}')">Details</button>
                </td>
                <td>
                    ${lead.Email ? `<button class="btn btn-success btn-sm" 
                                onclick="window.location.href='generate_email.html?leadId=${lead.Id}&toEmail=${encodeURIComponent(lead.Email)}'">
                            Connect
                        </button>` : "-"}
                </td>
            </tr>
        `);
    });
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination = $("#pagination");
    pagination.empty();

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        pagination.append(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="gotoPage(${i})">${i}</a>
            </li>
        `);
    }
}

// Go to specific page
function gotoPage(page) {
    currentPage = page;
    fetchLeads((currentPage - 1) * pageSize);
}

// Show lead details in modal
function showLeadDetails(leadId) {
    const lead = leadsData.find(l => l.LeadId === leadId);
    if (!lead) return;

    $("#leadModalTitle").text(lead.FullName || "Lead Details");

    let html = `
        <div class="row g-3">
            <div class="col-md-4">
                <img src="${lead.PhotoUrl || 'https://via.placeholder.com/200'}" class="img-fluid rounded" alt="Lead Photo">
            </div>
            <div class="col-md-8">
                <p><strong>Email:</strong> ${lead.Email || "-"}</p>
                <p><strong>Job Title:</strong> ${lead.JobTitle || "-"}</p>
                <p><strong>Organization:</strong> ${lead.OrganizationName || "-"}</p>
                <p><strong>City:</strong> ${lead.City || "-"}</p>
                <p><strong>Country:</strong> ${lead.Country || "-"}</p>
                <p><strong>LinkedIn:</strong> ${lead.LinkedinUrl ? `<a href="${lead.LinkedinUrl}" target="_blank">${lead.LinkedinUrl}</a>` : "-"}</p>
                <p><strong>Departments:</strong> ${lead.Departments?.join(", ") || "-"}</p>
                <p><strong>Functions:</strong> ${lead.Functions?.join(", ") || "-"}</p>
            </div>
        </div>
    `;
    $("#leadModalBody").html(html);
    const modal = new bootstrap.Modal(document.getElementById("leadModal"));
    modal.show();
}

// Apply filters
$("#filterForm").submit(function (e) {
    e.preventDefault();
    currentPage = 1;
    fetchLeads();
});

// Refresh button
$("#refreshBtn").click(() => fetchLeads());

// Initial load with pagination
fetchLeads();
