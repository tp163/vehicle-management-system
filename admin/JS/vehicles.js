document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('vehicleTableBody');
    const vehicleForm = document.getElementById('vehicleForm');
    const ownerSelect = document.getElementById('vOwner');

    // --- LOAD OWNERS INTO DROPDOWN ---
    function loadOwnersDropdown() {
        fetch('http://localhost:3000/customers')
            .then(res => res.json())
            .then(customers => {
                ownerSelect.innerHTML = '<option value="" selected disabled>Select Owner</option>';
                customers.forEach(cust => {
                    const opt = document.createElement('option');
                    opt.value = cust.customer_id; // Store ID, not name
                    opt.textContent = `${cust.reg_no} - ${cust.full_name}`; 
                    ownerSelect.appendChild(opt);
                });
            });
    }

    // --- LOAD VEHICLES ---
    function loadVehicles() {
        fetch('http://localhost:3000/api/vehicles')
            .then(res => res.json())
            .then(data => renderVehicles(data));
    }

    function renderVehicles(data) {
    tableBody.innerHTML = '';
    
    // 1. Initialize counters
    let total = data.length;
    let inShop = 0;
    let due = 0;

    data.forEach((v) => {
        // 2. Increment counters based on status
        if (v.status === "In Service") inShop++;
        if (v.status === "Due") due++;

        let statusClass = v.status === "In Service" ? "bg-info" : 
                          v.status === "Due" ? "bg-warning text-dark" : "bg-success";
        
        tableBody.innerHTML += `
           <tr>
            <td><span class="plate-badge">${v.plate_no}</span></td>
            <td><h6 class="mb-0 fw-bold">${v.brand}</h6><small>${v.model}</small></td>
            <td><div class="fw-bold">${v.owner_name}</div></td>
            <td>${v.year}</td>
            <td><span class="badge ${statusClass}">${v.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-dark" onclick="toggleVehicleStatus(${v.vehicle_id}, '${v.status}')">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
                <button class="btn btn-sm btn-light border" onclick="deleteVehicle(${v.vehicle_id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    });

    // 3. Update the Stats Cards in the HTML
    // Make sure these IDs match the IDs in your HTML file!
    if(document.getElementById('totalVehicles')) {
        document.getElementById('totalVehicles').innerText = total;
    }
    if(document.getElementById('inShopCount')) {
        document.getElementById('inShopCount').innerText = inShop;
    }
    if(document.getElementById('dueCount')) {
        document.getElementById('dueCount').innerText = due;
    }
}

    // --- SAVE ---
    vehicleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newVeh = {
            plate_no: document.getElementById('vPlate').value.toUpperCase(),
            brand: document.getElementById('vBrand').value,
            model: document.getElementById('vModel').value,
            customer_id: document.getElementById('vOwner').value, // This is the ID now
            year: document.getElementById('vYear').value,
            status: "On Road"
        };

        fetch('http://localhost:3000/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newVeh)
        }).then(() => {
            loadVehicles();
            bootstrap.Modal.getInstance(document.getElementById('addVehicleModal')).hide();
            vehicleForm.reset();
        });
    });

    window.toggleVehicleStatus = (id, current) => {
        const statuses = ["On Road", "In Service", "Due"];
        let next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
        fetch(`http://localhost:3000/api/vehicles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: next })
        }).then(() => loadVehicles());
    };

    window.deleteVehicle = (id) => {
        if(confirm("Delete?")) fetch(`http://localhost:3000/api/vehicles/${id}`, { method: 'DELETE' }).then(() => loadVehicles());
    };

    loadVehicles();
    loadOwnersDropdown();
// Fill the dropdown when page opens

    // Refresh dropdown whenever the modal is opened (to catch new customers)
    const modalEl = document.getElementById('addVehicleModal');
    if (modalEl) {
        modalEl.addEventListener('show.bs.modal', loadOwnersDropdown);
    }
});