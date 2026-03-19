document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('vehicleTableBody');
    const vehicleForm = document.getElementById('vehicleForm');
    const searchInput = document.getElementById('vehSearch');

    // --- 1. LOAD DATA OR SET DEFAULTS ---
    // Try to load from localStorage. If empty, use the default starting list.
    let vehicles = JSON.parse(localStorage.getItem('vsms_vehicles')) || [
        { plate: "WP ABC-1234", brand: "Toyota", model: "Corolla", owner: "Amila Sandaruwan", year: 2018, status: "On Road" },
        { plate: "WP CAL-5050", brand: "Mitsubishi", model: "Montero", owner: "Thilina Perera", year: 2021, status: "In Service" },
        { plate: "WP KY-9988", brand: "Honda", model: "Civic", owner: "Kavinda Gamage", year: 2015, status: "Due" }
    ];

    // --- 2. PERSISTENCE FUNCTION ---
    // Call this whenever you add, delete, or change a status
    function saveToLocalStorage() {
        localStorage.setItem('vsms_vehicles', JSON.stringify(vehicles));
    }

    // --- 3. DROPDOWN LOGIC (From previous step) ---
    function updateOwnerDropdown() {
        const ownerSelect = document.getElementById('vOwner');
        if (!ownerSelect) return;
        const savedCustomers = JSON.parse(localStorage.getItem('vsms_customers')) || [];
        ownerSelect.innerHTML = '<option value="" selected disabled>Select Owner</option>';
        savedCustomers.forEach(cust => {
            const opt = document.createElement('option');
            opt.value = cust.name;
            opt.textContent = `${cust.regNo} - ${cust.name}`; 
            ownerSelect.appendChild(opt);
        });
    }

    updateOwnerDropdown();
    const vehicleModal = document.getElementById('addVehicleModal');
    if (vehicleModal) {
        vehicleModal.addEventListener('show.bs.modal', updateOwnerDropdown);
    }

    // --- 4. RENDER LOGIC ---
    function renderVehicles(filteredData = vehicles) {
        tableBody.innerHTML = '';


         // Load customers to cross-reference the Reg No
    const savedCustomers = JSON.parse(localStorage.getItem('vsms_customers')) || [];

        let inShop = 0;
        let due = 0;

        filteredData.forEach((v, index) => {

            // Find the customer object that matches the vehicle owner's name
        const ownerData = savedCustomers.find(c => c.name === v.owner);
        const displayRegNo = ownerData ? ownerData.regNo : "N/A"; // Get Reg No or show N/A

            if (v.status === "In Service") inShop++;
            else if (v.status === "Due") due++;

            let statusClass = v.status === "In Service" ? "bg-info" : 
                              v.status === "Due" ? "bg-warning text-dark" : "bg-success";
            
            const row = `
               <tr>
                <td><span class="plate-badge shadow-sm">${v.plate}</span></td>
                <td><h6 class="mb-0 fw-bold">${v.brand}</h6><small class="text-muted">${v.model}</small></td>
                <td>
                    <div class="fw-bold">${v.owner}</div>
                    <small class="text-primary fw-bold" style="font-size: 0.75rem;">${displayRegNo}</small>
                </td>
                <td>${v.year}</td>
                <td><span class="badge ${statusClass}">${v.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-dark" onclick="toggleVehicleStatus(${index})" title="Change Status">
                        <i class="bi bi-arrow-repeat"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="alert('Viewing Service History for ${v.plate}')">
                        <i class="bi bi-file-earmark-medical"></i>
                    </button>
                    <button class="btn btn-sm btn-light border" onclick="deleteVehicle(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
            `;
            tableBody.innerHTML += row;
        });

        if(document.getElementById('totalVehicles')) document.getElementById('totalVehicles').innerText = vehicles.length;
        if(document.getElementById('inShopCount')) document.getElementById('inShopCount').innerText = inShop;
        if(document.getElementById('dueCount')) document.getElementById('dueCount').innerText = due;
    }

    // --- 5. ACTION LOGIC (WITH SAVING) ---

    // Change Status and Save
    window.toggleVehicleStatus = (index) => {
        const statuses = ["On Road", "In Service", "Due"];
        let currentIdx = statuses.indexOf(vehicles[index].status);
        let nextIdx = (currentIdx + 1) % statuses.length;
        vehicles[index].status = statuses[nextIdx];
        
        saveToLocalStorage(); // <--- SAVE
        renderVehicles();
    };

    // Add Vehicle and Save
    vehicleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newVeh = {
            plate: document.getElementById('vPlate').value.toUpperCase(),
            brand: document.getElementById('vBrand').value,
            model: document.getElementById('vModel').value,
            owner: document.getElementById('vOwner').value,
            year: document.getElementById('vYear').value,
            status: "On Road"
        };
        vehicles.push(newVeh);
        
        saveToLocalStorage(); // <--- SAVE
        renderVehicles();

        const modalEl = document.getElementById('addVehicleModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        vehicleForm.reset();
    });

    // Delete Vehicle and Save
    window.deleteVehicle = (index) => {
        if(confirm("Remove this vehicle from registry?")) {
            vehicles.splice(index, 1);
            saveToLocalStorage(); // <--- SAVE
            renderVehicles();
        }
    };

    // Search Logic
    searchInput.addEventListener('keyup', () => {
        const val = searchInput.value.toUpperCase();
        const filtered = vehicles.filter(v => v.plate.includes(val));
        renderVehicles(filtered);
    });

    // Initial render
    renderVehicles();
});