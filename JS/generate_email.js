// -----------------------------
// Get query string params
// -----------------------------
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const leadId = getQueryParam("leadId");
const toEmailQuery = getQueryParam("toEmail") || "";
const token = localStorage.getItem("accessToken");
const userId = Number(localStorage.getItem("userId")) || 1;

if (!leadId) {
    toastr.error("Lead ID not found!");
} else {
    generateEmail(leadId, toEmailQuery);
}

// -----------------------------
// Generate Email API call
// -----------------------------
async function generateEmail(leadId, prefilledEmail = "") {
    try {
        if (prefilledEmail) {
            document.getElementById("toEmail").value = prefilledEmail;
        }

        const response = await fetch(
            `http://185.187.170.73:8000/email/generate/generate-sales-email?lead_id=${leadId}`,
            {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();
        document.getElementById("loading").classList.add("d-none");

        if (!data.status) {
            toastr.error(data.message || "Failed to generate email");
            return;
        }

        const emailData = data.data;

        if (!prefilledEmail) {
            document.getElementById("toEmail").value = emailData.to_email;
        }

        document.getElementById("subject").value = emailData.subject;

        const emailsDiv = document.getElementById("emails");
        emailsDiv.innerHTML = "";

        // Section title
        const title = document.createElement("h6");
        title.textContent = "Email And Follow Ups";
        title.className = "mb-3";
        emailsDiv.appendChild(title);

        Object.entries(emailData.emails).forEach(([key, value], index) => {
            const label = index === 0 ? "Email" : `Follow Up ${index}`;

            const div = document.createElement("div");
            div.className = "mb-3";
            div.innerHTML = `
                <strong>${label}:</strong>
                <div class="email-content mt-1 border p-2 rounded"
                     contenteditable="true"
                     style="min-height:150px; background:#fff;">
                </div>
                <hr>
            `;

            const editableDiv = div.querySelector(".email-content");
            editableDiv.innerHTML = value;

            emailsDiv.appendChild(div);
        });

        document.getElementById("emailContent").classList.remove("d-none");

        // -----------------------------
        // Send Email API Call
        // -----------------------------
        document.getElementById("sendEmailBtn").addEventListener("click", async () => {
            try {
                const toEmail = document.getElementById("toEmail").value;
                const subject = document.getElementById("subject").value;

                const emailDivs = document.querySelectorAll(".email-content");

                const emailsPayload = {};
                emailDivs.forEach((div, index) => {
                    emailsPayload[`email_${index + 1}`] = {
                        body: div.innerHTML
                    };
                });

                const payload = {
                    UserId: userId,
                    ToEmail: toEmail,
                    Subject: subject,
                    Emails: emailsPayload
                };

                const sendResponse = await fetch(
                    "http://185.187.170.73:8000/email/send/email-sequence/send",
                    {
                        method: "POST",
                        headers: {
                            "accept": "application/json",
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    }
                );

                const sendData = await sendResponse.json();

                if (!sendData.status) {
                    toastr.error(sendData.message || "Failed to send email");
                    return;
                }

                toastr.success(sendData.message || "Email sent successfully");

                setTimeout(() => {
                    window.location.href = "apollo_people_search.html";
                }, 1500);

            } catch (error) {
                console.error(error);
                toastr.error("Failed to send email. Check console.");
            }
        });

    } catch (err) {
        document.getElementById("loading").classList.add("d-none");
        console.error(err);
        toastr.error("Error generating email. Check console.");
    }
}
