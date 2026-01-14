const API_URL = "http://185.187.170.73:8000/apollo/search-organization";
const ENRICH_API = "http://185.187.170.73:8000/apollo/bulk-enrich-organization";

let currentPage = 1;

// --------------------
// Utility functions
// --------------------
function v(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function arr(val) {
    return val && val.trim() !== "" ? [val.trim()] : [];
}

// --------------------
// LocalStorage helpers
// --------------------
function saveFilters() {
    const filters = {};
    document.querySelectorAll("input").forEach(i => {
        filters[i.id] = i.value;
    });
    localStorage.setItem("organizationFilters", JSON.stringify(filters));
}

function loadFilters() {
    const saved = localStorage.getItem("organizationFilters");
    if (!saved) return;
    const filters = JSON.parse(saved);
    Object.keys(filters).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = filters[key];
    });
}

function saveResults(results) {
    localStorage.setItem("organizationResults", JSON.stringify(results));
}

function loadResults() {
    const saved = localStorage.getItem("organizationResults");
    return saved ? JSON.parse(saved) : [];
}

// --------------------
// Render organizations
// --------------------
function renderOrganizations(list) {
    const container = document.getElementById("organizationResults");
    container.innerHTML = "";

    list.forEach(org => {
        const div = document.createElement("div");
        div.className = "card org-card shadow-sm mb-2";
        div.innerHTML = `
            <div class="card-body d-flex align-items-center gap-3">
                <img src="${org.logo_url || 'https://via.placeholder.com/56'}"
                     style="width:56px;height:56px;object-fit:contain;">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${org.name || "N/A"}</h6>
                    <small class="text-muted">
                        ${org.primary_domain || "—"} • Founded: ${org.founded_year || "N/A"} • Revenue: ${org.organization_revenue_printed || "N/A"}
                    </small>
                </div>
                <div class="d-flex gap-2">
                    ${org.website_url ? `<a href="${org.website_url}" target="_blank" class="btn btn-sm btn-outline-secondary">Website</a>` : ""}
                    ${org.linkedin_url ? `<a href="${org.linkedin_url}" target="_blank" class="btn btn-sm btn-outline-primary">LinkedIn</a>` : ""}
                    <button class="btn btn-sm btn-success" onclick="goToPeopleSearch('${org.id}', '${org.primary_domain || ""}')">Get Leads</button>
                </div>
            </div>
        `;

        div.addEventListener("click", () => enrichOrganization(org.primary_domain || ""));
        container.appendChild(div);
    });
}

// --------------------
// Navigation to People Search
// --------------------
function goToPeopleSearch(orgId, domain) {
    localStorage.setItem("selectedOrganizationId", orgId);
    localStorage.setItem("selectedOrganizationDomain", domain);
    window.location.href = "apollo_people_search.html";
}

// --------------------
// Fetch organizations
// --------------------
async function searchOrganizations() {
    const resultsContainer = document.getElementById("organizationResults");
    const info = document.getElementById("resultsInfo");

    resultsContainer.innerHTML = "";
    info.textContent = "Searching organizations...";

    const payload = {
        OrganizationNumEmployeesRanges: arr(v("OrganizationNumEmployeesRanges")),
        OrganizationLocations: arr(v("OrganizationLocations")),
        OrganizationNotLocations: arr(v("OrganizationNotLocations")),
        RevenueRangeMin: Number(v("RevenueRangeMin") || 0),
        RevenueRangeMax: Number(v("RevenueRangeMax") || 0),
        CurrentlyUsingAnyOfTechnologyUids: arr(v("CurrentlyUsingAnyOfTechnologyUids")),
        QOrganizationKeywordTags: arr(v("QOrganizationKeywordTags")),
        QOrganizationName: v("QOrganizationName"),
        OrganizationIds: arr(v("OrganizationIds")),
        QOrganizationJobTitles: arr(v("QOrganizationJobTitles")),
        OrganizationJobLocations: arr(v("OrganizationJobLocations")),
        OrganizationNumJobsRangeMin: Number(v("OrganizationNumJobsRangeMin") || 0),
        OrganizationNumJobsRangeMax: Number(v("OrganizationNumJobsRangeMax") || 0),
        Page: currentPage,
        PerPage: Number(v("PerPage") || 5)
    };

    saveFilters();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const res = await response.json();

        // If API fails or returns false status
        if (!response.ok || !res.status) {
            let errorMsg = "Failed to fetch organizations";

            if (res.message) {
                try {
                    // Check if message contains JSON string with "error"
                    const parsedMsg = JSON.parse(res.message.replace(/^Failed to search organizations\s*/, ""));
                    if (parsedMsg.error) {
                        errorMsg = parsedMsg.error; // This will contain your "insufficient credits" message with link
                    } else {
                        errorMsg = res.message;
                    }
                } catch {
                    errorMsg = res.message; // fallback plain message
                }
            }

            // Show in toastr (to allow HTML links)
            toastr.error(errorMsg, '', { escapeHtml: false, timeOut: 10000 });
            info.textContent = "";
            return;
        }

        // Merge organizations and accounts safely
        const organizations = res.data.organizations || [];
        const accounts = res.data.accounts || [];

        // Prefer organizations, fallback to accounts
        const finalResults = organizations.length ? organizations : accounts;

        // If still no results
        if (!finalResults.length) {
            info.textContent = "No organizations found";
            saveResults([]);
            document.getElementById("prevPage").disabled = true;
            document.getElementById("nextPage").disabled = true;
            document.getElementById("Page").value = currentPage;
            document.getElementById("pageInfo").textContent = `Page ${currentPage}`;
            return;
        }

        // Render results
        renderOrganizations(finalResults);
        info.textContent = `Showing ${finalResults.length} organization(s)`;
        saveResults(finalResults);

        document.getElementById("Page").value = currentPage;
        document.getElementById("pageInfo").textContent = `Page ${currentPage}`;

        document.getElementById("prevPage").disabled = currentPage === 1;
        document.getElementById("nextPage").disabled =
            finalResults.length < Number(v("PerPage"));


    } catch (err) {
        console.error(err);
        toastr.error("Failed to fetch organizations: " + err.message);
    }
}

// --------------------
// Enrich organization
// --------------------
async function enrichOrganization(domain) {
    if (!domain) return;

    const modal = new bootstrap.Modal(document.getElementById("orgModal"));
    const modalTitle = document.getElementById("orgModalTitle");
    const modalBody = document.getElementById("orgModalBody");

    modalTitle.textContent = "Loading...";
    modalBody.innerHTML = `<div class="text-center py-3">Fetching enriched organization data...</div>`;
    modal.show();

    try {
        const response = await fetch(ENRICH_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ OrganizationDomains: [domain] })
        });

        const res = await response.json();

        if (!response.ok || !res.status) {
            // Extract only the plain error message from the API response
            let errorMsg = "Failed to enrich organization";
            if (res.message) {
                try {
                    // The message may contain JSON inside a string after the colon
                    const jsonPart = res.message.split(':').slice(1).join(':').trim();
                    const parsed = JSON.parse(jsonPart);
                    if (parsed.error) errorMsg = parsed.error;
                } catch {
                    // fallback if parsing fails
                    errorMsg = res.message;
                }
            }

            modalTitle.textContent = "Error";
            modalBody.innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
            return;
        }

        if (!res.data.organizations.length) {
            modalTitle.textContent = "No data found";
            modalBody.innerHTML = "";
            return;
        }

        const org = res.data.organizations[0];
        modalTitle.textContent = org.name || "Organization";

        // Keywords in rows of 10
        let keywordsHTML = "";
        if (org.keywords?.length) {
            const chunkSize = 10;
            for (let i = 0; i < org.keywords.length; i += chunkSize) {
                const chunk = org.keywords.slice(i, i + chunkSize);
                keywordsHTML += `<div class="mb-1">` +
                    chunk.map(k => `<span class="badge bg-secondary me-1 mb-1">${k}</span>`).join('') +
                    `</div>`;
            }
        } else {
            keywordsHTML = "N/A";
        }

        // Departments
        const deptHTML = Object.entries(org.departmental_head_count || {})
            .filter(([_, val]) => val > 0)
            .map(([key, val]) => `<div class="col-md-3 mb-2"><strong>${key.replaceAll('_', ' ')}:</strong> ${val}</div>`).join('');

        // Social Icons
        const socialHTML = `
            ${org.website_url ? `<a href="${org.website_url}" target="_blank" class="me-2 text-decoration-none" title="Website"><i class="bi bi-globe fs-5"></i></a>` : ''}
            ${org.linkedin_url ? `<a href="${org.linkedin_url}" target="_blank" class="me-2 text-decoration-none" title="LinkedIn"><i class="bi bi-linkedin fs-5"></i></a>` : ''}
            ${org.facebook_url ? `<a href="${org.facebook_url}" target="_blank" class="me-2 text-decoration-none" title="Facebook"><i class="bi bi-facebook fs-5"></i></a>` : ''}
            ${org.twitter_url ? `<a href="${org.twitter_url}" target="_blank" class="me-2 text-decoration-none" title="Twitter"><i class="bi bi-twitter fs-5"></i></a>` : ''}
        `;

        modalBody.innerHTML = `
        <div class="container-fluid">
            <!-- Organization Header -->
            <div class="d-flex align-items-start mb-3 p-3 card shadow-sm">
                <div class="flex-shrink-0 me-3 text-center">
                    <img src="${org.logo_url || 'https://via.placeholder.com/100'}" 
                         class="img-fluid rounded" style="width:100px; height:100px; object-fit:contain;">
                </div>
                <div class="flex-grow-1">
                    <h5 class="fw-bold mb-1">${org.name}</h5>
                    <p class="mb-1"><strong>Domain:</strong> ${org.primary_domain || "N/A"}</p>
                    <p class="mb-1"><strong>Founded:</strong> ${org.founded_year || "N/A"}</p>
                    <p class="mb-1"><strong>Industry:</strong> ${org.industry || "N/A"}</p>
                    <p class="mb-1"><strong>Employees:</strong> ${org.estimated_num_employees || "N/A"}</p>
                    <p class="mb-1"><strong>Revenue:</strong> ${org.organization_revenue_printed || "N/A"}</p>
                    <div class="mt-2">${socialHTML}</div>
                </div>
            </div>

            <!-- Description Card -->
            <div class="card p-3 mb-3 shadow-sm">
                <h6 class="fw-bold">Description</h6>
                <p>${org.short_description || "N/A"}</p>
            </div>

            <!-- Address Card -->
            <div class="card p-3 mb-3 shadow-sm">
                <h6 class="fw-bold">Address</h6>
                <p>${org.street_address || ""}, ${org.city || ""}, ${org.state || ""}, ${org.country || ""}, ${org.postal_code || ""}</p>
            </div>

            <!-- Keywords Card -->
            <div class="card p-3 mb-3 shadow-sm">
                <h6 class="fw-bold">Keywords</h6>
                ${keywordsHTML}
            </div>

            <!-- Departments Card -->
            <div class="card p-3 mb-3 shadow-sm">
                <h6 class="fw-bold">Departments</h6>
                <div class="row">${deptHTML || "<div>N/A</div>"}</div>
            </div>

            <!-- Social & IDs Card -->
            <div class="card p-3 mb-3 shadow-sm">
                <h6 class="fw-bold">Social & IDs</h6>
                <p><strong>Phone:</strong> ${org.phone || "N/A"}<br>
                <strong>LinkedIn UID:</strong> ${org.linkedin_uid || "N/A"}<br>
                <strong>Public Symbol:</strong> ${org.publicly_traded_symbol || "N/A"}<br>
                <strong>Alexa Ranking:</strong> ${org.alexa_ranking || "N/A"}</p>
            </div>

            <!-- Industry Codes Card -->
            <div class="card p-3 mb-3 shadow-sm">
                <h6 class="fw-bold">Industry Codes</h6>
                <p><strong>SIC:</strong> ${org.sic_codes?.join(', ') || "N/A"}<br>
                <strong>NAICS:</strong> ${org.naics_codes?.join(', ') || "N/A"}</p>
            </div>
        </div>
        `;

    } catch (err) {
        console.error(err);
        modalTitle.textContent = "Error";
        modalBody.innerHTML = `<div class="alert alert-danger">Failed to fetch enriched organization data: ${err.message}</div>`;
    }
}


// --------------------
// Pagination buttons
// --------------------
document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        searchOrganizations();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    currentPage++;
    searchOrganizations();
});

// --------------------
// Other events
// --------------------
document.getElementById("searchBtn").addEventListener("click", () => {
    currentPage = 1;
    searchOrganizations();
});

document.getElementById("clearBtn").addEventListener("click", () => {
    document.querySelectorAll("input").forEach(i => i.value = "");
    currentPage = 1;
    document.getElementById("Page").value = 1;
    document.getElementById("PerPage").value = 5;
    document.getElementById("organizationResults").innerHTML = "";
    document.getElementById("resultsInfo").textContent = "";
    localStorage.removeItem("organizationFilters");
    localStorage.removeItem("organizationResults");
    toastr.info("Filters and results cleared");
});

// --------------------
// On load
// --------------------
document.addEventListener("DOMContentLoaded", () => {
    loadFilters();
    const savedResults = loadResults();
    if (savedResults.length) {
        renderOrganizations(savedResults);
        document.getElementById("resultsInfo").textContent = `Showing ${savedResults.length} organization(s) from last search`;
    }
});
