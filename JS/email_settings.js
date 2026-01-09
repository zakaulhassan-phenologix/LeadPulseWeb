document.addEventListener("DOMContentLoaded", () => {

    const API = "http://185.187.170.73:8000/email/settings/settings";
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    let emailSetting = null;

    const details = document.getElementById("emailDetails");
    const createBtn = document.getElementById("createBtn");
    const updateBtn = document.getElementById("updateBtn");
    const deleteBtn = document.getElementById("deleteBtn");

    const modalEl = document.getElementById("emailModal");
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById("emailForm");

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

    // ================= LOAD EMAIL =================
    async function loadEmail() {
        details.innerHTML = `<p class="text-muted">Loading...</p>`;
        try {
            const res = await fetch(`${API}/by-user?user_id=${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();

            if (result.status && result.data) {
                emailSetting = result.data;
                renderEmail(emailSetting);
            } else {
                showNoEmail();
            }
        } catch (err) {
            console.error(err);
            showNoEmail();
        }
    }

    // ================= UI STATES =================
    function showNoEmail() {
        emailSetting = null;
        details.innerHTML = `<p class="text-muted">No email settings found.</p>`;
        createBtn.classList.remove("d-none");
        updateBtn.classList.add("d-none");
        deleteBtn.classList.add("d-none");
    }

    function renderEmail(e) {
        details.innerHTML = `
            <div class="row">
                <div class="col-md-6"><b>Email Address:</b> ${e.EmailAddress}</div>
                <div class="col-md-6"><b>Password:</b> ${e.Password ? '******' : ''}</div>
            </div>
        `;

        createBtn.classList.add("d-none");
        updateBtn.classList.remove("d-none");
        deleteBtn.classList.remove("d-none");
    }

    // ================= CREATE =================
    createBtn.onclick = () => {
        form.reset();
        document.getElementById("modalTitle").innerText = "Create Email";
        form.Id.value = "";
        form.UserId.value = userId;
        modal.show();
    };

    // ================= UPDATE =================
    updateBtn.onclick = () => {
        if (!emailSetting) return;
        form.EmailAddress.value = emailSetting.EmailAddress;
        form.Password.value = emailSetting.Password;
        form.Id.value = emailSetting.Id;
        form.UserId.value = userId;
        document.getElementById("modalTitle").innerText = "Update Email";
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
                showSuccess(result.message || (isUpdate ? "Email updated successfully" : "Email created successfully"));
                setTimeout(() => {
                    modal.hide();
                    form.reset();
                    loadEmail();
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
                Are you sure you want to delete this email?<br>
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
                            const res = await fetch(`${API}/delete?id=${emailSetting.Id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const result = await res.json();

                            if (result.status) {
                                showSuccess(result.message || "Email deleted successfully");
                                setTimeout(() => showNoEmail(), 800);
                            } else {
                                showError(result.message || "Delete failed");
                            }
                        } catch (err) {
                            console.error(err);
                            showError("Server error while deleting email");
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
    loadEmail();
});
