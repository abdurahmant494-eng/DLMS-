// SIMPLE LOGIN - REMOVES CURRENT YEAR ERROR
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    // Skip current year setting for now
    // const yearEl = document.getElementById('currentYear');
    // if (yearEl) yearEl.textContent = new Date().getFullYear();
    
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
    if (!loginForm || !loginBtn) {
        console.error('Login form or button not found');
        return;
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
        try {
            const response = await window.dlmsAPI.login(email, password);
            
            if (response && response.token) {
                window.dlmsAPI.setToken(response.token);
                alert('Login successful!');
                window.location.href = 'dashboard.html';
            } else {
                alert('Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
});