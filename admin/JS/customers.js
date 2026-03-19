document.addEventListener('DOMContentLoaded', function() {
    const customerTable = document.getElementById('customerTableBody');
    const customerForm = document.getElementById('customerForm');
    const searchInput = document.getElementById('custSearch');
    const API_URL = 'http://localhost:3000/customers';

    let allCustomers = []; // For search filtering

    // 1. FETCH CUSTOMERS FROM DATABASE
    async function fetchCustomers() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error("Server error");
            allCustomers = await response.json();
            renderCustomers(allCustomers);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    }

    // 2. RENDER TABLE
    function renderCustomers(data) {
        customerTable.innerHTML = '';
        
        data.forEach((c) => {
            // Logic for initials avatar
            const initials = c.full_name ? c.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';

            const row = `
                <tr>
                    <td class="fw-bold text-primary">${c.reg_no}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="cust-avatar" style="width:35px; height:35px; background:#e9ecef; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-right:10px; font-weight:bold; color:#0d6efd; font-size:0.8rem;">
                                ${initials}
                            </div>
                            <div>
                                <h6 class="mb-0 fw-bold">${c.full_name}</h6>
                                <small class="text-muted" style="font-size: 0.7rem;">Joined: ${new Date(c.reg_date).toLocaleDateString()}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <small class="d-block"><i class="bi bi-telephone text-muted"></i> ${c.phone}</small>
                        <small class="d-block text-muted"><i class="bi bi-envelope"></i> ${c.email || 'N/A'}</small>
                    </td>
                    <td><small class="text-muted"><i class="bi bi-geo-alt"></i> ${c.address || 'N/A'}</small></td>
                    <td><span class="badge bg-light text-primary border">0</span></td> 
                    <td><small class="text-muted">-</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="alert('Reg No: ${c.reg_no}')">
                            <i class="bi bi-clock-history"></i>
                        </button>
                        <button class="btn btn-sm btn-light border" onclick="deleteCustomer(${c.customer_id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            customerTable.innerHTML += row;
        });
        updateStats(data);
    }

    // 3. UPDATE STATS CARDS
    function updateStats(data) {
        const totalElem = document.getElementById('totalCustCount');
        const monthElem = document.getElementById('newThisMonthCount');
        const freqElem = document.getElementById('frequentVisitorsCount');

        if(totalElem) totalElem.innerText = data.length;
        
        const now = new Date();
        const thisMonthCount = data.filter(c => {
            const d = new Date(c.reg_date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        
        if(monthElem) monthElem.innerText = thisMonthCount;
        if(freqElem) freqElem.innerText = data.filter(c => (c.visits || 0) >= 3).length;
    }

    // 4. SAVE NEW CUSTOMER
    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newCust = {
            full_name: document.getElementById('cName').value,
            phone: document.getElementById('cPhone').value,
            email: document.getElementById('cEmail').value,
            address: document.getElementById('cAddress').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCust)
            });

            if (response.ok) {
                // Success: Close the modal
                const modalElement = document.getElementById('addCustomerModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if(modalInstance) modalInstance.hide();

                customerForm.reset();
                fetchCustomers(); // Reload data
                alert("Customer Registered Successfully!");
            } else {
                const errData = await response.json();
                alert("Error: " + (errData.error || "Failed to save"));
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("Connection to server failed!");
        }
    });

    // 5. SEARCH LOGIC
    if(searchInput) {
        searchInput.addEventListener('keyup', () => {
            const val = searchInput.value.toLowerCase();
            const filtered = allCustomers.filter(c => 
                c.full_name.toLowerCase().includes(val) || 
                c.phone.includes(val) || 
                c.reg_no.toLowerCase().includes(val)
            );
            renderCustomers(filtered);
        });
    }

    // Initial Load
    fetchCustomers();
});

// 6. GLOBAL DELETE FUNCTION (Outside DOMContentLoaded for HTML access)
async function deleteCustomer(id) {
    if(confirm("Are you sure you want to delete this customer?")) {
        try {
            const response = await fetch(`http://localhost:3000/customers/${id}`, { 
                method: 'DELETE' 
            });
            if(response.ok) {
                // Refreshing page is the simplest way to update everything
                location.reload(); 
            } else {
                alert("Delete failed.");
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    }
}