document.addEventListener("DOMContentLoaded", () => {

    const API = "http://185.187.170.73:8000/company";
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    let company = null;

    const details = document.getElementById("companyDetails");
    const createBtn = document.getElementById("createBtn");
    const updateBtn = document.getElementById("updateBtn");
    const deleteBtn = document.getElementById("deleteBtn");

    const modalEl = document.getElementById("companyModal");
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById("companyForm");

    // ================= Toastr Settings =================
    function showSuccess(message) {
        if (typeof toastr !== "undefined") toastr.success(message);
    }

    function showError(message) {
        if (typeof toastr !== "undefined") toastr.error(message);
    }

    if (typeof toastr !== "undefined") {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 2000
        };
    }

    // ================= LOAD COMPANY =================
    async function loadCompany() {
        details.innerHTML = `<p class="text-muted">Loading...</p>`;
        try {
            const res = await fetch(`${API}/by-user?user_id=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const result = await res.json();

            if (result.status && result.data) {
                company = result.data;
                renderCompany(company);
            } else {
                showNoCompany();
            }
        } catch (err) {
            console.error(err);
            showNoCompany();
        }
    }

    // ================= UI STATES =================
    function showNoCompany() {
        company = null;
        details.innerHTML = `<p class="text-muted">No company found.</p>`;
        createBtn.classList.remove("d-none");
        updateBtn.classList.add("d-none");
        deleteBtn.classList.add("d-none");
    }

    // ================= RENDER COMPANY =================
function renderCompany(c) {
    details.innerHTML = `
        <div class="card shadow-sm p-3 mb-4">
            <h5 class="mb-3 text-primary"><i class="bi bi-building me-2"></i>Company Overview</h5>
            <div class="row g-3">
                <div class="col-md-6"><strong>Name:</strong> ${c.Name || '-'}</div>
                <div class="col-md-6"><strong>Website:</strong> <a href="${c.WebsiteUrl}" target="_blank">${c.WebsiteUrl || '-'}</a></div>
                <div class="col-12"><strong>Description:</strong> ${c.Description || '-'}</div>
                <div class="col-md-4"><strong>Industry:</strong> ${c.Industry || '-'}</div>
                <div class="col-md-4"><strong>Target Industry:</strong> ${c.TargetIndustry || '-'}</div>
                <div class="col-md-4"><strong>Target Geography:</strong> ${c.TargetGeography || '-'}</div>
                <div class="col-md-4"><strong>Target Company Size:</strong> ${c.TargetCompanySize || '-'}</div>
                <div class="col-md-4"><strong>Company Size:</strong> ${c.Size || '-'}</div>
                <div class="col-md-4"><strong>Services:</strong> ${c.Services || '-'}</div>
                <div class="col-12"><strong>Unique Value Proposition:</strong> ${c.UniqueValueProposition || '-'}</div>
            </div>
        </div>

        <div class="card shadow-sm p-3 mb-4">
            <h5 class="mb-3 text-success"><i class="bi bi-geo-alt me-2"></i>Address</h5>
            <div class="row g-2">
                <div class="col-12">${c.Address || '-'}, ${c.City || '-'}, ${c.State || '-'}, ${c.ZipCode || '-'}, ${c.Country || '-'}</div>
            </div>
        </div>

        <div class="card shadow-sm p-3 mb-4">
            <h5 class="mb-3 text-info"><i class="bi bi-link-45deg me-2"></i>Social & Brand</h5>
            <div class="row g-3">
                <div class="col-md-6"><strong>LinkedIn:</strong> <a href="${c.LinkedInPageUrl}" target="_blank">${c.LinkedInPageUrl || '-'}</a></div>
                <div class="col-md-6"><strong>Brand Tone:</strong> ${c.BrandTone || '-'}</div>
            </div>
        </div>

        <div class="card shadow-sm p-3 mb-4">
            <h5 class="mb-3 text-warning"><i class="bi bi-bar-chart-line me-2"></i>Business Insights</h5>
            <div class="row g-2">
                <div class="col-12"><strong>Challenges:</strong> ${c.Challenges || '-'}</div>
                <div class="col-12"><strong>Goals:</strong> ${c.Goals || '-'}</div>
                <div class="col-12"><strong>Competitors:</strong> ${c.Competitors || '-'}</div>
            </div>
        </div>

        <div class="card shadow-sm p-3">
            <h5 class="mb-3 text-secondary"><i class="bi bi-person-circle me-2"></i>Meta Info</h5>
            <div class="row g-2">
                <div class="col-md-4"><strong>Created By:</strong> ${c.CreatedBy || '-'}</div>
                <div class="col-md-4"><strong>Created At:</strong> ${c.CreatedAt ? new Date(c.CreatedAt).toLocaleString() : '-'}</div>
            </div>
        </div>
    `;

    createBtn.classList.add("d-none");
    updateBtn.classList.remove("d-none");
    deleteBtn.classList.remove("d-none");
}


    // ================= CREATE =================
    createBtn.onclick = () => {
        form.reset();
        document.getElementById("modalTitle").innerText = "Create Company";
        form.Id.value = "";
        modal.show();
    };

    // ================= UPDATE =================
    updateBtn.onclick = () => {
        Object.keys(company).forEach(key => {
            if (form[key]) form[key].value = company[key];
        });
        document.getElementById("modalTitle").innerText = "Update Company";
        modal.show();
    };

    // ================= SAVE (CREATE / UPDATE) =================
    document.getElementById("saveBtn").onclick = async () => {
        const data = Object.fromEntries(new FormData(form).entries());
        const isUpdate = !!data.Id && data.Id !== "";

        const url = isUpdate ? `${API}/update` : `${API}/create`;
        const method = isUpdate ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.status) {
                showSuccess(result.message || (isUpdate ? "Company updated successfully" : "Company created successfully"));
                setTimeout(() => {
                    modal.hide();
                    form.reset();
                    loadCompany(); // Refresh company details automatically
                }, 800);
            } else {
                showError(result.message || "Operation failed");
            }
        } catch (err) {
            console.error(err);
            showError("Server error");
        }
    };

    // ================= DELETE =================
    deleteBtn.onclick = () => {
        if (!toastr) return;
        toastr.remove();
        toastr.warning(
            `<div>
                Are you sure you want to delete this company?<br>
                <button type="button" class="btn btn-sm btn-danger me-2" id="confirmDelete">Yes</button>
                <button type="button" class="btn btn-sm btn-secondary" id="cancelDelete">No</button>
            </div>`,
            'Confirm Delete',
            {
                timeOut: 0,
                extendedTimeOut: 0,
                closeButton: false,
                allowHtml: true,
                tapToDismiss: false,
                onShown: function () {
                    document.getElementById('confirmDelete').onclick = async () => {
                        toastr.remove();
                        try {
                            const res = await fetch(`${API}/delete?company_id=${company.Id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const result = await res.json();
                            if (result.status) {
                                showSuccess(result.message || "Company deleted successfully");
                                setTimeout(() => showNoCompany(), 800);
                            } else {
                                showError(result.message || "Delete failed");
                            }
                        } catch (err) {
                            console.error(err);
                            showError("Server error while deleting company");
                        }
                    };

                    document.getElementById('cancelDelete').onclick = () => {
                        toastr.remove();
                        toastr.info("Delete cancelled");
                    };
                }
            }
        );
    };

    // ================= INIT =================
    loadCompany();
});
