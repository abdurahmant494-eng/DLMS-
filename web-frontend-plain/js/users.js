// users.js - User management functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Users page loaded');
    
    // Check authentication (admin/librarian only)
    checkAuthAndRole();
    
    // Initialize users page
    initializeUsersPage();
    
    // Load users
    loadUsers();
    
    // Setup event listeners
    setupEventListeners();
});

async function checkAuthAndRole() {
    const token = window.dlmsAPI.token;
    if (!token) {
        alert('Please login to access user management');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        // Check user role
        const response = await window.dlmsAPI.request('/auth/profile');
        if (response && response.user) {
            document.getElementById('userName').textContent = `Welcome, ${response.user.first_name}`;
            
            // Check if user has permission (admin or librarian)
            if (response.user.role !== 'admin' && response.user.role !== 'librarian') {
                alert('Access denied. Only administrators and librarians can access user management.');
                window.location.href = 'dashboard.html';
                return;
            }
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

function initializeUsersPage() {
    console.log('Initializing users page...');
    
    // Set current page
    currentPage = 1;
    
    // Set default filters
    currentFilters = {
        search: '',
        role: '',
        status: 'active'
    };
}

let currentPage = 1;
const usersPerPage = 10;
let currentFilters = {};

async function loadUsers(page = 1) {
    try {
        currentPage = page;
        
        // Show loading state
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">Loading users...</td>
            </tr>
        `;
        
        // Load users from API
        const response = await window.dlmsAPI.getUsers();
        
        if (response && response.users) {
            displayUsers(response.users);
            updateStatistics(response.users);
            updatePagination(response.users.length);
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-cell">No users found</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell" style="color: #e74c3c;">
                    Error loading users. Please try again.
                    <br>
                    <button onclick="loadUsers(1)" class="btn-action btn-view" style="margin-top: 10px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

function displayUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">No users found</td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    // Apply filters
    let filteredUsers = users;
    
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
            (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
            (user.last_name && user.last_name.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm)) ||
            (user.university_id && user.university_id.toLowerCase().includes(searchTerm))
        );
    }
    
    if (currentFilters.role) {
        filteredUsers = filteredUsers.filter(user => user.role === currentFilters.role);
    }
    
    if (currentFilters.status === 'active') {
        filteredUsers = filteredUsers.filter(user => user.is_active);
    } else if (currentFilters.status === 'inactive') {
        filteredUsers = filteredUsers.filter(user => !user.is_active);
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    paginatedUsers.forEach(user => {
        const row = createUserRow(user);
        tableBody.appendChild(row);
    });
}

function createUserRow(user) {
    const row = document.createElement('tr');
    
    // Role badge
    const roleClass = `role-${user.role || 'student'}`;
    const roleText = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student';
    
    // Status badge
    const statusClass = user.is_active ? 'status-active' : 'status-inactive';
    const statusText = user.is_active ? 'Active' : 'Inactive';
    
    row.innerHTML = `
        <td>${user.university_id || 'N/A'}</td>
        <td><strong>${user.first_name} ${user.last_name}</strong></td>
        <td>${user.email}</td>
        <td><span class="role-badge ${roleClass}">${roleText}</span></td>
        <td>${user.department || 'N/A'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewUser(${user.user_id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action btn-edit" onclick="editUser(${user.user_id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-disable" onclick="toggleUserStatus(${user.user_id}, ${user.is_active})">
                    <i class="fas fa-${user.is_active ? 'user-slash' : 'user-check'}"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function updateStatistics(users) {
    // Count by role
    const students = users.filter(user => user.role === 'student').length;
    const librarians = users.filter(user => user.role === 'librarian').length;
    const admins = users.filter(user => user.role === 'admin').length;
    const total = users.length;
    
    // Update counts
    document.getElementById('studentsCount').textContent = students;
    document.getElementById('librariansCount').textContent = librarians;
    document.getElementById('adminsCount').textContent = admins;
    document.getElementById('totalUsersCount').textContent = total;
}

function updatePagination(totalUsers) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Previous
        </button>
        <div class="page-numbers">
    `;
    
    // Show limited page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `;
    }
    
    paginationHTML += `
        </div>
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    loadUsers(page);
    
    // Scroll to top of table
    document.getElementById('usersTableBody').scrollIntoView({ behavior: 'smooth' });
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', function() {
        currentFilters.search = searchInput.value;
        loadUsers(1);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentFilters.search = searchInput.value;
            loadUsers(1);
        }
    });
    
    // Add user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            showAddUserModal();
        });
    }
    
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
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            closeAllModals();
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

function viewUser(userId) {
    console.log('Viewing user:', userId);
    
    // Fetch user details
    window.dlmsAPI.getUser(userId)
        .then(response => {
            if (response && response.user) {
                showUserDetailsModal(response.user);
            }
        })
        .catch(error => {
            console.error('Error fetching user details:', error);
            alert('Failed to load user details');
        });
}

function showUserDetailsModal(user) {
    const modal = document.getElementById('userModal');
    const modalBody = document.getElementById('userModalBody');
    
    // Format dates
    const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
    const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never';
    
    modalBody.innerHTML = `
        <div class="user-details">
            <div class="user-avatar">
                <div class="user-avatar-icon">
                    <i class="fas fa-user"></i>
                </div>
                <h3>${user.first_name} ${user.last_name}</h3>
                <span class="role-badge role-${user.role}" style="font-size: 1rem;">
                    ${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                </span>
            </div>
            <div class="user-info">
                <div class="info-section">
                    <h3>Personal Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-id-card"></i> University ID</span>
                            <span class="info-value">${user.university_id || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-envelope"></i> Email</span>
                            <span class="info-value">${user.email}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-phone"></i> Phone</span>
                            <span class="info-value">${user.phone || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-venus-mars"></i> Gender</span>
                            <span class="info-value">${user.gender || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>Academic Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-graduation-cap"></i> Department</span>
                            <span class="info-value">${user.department || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-calendar-alt"></i> Year</span>
                            <span class="info-value">${user.year || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-book"></i> Major</span>
                            <span class="info-value">${user.major || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>Account Information</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-user-circle"></i> Role</span>
                            <span class="info-value">
                                <span class="role-badge role-${user.role}">
                                    ${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                                </span>
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-toggle-${user.is_active ? 'on' : 'off'}"></i> Status</span>
                            <span class="info-value">
                                <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                                    ${user.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-calendar-plus"></i> Joined</span>
                            <span class="info-value">${createdDate}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label"><i class="fas fa-sign-in-alt"></i> Last Login</span>
                            <span class="info-value">${lastLogin}</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-actions">
                    <button class="btn-action btn-edit" onclick="editUser(${user.user_id})">
                        <i class="fas fa-edit"></i> Edit User
                    </button>
                    <button class="btn-action btn-disable" onclick="toggleUserStatus(${user.user_id}, ${user.is_active})">
                        <i class="fas fa-${user.is_active ? 'user-slash' : 'user-check'}"></i>
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn-action btn-view" onclick="viewUserLoans(${user.user_id})">
                        <i class="fas fa-book"></i> View Loans
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function showAddUserModal() {
    const modal = document.getElementById('addUserModal');
    const form = document.getElementById('addUserForm');
    
    form.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label for="firstName">First Name *</label>
                <input type="text" id="firstName" name="first_name" required>
            </div>
            <div class="form-group">
                <label for="lastName">Last Name *</label>
                <input type="text" id="lastName" name="last_name" required>
            </div>
            <div class="form-group">
                <label for="userEmail">Email Address *</label>
                <input type="email" id="userEmail" name="email" required>
            </div>
            <div class="form-group">
                <label for="universityId">University ID *</label>
                <input type="text" id="universityId" name="university_id" required>
            </div>
            <div class="form-group">
                <label for="userRole">Role *</label>
                <select id="userRole" name="role" required>
                    <option value="student">Student</option>
                    <option value="librarian">Librarian</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>
            <div class="form-group">
                <label for="userDepartment">Department</label>
                <input type="text" id="userDepartment" name="department">
            </div>
            <div class="form-group">
                <label for="userYear">Year</label>
                <input type="number" id="userYear" name="year" min="1" max="5">
            </div>
            <div class="form-group">
                <label for="userPhone">Phone Number</label>
                <input type="tel" id="userPhone" name="phone">
            </div>
            <div class="form-group">
                <label for="userPassword">Initial Password *</label>
                <div class="password-input">
                    <input type="password" id="userPassword" name="password" required minlength="6">
                    <button type="button" class="password-toggle" onclick="togglePassword('userPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <small style="color: #7f8c8d; font-size: 0.9rem;">Minimum 6 characters</small>
            </div>
            <div class="form-group">
                <label for="confirmPassword">Confirm Password *</label>
                <div class="password-input">
                    <input type="password" id="confirmPassword" name="confirm_password" required minlength="6">
                    <button type="button" class="password-toggle" onclick="togglePassword('confirmPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="form-actions">
            <button type="submit" class="btn-primary">
                <i class="fas fa-user-plus"></i> Create User
            </button>
            <button type="button" class="btn-secondary close-modal">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
    `;
    
    // Add form submission handler
    form.onsubmit = handleAddUserSubmit;
    
    // Add password toggle functionality
    const passwordToggles = form.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const inputId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            togglePassword(inputId);
        });
    });
    
    modal.classList.add('show');
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('firstName')?.focus();
    }, 100);
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

async function handleAddUserSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate passwords match
    if (data.password !== data.confirm_password) {
        alert('Passwords do not match!');
        return;
    }
    
    // Remove confirm_password from data
    delete data.confirm_password;
    
    try {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;
        
        // Submit to API
        const response = await window.dlmsAPI.register(data);
        
        if (response && response.message) {
            alert('User created successfully!');
            closeAllModals();
            loadUsers(1); // Refresh user list
        }
    } catch (error) {
        console.error('Error creating user:', error);
        alert(`Failed to create user: ${error.message || 'Please check the form data'}`);
    } finally {
        // Reset button state
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function editUser(userId) {
    alert('Edit functionality will be implemented in the next phase');
    // This would open an edit modal similar to add user modal
}

function toggleUserStatus(userId, isActive) {
    const action = isActive ? 'deactivate' : 'activate';
    const userName = prompt(`Enter the user's name to confirm ${action}ion:`);
    
    if (!userName) return;
    
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        // This would call an API endpoint to toggle user status
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)}ion functionality will be implemented in the next phase`);
        
        // In the future:
        // window.dlmsAPI.request(`/users/${userId}/toggle-status`, { method: 'PUT' })
        //     .then(response => { loadUsers(currentPage); })
        //     .catch(error => { alert('Failed to update user status'); });
    }
}

function viewUserLoans(userId) {
    // Redirect to loans page with user filter
    window.location.href = `loans.html?user_id=${userId}`;
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Export functions for use in HTML onclick
window.changePage = changePage;
window.viewUser = viewUser;
window.editUser = editUser;
window.toggleUserStatus = toggleUserStatus;
window.togglePassword = togglePassword;