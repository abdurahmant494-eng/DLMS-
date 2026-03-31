// dashboard.js - Updated to match your dashboard.html

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded');
    
    // Check user authentication
    if (!checkAuth()) {
        return;
    }
    
    // Initialize dashboard
    initializeDashboard();
    
    // Load dashboard data
    loadDashboardData();
    
    // Setup event listeners
    setupEventListeners();
});

// In dashboard.js, update the checkAuth function:
function checkAuth() {
    console.log('=== AUTH CHECK START ===');
    
    // Try multiple ways to get token
    let token = window.dlmsAPI ? window.dlmsAPI.token : null;
    
    if (!token) {
        token = localStorage.getItem('dlms_token');
        console.log('Got token from localStorage');
    }
    
    console.log('Token found:', token ? 'YES' : 'NO');
    console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        alert('Please login first');
        window.location.href = 'login.html';
        return false;
    }
    
    // Ensure API instance has the token
    if (window.dlmsAPI && !window.dlmsAPI.token) {
        window.dlmsAPI.token = token;
        console.log('Token restored to API instance');
    }
    
    console.log('=== AUTH CHECK PASSED ===');
    return true;
}

async function displayUserInfo() {
    try {
        const response = await window.dlmsAPI.request('/auth/profile');
        if (response && response.user) {
            const user = response.user;
            document.getElementById('userName').textContent = `Welcome, ${user.first_name}`;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        document.getElementById('userName').textContent = 'Welcome, User';
    }
}

function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Set initial last updated time
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    
    // Update every minute
    setInterval(() => {
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    }, 60000);
}

async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        
        // Show loading state for stats
        document.getElementById('totalBooks').textContent = 'Loading...';
        document.getElementById('activeUsers').textContent = 'Loading...';
        document.getElementById('activeLoans').textContent = 'Loading...';
        document.getElementById('openIncidents').textContent = 'Loading...';
        
        // Load all data in parallel
        await Promise.all([
            loadBooksStats(),
            loadUsersStats(),
            loadLoansStats(),
            loadIncidentsStats(),
            loadRecentBooks()
        ]);
        
        // Update system status
        updateSystemStatus();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data. Please check your connection.');
    }
}

async function loadBooksStats() {
    try {
        const response = await window.dlmsAPI.request('/books?page=1&limit=1');
        if (response) {
            const totalBooks = response.total || '0';
            document.getElementById('totalBooks').textContent = totalBooks;
            
            // Also update the brief stat if it exists
            const briefStat = document.querySelector('.stats-brief .stat-item:nth-child(1) span');
            if (briefStat) {
                briefStat.textContent = totalBooks + '+';
            }
        }
    } catch (error) {
        console.error('Error loading books stats:', error);
        document.getElementById('totalBooks').textContent = 'Error';
    }
}

async function loadUsersStats() {
    try {
        // Try to get user stats from dedicated endpoint first
        const response = await window.dlmsAPI.request('/users/stats/dashboard');
        if (response) {
            const activeUsers = response.activeUsers || '0';
            document.getElementById('activeUsers').textContent = activeUsers;
            
            // Also update the brief stat if it exists
            const briefStat = document.querySelector('.stats-brief .stat-item:nth-child(2) span');
            if (briefStat) {
                briefStat.textContent = activeUsers + '+';
            }
        } else {
            // Fallback: Get all users and count active ones
            const usersResponse = await window.dlmsAPI.request('/users');
            if (usersResponse && usersResponse.users) {
                const activeUsers = usersResponse.users.filter(user => user.is_active).length;
                document.getElementById('activeUsers').textContent = activeUsers;
                
                // Update brief stat
                const briefStat = document.querySelector('.stats-brief .stat-item:nth-child(2) span');
                if (briefStat) {
                    briefStat.textContent = activeUsers + '+';
                }
            }
        }
    } catch (error) {
        console.error('Error loading users stats:', error);
        document.getElementById('activeUsers').textContent = 'Error';
    }
}

async function loadLoansStats() {
    try {
        // Try to get loan stats from dedicated endpoint
        const response = await window.dlmsAPI.request('/loans/stats/summary');
        if (response && response.summary) {
            const activeLoans = response.summary.activeLoans || '0';
            document.getElementById('activeLoans').textContent = activeLoans;
        } else {
            // Fallback: Get all loans and count active ones
            const loansResponse = await window.dlmsAPI.request('/loans');
            if (loansResponse && loansResponse.loans) {
                const activeLoans = loansResponse.loans.filter(loan => 
                    loan.status === 'active' || loan.status === 'Active'
                ).length;
                document.getElementById('activeLoans').textContent = activeLoans;
            }
        }
    } catch (error) {
        console.error('Error loading loans stats:', error);
        document.getElementById('activeLoans').textContent = 'Error';
    }
}

async function loadIncidentsStats() {
    try {
        // Try to get incident stats from dedicated endpoint
        const response = await window.dlmsAPI.request('/incidents/stats/summary');
        if (response) {
            const openIncidents = response.pending || '0';
            document.getElementById('openIncidents').textContent = openIncidents;
        } else {
            // Fallback: Get all incidents and count pending ones
            const incidentsResponse = await window.dlmsAPI.request('/incidents');
            if (incidentsResponse && incidentsResponse.incidents) {
                const openIncidents = incidentsResponse.incidents.filter(incident => 
                    incident.status === 'pending' || incident.status === 'in_progress'
                ).length;
                document.getElementById('openIncidents').textContent = openIncidents;
            }
        }
    } catch (error) {
        console.error('Error loading incidents stats:', error);
        document.getElementById('openIncidents').textContent = 'Error';
    }
}

async function loadRecentBooks() {
    try {
        const recentBooksContainer = document.getElementById('recentBooks');
        if (!recentBooksContainer) return;
        
        const response = await window.dlmsAPI.request('/books?page=1&limit=5&sort=created_at:desc');
        
        if (response && response.books && response.books.length > 0) {
            recentBooksContainer.innerHTML = '';
            
            response.books.forEach(book => {
                const bookItem = document.createElement('div');
                bookItem.className = 'recent-book-item';
                
                // Determine availability
                const isAvailable = book.available_copies > 0;
                const statusClass = isAvailable ? 'available' : 'borrowed';
                const statusText = isAvailable ? 'Available' : 'Borrowed';
                
                bookItem.innerHTML = `
                    <div class="recent-book-cover">
                        ${book.cover_image ? 
                            `<img src="${book.cover_image}" alt="${book.title}">` : 
                            `<i class="fas fa-book"></i>`
                        }
                    </div>
                    <div class="recent-book-info">
                        <h4 title="${book.title}">${book.title.length > 40 ? book.title.substring(0, 40) + '...' : book.title}</h4>
                        <p>${book.author || 'Unknown Author'}</p>
                        <div class="recent-book-meta">
                            <span class="format-badge">${book.format || 'Physical'}</span>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                `;
                
                // Add click event to view book
                bookItem.addEventListener('click', () => {
                    window.location.href = `books.html?view=${book.book_id || book.id}`;
                });
                
                recentBooksContainer.appendChild(bookItem);
            });
            
        } else {
            recentBooksContainer.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-book"></i>
                    <p>No books available yet</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent books:', error);
        document.getElementById('recentBooks').innerHTML = `
            <div class="no-data error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading books</p>
            </div>
        `;
    }
}

function updateSystemStatus() {
    // Check API status
    fetch('http://localhost:5000/api/health')
        .then(response => {
            const apiStatus = document.getElementById('apiStatus');
            if (response.ok) {
                apiStatus.textContent = 'Online';
                apiStatus.className = 'status-value status-online';
            } else {
                throw new Error('API not responding properly');
            }
        })
        .catch(error => {
            document.getElementById('apiStatus').textContent = 'Offline';
            document.getElementById('apiStatus').className = 'status-value status-offline';
        });
    
    // Check database status via books endpoint
    fetch('http://localhost:5000/api/books?page=1&limit=1')
        .then(response => {
            const dbStatus = document.getElementById('dbStatus');
            if (response.ok) {
                dbStatus.textContent = 'Connected';
                dbStatus.className = 'status-value status-online';
            } else {
                throw new Error('Database connection error');
            }
        })
        .catch(error => {
            document.getElementById('dbStatus').textContent = 'Error';
            document.getElementById('dbStatus').className = 'status-value status-offline';
        });
    
    // Check email service
    const emailStatus = document.getElementById('emailStatus');
    // We'll assume email is active if backend is running
    emailStatus.textContent = 'Active';
    emailStatus.className = 'status-value status-online';
}

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                window.dlmsAPI.clearToken();
                window.location.href = 'login.html';
            }
        });
    }
    
    // Quick action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });
    
    // Refresh button if exists
    const refreshBtn = document.getElementById('refreshBtn');
    if (!refreshBtn) {
        // Add refresh functionality to header if needed
        const header = document.querySelector('.dashboard-header');
        if (header) {
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'btn-refresh';
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            refreshBtn.addEventListener('click', loadDashboardData);
            header.appendChild(refreshBtn);
        }
    } else {
        refreshBtn.addEventListener('click', function() {
            loadDashboardData();
            showNotification('Dashboard refreshed', 'success');
        });
    }
}

function showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'notification error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;
    
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    // Close button
    errorDiv.querySelector('.close-btn').addEventListener('click', function() {
        errorDiv.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function showNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `notification ${type}`;
    
    const bgColor = type === 'success' ? '#d4edda' : 
                    type === 'error' ? '#f8d7da' : 
                    '#d1ecf1';
    
    const color = type === 'success' ? '#155724' : 
                  type === 'error' ? '#721c24' : 
                  '#0c5460';
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 'info-circle';
    
    notificationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: ${color};
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    notificationDiv.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="close-btn">&times;</button>
    `;
    
    document.body.appendChild(notificationDiv);
    
    // Close button
    notificationDiv.querySelector('.close-btn').addEventListener('click', function() {
        notificationDiv.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notificationDiv.parentNode) {
            notificationDiv.remove();
        }
    }, 5000);
}

// Add CSS styles for recent books list
const recentBooksStyles = document.createElement('style');
recentBooksStyles.textContent = `
    .recent-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .recent-book-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid #e0e0e0;
    }
    
    .recent-book-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        border-color: #1a365d;
        background: white;
    }
    
    .recent-book-cover {
        width: 60px;
        height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2rem;
        flex-shrink: 0;
    }
    
    .recent-book-cover img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
    }
    
    .recent-book-info {
        flex: 1;
        min-width: 0;
    }
    
    .recent-book-info h4 {
        font-size: 1rem;
        color: #1a365d;
        margin-bottom: 5px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .recent-book-info p {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-bottom: 8px;
    }
    
    .recent-book-meta {
        display: flex;
        gap: 10px;
    }
    
    .format-badge {
        padding: 3px 8px;
        background: #e3f2fd;
        color: #1976d2;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .status-badge {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .status-badge.available {
        background: #d4edda;
        color: #155724;
    }
    
    .status-badge.borrowed {
        background: #f8d7da;
        color: #721c24;
    }
    
    .no-data {
        text-align: center;
        padding: 40px 20px;
        color: #7f8c8d;
    }
    
    .no-data i {
        font-size: 3rem;
        margin-bottom: 15px;
        opacity: 0.5;
    }
    
    .no-data.error {
        color: #e74c3c;
    }
    
    .btn-refresh {
        background: #2ecc71;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        transition: all 0.3s ease;
    }
    
    .btn-refresh:hover {
        background: #27ae60;
        transform: translateY(-2px);
    }
    
    .status-value {
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .status-online {
        background: #d4edda;
        color: #155724;
    }
    
    .status-offline {
        background: #f8d7da;
        color: #721c24;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    }
    
    .notification.success {
        background: #d4edda;
        color: #155724;
    }
    
    .notification.error {
        background: #f8d7da;
        color: #721c24;
    }
    
    .notification.info {
        background: #d1ecf1;
        color: #0c5460;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        color: inherit;
    }
`;
document.head.appendChild(recentBooksStyles);

// Auto-refresh dashboard every 2 minutes
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadDashboardData();
        console.log('Dashboard auto-refreshed at', new Date().toLocaleTimeString());
    }
}, 120000); // 2 minutes