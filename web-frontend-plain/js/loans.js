// loans.js - Loan management functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Loans page loaded');
    
    // Check authentication
    checkAuth();
    
    // Initialize loans page
    initializeLoansPage();
    
    // Load loans
    loadLoans();
    
    // Setup event listeners
    setupEventListeners();
});

function checkAuth() {
    const token = window.dlmsAPI.token;
    if (!token) {
        alert('Please login to access loan management');
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

function initializeLoansPage() {
    console.log('Initializing loans page...');
    
    // Set current page and active tab
    currentPage = 1;
    activeTab = 'active';
    
    // Set default filters
    currentFilters = {
        search: '',
        userType: '',
        timePeriod: 'all',
        sortBy: 'due_date',
        status: 'active'
    };
    
    // Update tab display
    updateActiveTab();
}

let currentPage = 1;
const loansPerPage = 10;
let activeTab = 'active';
let currentFilters = {};

async function loadLoans(page = 1) {
    try {
        currentPage = page;
        
        // Show loading state
        const tableBody = document.getElementById('loansTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">Loading loans...</td>
            </tr>
        `;
        
        // Load loans from API based on active tab
        let endpoint = '/loans';
        let queryParams = [];
        
        // Set status filter based on active tab
        switch(activeTab) {
            case 'active':
                currentFilters.status = 'active';
                break;
            case 'overdue':
                currentFilters.status = 'active';
                queryParams.push('overdue=true');
                break;
            case 'returned':
                currentFilters.status = 'returned';
                break;
            case 'my-loans':
                endpoint = '/loans/my-loans';
                break;
        }
        
        // Add other filters
        if (currentFilters.userType) {
            queryParams.push(`user_type=${currentFilters.userType}`);
        }
        
        if (queryParams.length > 0) {
            endpoint += '?' + queryParams.join('&');
        }
        
        console.log('Loading loans from:', endpoint);
        
        const response = await window.dlmsAPI.request(endpoint);
        
        if (response && response.loans) {
            displayLoans(response.loans);
            updateStatistics(response.loans);
            updatePagination(response.loans.length);
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-cell">No loans found</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading loans:', error);
        document.getElementById('loansTableBody').innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell" style="color: #e74c3c;">
                    Error loading loans. Please try again.
                    <br>
                    <button onclick="loadLoans(1)" class="btn-action btn-view" style="margin-top: 10px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

function displayLoans(loans) {
    const tableBody = document.getElementById('loansTableBody');
    
    if (loans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    No ${activeTab} loans found.
                    ${activeTab === 'active' ? `
                        <br>
                        <button onclick="showCheckoutModal()" class="btn-primary" style="margin-top: 10px;">
                            <i class="fas fa-book-reader"></i> Checkout a Book
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
        return;
    }
    
    // Apply filters
    let filteredLoans = [...loans];
    
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredLoans = filteredLoans.filter(loan => 
            (loan.Book && loan.Book.title && loan.Book.title.toLowerCase().includes(searchTerm)) ||
            (loan.User && (
                (loan.User.first_name && loan.User.first_name.toLowerCase().includes(searchTerm)) ||
                (loan.User.last_name && loan.User.last_name.toLowerCase().includes(searchTerm)) ||
                (loan.User.email && loan.User.email.toLowerCase().includes(searchTerm))
            )) ||
            (loan.loan_id && loan.loan_id.toString().includes(searchTerm))
        );
    }
    
    // Sort loans
    if (currentFilters.sortBy === 'due_date') {
        filteredLoans.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    } else if (currentFilters.sortBy === 'checkout_date') {
        filteredLoans.sort((a, b) => new Date(b.checkout_date) - new Date(a.checkout_date));
    } else if (currentFilters.sortBy === 'user_name') {
        filteredLoans.sort((a, b) => {
            const nameA = a.User ? `${a.User.first_name} ${a.User.last_name}` : '';
            const nameB = b.User ? `${b.User.first_name} ${b.User.last_name}` : '';
            return nameA.localeCompare(nameB);
        });
    } else if (currentFilters.sortBy === 'book_title') {
        filteredLoans.sort((a, b) => {
            const titleA = a.Book ? a.Book.title : '';
            const titleB = b.Book ? b.Book.title : '';
            return titleA.localeCompare(titleB);
        });
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * loansPerPage;
    const endIndex = startIndex + loansPerPage;
    const paginatedLoans = filteredLoans.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    paginatedLoans.forEach(loan => {
        const row = createLoanRow(loan);
        tableBody.appendChild(row);
    });
}

function createLoanRow(loan) {
    const row = document.createElement('tr');
    
    // Format dates
    const checkoutDate = new Date(loan.checkout_date).toLocaleDateString();
    const dueDate = new Date(loan.due_date).toLocaleDateString();
    const today = new Date();
    const isOverdue = new Date(loan.due_date) < today && loan.status === 'active';
    
    // Determine status
    let statusClass = 'status-active';
    let statusText = 'Active';
    
    if (isOverdue) {
        statusClass = 'status-overdue';
        statusText = 'Overdue';
    } else if (loan.status === 'returned') {
        statusClass = 'status-returned';
        statusText = 'Returned';
    } else if (loan.status === 'lost') {
        statusClass = 'status-lost';
        statusText = 'Lost';
    }
    
    // Determine fine amount class
    const fineAmount = loan.fine_amount || 0;
    const fineClass = fineAmount === 0 ? 'zero' : (loan.fine_paid ? 'paid' : 'pending');
    const fineText = fineAmount === 0 ? 'ETB 0' : `ETB ${fineAmount.toFixed(2)}`;
    
    row.innerHTML = `
        <td><strong>#${loan.loan_id}</strong></td>
        <td>
            <div class="book-info-cell">
                <div class="book-icon">
                    <i class="fas fa-book"></i>
                </div>
                <div class="book-details">
                    <span class="book-title">${loan.Book ? loan.Book.title : 'Unknown Book'}</span>
                    <span class="book-author">${loan.Book ? loan.Book.author : 'Unknown Author'}</span>
                </div>
            </div>
        </td>
        <td>
            <div class="user-info-cell">
                <div class="user-icon">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <span class="user-name">
                        ${loan.User ? `${loan.User.first_name} ${loan.User.last_name}` : 'Unknown User'}
                    </span>
                    <span class="user-email">${loan.User ? loan.User.email : ''}</span>
                </div>
            </div>
        </td>
        <td class="date-cell">${checkoutDate}</td>
        <td class="date-cell ${isOverdue ? 'overdue' : ''}">${dueDate}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td><span class="fine-amount ${fineClass}">${fineText}</span></td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewLoanDetails(${loan.loan_id})">
                    <i class="fas fa-eye"></i> View
                </button>
                ${loan.status === 'active' ? `
                    <button class="btn-action btn-return" onclick="returnBook(${loan.loan_id})">
                        <i class="fas fa-undo"></i> Return
                    </button>
                    <button class="btn-action btn-renew" onclick="renewLoan(${loan.loan_id})">
                        <i class="fas fa-redo"></i> Renew
                    </button>
                ` : ''}
                ${fineAmount > 0 && !loan.fine_paid ? `
                    <button class="btn-action btn-fine" onclick="payFine(${loan.loan_id})">
                        <i class="fas fa-money-bill"></i> Pay
                    </button>
                ` : ''}
            </div>
        </td>
    `;
    
    return row;
}

function updateStatistics(loans) {
    // Calculate statistics
    const totalLoans = loans.length;
    const activeLoans = loans.filter(loan => loan.status === 'active').length;
    const overdueLoans = loans.filter(loan => {
        if (loan.status !== 'active') return false;
        const dueDate = new Date(loan.due_date);
        const today = new Date();
        return dueDate < today;
    }).length;
    
    const returnedThisMonth = loans.filter(loan => {
        if (loan.status !== 'returned') return false;
        const returnDate = new Date(loan.return_date);
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return returnDate >= firstDayOfMonth;
    }).length;
    
    const pendingFines = loans
        .filter(loan => loan.fine_amount > 0 && !loan.fine_paid)
        .reduce((sum, loan) => sum + loan.fine_amount, 0);
    
    // Update counts
    document.getElementById('activeLoansCount').textContent = activeLoans;
    document.getElementById('overdueLoansCount').textContent = overdueLoans;
    document.getElementById('returnedLoansCount').textContent = returnedThisMonth;
    document.getElementById('pendingFinesAmount').textContent = `ETB ${pendingFines.toFixed(2)}`;
}

function updatePagination(totalLoans) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalLoans / loansPerPage);
    
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
    loadLoans(page);
    
    // Scroll to top of table
    document.getElementById('loansTableBody').scrollIntoView({ behavior: 'smooth' });
}

function updateActiveTab() {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === activeTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', function() {
        currentFilters.search = searchInput.value;
        loadLoans(1);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentFilters.search = searchInput.value;
            loadLoans(1);
        }
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            activeTab = this.dataset.tab;
            updateActiveTab();
            loadLoans(1);
        });
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
            currentFilters.userType = document.getElementById('userTypeFilter').value;
            currentFilters.timePeriod = document.getElementById('timePeriodFilter').value;
            currentFilters.sortBy = document.getElementById('sortFilter').value;
            loadLoans(1);
        });
    }
    
    // Clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            document.getElementById('userTypeFilter').value = '';
            document.getElementById('timePeriodFilter').value = 'all';
            document.getElementById('sortFilter').value = 'due_date';
            document.getElementById('searchInput').value = '';
            
            currentFilters = {
                search: '',
                userType: '',
                timePeriod: 'all',
                sortBy: 'due_date',
                status: 'active'
            };
            
            loadLoans(1);
        });
    }
    
    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            showCheckoutModal();
        });
    }
    
    // Footer links
    const viewMyLoans = document.getElementById('viewMyLoans');
    if (viewMyLoans) {
        viewMyLoans.addEventListener('click', function(e) {
            e.preventDefault();
            activeTab = 'my-loans';
            updateActiveTab();
            loadLoans(1);
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

function showCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    const form = document.getElementById('checkoutForm');
    
    form.innerHTML = `
        <div class="checkout-form">
            <div class="form-group">
                <label for="bookSearch">Search Book *</label>
                <input type="text" id="bookSearch" placeholder="Search by title, author, or ISBN...">
                <div class="book-search-results" id="bookSearchResults">
                    <!-- Search results will appear here -->
                </div>
            </div>
            
            <div class="form-group" id="selectedBookContainer" style="display: none;">
                <label>Selected Book</label>
                <div class="form-info" id="selectedBookInfo">
                    <!-- Selected book info will appear here -->
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="userSearch">Select User *</label>
                    <select id="userSearch">
                        <option value="">Select a user...</option>
                        <!-- Users will be loaded here -->
                    </select>
                </div>
                <div class="form-group">
                    <label for="dueDate">Due Date *</label>
                    <input type="date" id="dueDate" name="due_date" 
                           value="${getDefaultDueDate()}" 
                           min="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">
                    <i class="fas fa-book-reader"></i> Checkout Book
                </button>
                <button type="button" class="btn-secondary close-modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    // Add form submission handler
    form.onsubmit = handleCheckoutSubmit;
    
    // Add book search functionality
    const bookSearch = document.getElementById('bookSearch');
    bookSearch.addEventListener('input', debounce(searchBooks, 300));
    
    // Load users
    loadUsersForCheckout();
    
    modal.classList.add('show');
    
    // Focus on search input
    setTimeout(() => {
        bookSearch.focus();
    }, 100);
}

function getDefaultDueDate() {
    const today = new Date();
    const defaultDays = 14; // Default loan period for students
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + defaultDays);
    return dueDate.toISOString().split('T')[0];
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function searchBooks() {
    const searchTerm = document.getElementById('bookSearch').value.trim();
    const resultsContainer = document.getElementById('bookSearchResults');
    
    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '<div class="book-option">Start typing to search books...</div>';
        return;
    }
    
    try {
        const response = await window.dlmsAPI.request(`/books/search?q=${encodeURIComponent(searchTerm)}`);
        
        if (response && response.books && response.books.length > 0) {
            resultsContainer.innerHTML = '';
            
            response.books.forEach(book => {
                if (book.available_copies > 0) {
                    const option = document.createElement('div');
                    option.className = 'book-option';
                    option.innerHTML = `
                        <div class="title">${book.title}</div>
                        <div class="details">${book.author} | Available: ${book.available_copies}/${book.total_copies}</div>
                    `;
                    
                    option.addEventListener('click', function() {
                        selectBookForCheckout(book);
                    });
                    
                    resultsContainer.appendChild(option);
                }
            });
            
            if (resultsContainer.children.length === 0) {
                resultsContainer.innerHTML = '<div class="book-option">No available books found</div>';
            }
        } else {
            resultsContainer.innerHTML = '<div class="book-option">No books found</div>';
        }
    } catch (error) {
        console.error('Error searching books:', error);
        resultsContainer.innerHTML = '<div class="book-option">Error searching books</div>';
    }
}

function selectBookForCheckout(book) {
    const selectedBookContainer = document.getElementById('selectedBookContainer');
    const selectedBookInfo = document.getElementById('selectedBookInfo');
    
    selectedBookInfo.innerHTML = `
        <h4>${book.title}</h4>
        <p><strong>Author:</strong> ${book.author}</p>
        <p><strong>Available Copies:</strong> ${book.available_copies}/${book.total_copies}</p>
        <p><strong>Format:</strong> ${book.format || 'Physical'}</p>
        <input type="hidden" id="selectedBookId" value="${book.book_id}">
    `;
    
    selectedBookContainer.style.display = 'block';
    
    // Clear search results
    document.getElementById('bookSearchResults').innerHTML = '';
    document.getElementById('bookSearch').value = '';
}

async function loadUsersForCheckout() {
    try {
        const response = await window.dlmsAPI.getUsers();
        const userSelect = document.getElementById('userSearch');
        
        if (response && response.users) {
            userSelect.innerHTML = '<option value="">Select a user...</option>';
            
            response.users.forEach(user => {
                if (user.is_active) {
                    const option = document.createElement('option');
                    option.value = user.user_id;
                    option.textContent = `${user.first_name} ${user.last_name} (${user.role}) - ${user.university_id}`;
                    userSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function handleCheckoutSubmit(event) {
    event.preventDefault();
    
    const bookId = document.getElementById('selectedBookId')?.value;
    const userId = document.getElementById('userSearch').value;
    const dueDate = document.getElementById('dueDate').value;
    
    if (!bookId) {
        alert('Please select a book');
        return;
    }
    
    if (!userId) {
        alert('Please select a user');
        return;
    }
    
    if (!dueDate) {
        alert('Please select a due date');
        return;
    }
    
    const checkoutData = {
        book_id: bookId,
        user_id: userId,
        due_date: dueDate
    };
    
    try {
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        // Submit to API
        const response = await window.dlmsAPI.request('/loans/checkout', {
            method: 'POST',
            body: JSON.stringify(checkoutData)
        });
        
        if (response && response.message) {
            alert('Book checked out successfully!');
            closeAllModals();
            loadLoans(1); // Refresh loans list
        }
    } catch (error) {
        console.error('Error checking out book:', error);
        alert(`Failed to checkout book: ${error.message || 'Please check the form data'}`);
    } finally {
        // Reset button state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function viewLoanDetails(loanId) {
    console.log('Viewing loan details:', loanId);
    
    // Fetch loan details
    window.dlmsAPI.request(`/loans/${loanId}`)
        .then(response => {
            if (response && response.loan) {
                showLoanDetails(response.loan);
            }
        })
        .catch(error => {
            console.error('Error fetching loan details:', error);
            alert('Failed to load loan details');
        });
}

function showLoanDetails(loan) {
    const modal = document.getElementById('loanActionModal');
    const modalTitle = document.getElementById('loanActionTitle');
    const modalBody = document.getElementById('loanActionBody');
    
    modalTitle.textContent = 'Loan Details';
    
    // Format dates
    const checkoutDate = new Date(loan.checkout_date).toLocaleString();
    const dueDate = new Date(loan.due_date).toLocaleString();
    const returnDate = loan.return_date ? new Date(loan.return_date).toLocaleString() : 'Not returned';
    
    modalBody.innerHTML = `
        <div class="form-info">
            <h4>Loan Information</h4>
            <p><strong>Loan ID:</strong> #${loan.loan_id}</p>
            <p><strong>Book:</strong> ${loan.Book ? loan.Book.title : 'Unknown'}</p>
            <p><strong>User:</strong> ${loan.User ? `${loan.User.first_name} ${loan.User.last_name}` : 'Unknown'}</p>
            <p><strong>Checkout Date:</strong> ${checkoutDate}</p>
            <p><strong>Due Date:</strong> ${dueDate}</p>
            <p><strong>Return Date:</strong> ${returnDate}</p>
            <p><strong>Status:</strong> ${loan.status}</p>
            <p><strong>Renewal Count:</strong> ${loan.renew_count || 0}</p>
            <p><strong>Fine Amount:</strong> ETB ${loan.fine_amount || 0}</p>
            <p><strong>Fine Paid:</strong> ${loan.fine_paid ? 'Yes' : 'No'}</p>
        </div>
        
        <div class="form-actions">
            ${loan.status === 'active' ? `
                <button class="btn-primary" onclick="returnBook(${loan.loan_id})">
                    <i class="fas fa-undo"></i> Return Book
                </button>
                <button class="btn-secondary" onclick="renewLoan(${loan.loan_id})">
                    <i class="fas fa-redo"></i> Renew Loan
                </button>
            ` : ''}
            <button class="btn-secondary close-modal">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;
    
    modal.classList.add('show');
}

function returnBook(loanId) {
    const modal = document.getElementById('loanActionModal');
    const modalTitle = document.getElementById('loanActionTitle');
    const modalBody = document.getElementById('loanActionBody');
    
    modalTitle.textContent = 'Return Book';
    
    modalBody.innerHTML = `
        <div class="return-form">
            <div class="form-info">
                <h4>Return Book</h4>
                <p>Please inspect the book condition before accepting the return.</p>
            </div>
            
            <div class="form-group">
                <label>Book Condition *</label>
                <div class="condition-options">
                    <div class="condition-option" data-condition="good">
                        <i class="fas fa-check-circle"></i>
                        <p>Good</p>
                        <small>No damage</small>
                    </div>
                    <div class="condition-option" data-condition="damaged">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Damaged</p>
                        <small>Minor damage</small>
                    </div>
                    <div class="condition-option" data-condition="lost">
                        <i class="fas fa-times-circle"></i>
                        <p>Lost</p>
                        <small>Book not returned</small>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="returnNotes">Notes</label>
                <textarea id="returnNotes" placeholder="Any notes about the return..."></textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-primary" onclick="processReturn(${loanId})">
                    <i class="fas fa-check"></i> Confirm Return
                </button>
                <button type="button" class="btn-secondary close-modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    // Add condition selection
    modalBody.querySelectorAll('.condition-option').forEach(option => {
        option.addEventListener('click', function() {
            modalBody.querySelectorAll('.condition-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });
    
    modal.classList.add('show');
}

function processReturn(loanId) {
    const selectedCondition = document.querySelector('.condition-option.selected');
    
    if (!selectedCondition) {
        alert('Please select the book condition');
        return;
    }
    
    const condition = selectedCondition.dataset.condition;
    const notes = document.getElementById('returnNotes').value;
    
    if (confirm(`Confirm return with condition: ${condition}?`)) {
        // This would call the API
        alert(`Return functionality will be implemented in the next phase. Condition: ${condition}`);
        
        // In the future:
        // window.dlmsAPI.request(`/loans/${loanId}/return`, {
        //     method: 'POST',
        //     body: JSON.stringify({ condition, notes })
        // })
        // .then(response => {
        //     alert('Book returned successfully!');
        //     closeAllModals();
        //     loadLoans(currentPage);
        // })
        // .catch(error => {
        //     alert('Failed to return book');
        // });
    }
}

function renewLoan(loanId) {
    const modal = document.getElementById('loanActionModal');
    const modalTitle = document.getElementById('loanActionTitle');
    const modalBody = document.getElementById('loanActionBody');
    
    modalTitle.textContent = 'Renew Loan';
    
    modalBody.innerHTML = `
        <div class="renew-form">
            <div class="form-info">
                <h4>Renew Book Loan</h4>
                <p>You can renew this book for an additional loan period.</p>
                <p>Maximum 2 renewals allowed per book.</p>
            </div>
            
            <div class="form-group">
                <label for="renewDueDate">New Due Date *</label>
                <input type="date" id="renewDueDate" 
                       value="${getDefaultDueDate()}" 
                       min="${new Date().toISOString().split('T')[0]}">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-primary" onclick="processRenewal(${loanId})">
                    <i class="fas fa-redo"></i> Confirm Renewal
                </button>
                <button type="button" class="btn-secondary close-modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function processRenewal(loanId) {
    const newDueDate = document.getElementById('renewDueDate').value;
    
    if (!newDueDate) {
        alert('Please select a new due date');
        return;
    }
    
    if (confirm(`Renew loan until ${newDueDate}?`)) {
        // This would call the API
        alert('Renewal functionality will be implemented in the next phase');
        
        // In the future:
        // window.dlmsAPI.request(`/loans/${loanId}/renew`, {
        //     method: 'POST',
        //     body: JSON.stringify({ due_date: newDueDate })
        // })
        // .then(response => {
        //     alert('Loan renewed successfully!');
        //     closeAllModals();
        //     loadLoans(currentPage);
        // })
        // .catch(error => {
        //     alert('Failed to renew loan');
        // });
    }
}

function payFine(loanId) {
    const modal = document.getElementById('loanActionModal');
    const modalTitle = document.getElementById('loanActionTitle');
    const modalBody = document.getElementById('loanActionBody');
    
    modalTitle.textContent = 'Pay Fine';
    
    modalBody.innerHTML = `
        <div class="fine-form">
            <div class="form-info">
                <h4>Pay Overdue Fine</h4>
                <p>Please enter the payment amount for the overdue fine.</p>
                <p>Note: Fines are calculated at ETB 0.50 per day overdue.</p>
            </div>
            
            <div class="form-group">
                <label for="paymentAmount">Payment Amount (ETB) *</label>
                <input type="number" id="paymentAmount" step="0.01" min="0" placeholder="0.00">
            </div>
            
            <div class="form-group">
                <label for="paymentMethod">Payment Method</label>
                <select id="paymentMethod">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="online">Online Payment</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="paymentReference">Reference Number</label>
                <input type="text" id="paymentReference" placeholder="Transaction reference">
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn-primary" onclick="processPayment(${loanId})">
                    <i class="fas fa-money-bill-wave"></i> Process Payment
                </button>
                <button type="button" class="btn-secondary close-modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function processPayment(loanId) {
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const method = document.getElementById('paymentMethod').value;
    const reference = document.getElementById('paymentReference').value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid payment amount');
        return;
    }
    
    if (confirm(`Process payment of ETB ${amount.toFixed(2)} via ${method}?`)) {
        // This would call the API
        alert('Payment functionality will be implemented in the next phase');
        
        // In the future:
        // window.dlmsAPI.request(`/loans/${loanId}/pay-fine`, {
        //     method: 'POST',
        //     body: JSON.stringify({ amount, method, reference })
        // })
        // .then(response => {
        //     alert('Payment processed successfully!');
        //     closeAllModals();
        //     loadLoans(currentPage);
        // })
        // .catch(error => {
        //     alert('Failed to process payment');
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
window.viewLoanDetails = viewLoanDetails;
window.returnBook = returnBook;
window.renewLoan = renewLoan;
window.payFine = payFine;
window.showCheckoutModal = showCheckoutModal;