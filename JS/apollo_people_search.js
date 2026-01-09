const PEOPLE_API_URL = "http://185.187.170.73:8000/apollo/search-people";
let currentPage = Number(localStorage.getItem("peopleCurrentPage")) || 1;

// --------------------
// LocalStorage Keys
// --------------------
const PEOPLE_CACHE_KEY = "peopleSearchResults";

// --------------------
// Mapped Organization from localStorage
// --------------------
const mappedOrgId = localStorage.getItem("selectedOrganizationId");
const mappedOrgDomain = localStorage.getItem("selectedOrganizationDomain");
const mappedOrgName = localStorage.getItem("selectedOrganizationName");

if (mappedOrgDomain && document.getElementById("OrgDomain")) {
    document.getElementById("OrgDomain").value = mappedOrgDomain;
}

// --------------------
// Restore Organization Header
// --------------------
const organizationHeader = document.getElementById("organizationHeader");
if (mappedOrgDomain && organizationHeader) {
    organizationHeader.innerHTML = mappedOrgName
        ? `${mappedOrgName} <span class="text-muted fs-6">• ${mappedOrgDomain}</span>`
        : `<span class="text-muted fs-6">${mappedOrgDomain}</span>`;
    organizationHeader.classList.remove("d-none");
}

// --------------------
// Fetch People (API CALL)
// --------------------
async function fetchPeople() {
    const token = localStorage.getItem("accessToken");
    if (!token) {
        toastr.error("Unauthorized: No access token found.");
        return;
    }

    const perPageEl = document.getElementById("PerPage");
    const peopleResults = document.getElementById("peopleResults");
    const peopleResultsInfo = document.getElementById("peopleResultsInfo");

    localStorage.setItem("peopleCurrentPage", currentPage);

    const currentOrgDomain = document.getElementById("OrgDomain")?.value.trim();
    const currentOrgId = document.getElementById("OrgId")?.value.trim();

    const payload = {
        PersonFirstNames: document.getElementById("FirstName").value.trim()
            ? [document.getElementById("FirstName").value.trim()]
            : [],
        PersonLastNames: document.getElementById("LastName").value.trim()
            ? [document.getElementById("LastName").value.trim()]
            : [],
        PersonTitles: document.getElementById("PersonTitle").value.trim()
            ? [document.getElementById("PersonTitle").value.trim()]
            : [],
        QOrganizationDomainsList: currentOrgDomain ? [currentOrgDomain] : [],
        OrganizationIds: currentOrgId ? [currentOrgId] : [],
        Page: currentPage,
        PerPage: Number(document.getElementById("PerPage")?.value || 5)
    };


    peopleResults.innerHTML = "";
    peopleResultsInfo.textContent = "Fetching people...";

    try {
        const res = await fetch(PEOPLE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!data?.status) {
            peopleResultsInfo.textContent = data.message || "Unauthorized access";
            return;
        }

        const people = data.data.people || [];

        localStorage.setItem(PEOPLE_CACHE_KEY, JSON.stringify(people));

        renderPeople(people);
        peopleResultsInfo.textContent = `Showing ${people.length} people`;

        document.getElementById("pageInfo").textContent = `Page ${currentPage}`;
        document.getElementById("prevPage").disabled = currentPage === 1;
        document.getElementById("nextPage").disabled =
            people.length < Number(perPageEl?.value || 5);

    } catch (err) {
        console.error(err);
        toastr.error("Failed to fetch people");
    }
}

// --------------------
// Load People from LocalStorage (NO API CALL)
// --------------------
function loadPeopleFromCache() {
    const cached = localStorage.getItem(PEOPLE_CACHE_KEY);
    if (!cached) return;

    const people = JSON.parse(cached);
    if (!people.length) return;

    renderPeople(people);
    document.getElementById("peopleResultsInfo").textContent =
        `Showing ${people.length} people (cached)`;
}



// --------------------
// EVENTS
// --------------------
document.getElementById("searchBtn").addEventListener("click", () => {
    currentPage = 1;

    // Clear only the people search cache
    localStorage.removeItem(PEOPLE_CACHE_KEY);
    localStorage.removeItem("peopleCurrentPage");

    // Read the current input values
    const currentOrgDomain = document.getElementById("OrgDomain")?.value.trim();
    const currentOrgId = document.getElementById("OrgId")?.value.trim(); // optional

    // Save current org to localStorage for persistence
    if (currentOrgDomain) localStorage.setItem("selectedOrganizationDomain", currentOrgDomain);
    if (currentOrgId) localStorage.setItem("selectedOrganizationId", currentOrgId);

    document.getElementById("peopleResults").innerHTML = "";
    document.getElementById("peopleResultsInfo").textContent = "Searching...";

    // Call fetch with updated domain
    fetchPeople();
});



document.getElementById("nextPage").addEventListener("click", () => {
    currentPage++;
    fetchPeople();
});

// --------------------
// Page Load (NO API CALL)
// --------------------
document.addEventListener("DOMContentLoaded", () => {
    loadPeopleFromCache();
});




// --------------------
// Render People Cards
// --------------------
function renderPeople(list) {
    const peopleResults = document.getElementById("peopleResults");
    peopleResults.innerHTML = "";

    const enrichModal = new bootstrap.Modal(document.getElementById('enrichModal'));
    const modalBody = document.getElementById("modal-body");
    const token = localStorage.getItem("accessToken");

    list.forEach(person => {
        const initials = `${person.first_name?.[0] || ""}${person.last_name_obfuscated?.[0] || ""}`;

        const div = document.createElement("div");
        div.className = "card person-card shadow-sm mb-2 cursor-pointer";

        div.innerHTML = `
            <div class="card-body d-flex align-items-center gap-3">
                <div class="avatar">${initials}</div>
                <div>
                    <h6 class="mb-1">${[person.first_name, person.last_name_obfuscated].filter(Boolean).join(" ")}</h6>
                    ${person.title ? `<div class="text-muted small">${person.title}</div>` : ""}
                    ${person.last_refreshed_at ? `<div class="text-muted small">Last refreshed: ${new Date(person.last_refreshed_at).toLocaleDateString()}</div>` : ""}
                </div>
            </div>
        `;

        div.addEventListener("click", async () => {
            enrichModal.show();
            modalBody.innerHTML = `<div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>`;

            const payload = {
                ApolloPersonId: person.id,
                FirstName: person.first_name || "",
                LastName: person.last_name_obfuscated || "",
                FullName: `${person.first_name || ""} ${person.last_name_obfuscated || ""}`.trim(),
                Email: person.email || "",
                LinkedInProfileURL: person.linkedin_url || "",
                OrganizationName: person.organization?.name || "",
                Domain: (person.organization?.name || "").replace(/\s+/g, '').toLowerCase() + ".com",
                RevealPersonalEmails: false
            };

            try {
                const response = await fetch('http://185.187.170.73:8000/apollo/get/enrich-lead/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!data?.status) {
                    modalBody.innerHTML = `<p class="text-danger">${data.message || 'Unauthorized access'}</p>`;
                    return;
                }

                debugger;
                const lead = data.data.enriched_lead;
                const leadId = data.data.lead_id;
                const email = lead.person.email || "";

                modalBody.innerHTML = `
            <div class="row g-3">
                <!-- Left Panel -->
                <div class="col-md-4 text-center border-end">
                    <img src="${lead.person.photo_url}" class="img-fluid rounded-circle mb-3" alt="${lead.person.name}" style="width:150px;height:150px;object-fit:cover;">
                    <h5 class="fw-bold">${lead.person.name}</h5>
                    <p class="text-muted mb-1">${lead.person.title || ''}</p>
                    <p class="text-muted">${lead.person.headline || ''}</p>
                    <p><i class="bi bi-envelope"></i> ${email}</p>

                    <p>
                        ${lead.person.linkedin_url ? `<a href="${lead.person.linkedin_url}" target="_blank" class="btn btn-outline-primary btn-sm mb-1 w-100"><i class="bi bi-linkedin"></i> LinkedIn</a>` : ''}
                        ${lead.person.twitter_url ? `<a href="${lead.person.twitter_url}" target="_blank" class="btn btn-outline-info btn-sm mb-1 w-100"><i class="bi bi-twitter"></i> Twitter</a>` : ''}
                        ${lead.person.facebook_url ? `<a href="${lead.person.facebook_url}" target="_blank" class="btn btn-outline-primary btn-sm mb-1 w-100"><i class="bi bi-facebook"></i> Facebook</a>` : ''}
                        ${lead.person.github_url ? `<a href="${lead.person.github_url}" target="_blank" class="btn btn-outline-dark btn-sm mb-1 w-100"><i class="bi bi-github"></i> GitHub</a>` : ''}
                    </p>

                    ${email
                        ? `<button class="btn btn-success w-100 mt-2" 
                                onclick="window.location.href='generate_email.html?leadId=${leadId}&toEmail=${encodeURIComponent(lead.person.email)}'">
                            Connect
                        </button>`
                        : ''
                    }

                </div>

                <!-- Right Panel -->
                <div class="col-md-8">
                    <!-- Organization Info -->
                    <div class="mb-3">
                        <h6 class="fw-bold">Organization: ${lead.person.organization.name}</h6>
                        <p><i class="bi bi-telephone"></i> ${lead.person.organization.primary_phone?.number || ''}</p>
                        <p><a href="${lead.person.organization.website_url}" target="_blank">${lead.person.organization.website_url || ''}</a></p>
                        <p><strong>Industry:</strong> ${lead.person.organization.industry || ''}</p>
                        <p><strong>Employees:</strong> ${lead.person.organization.estimated_num_employees || ''}</p>
                        <p><strong>Founded:</strong> ${lead.person.organization.founded_year || ''}</p>
                        <p><strong>Location:</strong> ${lead.person.organization.city}, ${lead.person.organization.state}, ${lead.person.organization.country}</p>
                        <p>${lead.person.organization.short_description || ''}</p>
                    </div>

                    <!-- Technologies -->
                    ${lead.person.organization.current_technologies?.length > 0 ? `
                    <div class="mb-3">
                        <h6 class="fw-bold">Current Technologies:</h6>
                        <div class="d-flex flex-wrap gap-2">
                            ${lead.person.organization.current_technologies.map(tech => `<span class="badge bg-primary">${tech.name}</span>`).join('')}
                        </div>
                    </div>` : ''}

                    <!-- Employment History -->
                    <div class="mb-3">
                        <h6 class="fw-bold">Employment History:</h6>
                        <ul class="list-group list-group-flush">
                            ${lead.person.employment_history.map(job => `
                                <li class="list-group-item p-2">
                                    <strong>${job.title}</strong> at <em>${job.organization_name}</em><br>
                                    <small>${job.start_date || ''} - ${job.end_date || (job.current ? 'Present' : '')}</small>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <!-- Location & Time Zone -->
                    <div class="mb-3">
                        <h6 class="fw-bold">Location & Time Zone:</h6>
                        <p>${lead.person.formatted_address || ''} | <strong>Time Zone:</strong> ${lead.person.time_zone || ''}</p>
                    </div>

                    <!-- Departments & Seniority -->
                    <div class="mb-3">
                        <h6 class="fw-bold">Role Details:</h6>
                        <p><strong>Departments:</strong> ${lead.person.departments.join(', ')}</p>
                        <p><strong>Subdepartments:</strong> ${lead.person.subdepartments.join(', ')}</p>
                        <p><strong>Seniority:</strong> ${lead.person.seniority}</p>
                    </div>
                </div>
            </div>
                `;
            } catch (err) {
                modalBody.innerHTML = `<p class="text-danger">Error fetching lead details.</p>`;
                console.error(err);
            }
        });

        peopleResults.appendChild(div);
    });
}
