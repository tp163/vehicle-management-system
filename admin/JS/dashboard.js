document.addEventListener('DOMContentLoaded', function () {
    
    // --- 1. DYNAMIC GREETING & LIVE CLOCK ---
    const navbarBrand = document.querySelector('.navbar h4');
    
    function updateClock() {
        const now = new Date();
        const hours = now.getHours();
        
        // Update Greeting
        let greeting = "Admin Dashboard";
        if (hours < 12) greeting = "Good Morning, Admin";
        else if (hours < 18) greeting = "Good Afternoon, Admin";
        else greeting = "Good Evening, Admin";
        if (navbarBrand) navbarBrand.innerHTML = `<i class="bi bi-speedometer2 me-2"></i> ${greeting}`;

        // Update Clock Display
        const display = now.toLocaleString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const dateEl = document.getElementById('current-date');
        if (dateEl) dateEl.textContent = display;
    }

    updateClock();
    setInterval(updateClock, 1000);

    // --- 2. DYNAMIC STATS + LIVE WORKSHOP (API BASED) ---
    async function updateStats() {
        try {
            const [servicesRes, inventoryRes] = await Promise.all([
                fetch('http://localhost:3000/api/services'),
                fetch('http://localhost:3000/inventory')
            ]);

            if (!servicesRes.ok || !inventoryRes.ok) {
                throw new Error('Failed to load dashboard stats');
            }

            const services = await servicesRes.json();
            const inventory = await inventoryRes.json();

            const inShop = services.filter(s => s.status === 'In Progress' || s.status === 'Pending').length;
            const pending = services.filter(s => s.status === 'Pending').length;
            const lowStock = inventory.filter(i => Number(i.qty) < 10).length;

            const today = new Date();
            const isSameDate = (dateText) => {
                if (!dateText) return false;
                const d = new Date(dateText);
                return d.getFullYear() === today.getFullYear() &&
                       d.getMonth() === today.getMonth() &&
                       d.getDate() === today.getDate();
            };

            const todayEarningsValue = services
                .filter(s => s.status === 'Ready' && isSameDate(s.service_date))
                .reduce((sum, s) => sum + (Number(s.cost) || 0), 0);

            const vehiclesInShopEl = document.getElementById('vehiclesInShopCount');
            const todayEarningsEl = document.getElementById('todayEarnings');
            const pendingJobsEl = document.getElementById('pendingJobsCount');
            const lowStockEl = document.getElementById('lowStockCount');

            if (vehiclesInShopEl) vehiclesInShopEl.innerText = inShop;
            if (todayEarningsEl) todayEarningsEl.innerText = `Rs. ${todayEarningsValue.toLocaleString()}`;
            if (pendingJobsEl) pendingJobsEl.innerText = pending;
            if (lowStockEl) lowStockEl.innerText = lowStock;
        } catch (error) {
            console.error('Dashboard stats load error:', error);
        }
    }

    async function loadLiveWorkshopStatus() {
        const workshopBody = document.getElementById('workshopStatusBody');
        if (!workshopBody) return;

        try {
            const [servicesRes, vehiclesRes] = await Promise.all([
                fetch('http://localhost:3000/api/services'),
                fetch('http://localhost:3000/api/vehicles')
            ]);

            if (!servicesRes.ok || !vehiclesRes.ok) {
                throw new Error('Failed to load workshop data');
            }

            const services = await servicesRes.json();
            const vehicles = await vehiclesRes.json();
            const vehicleMap = new Map(vehicles.map(v => [String(v.vehicle_id), v]));

            workshopBody.innerHTML = '';
            if (services.length === 0) {
                workshopBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No active jobs found.</td></tr>';
                return;
            }

            const latestServices = services.slice(0, 6);
            latestServices.forEach(s => {
                const vehicle = vehicleMap.get(String(s.vehicle_id));
                const customerName = vehicle?.owner_name || 'N/A';
                const mechanicName = s.mechanic_name || 'Unassigned';

                let statusBadge = '<span class="badge bg-secondary">Unknown</span>';
                if (s.status === 'In Progress') statusBadge = '<span class="badge bg-info text-white">In Progress</span>';
                if (s.status === 'Pending') statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                if (s.status === 'Ready') statusBadge = '<span class="badge bg-success">Ready</span>';

                workshopBody.innerHTML += `
                    <tr>
                        <td class="fw-bold">${s.plate_no || '-'}</td>
                        <td>${customerName}</td>
                        <td>${mechanicName}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error('Live workshop load error:', error);
            workshopBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-3">Unable to load workshop status.</td></tr>';
        }
    }

    function formatTimeAgo(dateValue) {
        const date = new Date(dateValue);
        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / (1000 * 60));
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
        const diffDay = Math.floor(diffHr / 24);
        return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    }

    async function loadRecentActivity() {
        const list = document.getElementById('recentActivityList');
        if (!list) return;

        try {
            const response = await fetch('http://localhost:3000/api/dashboard/activity?limit=8');
            if (!response.ok) throw new Error('Failed to fetch activity feed');

            const activities = await response.json();
            if (!activities.length) {
                list.innerHTML = '<li class="text-muted small">No recent activity yet.</li>';
                return;
            }

            list.innerHTML = '';
            activities.forEach((a, index) => {
                const colorClass = a.severity === 'danger'
                    ? 'text-danger'
                    : a.severity === 'warning'
                        ? 'text-warning'
                        : a.severity === 'success'
                            ? 'text-success'
                            : 'text-primary';

                const borderClass = index < activities.length - 1 ? 'pb-3 border-bottom mb-3' : '';
                list.innerHTML += `
                    <li class="${borderClass}">
                        <small class="${colorClass} fw-bold">${formatTimeAgo(a.created_at)}</small>
                        <p class="mb-0 small">${a.message}</p>
                    </li>
                `;
            });
        } catch (error) {
            console.error('Recent activity load error:', error);
            list.innerHTML = '<li class="text-danger small">Unable to load recent activity.</li>';
        }
    }

    // --- 3. BOOKING REQUESTS MANAGEMENT ---
    let currentBookingId = null; // Global to track which booking is being processed
    let allMechanics = []; // Global to store mechanics list

    // Load booking requests from backend
    async function loadBookingRequests() {
        try {
            const response = await fetch('http://localhost:3000/api/booking-requests/pending');
            if (!response.ok) throw new Error('Failed to fetch booking requests');
            
            const bookings = await response.json();
            renderBookings(bookings);
        } catch (error) {
            console.error('Error loading booking requests:', error);
            renderBookings([]); // Show empty state on error
        }
    }

    // Render booking requests table
    function renderBookings(bookings) {
        const bookingTable = document.getElementById('bookingRequestsTable');
        const badge = document.getElementById('bookingBadge');
        
        if (badge) badge.innerText = `${bookings.length} New`;

        if (!bookingTable) return;

        if (bookings.length === 0) {
            bookingTable.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted small">No new booking requests</td></tr>`;
            return;
        }

        bookingTable.innerHTML = '';
        bookings.forEach((b) => {
            const requestDate = new Date(b.requested_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const serviceDate = new Date(b.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const row = `
                <tr>
                    <td><small>${requestDate}</small></td>
                    <td>
                        <div class="fw-bold">${b.full_name || 'N/A'}</div>
                        <small class="text-primary">${b.plate_no || 'N/A'} - ${b.brand || ''} ${b.model || ''}</small>
                        <div><small class="text-muted">Service: ${serviceDate}</small></div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${b.service_type || 'N/A'}</span></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-success" onclick="openApproveModal(${b.booking_request_id})" title="Approve" data-bs-toggle="tooltip">
                                <i class="bi bi-check-circle"></i>
                            </button>
                            <button class="btn btn-danger" onclick="openRejectModal(${b.booking_request_id})" title="Reject" data-bs-toggle="tooltip">
                                <i class="bi bi-x-circle"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            bookingTable.innerHTML += row;
        });
    }

    // Load mechanics for dropdown
    async function loadMechanics() {
        try {
            const response = await fetch('http://localhost:3000/api/mechanics');
            if (!response.ok) throw new Error('Failed to fetch mechanics');
            
            allMechanics = await response.json();
            const select = document.getElementById('approveMechanic');
            if (select) {
                select.innerHTML = '<option value="" selected disabled>Select a mechanic</option>';
                allMechanics.forEach(m => {
                    select.innerHTML += `<option value="${m.mechanic_id}">${m.full_name}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading mechanics:', error);
        }
    }

    // --- 4. ACTION FUNCTIONS (Global for HTML buttons) ---
    window.openApproveModal = async (bookingId) => {
        currentBookingId = bookingId;
        try {
            const response = await fetch('http://localhost:3000/api/booking-requests');
            if (!response.ok) throw new Error('Failed to fetch bookings');
            
            const bookings = await response.json();
            const booking = bookings.find(b => b.booking_request_id === bookingId);
            
            if (booking) {
                const requestDate = new Date(booking.requested_date).toLocaleDateString();
                const serviceDate = new Date(booking.service_date).toLocaleDateString();
                const details = `
                    <strong>Customer:</strong> ${booking.full_name}<br>
                    <strong>Vehicle:</strong> ${booking.plate_no} - ${booking.brand} ${booking.model}<br>
                    <strong>Service Type:</strong> ${booking.service_type}<br>
                    <strong>Requested:</strong> ${requestDate}<br>
                    <strong>Preferred Date:</strong> ${serviceDate}<br>
                    <strong>Notes:</strong> ${booking.description || 'No notes'}
                `;
                document.getElementById('approveBookingDetails').innerHTML = details;
                const modal = new bootstrap.Modal(document.getElementById('approveBookingModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error opening approve modal:', error);
            alert('Error loading booking details');
        }
    };

    window.openRejectModal = async (bookingId) => {
        currentBookingId = bookingId;
        try {
            const response = await fetch('http://localhost:3000/api/booking-requests');
            if (!response.ok) throw new Error('Failed to fetch bookings');
            
            const bookings = await response.json();
            const booking = bookings.find(b => b.booking_request_id === bookingId);
            
            if (booking) {
                const requestDate = new Date(booking.requested_date).toLocaleDateString();
                const serviceDate = new Date(booking.service_date).toLocaleDateString();
                const details = `
                    <strong>Customer:</strong> ${booking.full_name}<br>
                    <strong>Vehicle:</strong> ${booking.plate_no} - ${booking.brand} ${booking.model}<br>
                    <strong>Service Type:</strong> ${booking.service_type}<br>
                    <strong>Requested:</strong> ${requestDate}<br>
                    <strong>Preferred Date:</strong> ${serviceDate}
                `;
                document.getElementById('rejectBookingDetails').innerHTML = details;
                document.getElementById('rejectReason').value = ''; // Clear previous content
                const modal = new bootstrap.Modal(document.getElementById('rejectBookingModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error opening reject modal:', error);
            alert('Error loading booking details');
        }
    };

    window.submitApproveBooking = async () => {
        const mechanicId = document.getElementById('approveMechanic').value;
        
        if (!mechanicId) {
            alert('Please select a mechanic');
            return;
        }

        if (!currentBookingId) {
            alert('Error: Booking ID not found');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/booking-requests/${currentBookingId}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mechanic_id: mechanicId })
            });

            if (response.ok) {
                alert('Booking approved! Service job has been created.');
                bootstrap.Modal.getInstance(document.getElementById('approveBookingModal')).hide();
                currentBookingId = null;
                loadBookingRequests(); // Reload the list
                updateStats();
                loadLiveWorkshopStatus();
                loadRecentActivity();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to approve booking'));
            }
        } catch (error) {
            console.error('Error approving booking:', error);
            alert('Error approving booking. Please try again.');
        }
    };

    window.submitRejectBooking = async () => {
        const reason = document.getElementById('rejectReason').value.trim();
        
        if (!reason) {
            alert('Please provide a reason for rejection');
            return;
        }

        if (!currentBookingId) {
            alert('Error: Booking ID not found');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/booking-requests/${currentBookingId}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejection_reason: reason })
            });

            if (response.ok) {
                alert('Booking request has been rejected. The customer will be notified.');
                bootstrap.Modal.getInstance(document.getElementById('rejectBookingModal')).hide();
                currentBookingId = null;
                loadBookingRequests(); // Reload the list
                updateStats();
                loadRecentActivity();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to reject booking'));
            }
        } catch (error) {
            console.error('Error rejecting booking:', error);
            alert('Error rejecting booking. Please try again.');
        }
    };

    // --- 5. UI INTERACTIONS (Highlighting & Logout) ---
    // Event Delegation for Table Highlighting (Works for dynamic rows)
    document.addEventListener('click', function (e) {
        const row = e.target.closest('tbody tr');
        if (row) {
            const allRows = row.closest('table').querySelectorAll('tr');
            allRows.forEach(r => r.style.backgroundColor = '');
            row.style.backgroundColor = '#f0f7ff';
        }
    });

    const logoutBtn = document.querySelector('.dropdown-item[href="logout.html"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if(!confirm("Are you sure you want to logout?")) {
                e.preventDefault();
            }
        });
    }

    // --- 6. INITIALIZATION ---
    loadBookingRequests();
    loadMechanics();
    updateStats();
    loadLiveWorkshopStatus();
    loadRecentActivity();

    // Keep dashboard synced with changes from other pages.
    setInterval(() => {
        loadBookingRequests();
        updateStats();
        loadLiveWorkshopStatus();
        loadRecentActivity();
    }, 30000);

    // Bootstrap Tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
});