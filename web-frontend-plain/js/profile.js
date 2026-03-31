// profile.js - User profile management

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    // Check authentication
    checkAuth();
    
    // Load user profile
    loadUserProfile();
    
    // Setup event listeners
    setupEventListeners();
});

function checkAuth() {
    const token = window.dlmsAPI.token;
    if (!token) {
        alert('Please login to access your profile');
        window.location.href = 'login.html';
        return;
    }
}

async function loadUserProfile() {
    try {
        // Load user information
        const userResponse = await window.dlmsAPI.request('/auth/profile');
        
        if (userResponse && userResponse.user) {
            displayUserInfo(userResponse.user);
            displayPersonalInfo(userResponse.user);
            loadUserStats(userResponse.user.user_id);
            loadUserLoans(userResponse.user.user_id);
            loadUserActivity(userResponse.user.user_id);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        alert('Failed to load profile. Please try again.');
    }
}

function displayUserInfo(user) {
    // Update sidebar
    document.getElementById('userFullName').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('userRole').textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
    document.getElementById('userId').textContent = user.university_id || `ID: ${user.user_id}`;
    document.getElementById('userName').textContent = user.first_name;
    
    // Update avatar based on role
    const avatar = document.getElementById('userAvatar');
    let icon = 'fa-user';
    let bgColor = '#9b59b6';
    
    switch(user.role) {
        case 'student':
            icon = 'fa-user-graduate';
            bgColor = '#3498db';
            break;
        case 'librarian':
            icon = 'fa-user-tie';
            bgColor = '#2ecc71';
            break;
        case 'admin':
            icon = 'fa-user-shield';
            bgColor = '#e74c3c';
            break;
    }
    
    avatar.innerHTML = `<i class="fas ${icon}"></i>`;
    avatar.style.background = `linear-gradient(135deg, ${bgColor}, ${darkenColor(bgColor, 20)})`;
}

function darkenColor(color, percent) {
    // Simple color darkening function
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function displayPersonalInfo(user) {
    const infoGrid = document.getElementById('personalInfoView');
    
    infoGrid.innerHTML = `
        <div class="info-item">
            <div class="info-label"><i class="fas fa-id-card"></i> University ID</div>
            <div class="info-value">${user.university_id || 'Not assigned'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label"><i class="fas fa-envelope"></i> Email Address</div>
            <div class="info-value">${user.email}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label"><i class="fas fa-phone"></i> Phone Number</div>
            <div class="info-value">${user.phone || 'Not provided'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label"><i class="fas fa-building"></i> Department</div>
            <div class="info-value">${user.department || 'Not specified'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label"><i class="fas fa-calendar-alt"></i> Year</div>
            <div class="info-value">${user.year || 'Not specified'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label"><i class="fas fa-user-tag"></i> Account Type</div>
            <div class="info-value">${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label"><i class="fas fa-calendar-plus"></i> Member Since</div>
            <div class="info-value">${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
        </div>
        
        <div class="info-item">
            <div class="info-label"><i class="fas fa-sign-in-alt"></i> Last Login</div>
            <div class="info-value">${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</div>
        </div>
    `;
    
    // Set up edit form
    setupEditForm(user);
}

function setupEditForm(user) {
    const editForm = document.getElementById('personalEditForm');
    
    editForm.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label for="editFirstName">First Name *</label>
                <input type="text" id="editFirstName" value="${user.first_name}" required>
            </div>
            <div class="form-group">
                <label for="editLastName">Last Name *</label>
                <input type="text" id="editLastName" value="${user.last_name}" required>
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="editEmail">Email *</label>
                <input type="email" id="editEmail" value="${user.email}" required>
            </div>
            <div class="form-group">
                <label for="editPhone">Phone</label>
                <input type="tel" id="editPhone" value="${user.phone || ''}">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="editDepartment">Department</label>
                <input type="text" id="editDepartment" value="${user.department || ''}">
            </div>
            <div class="form-group">
                <label for="editYear">Year</label>
                <input type="number" id="editYear" value="${user.year || ''}" min="1" max="5">
            </div>
        </div>
        
        <div class="form-actions">
            <button type="submit" class="btn-primary">
                <i class="fas fa-save"></i> Save Changes
            </button>
            <button type="button" class="btn-secondary" id="cancelEditBtn">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
    `;
    
    // Add form submission handler
    editForm.onsubmit = handleProfileUpdate;
    
    // Add cancel button handler
    document.getElementById('cancelEditBtn').addEventListener('click', function() {
        toggleEditMode(false);
    });
}

async function loadUserStats(userId) {
    try {
        // Load user's loans for stats
        const loansResponse = await window.dlmsAPI.request('/loans/my-loans');
        
        if (loansResponse && loansResponse.loans) {
            const activeLoans = loansResponse.loans.filter(loan => loan.status === 'active').length;
            const overdueLoans = loansResponse.loans.filter(loan => {
                if (loan.status !== 'active') return false;
                const dueDate = new Date(loan.due_date);
                const today = new Date();
                return dueDate < today;
            }).length;
            
            document.getElementById('activeLoansStat').textContent = activeLoans;
            document.getElementById('overdueStat').textContent = overdueLoans;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadUserLoans(userId) {
    try {
        const loansList = document.getElementById('myLoansList');
        loansList.innerHTML = '<div class="loading">Loading your loans...</div>';
        
        const response = await window.dlmsAPI.request('/loans/my-loans');
        
        if (response && response.loans && response.loans.length > 0) {
            // Filter active loans (max 5 for display)
            const activeLoans = response.loans
                .filter(loan => loan.status === 'active')
                .slice(0, 5);
            
            if (activeLoans.length === 0) {
                loansList.innerHTML = `
                    <div class="loan-item">
                        <div class="loan-icon">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="loan-details">
                            <h4>No Active Loans</h4>
                            <p>You don't have any books checked out at the moment.</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            loansList.innerHTML = '';
            
            activeLoans.forEach(loan => {
                const dueDate = new Date(loan.due_date);
                const today = new Date();
                const isOverdue = dueDate < today;
                const statusClass = isOverdue ? 'status-overdue' : 'status-active';
                const statusText = isOverdue ? 'Overdue' : 'Active';
                
                const loanItem = document.createElement('div');
                loanItem.className = 'loan-item';
                
                loanItem.innerHTML = `
                    <div class="loan-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="loan-details">
                        <h4>${loan.Book ? loan.Book.title : 'Unknown Book'}</h4>
                        <p><strong>Author:</strong> ${loan.Book ? loan.Book.author : 'Unknown'}</p>
                        <p><strong>Due:</strong> ${dueDate.toLocaleDateString()}</p>
                        <p><strong>Days Left:</strong> ${isOverdue ? 
                            `${Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))} days overdue` : 
                            `${Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))} days`}</p>
                    </div>
                    <span class="loan-status ${statusClass}">${statusText}</span>
                `;
                
                loansList.appendChild(loanItem);
            });
            
            // Add view all link if there are more loans
            if (response.loans.length > 5) {
                const viewAll = document.createElement('a');
                viewAll.href = 'loans.html?tab=my-loans';
                viewAll.className = 'btn-view-all';
                viewAll.innerHTML = 'View All Loans <i class="fas fa-arrow-right"></i>';
                viewAll.style.marginTop = '20px';
                viewAll.style.display = 'block';
                viewAll.style.textAlign = 'center';
                
                loansList.appendChild(viewAll);
            }
        } else {
            loansList.innerHTML = `
                <div class="loan-item">
                    <div class="loan-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <div class="loan-details">
                        <h4>No Active Loans</h4>
                        <p>You don't have any books checked out at the moment.</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user loans:', error);
        document.getElementById('myLoansList').innerHTML = `
            <div class="loan-item">
                <div class="loan-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="loan-details">
                    <h4>Error Loading Loans</h4>
                    <p>Could not load your loan information.</p>
                </div>
            </div>
        `;
    }
}

async function loadUserActivity(userId) {
    try {
        const timeline = document.getElementById('activityTimeline');
        
        // For now, use mock data. In production, this would come from an API
        const mockActivities = [
            {
                date: new Date().toLocaleDateString(),
                title: 'Book Checked Out',
                description: 'Borrowed "Introduction to Algorithms"'
            },
            {
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                title: 'Book Returned',
                description: 'Returned "Database Systems" on time'
            },
            {
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                title: 'Password Changed',
                description: 'Updated account password'
            },
            {
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                title: 'Incident Reported',
                description: 'Reported noise disturbance in Study Area A'
            }
        ];
        
        timeline.innerHTML = '';
        
        mockActivities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            item.innerHTML = `
                <div class="activity-date">${activity.date}</div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-desc">${activity.description}</div>
                </div>
            `;
            
            timeline.appendChild(item);
        });
        
        // Add empty state if no activities
        if (mockActivities.length === 0) {
            timeline.innerHTML = `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-title">No Recent Activity</div>
                        <div class="activity-desc">Your activity history will appear here.</div>
                    </div>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading activity:', error);
        document.getElementById('activityTimeline').innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <div class="activity-title">Error Loading Activity</div>
                    <div class="activity-desc">Could not load your activity history.</div>
                </div>
            </div>
        `;
    }
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            document.querySelectorAll('.menu-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.dataset.section + 'Section';
            document.querySelectorAll('.profile-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Edit personal info button
    const editPersonalBtn = document.getElementById('editPersonalBtn');
    if (editPersonalBtn) {
        editPersonalBtn.addEventListener('click', function() {
            toggleEditMode(true);
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

function toggleEditMode(showEdit) {
    const viewMode = document.getElementById('personalInfoView');
    const editForm = document.getElementById('personalEditForm');
    const editBtn = document.getElementById('editPersonalBtn');
    
    if (showEdit) {
        viewMode.style.display = 'none';
        editForm.style.display = 'block';
        editBtn.innerHTML = '<i class="fas fa-eye"></i> View';
        editBtn.onclick = () => toggleEditMode(false);
    } else {
        viewMode.style.display = 'grid';
        editForm.style.display = 'none';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editBtn.onclick = () => toggleEditMode(true);
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const formData = {
        first_name: document.getElementById('editFirstName').value,
        last_name: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value || null,
        department: document.getElementById('editDepartment').value || null,
        year: document.getElementById('editYear').value ? parseInt(document.getElementById('editYear').value) : null
    };
    
    try {
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        // Update profile via API
        const response = await window.dlmsAPI.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        if (response && response.user) {
            alert('Profile updated successfully!');
            
            // Reload user info
            displayUserInfo(response.user);
            displayPersonalInfo(response.user);
            
            // Switch back to view mode
            toggleEditMode(false);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert(`Failed to update profile: ${error.message || 'Please check your data'}`);
    } finally {
        // Reset button state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function changePassword() {
    const modal = document.getElementById('passwordModal');
    const form = document.getElementById('changePasswordForm');
    
    form.innerHTML = `
        <div class="change-password-form">
            <div class="form-group">
                <label for="currentPassword">Current Password *</label>
                <div class="password-input">
                    <input type="password" id="currentPassword" required>
                    <button type="button" class="password-toggle" onclick="togglePassword('currentPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            
            <div class="form-group">
                <label for="newPassword">New Password *</label>
                <div class="password-input">
                    <input type="password" id="newPassword" required minlength="6">
                    <button type="button" class="password-toggle" onclick="togglePassword('newPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <small style="color: #7f8c8d;">Minimum 6 characters</small>
            </div>
            
            <div class="form-group">
                <label for="confirmPassword">Confirm New Password *</label>
                <div class="password-input">
                    <input type="password" id="confirmPassword" required minlength="6">
                    <button type="button" class="password-toggle" onclick="togglePassword('confirmPassword')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-key"></i> Change Password
                </button>
                <button type="button" class="btn-secondary close-modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    // Add form submission handler
    form.onsubmit = handlePasswordChange;
    
    // Add password toggle functionality
    const passwordToggles = form.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const inputId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
            togglePasswordVisibility(inputId);
        });
    });
    
    modal.classList.add('show');
    
    // Focus on current password input
    setTimeout(() => {
        document.getElementById('currentPassword')?.focus();
    }, 100);
}

function togglePasswordVisibility(inputId) {
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

async function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
        submitBtn.disabled = true;
        
        // Change password via API
        const response = await window.dlmsAPI.request('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response && response.message) {
            alert('Password changed successfully!');
            closeAllModals();
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert(`Failed to change password: ${error.message || 'Please check your current password'}`);
    } finally {
        // Reset button state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function manageSessions() {
    alert('Session management will be implemented in the next phase');
    // This would show a modal with active sessions and logout options
}

function enable2FA() {
    alert('Two-factor authentication will be implemented in the next phase');
    // This would guide the user through 2FA setup
}

function deleteAccount() {
    if (confirm('WARNING: This will permanently delete your account and all associated data. This action cannot be undone.\n\nAre you absolutely sure?')) {
        const reason = prompt('Please tell us why you are deleting your account (optional):');
        
        if (confirm('Final confirmation: Delete your account?')) {
            alert('Account deletion will be implemented in the next phase');
            // This would call the API to delete the account
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Export functions for use in HTML onclick
window.changePassword = changePassword;
window.manageSessions = manageSessions;
window.enable2FA = enable2FA;
window.deleteAccount = deleteAccount;
window.togglePasswordVisibility = togglePasswordVisibility;