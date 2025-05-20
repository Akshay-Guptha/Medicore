// frontend/js/homepage.js
document.addEventListener('DOMContentLoaded', () => {
    // Existing DOM element selections for user info and logout
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const welcomeHeader = document.getElementById('welcomeHeader'); // In dashboardView
    const logoutButton = document.getElementById('logoutButton');

    // DOM elements for view switching
    const dashboardLink = document.getElementById('dashboardLink');
    const myNotesLink = document.getElementById('myNotesLink');
    const dashboardView = document.getElementById('dashboardView');
    const notesView = document.getElementById('notesView');
    // const searchResultsContainer = document.getElementById('results'); // Already part of dashboardView

    const BACKEND_API_URL = 'http://localhost:5000';

    // --- View Switching Logic ---
    function showView(viewIdToShow) {
        // Hide all main views first
        if (dashboardView) dashboardView.style.display = 'none';
        if (notesView) notesView.style.display = 'none';
        // Add any other top-level views here if they exist

        // Show the requested view
        const viewElement = document.getElementById(viewIdToShow);
        if (viewElement) {
            viewElement.style.display = 'block';

            // If showing notes view, initialize it (or re-initialize if needed)
            if (viewIdToShow === 'notesView') {
                if (window.notesManager && typeof window.notesManager.init === 'function') {
                    console.log("Initializing notes manager...");
                    window.notesManager.init(); // Call the init function from notesManager.js
                } else {
                    console.warn('notesManager or notesManager.init function is not available yet.');
                    // You might want to load notesManager.js dynamically or ensure it's loaded
                }
            }
        } else {
            console.error(`View with ID "${viewIdToShow}" not found.`);
        }
    }

    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            showView('dashboardView');
        });
    }

    if (myNotesLink) {
        myNotesLink.addEventListener('click', (e) => {
            e.preventDefault();
            showView('notesView');
        });
    }

    // --- Authentication and User Info Logic (Modified to return boolean) ---
    async function checkUserSessionAndLoadInfo() {
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/auth/me`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    if (userNameDisplay) userNameDisplay.textContent = data.user.fullName || 'User';
                    if (userEmailDisplay) userEmailDisplay.textContent = data.user.email || '';
                    if (welcomeHeader) welcomeHeader.textContent = `Welcome back, ${data.user.fullName || 'User'}!`;
                    return true; // User is authenticated
                } else {
                    console.warn('/api/auth/me response not successful or no user data:', data);
                    redirectToLogin('Session data issue. Please log in again.');
                    return false;
                }
            } else if (response.status === 401) {
                redirectToLogin('Your session has expired or you are not logged in. Please log in.');
                return false;
            } else {
                console.error('Error fetching user session:', response.status, response.statusText);
                redirectToLogin(`Error fetching session (Status: ${response.status}). Please try logging in again.`);
                return false;
            }
        } catch (error) {
            console.error('Network error or issue checking user session:', error);
            alert('Could not connect to the server to verify your session. Please check your internet connection and try again. If the problem persists, the server may be down.');
            if (userNameDisplay) userNameDisplay.textContent = 'Error loading user';
            if (welcomeHeader) welcomeHeader.textContent = 'Could not connect to server.';
            return false; // Assume not authenticated on network error for page load
        }
    }

    function redirectToLogin(message = 'Please sign in to continue.') {
        // To avoid multiple alerts if called rapidly
        if (!window.isRedirectingToLogin) {
            window.isRedirectingToLogin = true;
            alert(message);
            window.location.href = 'index.html'; // Or your login page filename
        }
    }

    // --- Logout Logic (existing) ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch(`${BACKEND_API_URL}/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    alert(data.message || 'Logged out successfully.');
                    window.location.href = 'index.html';
                } else {
                    alert(data.message || `Logout failed (Status: ${response.status}). Please try again.`);
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('An error occurred during logout. Please check the console.');
            }
        });
    } else {
        console.warn('Logout button not found.');
    }

    // --- Page Initialization ---
    async function initializePage() {
        const isAuthenticated = await checkUserSessionAndLoadInfo();
        if (isAuthenticated) {
            // If user is authenticated, show the dashboard view by default.
            // The notes view will be shown when its link is clicked.
            showView('dashboardView');
        }
        // If not authenticated, checkUserSessionAndLoadInfo() already handles redirection.
    }

    initializePage(); // Call the main initialization function
});