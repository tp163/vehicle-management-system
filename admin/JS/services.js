document.addEventListener('DOMContentLoaded', function() {
    const jobsTable = document.getElementById('jobsTableBody');
    const jobForm = document.getElementById('jobForm');

    // Initial Active Jobs Data - Load from localStorage if available
    
    // --- NEW: Load dropdown data ---
    function updateVehicleDropdown() {
        const plateSelect = document.getElementById('jPlate');
        if (!plateSelect) return;
        
        let savedVehicles = JSON.parse(localStorage.getItem('vsms_vehicles')) || [];
        
        // Clear existing options except the first disabled one if you want, 
        // but here we just rebuild it completely.
        plateSelect.innerHTML = '<option value="" selected disabled>Select Vehicle</option>';
        
        savedVehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.plate;
            opt.textContent = `${v.plate} (${v.brand} ${v.model})`;
            plateSelect.appendChild(opt);
        });
    }

    // Call it initially
    updateVehicleDropdown();
    
    // Also call it when the modal opens to get fresh data
    const addJobModal = document.getElementById('addJobModal');
    if (addJobModal) {
        addJobModal.addEventListener('show.bs.modal', updateVehicleDropdown);
    }

    let jobs = JSON.parse(localStorage.getItem('vsms_services')) || [
        { id: "JOB-7701", plate: "WP CAL-5050", type: "Engine Diagnostic", mechanic: "Saranga Bandara", status: "In Progress" },
        { id: "JOB-7702", plate: "WP ABC-1234", type: "Oil Change", mechanic: "Ruwan Edirisooriya", status: "Ready" },
        { id: "JOB-7703", plate: "WP KY-9988", type: "Brake Repair", mechanic: "Saman Perera", status: "Pending" }
    ];

    function saveJobsToStorage() {
        localStorage.setItem('vsms_services', JSON.stringify(jobs));
    }

    function renderJobs() {
        jobsTable.innerHTML = '';
        
        // 1. Initialize counters
        let activeCount = 0;    // For "In Progress"
        let pendingCount = 0;   // For "Pending"
        let readyCount = 0;     // For "Ready"

        jobs.forEach((j, index) => {
            // 2. Increment counters based on status
            if (j.status === "In Progress") {
                activeCount++;
            } else if (j.status === "Pending") {
                pendingCount++;
            } else if (j.status === "Ready") {
                readyCount++;
            }

            // Define status badge UI
            let statusBadge = '';
            if (j.status === "In Progress") statusBadge = '<span class="badge bg-info">In Progress</span>';
            else if (j.status === "Ready") statusBadge = '<span class="badge bg-success">Ready</span>';
            else statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';

            const row = `
                <tr>
                    <td class="fw-bold">${j.id}</td>
                    <td><span class="plate-no">${j.plate}</span></td>
                    <td>${j.type}</td>
                    <td><i class="bi bi-person-gear me-2"></i>${j.mechanic}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="changeStatus(${index})">Update Status</button>
                        <button class="btn btn-sm btn-light border" onclick="deleteJob(${index})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
            jobsTable.innerHTML += row;
        });

        // 3. Update the UI Stats Cards
        document.getElementById('activeJobsCount').innerText = activeCount;
        document.getElementById('pendingApprovalCount').innerText = pendingCount;
        document.getElementById('completedTodayCount').innerText = readyCount;
    }

    // Toggle Status Logic
    window.changeStatus = (index) => {
    const statuses = ["Pending", "In Progress", "Ready"];
    let current = statuses.indexOf(jobs[index].status);
    let nextStatus = statuses[(current + 1) % statuses.length];

    // --- NEW: If the job is being marked as Ready, ask for the cost ---
    if (nextStatus === "Ready") {
        let amount = prompt("Enter final service cost (Rs.):", "5000");
        jobs[index].cost = amount ? parseInt(amount) : 0;
    }

    jobs[index].status = nextStatus;
    saveJobsToStorage();
    renderJobs();
};

    // Add New Job Logic
    jobForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newJob = {
            id: 'JOB-' + (7700 + jobs.length + 1),
            plate: document.getElementById('jPlate').value, // No need to toUpperCase() as it's from a dropdown now
            type: document.getElementById('jType').value,
            mechanic: document.getElementById('jMech').value,
            status: "In Progress", // Defaults to In Progress (Active)
       
            // --- ADD THESE TWO LINES ---
            date: new Date().toISOString(), // This allows the history page to sort by newest
            cost: 0 // Default cost is 0 until job is finished
       
        };
        jobs.push(newJob);
        saveJobsToStorage(); // Save after adding new job
        renderJobs();
        bootstrap.Modal.getInstance(document.getElementById('addJobModal')).hide();
        jobForm.reset();
    });

    window.deleteJob = (index) => {
        if(confirm("Cancel this service job?")) {
            jobs.splice(index, 1);
            saveJobsToStorage(); // Save after deleting job
            renderJobs();
        }
    };

    // Save initial default mock data to storage if not already there so it's readable immediately by other pages
    if (!localStorage.getItem('vsms_services')) {
        saveJobsToStorage();
    }

    renderJobs();
});