// incidents.js - Incident reporting and management

document.addEventListener('DOMContentLoaded', function() {
    console.log('Incidents page loaded');
    
    // Check authentication
    checkAuth();
    
    // Initialize incidents page
    initializeIncidentsPage();
    
    // Load incidents
    loadIncidents();
    
    // Setup event listeners
    setupEventListeners();
});

function checkAuth() {
    const token = window.dlmsAPI.token;
    if (!token) {
        alert('Please login to access incident reporting');
        window.location.href = 'login.html';
        return;
    }
    
    // Update username
    updateUserInfo();
}

async function updateUserInfo() {
    try {
        const response = await window.dlmsAPI.request('/auth/profile');
        if (response && response.user) {
            document.getElementById('userName').textContent = `Welcome, ${response.user.first_name}`;
        }
    } catch (error) {
        console.log('Could not fetch user profile:', error);
    }
}

function initializeIncidentsPage() {
    console.log('Initializing incidents page...');
    
    // Set current page
    currentPage = 1;
    
    // Set default filters
    currentFilters = {
        search: '',
        status: '',
        category: '',
        priority: '',
        sortBy: 'reported_at'
    };
}

let currentPage = 1;
const incidentsPerPage = 10;
let currentFilters = {};

async function loadIncidents(page = 1) {
    try {
        currentPage = page;
        
        // Show loading state
        const incidentsList = document.getElementById('incidentsList');
        incidentsList.innerHTML = '<div class="loading">Loading incidents...</div>';
        
        // Build query string
        let query = '';
        const queryParams = [];
        
        if (currentFilters.status) queryParams.push(`status=${currentFilters.status}`);
        if (currentFilters.category) queryParams.push(`category=${currentFilters.category}`);
        if (currentFilters.priority) queryParams.push(`priority=${currentFilters.priority}`);
        
        if (queryParams.length > 0) {
            query = '?' + queryParams.join('&');
        }
        
        console.log('Loading incidents with query:', query);
        
        const response = await window.dlmsAPI.request(`/incidents${query}`);
        
        if (response && response.incidents) {
            displayIncidents(response.incidents);
            updateStatistics(response.incidents);
            updatePagination(response.incidents.length);
        } else {
            incidentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>No Incidents Found</h3>
                    <p>No incidents match your search criteria.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading incidents:', error);
        document.getElementById('incidentsList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Incidents</h3>
                <p>Could not connect to the server. Please check your connection.</p>
                <button onclick="loadIncidents(1)" class="btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function displayIncidents(incidents) {
    const incidentsList = document.getElementById('incidentsList');
    
    if (incidents.length === 0) {
        incidentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>No Incidents Found</h3>
                <p>Try adjusting your search or filters.</p>
                <button onclick="showReportModal()" class="btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-flag"></i> Report First Incident
                </button>
            </div>
        `;
        return;
    }
    
    // Sort incidents
    let sortedIncidents = [...incidents];
    if (currentFilters.sortBy === 'reported_at') {
        sortedIncidents.sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
    } else if (currentFilters.sortBy === 'priority') {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        sortedIncidents.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    }
    
    // Apply search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        sortedIncidents = sortedIncidents.filter(incident => 
            incident.title.toLowerCase().includes(searchTerm) ||
            incident.description.toLowerCase().includes(searchTerm) ||
            incident.location.toLowerCase().includes(searchTerm)
        );
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * incidentsPerPage;
    const endIndex = startIndex + incidentsPerPage;
    const paginatedIncidents = sortedIncidents.slice(startIndex, endIndex);
    
    incidentsList.innerHTML = '';
    
    paginatedIncidents.forEach(incident => {
        const incidentItem = createIncidentItem(incident);
        incidentsList.appendChild(incidentItem);
    });
}

function createIncidentItem(incident) {
    const item = document.createElement('div');
    item.className = 'incident-item';
    
    // Format date
    const reportedDate = new Date(incident.reported_at).toLocaleDateString();
    const reportedTime = new Date(incident.reported_at).toLocaleTimeString();
    
    item.innerHTML = `
        <div class="incident-header">
            <div>
                <h3 class="incident-title">${incident.title}</h3>
                <div class="incident-meta">
                    <span class="incident-meta-item">
                        <i class="fas fa-calendar"></i>
                        ${reportedDate} at ${reportedTime}
                    </span>
                    <span class="incident-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        ${incident.location || 'Unknown Location'}
                    </span>
                    <span class="incident-meta-item">
                        <i class="fas fa-user"></i>
                        ${incident.reporter ? `${incident.reporter.first_name} ${incident.reporter.last_name}` : 'Anonymous'}
                    </span>
                </div>
            </div>
            <div class="incident-status">
                <span class="status-badge status-${incident.status}">${incident.status.replace('_', ' ').toUpperCase()}</span>
                <span class="priority-badge priority-${incident.priority}" style="margin-top: 5px; display: block;">
                    ${incident.priority.toUpperCase()}
                </span>
            </div>
        </div>
        
        <div class="incident-description">
            ${incident.description || 'No description provided.'}
        </div>
        
        <div class="incident-footer">
            <span class="category-badge">${incident.category.toUpperCase()}</span>
            <div class="incident-actions">
                <button class="btn-action btn-view" onclick="viewIncident(${incident.incident_id})">
                    <i class="fas fa-eye"></i> View Details
                </button>
                ${incident.status === 'pending' ? `
                    <button class="btn-action btn-edit" onclick="updateIncidentStatus(${incident.incident_id})">
                        <i class="fas fa-edit"></i> Update
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    return item;
}

function updateStatistics(incidents) {
    // Count by status and priority
    const total = incidents.length;
    const pending = incidents.filter(i => i.status === 'pending').length;
    const resolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    const critical = incidents.filter(i => i.priority === 'critical').length;
    
    // Update counts
    document.getElementById('totalIncidents').textContent = total;
    document.getElementById('pendingIncidents').textContent = pending;
    document.getElementById('resolvedIncidents').textContent = resolved;
    document.getElementById('criticalIncidents').textContent = critical;
}

function updatePagination(totalIncidents) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalIncidents / incidentsPerPage);
    
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
    loadIncidents(page);
    
    // Scroll to top of incidents list
    document.getElementById('incidentsList').scrollIntoView({ behavior: 'smooth' });
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', function() {
        currentFilters.search = searchInput.value;
        loadIncidents(1);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentFilters.search = searchInput.value;
            loadIncidents(1);
        }
    });
    
    // Filter toggle
    const filterBtn = document.getElementById('filterBtn');
    const filtersPanel = document.getElementById('filtersPanel');
    
    filterBtn.addEventListener('click', function() {
        const isVisible = filtersPanel.style.display === 'block';
        filtersPanel.style.display = isVisible ? 'none' : 'block';
        filterBtn.innerHTML = isVisible ? 
            '<i class="fas fa-filter"></i> Filter' : 
            '<i class="fas fa-times"></i> Close Filters';
    });
    
    // Apply filters
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            currentFilters.status = document.getElementById('statusFilter').value;
            currentFilters.category = document.getElementById('categoryFilter').value;
            currentFilters.priority = document.getElementById('priorityFilter').value;
            currentFilters.sortBy = document.getElementById('sortFilter').value;
            loadIncidents(1);
        });
    }
    
    // Clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            document.getElementById('statusFilter').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('priorityFilter').value = '';
            document.getElementById('sortFilter').value = 'reported_at';
            document.getElementById('searchInput').value = '';
            
            currentFilters = {
                search: '',
                status: '',
                category: '',
                priority: '',
                sortBy: 'reported_at'
            };
            
            loadIncidents(1);
        });
    }
    
    // Report incident button
    const reportIncidentBtn = document.getElementById('reportIncidentBtn');
    if (reportIncidentBtn) {
        reportIncidentBtn.addEventListener('click', function() {
            showReportModal();
        });
    }
    
    // Quick report links
    const quickReportLinks = [
        'quickReportNoise',
        'quickReportLight',
        'quickReportFurniture',
        'quickReportOther'
    ];
    
    quickReportLinks.forEach(linkId => {
        const link = document.getElementById(linkId);
        if (link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const category = this.textContent.split(' ')[0].toLowerCase();
                showReportModal(category);
            });
        }
    });
    
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

function showReportModal(prefillCategory = '') {
    const modal = document.getElementById('reportModal');
    const form = document.getElementById('reportForm');
    
    form.innerHTML = `
        <div class="report-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="incidentTitle">Title *</label>
                    <input type="text" id="incidentTitle" name="title" required 
                           placeholder="Brief description of the issue">
                </div>
                <div class="form-group">
                    <label for="incidentCategory">Category *</label>
                    <select id="incidentCategory" name="category" required>
                        <option value="">Select Category</option>
                        <option value="noise" ${prefillCategory === 'noise' ? 'selected' : ''}>Noise Disturbance</option>
                        <option value="lighting" ${prefillCategory === 'lighting' ? 'selected' : ''}>Lighting Problem</option>
                        <option value="furniture" ${prefillCategory === 'furniture' ? 'selected' : ''}>Broken Furniture</option>
                        <option value="disruption" ${prefillCategory === 'disruption' ? 'selected' : ''}>Disruption</option>
                        <option value="cleanliness" ${prefillCategory === 'cleanliness' ? 'selected' : ''}>Cleanliness Issue</option>
                        <option value="temperature" ${prefillCategory === 'temperature' ? 'selected' : ''}>Temperature Problem</option>
                        <option value="other" ${prefillCategory === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="incidentLocation">Location</label>
                    <input type="text" id="incidentLocation" name="location" 
                           placeholder="e.g., Study Area A, Computer Lab">
                </div>
                <div class="form-group">
                    <label for="incidentPriority">Priority *</label>
                    <select id="incidentPriority" name="priority" required>
                        <option value="low">Low - Minor inconvenience</option>
                        <option value="medium" selected>Medium - Needs attention</option>
                        <option value="high">High - Significant problem</option>
                        <option value="critical">Critical - Emergency/Urgent</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="incidentDescription">Description *</label>
                <textarea id="incidentDescription" name="description" required 
                          placeholder="Please describe the issue in detail..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="reporterNotes">Additional Notes</label>
                <textarea id="reporterNotes" name="reporter_notes" 
                          placeholder="Any additional information..."></textarea>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-paper-plane"></i> Submit Report
                </button>
                <button type="button" class="btn-secondary close-modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    // Add form submission handler
    form.onsubmit = handleReportSubmit;
    
    modal.classList.add('show');
    
    // Focus on title input
    setTimeout(() => {
        document.getElementById('incidentTitle')?.focus();
    }, 100);
}

async function handleReportSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        // Submit to API
        const response = await window.dlmsAPI.createIncident(data);
        
        if (response && response.message) {
            alert('Incident reported successfully!');
            closeAllModals();
            loadIncidents(1); // Refresh incidents list
        }
    } catch (error) {
        console.error('Error reporting incident:', error);
        alert(`Failed to report incident: ${error.message || 'Please check your connection'}`);
    } finally {
        // Reset button state
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function viewIncident(incidentId) {
    console.log('Viewing incident:', incidentId);
    
    // Fetch incident details
    window.dlmsAPI.request(`/incidents/${incidentId}`)
        .then(response => {
            if (response && response.incident) {
                showIncidentDetailsModal(response.incident);
            }
        })
        .catch(error => {
            console.error('Error fetching incident details:', error);
            alert('Failed to load incident details');
        });
}

function showIncidentDetailsModal(incident) {
    const modal = document.getElementById('incidentModal');
    const modalBody = document.getElementById('incidentModalBody');
    
    // Format dates
    const reportedDate = new Date(incident.reported_at).toLocaleString();
    const updatedDate = incident.updated_at ? new Date(incident.updated_at).toLocaleString() : 'N/A';
    const resolvedDate = incident.resolved_at ? new Date(incident.resolved_at).toLocaleString() : 'N/A';
    
    modalBody.innerHTML = `
        <div class="incident-details">
            <div class="detail-section">
                <h3>Incident Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-heading"></i> Title</span>
                        <span class="detail-value">${incident.title}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-tag"></i> Category</span>
                        <span class="detail-value">
                            <span class="category-badge">${incident.category.toUpperCase()}</span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-exclamation"></i> Priority</span>
                        <span class="detail-value">
                            <span class="priority-badge priority-${incident.priority}">
                                ${incident.priority.toUpperCase()}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-toggle-${incident.status === 'resolved' ? 'on' : 'off'}"></i> Status</span>
                        <span class="detail-value">
                            <span class="status-badge status-${incident.status}">
                                ${incident.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-map-marker-alt"></i> Location</span>
                        <span class="detail-value">${incident.location || 'Not specified'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-user"></i> Reporter</span>
                        <span class="detail-value">
                            ${incident.reporter ? 
                                `${incident.reporter.first_name} ${incident.reporter.last_name} (${incident.reporter.email})` : 
                                'Anonymous'
                            }
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-user-tie"></i> Assigned Staff</span>
                        <span class="detail-value">
                            ${incident.assignedStaff ? 
                                `${incident.assignedStaff.first_name} ${incident.assignedStaff.last_name}` : 
                                'Not assigned'
                            }
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Description</h3>
                <div class="notes-container">
                    <p>${incident.description || 'No description provided.'}</p>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Notes</h3>
                <div class="notes-container">
                    <h4>Reporter Notes:</h4>
                    <p>${incident.reporter_notes || 'No additional notes from reporter.'}</p>
                    
                    ${incident.staff_notes ? `
                        <h4 style="margin-top: 15px;">Staff Notes:</h4>
                        <p>${incident.staff_notes}</p>
                    ` : ''}
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Timeline</h3>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-date">Reported on ${reportedDate}</div>
                        <div class="timeline-content">Incident was reported</div>
                    </div>
                    
                    ${incident.updated_at && incident.updated_at !== incident.reported_at ? `
                        <div class="timeline-item">
                            <div class="timeline-date">Updated on ${updatedDate}</div>
                            <div class="timeline-content">Status updated to ${incident.status}</div>
                        </div>
                    ` : ''}
                    
                    ${incident.resolved_at ? `
                        <div class="timeline-item">
                            <div class="timeline-date">Resolved on ${resolvedDate}</div>
                            <div class="timeline-content">Incident was marked as resolved</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${incident.status !== 'resolved' && incident.status !== 'closed' ? `
                <div class="form-actions">
                    <button class="btn-primary" onclick="updateIncidentStatus(${incident.incident_id})">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.add('show');
}

function updateIncidentStatus(incidentId) {
    const newStatus = prompt('Enter new status (pending, assigned, in_progress, resolved, closed):');
    
    if (!newStatus) return;
    
    const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(newStatus.toLowerCase())) {
        alert('Invalid status. Please use: pending, assigned, in_progress, resolved, closed');
        return;
    }
    
    const staffNotes = prompt('Enter staff notes (optional):');
    
    const updateData = {
        status: newStatus.toLowerCase()
    };
    
    if (staffNotes) {
        updateData.staff_notes = staffNotes;
    }
    
    if (confirm('Are you sure you want to update this incident?')) {
        // This would call the API
        alert('Status update functionality will be implemented in the next phase');
        
        // In the future:
        // window.dlmsAPI.request(`/incidents/${incidentId}`, {
        //     method: 'PUT',
        //     body: JSON.stringify(updateData)
        // })
        // .then(response => {
        //     loadIncidents(currentPage);
        //     closeAllModals();
        // })
        // .catch(error => {
        //     alert('Failed to update incident');
        // });
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Export functions for use in HTML onclick
window.changePage = changePage;
window.viewIncident = viewIncident;
window.updateIncidentStatus = updateIncidentStatus;
window.showReportModal = showReportModal;