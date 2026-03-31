// register.js - Registration functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Registration page loaded');
    
    // Initialize registration page
    initializeRegistration();
    
    // Setup event listeners
    setupEventListeners();
});

function initializeRegistration() {
    console.log('Initializing registration...');
    
    // Set current year
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Initialize role selection
    initializeRoleSelection();
    
    // Initialize password strength
    initializePasswordStrength();
    
    // Initialize password toggle
    initializePasswordToggle();
}

function initializeRoleSelection() {
    const roleOptions = document.querySelectorAll('.role-option');
    let selectedRole = 'student';
    
    roleOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectedRole = this.dataset.role;
            
            // Update UI
            roleOptions.forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            
            // Update form based on role
            updateFormForRole(selectedRole);
        });
    });
    
    // Trigger initial update
    updateFormForRole(selectedRole);
}

function updateFormForRole(role) {
    const yearGroup = document.getElementById('yearGroup');
    const departmentGroup = document.getElementById('departmentGroup');
    
    if (role === 'staff') {
        // For staff, year is optional
        if (yearGroup) {
            yearGroup.style.display = 'none';
            document.getElementById('year').required = false;
        }
        
        // Update department label for staff
        if (departmentGroup) {
            const label = departmentGroup.querySelector('label');
            if (label) {
                label.innerHTML = '<i class="fas fa-building"></i> Department/Office *';
            }
        }
    } else {
        // For students, year is required
        if (yearGroup) {
            yearGroup.style.display = 'block';
            document.getElementById('year').required = true;
        }
        
        // Reset department label
        if (departmentGroup) {
            const label = departmentGroup.querySelector('label');
            if (label) {
                label.innerHTML = '<i class="fas fa-building"></i> Department *';
            }
        }
    }
}

function initializePasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    passwordInput.addEventListener('input', function(e) {
        const password = e.target.value;
        const strengthBar = document.getElementById('strengthBar');
        if (!strengthBar) return;
        
        // Calculate strength
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/\d/)) strength++;
        if (password.match(/[^a-zA-Z\d]/)) strength++;
        
        // Update strength bar
        strengthBar.className = 'strength-bar';
        if (password.length === 0) {
            strengthBar.style.width = '0%';
        } else if (strength < 2) {
            strengthBar.classList.add('strength-weak');
        } else if (strength < 4) {
            strengthBar.classList.add('strength-medium');
        } else {
            strengthBar.classList.add('strength-strong');
        }
    });
}

function initializePasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
}

function setupEventListeners() {
    // Register button
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegistration);
    }
    
    // Clear form button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearForm);
    }
    
    // Enter key support
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('registerBtn').click();
        }
    });
}

function validateForm() {
    let isValid = true;
    const errors = {};
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
    
    // Get selected role
    const selectedRole = document.querySelector('.role-option.selected').dataset.role;
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'universityId', 'password', 'confirmPassword', 'department'];
    if (selectedRole === 'student') requiredFields.push('year');
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            errors[fieldId] = 'This field is required';
            isValid = false;
        }
    });
    
    // Email validation
    const email = document.getElementById('email').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        errors.email = 'Please enter a valid email address';
        isValid = false;
    }
    
    // University ID format validation
    const universityId = document.getElementById('universityId').value.toUpperCase();
    const idRegex = /^BRU\/R\/\d{3}\/16$/;
    if (universityId && !idRegex.test(universityId)) {
        errors.universityId = 'Format: BRU/R/xxx/16 (e.g., BRU/R/123/16)';
        isValid = false;
    }
    
    // Password validation
    const password = document.getElementById('password').value;
    if (password && password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
        isValid = false;
    }
    
    // Password match validation
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password && confirmPassword && password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
        isValid = false;
    }
    
    // Terms agreement
    if (!document.getElementById('terms').checked) {
        alert('You must agree to the Terms of Service and Privacy Policy');
        isValid = false;
    }
    
    // Display errors
    Object.keys(errors).forEach(fieldId => {
        const errorElement = document.getElementById(fieldId + 'Error');
        if (errorElement) {
            errorElement.textContent = errors[fieldId];
        }
    });
    
    return isValid;
}

async function handleRegistration() {
    if (!validateForm()) {
        return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    const originalText = registerBtn.innerHTML;
    
    // Disable button and show loading
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        // Prepare registration data
        const formData = {
            first_name: document.getElementById('firstName').value.trim(),
            last_name: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            university_id: document.getElementById('universityId').value.toUpperCase().trim(),
            password: document.getElementById('password').value,
            role: document.querySelector('.role-option.selected').dataset.role === 'staff' ? 'librarian' : 'student',
            phone: document.getElementById('phone').value.trim() || null,
            department: document.getElementById('department').value,
            year: document.querySelector('.role-option.selected').dataset.role === 'student' ? 
                  parseInt(document.getElementById('year').value) : null
        };
        
        console.log('Registering with data:', formData);
        
        // Call registration API
        const response = await window.dlmsAPI.register(formData);
        
        if (response && response.message) {
            // Show success modal
            showSuccessModal();
            
            // Clear form
            clearForm();
            
            console.log('Registration successful:', response);
        } else {
            throw new Error('Registration failed - no response from server');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed. ';
        
        if (error.message.includes('User already exists') || error.message.includes('already exists')) {
            errorMessage = 'Email already registered. Please use a different email or login.';
        } else if (error.message.includes('University ID already registered')) {
            errorMessage = 'University ID already registered. Please check your ID or contact administration.';
        } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please check if backend is running on localhost:5000';
        } else {
            errorMessage += error.message || 'Please try again.';
        }
        
        showError(errorMessage);
    } finally {
        // Re-enable button
        registerBtn.disabled = false;
        registerBtn.innerHTML = originalText;
    }
}

function showSuccessModal() {
    // Create success modal if it doesn't exist
    let modal = document.getElementById('successModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'successModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2><i class="fas fa-check-circle"></i> Registration Successful!</h2>
                </div>
                <div class="modal-body" style="text-align: center;">
                    <div style="font-size: 4rem; color: #2ecc71; margin: 20px 0;">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <h3 style="color: var(--primary-color); margin-bottom: 15px;">Welcome to Borana University DLMS</h3>
                    <p style="margin-bottom: 20px; color: var(--gray-text);">
                        Your account has been created successfully. You can now login with your credentials.
                    </p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
                        <button onclick="window.location.href='login.html'" class="btn-primary">
                            <i class="fas fa-sign-in-alt"></i> Go to Login
                        </button>
                        <button onclick="window.location.href='../index.html'" class="btn-secondary">
                            <i class="fas fa-home"></i> Return Home
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
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

function clearForm() {
    if (confirm('Clear all form fields?')) {
        document.querySelectorAll('input, select').forEach(element => {
            if (element.type !== 'checkbox') {
                element.value = '';
            }
        });
        document.getElementById('terms').checked = false;
        
        // Reset role to student
        const studentRole = document.querySelector('[data-role="student"]');
        document.querySelectorAll('.role-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        if (studentRole) {
            studentRole.classList.add('selected');
        }
        updateFormForRole('student');
        
        // Clear errors
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
        
        // Reset strength bar
        const strengthBar = document.getElementById('strengthBar');
        if (strengthBar) {
            strengthBar.style.width = '0%';
            strengthBar.className = 'strength-bar';
        }
    }
}

// Add animation style
const animationStyles = document.createElement('style');
animationStyles.textContent = `
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
    
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2000;
        align-items: center;
        justify-content: center;
        padding: 20px;
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
    
    .notification.error {
        background: #f8d7da;
        color: #721c24;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        color: inherit;
    }
    
    .strength-bar {
        height: 100%;
        transition: all 0.3s ease;
    }
    
    .strength-weak { background: #e74c3c; width: 33%; }
    .strength-medium { background: #f39c12; width: 66%; }
    .strength-strong { background: #2ecc71; width: 100%; }
`;
document.head.appendChild(animationStyles);