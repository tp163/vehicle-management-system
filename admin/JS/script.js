const sections = document.querySelectorAll('.fade-in');

function revealSections(){

sections.forEach(section => {

const sectionTop = section.getBoundingClientRect().top;

if(sectionTop < window.innerHeight - 100){

section.classList.add('show');

}

});

}

window.addEventListener('scroll', revealSections);






document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('vehicleTableBody');
    const vehicleForm = document.getElementById('vehicleForm');
    const searchInput = document.getElementById('vehSearch');

    let vehicles = []; // Global state to hold DB data

    // --- 1. FETCH FROM DATABASE ---
    async function loadVehicles() {
        try {
            const response = await fetch('http://localhost:3000/api/vehicles');
            vehicles = await response.json();
            renderVehicles();
        } catch (error) {
            console.error("Database connection failed:", error);
        }
    }

    // --- 2. RENDER LOGIC (Updated to use DB 'id') ---
    function renderVehicles(filteredData = vehicles) {
        tableBody.innerHTML = '';
        const savedCustomers = JSON.parse(localStorage.getItem('vsms_customers')) || [];

        let inShop = 0, due = 0;

        filteredData.forEach((v) => {
            const ownerData = savedCustomers.find(c => c.name === v.owner);
            const displayRegNo = ownerData ? ownerData.regNo : "N/A";

            if (v.status === "In Service") inShop++;
            else if (v.status === "Due") due++;

            let statusClass = v.status === "In Service" ? "bg-info" : 
                              v.status === "Due" ? "bg-warning text-dark" : "bg-success";
            
            // NOTE: We pass v.id (MySQL ID) to the functions instead of index
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
                    <button class="btn btn-sm btn-outline-dark" onclick="toggleVehicleStatus(${v.id}, '${v.status}')">
                        <i class="bi bi-arrow-repeat"></i>
                    </button>
                    <button class="btn btn-sm btn-light border" onclick="deleteVehicle(${v.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

        if(document.getElementById('totalVehicles')) document.getElementById('totalVehicles').innerText = vehicles.length;
        if(document.getElementById('inShopCount')) document.getElementById('inShopCount').innerText = inShop;
        if(document.getElementById('dueCount')) document.getElementById('dueCount').innerText = due;
    }

    // --- 3. ACTION LOGIC (Calling API) ---

    window.toggleVehicleStatus = async (id, currentStatus) => {
        const statuses = ["On Road", "In Service", "Due"];
        let nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
        const newStatus = statuses[nextIdx];

        await fetch(`http://localhost:3000/api/vehicles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        loadVehicles(); // Refresh list
    };

    vehicleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newVeh = {
            plate: document.getElementById('vPlate').value.toUpperCase(),
            brand: document.getElementById('vBrand').value,
            model: document.getElementById('vModel').value,
            owner: document.getElementById('vOwner').value,
            year: document.getElementById('vYear').value,
            status: "On Road"
        };

        await fetch('http://localhost:3000/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newVeh)
        });

        loadVehicles(); 
        bootstrap.Modal.getInstance(document.getElementById('addVehicleModal')).hide();
        vehicleForm.reset();
    });

    window.deleteVehicle = async (id) => {
        if(confirm("Remove this vehicle?")) {
            await fetch(`http://localhost:3000/api/vehicles/${id}`, { method: 'DELETE' });
            loadVehicles();
        }
    };

    // Initial Load
    loadVehicles();
});