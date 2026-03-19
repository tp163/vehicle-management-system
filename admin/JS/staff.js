document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('staffTableBody');
    const staffForm = document.getElementById('staffForm');

    // Load from LocalStorage or use defaults (Updated with Email and Address)
    let staffMembers = JSON.parse(localStorage.getItem('vsms_staff')) || [
        { name: "Aravinda Bandara", role: "Branch Manager", shift: "Full Day (9AM-6PM)", phone: "077-1112223", email: "aravinda@vsms.com", address: "123 Main St, Colombo", status: "Active" },
        { name: "Dilini Perera", role: "Receptionist", shift: "Morning (8AM-4PM)", phone: "071-4445556", email: "dilini@vsms.com", address: "456 Oak Ave, Kandy", status: "Active" },
        { name: "Sunil Ekanayake", role: "Inventory Manager", shift: "Morning (8AM-4PM)", phone: "076-7778889", email: "sunil@vsms.com", address: "789 Pine Rd, Galle", status: "On Leave" }
    ];

    function renderStaff() {
        tableBody.innerHTML = '';
        
        // Save current state
        localStorage.setItem('vsms_staff', JSON.stringify(staffMembers));

        let activeCount = 0;
        let mgmtCount = 0;
        let leaveCount = 0;

        staffMembers.forEach((s, index) => {
            // Stats logic
            if (s.status === "Active") activeCount++;
            else leaveCount++;

            if (s.role === "Branch Manager" || s.role === "Inventory Manager") mgmtCount++;

            // UI Color logic
            let statusBadge = s.status === "Active" ? "bg-success" : "bg-danger";

            const row = `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="https://ui-avatars.com/api/?name=${s.name}&background=random" class="rounded-circle me-3" style="width:35px">
                            <span class="fw-bold">${s.name}</span>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${s.role}</span></td>
                    <td>
                        <div class="small fw-bold"><i class="bi bi-telephone text-muted me-1"></i>${s.phone}</div>
                        <div class="small text-muted"><i class="bi bi-envelope me-1"></i>${s.email}</div>
                    </td>
                    <td><small class="text-muted">${s.address}</small></td>
                    <td><small>${s.shift}</small></td>
                    <td><span class="badge ${statusBadge}">${s.status}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-dark" onclick="toggleStaffStatus(${index})">
                            <i class="bi bi-arrow-repeat"></i>
                        </button>
                        <button class="btn btn-sm btn-light border" onclick="deleteStaff(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // Update Stat Cards
        document.getElementById('totalStaffCount').innerText = staffMembers.length;
        document.getElementById('activeStaffCount').innerText = activeCount;
        document.getElementById('mgmtCount').innerText = mgmtCount;
        document.getElementById('leaveCount').innerText = leaveCount;
    }

    // Toggle Status: Active <-> On Leave
    window.toggleStaffStatus = function(index) {
        staffMembers[index].status = staffMembers[index].status === "Active" ? "On Leave" : "Active";
        renderStaff();
    };

    // Add Staff Logic (Updated to capture Email and Address)
    staffForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newMember = {
            name: document.getElementById('sName').value,
            email: document.getElementById('sEmail').value,     // Added
            address: document.getElementById('sAddress').value, // Added
            phone: document.getElementById('sPhone').value,
            role: document.getElementById('sRole').value,
            shift: document.getElementById('sShift').value,
            status: "Active"
        };
        staffMembers.push(newMember);
        renderStaff();
        bootstrap.Modal.getInstance(document.getElementById('addStaffModal')).hide();
        staffForm.reset();
    });

    window.deleteStaff = function(index) {
        if(confirm("Remove this staff member?")) {
            staffMembers.splice(index, 1);
            renderStaff();
        }
    };

    renderStaff();
});