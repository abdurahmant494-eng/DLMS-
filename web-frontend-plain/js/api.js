// api.js - UPDATED with forgot password function
const API_BASE_URL = 'http://localhost:5000/api';

class DLMS_API {
    constructor() {
        this.token = localStorage.getItem('dlms_token');
    }
    
    // Set authentication token
   // In your api.js, update the setToken method:
setToken(token) {
    console.log('Setting token:', token ? token.substring(0, 20) + '...' : 'null');
    this.token = token;
    localStorage.setItem('dlms_token', token);
    console.log('Token saved to localStorage:', localStorage.getItem('dlms_token') ? 'Yes' : 'No');
}

// And in the request method, add debug logging:
async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('Making request to:', url);
    console.log('Current token exists:', this.token ? 'Yes' : 'No');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        console.log('Authorization header added');
    } else {
        console.log('No token available, request will be unauthenticated');
    }
    
    // ... rest of your code
}
    
    // Remove token (logout)
    clearToken() {
        this.token = null;
        localStorage.removeItem('dlms_token');
    }
    
    // Make API request
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // Token expired or invalid
                this.clearToken();
                window.location.href = '/pages/login.html';
                return null;
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // Auth APIs
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
    
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    // Forgot password
    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
    
    // Reset password
    async resetPassword(token, newPassword) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });
    }
    
    // Refresh token
    async refreshToken(refreshToken) {
        return this.request('/auth/refresh-token', {
            method: 'POST',
            body: JSON.stringify({ refreshToken })
        });
    }
    
    // Get user profile
    async getProfile() {
        return this.request('/auth/profile');
    }
    
    // Update profile
    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }
    
    // Change password
    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }
    
    // Book APIs
    async getBooks(page = 1, limit = 10) {
        return this.request(`/books?page=${page}&limit=${limit}`);
    }
    
    async searchBooks(query) {
        return this.request(`/books/search?q=${encodeURIComponent(query)}`);
    }
    
    async getBook(id) {
        return this.request(`/books/${id}`);
    }
    
    async createBook(bookData) {
        return this.request('/books', {
            method: 'POST',
            body: JSON.stringify(bookData)
        });
    }
    
    async updateBook(id, bookData) {
        return this.request(`/books/${id}`, {
            method: 'PUT',
            body: JSON.stringify(bookData)
        });
    }
    
    async deleteBook(id) {
        return this.request(`/books/${id}`, {
            method: 'DELETE'
        });
    }
    
    // User APIs
    async getUsers() {
        return this.request('/users');
    }
    
    async getUser(id) {
        return this.request(`/users/${id}`);
    }
    
    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    // Loan APIs
    async getLoans() {
        return this.request('/loans');
    }
    
    async getMyLoans() {
        return this.request('/loans/my-loans');
    }
    
    async createLoan(loanData) {
        return this.request('/loans/checkout', {
            method: 'POST',
            body: JSON.stringify(loanData)
        });
    }
    
    async returnBook(loanId, condition = 'good') {
        return this.request(`/loans/${loanId}/return`, {
            method: 'POST',
            body: JSON.stringify({ condition })
        });
    }
    
    async renewLoan(loanId) {
        return this.request(`/loans/${loanId}/renew`, {
            method: 'POST'
        });
    }
    
    async payFine(loanId, amount) {
        return this.request(`/loans/${loanId}/pay-fine`, {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
    }
    
    // Incident APIs
    async getIncidents() {
        return this.request('/incidents');
    }
    
    async createIncident(incidentData) {
        return this.request('/incidents', {
            method: 'POST',
            body: JSON.stringify(incidentData)
        });
    }
    
    async updateIncident(id, incidentData) {
        return this.request(`/incidents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(incidentData)
        });
    }
    
    // System health check
    async checkHealth() {
        return this.request('/health');
    }
}

// Create global API instance
window.dlmsAPI = new DLMS_API();