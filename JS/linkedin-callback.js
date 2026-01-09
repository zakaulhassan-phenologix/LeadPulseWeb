(async function () {
    try {
        debugger
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state"); // <-- get state from URL
        const error = params.get("error");

        if (error) {
            toastr.error("LinkedIn authorization failed");
            setTimeout(() => window.location.href = "../dashboard.html", 2000);
            return;
        }

        if (!code || !state) {
            toastr.error("Authorization code or state missing");
            setTimeout(() => window.location.href = "../dashboard.html", 2000);
            return;
        }

        // Call your backend callback API with code AND state
        const response = await fetch(
            `http://185.187.170.73:8000/auth/linkedin/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
            {
                method: "GET",
                headers: { "Accept": "application/json" }
            }
        );

        const result = await response.json();
        debugger

        if (result.status) {
            toastr.success(result.message || "LinkedIn connected successfully");
        } else {
            toastr.error(result.message || "LinkedIn connection failed");
        }

    } catch (err) {
        console.error(err);
        toastr.error("Something went wrong");
    } finally {
        setTimeout(() => window.location.href = "../dashboard.html", 2000);
    }
})();
