document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.querySelector('form');

    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: "toast-top-right",
        timeOut: "3000"
    };

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const loginData = {
            Email: email,
            Password: password
        };

        try {
            const response = await fetch(
                'http://185.187.170.73:8000/user/login',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                }
            );

            const result = await response.json();

            if (response.ok && result.status === true) {
                toastr.success('Login Successful! Redirecting...', 'Success');

                // Store token and user info in localStorage
                localStorage.setItem('accessToken', result.data.access_token);
                localStorage.setItem('userId', result.data.id);
                localStorage.setItem('userName', result.data.name);
                localStorage.setItem('userEmail', result.data.email);

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '../dashboard.html';
                }, 500);

            } else {
                toastr.error(result.message || 'Invalid Email or Password', 'Login Failed');
            }

        } catch (error) {
            console.error('Error:', error);
            toastr.error('CORS error or Server is down.', 'Network Error');
        }
    });
});
