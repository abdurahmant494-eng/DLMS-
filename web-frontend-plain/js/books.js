// books.js - Book catalog and management functionality - COMPLETE FIXED VERSION

// Global variables
let currentPage = 1;
const booksPerPage = 12;
let currentFilters = {
    search: '',
    format: '',
    subject: '',
    language: '',
    sortBy: 'created_at'
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Books page loaded');
    
    // Check authentication
    if (!checkAuth()) {
        return; // Stop if not authenticated
    }
    
    // Initialize books page
    initializeBooksPage();
    
    // Load books
    loadBooks();
    
    // Setup event listeners
    setupEventListeners();
});

function checkAuth() {
    const token = window.dlmsAPI ? window.dlmsAPI.token : null;
    if (!token) {
        // Not logged in, redirect to login
        alert('Please login to access the book catalog');
        window.location.href = 'login.html';
        return false;
    }
    
    // Update username
    updateUserInfo();
    return true;
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

function initializeBooksPage() {
    console.log('Initializing books page...');
    
    // Reset to page 1
    currentPage = 1;
    
    // Reset filters
    currentFilters = {
        search: '',
        format: '',
        subject: '',
        language: '',
        sortBy: 'created_at'
    };
    
    // Update page title
    updatePageTitle();
}

function updatePageTitle() {
    const title = currentFilters.search 
        ? `Search: "${currentFilters.search}" - Book Catalog` 
        : 'Book Catalog - DLMS | Borana University';
    document.title = title;
}

async function loadBooks(page = 1) {
    try {
        currentPage = page;
        
        // Show loading state
        const booksGrid = document.getElementById('booksGrid');
        booksGrid.innerHTML = '<div class="loading">Loading books...</div>';
        
        // Build query string
        let query = `?page=${page}&limit=${booksPerPage}`;
        if (currentFilters.search) query += `&q=${encodeURIComponent(currentFilters.search)}`;
        if (currentFilters.format) query += `&format=${currentFilters.format}`;
        if (currentFilters.subject) query += `&subject=${encodeURIComponent(currentFilters.subject)}`;
        if (currentFilters.language) query += `&language=${encodeURIComponent(currentFilters.language)}`;
        
        console.log('Loading books with query:', query);
        
        const response = await window.dlmsAPI.request(`/books${query}`);
        
        if (response && response.books) {
            displayBooks(response.books);
            updatePagination(response.total || response.books.length, response.totalPages || 1);
            updateStatistics(response.books);
        } else {
            booksGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <h3>No Books Found</h3>
                    <p>No books match your search criteria.</p>
                    <button id="clearSearchBtn" class="btn-primary" style="margin-top: 20px;">
                        Clear Search
                    </button>
                </div>
            `;
            
            document.getElementById('clearSearchBtn')?.addEventListener('click', function() {
                document.getElementById('searchInput').value = '';
                currentFilters.search = '';
                loadBooks(1);
            });
        }
    } catch (error) {
        console.error('Error loading books:', error);
        document.getElementById('booksGrid').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Books</h3>
                <p>Could not connect to the server. Please check your connection.</p>
                <button onclick="loadBooks(1)" class="btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

function displayBooks(books) {
    const booksGrid = document.getElementById('booksGrid');
    
    if (books.length === 0) {
        booksGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <h3>No Books Found</h3>
                <p>Try adjusting your search or filters.</p>
            </div>
        `;
        return;
    }
    
    booksGrid.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    // Determine availability
    const isAvailable = book.available_copies > 0;
    const availabilityClass = isAvailable ? 'available' : 'unavailable';
    const availabilityText = isAvailable ? 'Available' : 'Out of Stock';
    
    // Determine format icon
    const formatText = book.format ? book.format.charAt(0).toUpperCase() + book.format.slice(1) : 'Unknown';
    
    card.innerHTML = `
        <div class="book-cover">
            ${book.cover_image ? 
                `<img src="${book.cover_image}" alt="${book.title}">` : 
                `<i class="fas fa-book"></i>`
            }
            <div class="book-format">${formatText}</div>
            <div class="availability ${availabilityClass}">${availabilityText}</div>
        </div>
        <div class="book-info">
            <h3 class="book-title" title="${book.title}">${book.title}</h3>
            <div class="book-author">
                <i class="fas fa-user-edit"></i>
                ${book.author || 'Unknown Author'}
            </div>
            <div class="book-details">
                <div class="book-detail">
                    <i class="fas fa-hashtag"></i>
                    <span>ISBN: ${book.isbn || 'N/A'}</span>
                </div>
                <div class="book-detail">
                    <i class="fas fa-calendar"></i>
                    <span>Year: ${book.publication_year || 'N/A'}</span>
                </div>
                <div class="book-detail">
                    <i class="fas fa-language"></i>
                    <span>Language: ${book.language || 'English'}</span>
                </div>
                <div class="book-detail">
                    <i class="fas fa-copy"></i>
                    <span>Available: ${book.available_copies || 0}/${book.total_copies || 0}</span>
                </div>
            </div>
            <div class="book-actions">
                <button class="action-btn view" onclick="viewBook(${book.book_id || book.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn ${isAvailable ? 'borrow' : 'disabled'}" 
                        onclick="${isAvailable ? `borrowBook(${book.book_id || book.id})` : ''}"
                        ${!isAvailable ? 'disabled' : ''}>
                    <i class="fas fa-exchange-alt"></i> Borrow
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function getFormatIcon(format) {
    switch(format) {
        case 'physical': return 'fas fa-book';
        case 'digital': return 'fas fa-file-pdf';
        case 'both': return 'fas fa-book-open';
        default: return 'fas fa-book';
    }
}

function updatePagination(total, totalPages) {
    const pagination = document.getElementById('pagination');
    
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
    
    // Show first page, current page range, and last page
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="changePage(1)">1</button>
            ${startPage > 2 ? '<span>...</span>' : ''}
        `;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<span>...</span>' : ''}
            <button onclick="changePage(${totalPages})">${totalPages}</button>
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
    if (page < 1) return;
    loadBooks(page);
    
    // Scroll to top of books grid
    document.getElementById('booksGrid').scrollIntoView({ behavior: 'smooth' });
}

function updateStatistics(books) {
    // Update counts
    document.getElementById('totalBooksCount').textContent = books.length;
    
    // Count digital books
    const digitalBooks = books.filter(book => book.format === 'digital' || book.format === 'both').length;
    document.getElementById('digitalBooksCount').textContent = digitalBooks;
    
    // Count unique languages
    const languages = new Set(books.map(book => book.language).filter(lang => lang));
    document.getElementById('languagesCount').textContent = languages.size;
    
    // Count unique subjects
    const subjects = new Set(books.map(book => book.subject).filter(subject => subject));
    document.getElementById('subjectsCount').textContent = subjects.size;
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', function() {
        currentFilters.search = searchInput.value;
        updatePageTitle();
        loadBooks(1);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentFilters.search = searchInput.value;
            updatePageTitle();
            loadBooks(1);
        }
    });
    
    // Filter toggle
    const filterBtn = document.getElementById('filterBtn');
    const filtersContainer = document.getElementById('filtersContainer');
    
    filterBtn.addEventListener('click', function() {
        const isVisible = filtersContainer.style.display === 'block';
        filtersContainer.style.display = isVisible ? 'none' : 'block';
        filterBtn.innerHTML = isVisible ? 
            '<i class="fas fa-filter"></i> Filter' : 
            '<i class="fas fa-times"></i> Close Filters';
    });
    
    // Apply filters
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            currentFilters.format = document.getElementById('formatFilter').value;
            currentFilters.subject = document.getElementById('subjectFilter').value;
            currentFilters.language = document.getElementById('languageFilter').value;
            currentFilters.sortBy = document.getElementById('sortFilter').value;
            loadBooks(1);
        });
    }
    
    // Clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            document.getElementById('formatFilter').value = '';
            document.getElementById('subjectFilter').value = '';
            document.getElementById('languageFilter').value = '';
            document.getElementById('sortFilter').value = 'title';
            currentFilters = {
                search: searchInput.value,
                format: '',
                subject: '',
                language: '',
                sortBy: 'title'
            };
            loadBooks(1);
        });
    }
    
    // Add book button
    const addBookBtn = document.getElementById('addBookBtn');
    if (addBookBtn) {
        addBookBtn.addEventListener('click', function() {
            showAddBookModal();
        });
    }
    
    // Add Book Form Submission
    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) {
        addBookForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAddBook();
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

async function handleAddBook() {
    console.log('=== DEBUG: Starting Add Book ===');
    
    const form = document.getElementById('addBookForm');
    if (!form) {
        alert('Add book form not found!');
        return;
    }
    
    try {
        // Get form data
        const bookData = {
            title: document.getElementById('bookTitle').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            isbn: document.getElementById('bookISBN')?.value.trim() || '',
            subject: document.getElementById('bookSubject')?.value.trim() || '',
            publisher: document.getElementById('bookPublisher')?.value.trim() || '',
            publication_year: document.getElementById('bookYear')?.value || null,
            language: document.getElementById('bookLanguage')?.value || 'English',
            format: document.getElementById('bookFormat')?.value || 'physical',
            total_copies: document.getElementById('bookCopies')?.value || 1,
            shelf_location: document.getElementById('bookLocation')?.value.trim() || '',
            description: document.getElementById('bookDescription')?.value.trim() || ''
        };
        
        console.log('Book data to submit:', bookData);
        
        // Validate required fields
        if (!bookData.title || !bookData.author) {
            alert('Title and Author are required fields!');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitBtn.disabled = true;
        
        // Make API call
        const response = await window.dlmsAPI.request('/books', {
            method: 'POST',
            body: JSON.stringify(bookData),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API Response:', response);
        
        if (response && (response.book || response.success || response.message)) {
            // Success!
            alert('✓ Book added successfully!');
            closeAllModals();
            form.reset();
            loadBooks(currentPage); // Refresh the book list
        } else {
            throw new Error(response?.message || 'Failed to add book');
        }
        
    } catch (error) {
        console.error('Error adding book:', error);
        alert(`❌ Failed to add book: ${error.message || 'Unknown error'}`);
    } finally {
        // Restore button state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Book';
            submitBtn.disabled = false;
        }
    }
}

function viewBook(bookId) {
    console.log('Viewing book:', bookId);
    
    // Fetch book details
    window.dlmsAPI.request(`/books/${bookId}`)
        .then(response => {
            if (response && response.book) {
                showBookDetailsModal(response.book);
            }
        })
        .catch(error => {
            console.error('Error fetching book details:', error);
            alert('Failed to load book details');
        });
}

function showBookDetailsModal(book) {
    const modal = document.getElementById('bookModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    // Format book details
    const formatText = book.format ? book.format.charAt(0).toUpperCase() + book.format.slice(1) : 'Unknown';
    const availabilityText = book.available_copies > 0 ? 'Available' : 'Out of Stock';
    const availabilityClass = book.available_copies > 0 ? 'available' : 'unavailable';
    
    modalTitle.textContent = book.title;
    modalBody.innerHTML = `
        <div class="book-detail-modal">
            <div class="detail-cover">
                ${book.cover_image ? 
                    `<img src="${book.cover_image}" alt="${book.title}">` : 
                    `<div style="width: 300px; height: 400px; background: linear-gradient(135deg, #3498db, #2c3e50); 
                      display: flex; align-items: center; justify-content: center; border-radius: 10px;">
                        <i class="fas fa-book" style="font-size: 4rem; color: white;"></i>
                    </div>`
                }
                <div class="detail-actions">
                    <button class="action-btn view" onclick="viewBookPdf(${book.book_id || book.id})" ${book.digital_file_url ? '' : 'disabled'}>
                        <i class="fas fa-file-pdf"></i> Read Online
                    </button>
                    <button class="action-btn borrow" onclick="borrowBook(${book.book_id || book.id})" ${book.available_copies > 0 ? '' : 'disabled'}>
                        <i class="fas fa-exchange-alt"></i> Borrow Book
                    </button>
                </div>
            </div>
            <div class="detail-info">
                <div class="detail-section">
                    <h3>Book Information</h3>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-heading"></i> Title</span>
                        <span class="detail-value">${book.title}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-user-edit"></i> Author</span>
                        <span class="detail-value">${book.author || 'Unknown'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-hashtag"></i> ISBN</span>
                        <span class="detail-value">${book.isbn || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-building"></i> Publisher</span>
                        <span class="detail-value">${book.publisher || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-calendar"></i> Publication Year</span>
                        <span class="detail-value">${book.publication_year || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-tag"></i> Subject</span>
                        <span class="detail-value">${book.subject || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Availability</h3>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-layer-group"></i> Format</span>
                        <span class="detail-value">${formatText}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-language"></i> Language</span>
                        <span class="detail-value">${book.language || 'English'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-copy"></i> Total Copies</span>
                        <span class="detail-value">${book.total_copies || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-check-circle"></i> Available Copies</span>
                        <span class="detail-value">
                            <span class="${availabilityClass}" style="padding: 3px 8px; border-radius: 4px;">
                                ${book.available_copies || 0}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label"><i class="fas fa-map-marker-alt"></i> Shelf Location</span>
                        <span class="detail-value">${book.shelf_location || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Description</h3>
                    <div class="detail-item">
                        <span class="detail-value" style="line-height: 1.6;">
                            ${book.description || 'No description available.'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function showAddBookModal() {
    const modal = document.getElementById('addBookModal');
    if (modal) {
        modal.classList.add('show');
        
        // Reset form to default values
        const form = document.getElementById('addBookForm');
        if (form) {
            form.reset();
            // Set default values
            document.getElementById('bookCopies').value = 1;
            document.getElementById('bookLanguage').value = 'English';
            document.getElementById('bookFormat').value = 'physical';
        }
        
        // Focus on first input
        setTimeout(() => {
            document.getElementById('bookTitle')?.focus();
        }, 100);
    } else {
        console.error('Add book modal not found! Check HTML structure.');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

function borrowBook(bookId) {
    if (!confirm('Are you sure you want to borrow this book?')) {
        return;
    }
    
    // Get user ID from token (simplified)
    const token = window.dlmsAPI.token;
    if (!token) {
        alert('Please login to borrow books');
        window.location.href = 'login.html';
        return;
    }
    
    // For now, show a message
    alert('Borrow functionality will be implemented in the next phase. Please contact the librarian.');
    
    // In the future, this would call:
    // window.dlmsAPI.createLoan({ book_id: bookId })
    //     .then(response => { /* handle success */ })
    //     .catch(error => { /* handle error */ });
}

function viewBookPdf(bookId) {
    // This would open the PDF in a new tab or embedded viewer
    alert('PDF viewer will be implemented in the next phase');
    
    // In the future:
    // window.open(`/api/books/${bookId}/pdf`, '_blank');
}

// Export functions for use in HTML onclick
window.changePage = changePage;
window.viewBook = viewBook;
window.borrowBook = borrowBook;
window.showAddBookModal = showAddBookModal;
window.handleAddBook = handleAddBook;

// Add CSS for notifications
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
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
`;
document.head.appendChild(notificationStyle);