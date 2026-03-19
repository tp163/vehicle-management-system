document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('mechanicTableBody');
    const mechanicForm = document.getElementById('mechanicForm');

    // Initial Data
    let mechanics = [
        { name: "Saranga Bandara", spec: "Engine Specialist", exp: 8, phone: "077-1234567", status: "Available" },
        { name: "Nimal Aththanayake", spec: "Electrical Expert", exp: 5, phone: "077-9876543", status: "Busy" },
        { name: "Ruwan Edirisooriya", spec: "Brake & Suspension", exp: 12, phone: "071-2223334", status: "Available" },
        { name: "Saman Perera", spec: "Hybrid System Pro", exp: 4, phone: "076-5556667", status: "Off-Duty" }
    ];

    function renderMechanics() {
        tableBody.innerHTML = '';
        
        // Reset counters to zero every time we re-render
        let avail = 0, busy = 0, off = 0;

        mechanics.forEach((m, index) => {
            // 1. Count Statuses correctly
            if (m.status === "Available") avail++;
            else if (m.status === "Busy") busy++;
            else if (m.status === "Off-Duty") off++;

            // Define Status Color for the small circle/dot
            let statusColor = m.status === "Available" ? "status-available" : 
                              m.status === "Busy" ? "status-busy" : "status-off";

            const row = `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="https://ui-avatars.com/api/?name=${m.name}&background=random" class="rounded-circle mech-img shadow-sm" style="width:40px; height:40px; margin-right:10px;">
                            <span class="fw-bold">${m.name}</span>
                        </div>
                    </td>
                    <td>${m.spec}</td>
                    <td>${m.exp} Years</td>
                    <td><i class="bi bi-telephone text-muted me-2"></i>${m.phone}</td>
                    <td>
                        <span class="badge-status ${statusColor}"></span>
                        <span class="small">${m.status}</span>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-dark" onclick="toggleStatus(${index})">
                            <i class="bi bi-arrow-repeat"></i> Change Status
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // 2. Update Stats UI - These IDs must exist in your HTML
        document.getElementById('totalMechanics').innerText = mechanics.length;
        document.getElementById('availableCount').innerText = avail;
        document.getElementById('busyCount').innerText = busy;
        document.getElementById('offDutyCount').innerText = off;
    }

    // Toggle Status Logic
    window.toggleStatus = function(index) {
        const statuses = ["Available", "Busy", "Off-Duty"];
        let currentIdx = statuses.indexOf(mechanics[index].status);
        let nextIdx = (currentIdx + 1) % statuses.length;
        mechanics[index].status = statuses[nextIdx];
        
        // Re-run the render function to update the cards at the top
        renderMechanics();
    };

    // Add Mechanic Logic
    mechanicForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newMech = {
            name: document.getElementById('mName').value,
            spec: document.getElementById('mSpec').value,
            exp: document.getElementById('mExp').value,
            phone: document.getElementById('mPhone').value,
            status: "Available"
        };
        mechanics.push(newMech);
        
        // Close modal and refresh UI
        renderMechanics();
        bootstrap.Modal.getInstance(document.getElementById('addMechanicModal')).hide();
        mechanicForm.reset();
    });

    // Initial render call
    renderMechanics();
});