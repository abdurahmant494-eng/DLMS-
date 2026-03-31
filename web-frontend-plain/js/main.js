// Main JavaScript for DLMS
document.addEventListener('DOMContentLoaded', function() {
    console.log('DLMS Frontend loaded');
    
    // Update API status
    checkAPIStatus();
    
    // Set current year in footer
    document.querySelector('.footer p:first-child').innerHTML = 
        `DLMS - Digital Library Management System &copy; ${new Date().getFullYear()}`;
    
    // Highlight active navigation link
    highlightActiveNav();
});

function highlightActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage || 
            (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        }
    });
}

function checkAPIStatus() {
    const apiStatus = document.getElementById('api-status');
    if (!apiStatus) return;
    
    // Try to connect to backend API
    fetch('http://localhost:5000/api/health')
        .then(response => {
            if (response.ok) {
                apiStatus.textContent = 'Online';
                apiStatus.setAttribute('data-status', 'online');
                apiStatus.style.background = '#d4edda';
                apiStatus.style.color = '#155724';
            } else {
                throw new Error('API not responding properly');
            }
        })
        .catch(error => {
            console.log('Backend not reachable:', error.message);
            apiStatus.textContent = 'Offline';
            apiStatus.setAttribute('data-status', 'offline');
            apiStatus.style.background = '#f8d7da';
            apiStatus.style.color = '#721c24';
        });
}