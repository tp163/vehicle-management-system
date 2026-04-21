document.addEventListener('DOMContentLoaded', function() {
    const jobsTable = document.getElementById('jobsTableBody');
    const jobForm = document.getElementById('jobForm');
    const plateSelect = document.getElementById('jPlate');
    const mechanicSelect = document.getElementById('jMech');
    const fallbackMechanics = [
        'Ruwan Edirisooriya',
        'Saranga Bandara',
        'Saman Perera'
    ];

    // --- 1. LOAD DATA FROM DATABASE ---
    function loadServices() {
        fetch('http://localhost:3000/api/services')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load services');
                return res.json();
            })
            .then(data => renderJobs(data))
            .catch(err => console.error("Error loading services:", err));
    }

    // --- 2. RENDER TABLE & STATS ---
    function renderJobs(data) {
        if (!jobsTable) return;
        jobsTable.innerHTML = '';
        
        let activeCount = 0;    
        let pendingCount = 0;   
        let readyCount = 0;     

        data.forEach((j) => {
            if (j.status === "In Progress") activeCount++;
            else if (j.status === "Pending") pendingCount++;
            else if (j.status === "Ready") readyCount++;

            let statusBadge = j.status === "In Progress" ? '<span class="badge bg-info">In Progress</span>' : 
                              j.status === "Ready" ? '<span class="badge bg-success">Ready</span>' : 
                              '<span class="badge bg-warning text-dark">Pending</span>';

            jobsTable.innerHTML += `
                <tr>
                    <td class="fw-bold">${j.job_no}</td>
                    <td><span class="plate-no">${j.plate_no || 'N/A'}</span></td>
                    <td>${j.service_type}</td>
                    <td><i class="bi bi-person-gear me-2"></i>${j.mechanic_name || 'Unassigned'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="changeStatus(${j.service_id}, '${j.status}', ${j.cost})">Update</button>
                        <button class="btn btn-sm btn-light border" onclick="deleteJob(${j.service_id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        });

        // Update Stats Cards
        document.getElementById('activeJobsCount').innerText = activeCount;
        document.getElementById('pendingApprovalCount').innerText = pendingCount;
        document.getElementById('completedTodayCount').innerText = readyCount;
    }

    // --- 3. DROP-DOWN POPULATION ---
    function populateDropdowns() {
        // Load Vehicles
        fetch('http://localhost:3000/api/vehicles')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load vehicles');
                return res.json();
            })
            .then(vehicles => {
                plateSelect.innerHTML = '<option value="" selected disabled>Select Vehicle</option>';
                vehicles.forEach(v => {
                    plateSelect.innerHTML += `<option value="${v.vehicle_id}">${v.plate_no}</option>`;
                });
            })
            .catch(err => {
                console.error('Vehicle load error:', err);
                plateSelect.innerHTML = '<option value="" selected disabled>Unable to load vehicles</option>';
            });

        // Load Mechanics
        fetch('http://localhost:3000/api/mechanics')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load mechanics');
                return res.json();
            })
            .then(mechanics => {
                mechanicSelect.innerHTML = '<option value="" selected disabled>Select Mechanic</option>';
                if (mechanics.length > 0) {
                    mechanics.forEach(m => {
                        mechanicSelect.innerHTML += `<option value="${m.mechanic_id}">${m.full_name}</option>`;
                    });
                    return;
                }

                // If mechanics table is empty, keep form usable by sending names.
                fallbackMechanics.forEach(name => {
                    mechanicSelect.innerHTML += `<option value="${name}">${name}</option>`;
                });
            })
            .catch(err => {
                console.error('Mechanic load error:', err);
                mechanicSelect.innerHTML = '<option value="" selected disabled>Select Mechanic</option>';
                fallbackMechanics.forEach(name => {
                    mechanicSelect.innerHTML += `<option value="${name}">${name}</option>`;
                });
            });
    }

    // --- 4. NEW JOB SUBMISSION ---
    jobForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newJob = {
            job_no: 'JOB-' + Math.floor(1000 + Math.random() * 9000),
            vehicle_id: plateSelect.value,
            mechanic_id: null,
            mechanic_name: null,
            service_type: document.getElementById('jType').value,
            status: "In Progress",
            cost: 0 
        };

        const selectedMechanicValue = mechanicSelect.value;
        if (!Number.isNaN(Number(selectedMechanicValue)) && selectedMechanicValue !== '') {
            newJob.mechanic_id = Number(selectedMechanicValue);
        } else if (selectedMechanicValue) {
            newJob.mechanic_name = selectedMechanicValue;
        }

        if (!newJob.vehicle_id || (!newJob.mechanic_id && !newJob.mechanic_name)) {
            alert('Please select both vehicle and mechanic.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newJob)
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || 'Failed to create service job');
            }

            loadServices();
            bootstrap.Modal.getInstance(document.getElementById('addJobModal')).hide();
            jobForm.reset();
        } catch (error) {
            console.error('Service create error:', error);
            alert(error.message);
        }
    });

    // --- 5. GLOBAL FUNCTIONS ---
    window.changeStatus = function(id, currentStatus, currentCost) {
        const statuses = ["Pending", "In Progress", "Ready"];
        let nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
        let newCost = currentCost;

        if (nextStatus === "Ready") {
            const amount = prompt("Enter final service cost (Rs.):", currentCost || "5000");
            newCost = amount ? parseInt(amount) : currentCost;
        }

        fetch(`http://localhost:3000/api/services/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus, cost: newCost })
        }).then(() => loadServices());
    };

    window.deleteJob = function(id) {
        if(confirm("Cancel this job?")) {
            fetch(`http://localhost:3000/api/services/${id}`, { method: 'DELETE' })
                .then(() => loadServices());
        }
    };

    loadServices();
    populateDropdowns();
});