document.addEventListener("DOMContentLoaded", () => {
    const API = "http://185.187.170.73:8000/linkedin/posts";
    const token = localStorage.getItem("accessToken");

    const postsContainer = document.getElementById("postsContainer");
    let postsData = { scheduled: [], history: [] };
    let currentTab = "scheduled";
    let currentPage = 0;
    const PAGE_SIZE = 10;
    let scheduledSearch = "";
    let historySearch = "";

    // ================= Toastr =================
    function showSuccess(msg) { if (toastr) toastr.success(msg); }
    function showError(msg) { if (toastr) toastr.error(msg); }

    if (toastr) {
        toastr.options = { closeButton: true, progressBar: true, positionClass: "toast-top-right", timeOut: 2000 };
    }

    // ================= LOAD POSTS =================
    async function loadPosts() {
        postsContainer.innerHTML = `<p class="text-muted">Loading...</p>`;
        const endpoint = currentTab === "scheduled" ? "schedule_list" : "history_list";
        const search = currentTab === "scheduled" ? scheduledSearch : historySearch;
        const url = `${API}/${endpoint}?skipCount=${currentPage * PAGE_SIZE}&maxCount=${PAGE_SIZE}&search=${encodeURIComponent(search)}`;

        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const result = await res.json();

            if (result.status && result.data) {
                postsData[currentTab] = result.data.items;
                renderPosts(postsData[currentTab]);
                renderPagination(result.data.totalCount);
                document.getElementById("totalCount").textContent = `Total: ${result.data.totalCount}`;
            } else {
                postsContainer.innerHTML = `<p class="text-muted">No posts found.</p>`;
                document.getElementById("pagination").innerHTML = "";
            }
        } catch (err) {
            console.error(err);
            showError("Failed to load posts");
        }
    }

    // ================= RENDER POSTS =================
    function renderPosts(posts) {
        postsContainer.innerHTML = "";
        if (!posts.length) return postsContainer.innerHTML = `<p class="text-muted">No posts found.</p>`;

        posts.forEach(post => {
            let content = post.Content || "";
            content = content.replace(/(#\w+)/g, '<strong class="hashtag">$1</strong>');
            content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

            postsContainer.innerHTML += `
                <div class="card mb-3 post-card">
                    <div class="card-body post-content">
                        ${currentTab === "scheduled" ? `<i class="bi bi-trash delete-btn" onclick="confirmDelete(${post.Id})"></i>` : ""}
                        <p>${content}</p>
                        ${post.ImageUrl ? `<img src="${post.ImageUrl}" class="post-media">` : ""}
                        ${post.VideoUrl ? `<video src="${post.VideoUrl}" controls class="post-media"></video>` : ""}
                        <div class="card-footer mt-2">${currentTab === "scheduled" ? `Scheduled: ${formatDate(post.ScheduledTime)}` : `Published: ${formatDate(post.PublishedAt)}`}</div>
                    </div>
                </div>`;
        });
    }

    // ================= DELETE =================
    window.confirmDelete = function (postId) {
        toastr.remove();
        toastr.warning(
            `<div>
                Are you sure you want to delete this post?<br>
                <button type="button" class="btn btn-sm btn-danger me-2" id="confirmDeletePost">Yes</button>
                <button type="button" class="btn btn-sm btn-secondary" id="cancelDeletePost">No</button>
            </div>`,
            "Confirm Delete",
            {
                timeOut: 0,
                extendedTimeOut: 0,
                closeButton: false,
                allowHtml: true,
                tapToDismiss: false,
                onShown: function () {
                    document.getElementById("confirmDeletePost").onclick = async () => {
                        toastr.remove();
                        try {
                            await fetch(`${API}/${postId}/delete`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                            showSuccess("Post deleted successfully");
                            loadPosts();
                        } catch {
                            showError("Failed to delete post");
                        }
                    };
                    document.getElementById("cancelDeletePost").onclick = () => { toastr.remove(); toastr.info("Delete cancelled"); };
                }
            }
        );
    }

    // ================= PAGINATION =================
    function renderPagination(total) {
        const pages = Math.ceil(total / PAGE_SIZE);
        const pagination = document.getElementById("pagination");
        pagination.innerHTML = "";
        for (let i = 0; i < pages; i++) {
            pagination.innerHTML += `<li class="page-item ${i === currentPage ? "active" : ""}">
                <button class="page-link" onclick="goToPage(${i})">${i + 1}</button>
            </li>`;
        }
    }

    window.goToPage = function (page) { currentPage = page; loadPosts(); }

    // ================= TAB SWITCH =================
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentTab = btn.dataset.tab;
            currentPage = 0;
            toggleSearch();
            loadPosts();
        });
    });

    function toggleSearch() {
        document.getElementById("scheduledSearchBox").classList.toggle("d-none", currentTab !== "scheduled");
        document.getElementById("historySearchBox").classList.toggle("d-none", currentTab !== "history");

        // Reset posts and total count immediately when tab changes
        postsContainer.innerHTML = `<p class="text-muted">Loading...</p>`;
        document.getElementById("totalCount").textContent = `Total: 0`;
    }


    // ================= SEARCH =================
    document.getElementById("scheduledSearch").addEventListener("input", debounce(e => { scheduledSearch = e.target.value; currentPage = 0; loadPosts(); }));
    document.getElementById("historySearch").addEventListener("input", debounce(e => { historySearch = e.target.value; currentPage = 0; loadPosts(); }));

    // ================= HELPERS =================
    function formatDate(d) { return new Date(d + "Z").toLocaleString(); }
    function debounce(fn, delay = 400) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; }

    // ================= INIT =================
    loadPosts();
});
