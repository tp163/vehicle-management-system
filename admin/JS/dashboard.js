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

    // --- 2. DYNAMIC STATS UPDATER ---
    function updateStats() {
        const services = JSON.parse(localStorage.getItem('vsms_services')) || [];
        const inventory = JSON.parse(localStorage.getItem('vsms_inventory')) || [];
        
        // Vehicles in Shop (In Progress or Testing)
        const inShop = services.filter(s => s.status === "In Progress" || s.status === "Testing").length;
        // Pending Jobs
        const pending = services.filter(s => s.status === "Pending").length;
        // Low Stock (Items below 10)
        const lowStock = inventory.filter(i => i.quantity < 10).length;

        // Update the UI (Using querySelector to find the H3 tags in the cards)
        const cards = document.querySelectorAll('.stat-card h3');
        if (cards.length >= 4) {
            cards[0].innerText = inShop;
            // cards[1] is for Earnings (usually handled by invoices)
            cards[2].innerText = pending;
            cards[3].innerText = lowStock;
        }
    }

    // --- 3. BOOKING REQUESTS MANAGEMENT ---
    function renderBookings() {
        const bookingTable = document.getElementById('bookingRequestsTable');
        const badge = document.getElementById('bookingBadge');
        
        const allBookings = JSON.parse(localStorage.getItem('vsms_bookings')) || [];
        const pendingRequests = allBookings.filter(b => b.status === "Pending Approval");
        
        if(badge) badge.innerText = `${pendingRequests.length} New`;

        if (!bookingTable) return;

        if (pendingRequests.length === 0) {
            bookingTable.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted small">No new requests</td></tr>`;
            return;
        }

        bookingTable.innerHTML = '';
        pendingRequests.forEach((b) => {
            const row = `
                <tr>
                    <td>${b.date}</td>
                    <td>
                        <div class="fw-bold">${b.customerName}</div>
                        <small class="text-primary">${b.vehiclePlate}</small>
                    </td>
                    <td><span class="badge bg-light text-dark border">${b.serviceType}</span></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-success" onclick="approveBooking('${b.id}')" title="Approve"><i class="bi bi-check"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="rejectBooking('${b.id}')" title="Reject"><i class="bi bi-x"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            bookingTable.innerHTML += row;
        });
    }

    // --- 4. ACTION FUNCTIONS (Global for HTML buttons) ---
    window.approveBooking = (bookingId) => {
        let bookings = JSON.parse(localStorage.getItem('vsms_bookings')) || [];
        let services = JSON.parse(localStorage.getItem('vsms_services')) || [];

        const index = bookings.findIndex(b => b.id === bookingId);
        if (index > -1) {
            const approved = bookings[index];
            bookings[index].status = "Approved";

            // Create Job in Services
            const newJob = {
                id: 'JOB-' + Date.now().toString().slice(-4),
                plate: approved.vehiclePlate,
                type: approved.serviceType,
                mechanic: "Unassigned",
                status: "Pending",
                date: approved.date
            };
            
            services.push(newJob);
            localStorage.setItem('vsms_bookings', JSON.stringify(bookings));
            localStorage.setItem('vsms_services', JSON.stringify(services));

            alert("Booking Approved! Job created.");
            renderBookings();
            updateStats();
        }
    };

    window.rejectBooking = (bookingId) => {
        if(confirm("Reject this booking request?")) {
            let bookings = JSON.parse(localStorage.getItem('vsms_bookings')) || [];
            const index = bookings.findIndex(b => b.id === bookingId);
            if (index > -1) {
                bookings[index].status = "Rejected";
                localStorage.setItem('vsms_bookings', JSON.stringify(bookings));
                renderBookings();
            }
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
    renderBookings();
    updateStats();

    // Bootstrap Tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
});