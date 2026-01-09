const API = "http://185.187.170.73:8000";
const token = localStorage.getItem("accessToken");

// Auth guard
if (!token) {
    toastr.error("Session expired. Please login again.");
    setTimeout(() => window.location.href = "../login.html", 1500);
}

// Elements
const openGenerateModalBtn = document.getElementById("openGenerateModalBtn");
const generatePostBtn = document.getElementById("generatePostBtn");
const postNowBtn = document.getElementById("postNowBtn");
const schedulePostBtn = document.getElementById("schedulePostBtn");
const postContent = document.getElementById("postContent");
const attachBtn = document.getElementById("attachBtn");
const articleBtn = document.getElementById("articleBtn");
const attachmentFile = document.getElementById("attachmentFile");
const attachmentPreview = document.getElementById("attachmentPreview");
const attachmentName = document.getElementById("attachmentName");
const removeAttachmentBtn = document.getElementById("removeAttachmentBtn");

// Modals
const generateModal = new bootstrap.Modal(document.getElementById("generateModal"));
const articleModal = new bootstrap.Modal(document.getElementById("articleModal"));
const scheduleModal = new bootstrap.Modal(document.getElementById("scheduleModal"));
const saveScheduleBtn = document.getElementById("saveScheduleBtn");
const scheduledDateTime = document.getElementById("scheduledDateTime");

// Article Data
let articleData = { title: "", link: "", description: "" };
const articlePreviewContainer = document.createElement("div");
articlePreviewContainer.id = "articlePreview";
articlePreviewContainer.classList.add("mb-3", "d-none");
articlePreviewContainer.innerHTML = `
    <label class="form-label fw-semibold">Article:</label>
    <div class="d-flex align-items-center gap-2">
        <i class="bi bi-file-earmark-text fs-3"></i>
        <span id="articleName"></span>
        <button type="button" id="removeArticleBtn" class="btn btn-sm btn-outline-danger ms-2" title="Remove Article">&times;</button>
    </div>
`;
postContent.parentNode.insertBefore(articlePreviewContainer, postContent.nextSibling);
const articleName = document.getElementById("articleName");
const removeArticleBtn = document.getElementById("removeArticleBtn");

// Open Generate Modal
openGenerateModalBtn.addEventListener("click", () => generateModal.show());

// Generate Post
generatePostBtn.addEventListener("click", async () => {
    try {
        const payload = {
            PostTopic: document.getElementById("PostTopic").value.trim(),
            AdditionalContext: document.getElementById("AdditionalContext").value.trim(),
            Tone: document.getElementById("Tone").value,
            PostLength: document.getElementById("PostLength").value,
            CTA: document.getElementById("CTA").value.trim(),
            Hashtags: document.getElementById("Hashtags").value.trim(),
            Sender_Designation: document.getElementById("Sender_Designation").value.trim()
        };
        if (!payload.PostTopic) return toastr.warning("Post Topic is required");

        generatePostBtn.disabled = true;
        toastr.info("Generating post...");

        const res = await fetch(`${API}/linkedin/posts/generate`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok || !result.status) throw new Error(result.message || "Failed to generate post");

        postContent.value = result.data;
        postContent.disabled = false;

        // Show buttons
        postNowBtn.classList.remove("d-none");
        schedulePostBtn.classList.remove("d-none");
        attachBtn.classList.remove("d-none");
        articleBtn.classList.remove("d-none");

        generateModal.hide();
        toastr.success("Post generated successfully!");
    } catch (err) {
        console.error(err);
        toastr.error(err.message || "Something went wrong");
    } finally { generatePostBtn.disabled = false; }
});

// Attachment button
attachBtn.addEventListener("click", () => attachmentFile.click());
attachmentFile.addEventListener("change", () => {
    if (attachmentFile.files.length > 0) {
        attachmentPreview.classList.remove("d-none");
        attachmentName.innerText = attachmentFile.files[0].name;
        articleBtn.disabled = true;
        articlePreviewContainer.classList.add("d-none");
        articleData = { title: "", link: "", description: "" };
    }
});

// Remove attachment
removeAttachmentBtn.addEventListener("click", () => {
    attachmentFile.value = "";
    attachmentPreview.classList.add("d-none");
    attachmentName.innerText = "";
    articleBtn.disabled = false;
});

// Article button
articleBtn.addEventListener("click", () => articleModal.show());

// Save Article
document.getElementById("saveArticleBtn").addEventListener("click", () => {
    articleData.title = document.getElementById("articleTitle").value.trim();
    articleData.link = document.getElementById("articleSourceLink").value.trim();
    articleData.description = document.getElementById("articleDescription").value.trim();

    if (articleData.title || articleData.link || articleData.description) {
        articlePreviewContainer.classList.remove("d-none");
        articleName.innerText = articleData.title || "Article";
        attachBtn.disabled = true;
    }

    articleModal.hide();
    toastr.success("Article info saved!");
});

// Remove Article
removeArticleBtn.addEventListener("click", () => {
    articleData = { title: "", link: "", description: "" };
    articlePreviewContainer.classList.add("d-none");
    articleName.innerText = "";
    attachBtn.disabled = false;
});

// Post Now
postNowBtn.addEventListener("click", async () => {
    await postOrSchedule("upload");
});

// Schedule Post
schedulePostBtn.addEventListener("click", () => scheduleModal.show());

saveScheduleBtn.addEventListener("click", async () => {
    const scheduledTime = scheduledDateTime.value;
    if (!scheduledTime) return toastr.warning("Please select date and time");
    await postOrSchedule("schedule", scheduledTime);
    scheduleModal.hide();
    resetUI(); // <-- Reset UI after scheduling
});

// Function to handle both post & schedule
async function postOrSchedule(endpoint, scheduledTime = null) {
    try {
        const content = postContent.value.trim();
        if (!content) return toastr.warning("Post content is empty");

        const btn = endpoint === "upload" ? postNowBtn : saveScheduleBtn;
        btn.disabled = true;
        toastr.info(endpoint === "upload" ? "Posting to LinkedIn..." : "Scheduling post...");

        const formData = new FormData();
        formData.append("post_content", content);

        let postType = "text";
        if (attachmentFile.files.length > 0) postType = "attachment";
        if (articleData.title || articleData.link || articleData.description) postType = "article";
        formData.append("post_type", postType);

        if (attachmentFile.files.length > 0) formData.append("file", attachmentFile.files[0]);
        formData.append("article_title", articleData.title || "");
        formData.append("article_source_link", articleData.link || "");
        formData.append("article_description", articleData.description || "");

        if (scheduledTime) formData.append("scheduled_time", new Date(scheduledTime).toISOString());

        const res = await fetch(`${API}/linkedin/posts/${endpoint}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        const result = await res.json();
        if (!res.ok || !result.status) throw new Error(result.message || "Operation failed");

        toastr.success(result.message || (endpoint === "upload" ? "Posted successfully!" : "Scheduled successfully!"));

        if (endpoint === "upload") resetUI();
    } catch (err) {
        console.error(err);
        toastr.error(err.message || "Operation failed");
    } finally { 
        if (endpoint === "upload") postNowBtn.disabled = false;
        else saveScheduleBtn.disabled = false;
    }
}

// Reset UI after posting or scheduling
function resetUI() {
    postContent.value = ""; 
    postContent.disabled = true;
    postNowBtn.classList.add("d-none");
    schedulePostBtn.classList.add("d-none");
    attachBtn.classList.add("d-none");
    articleBtn.classList.add("d-none");
    attachmentFile.value = "";
    attachmentPreview.classList.add("d-none");
    attachmentName.innerText = "";
    articlePreviewContainer.classList.add("d-none");
    articleName.innerText = "";
    articleData = { title: "", link: "", description: "" };
    attachBtn.disabled = false;
    articleBtn.disabled = false;
}
