document.addEventListener('DOMContentLoaded', function () {
    const invoiceForm = document.getElementById('invoiceForm');
    const servCostInput = document.getElementById('servCost');
    const partCostInput = document.getElementById('partCost');
    const totalCostInput = document.getElementById('totalCost');

    // Function to calculate total cost automatically
    function calculateTotal() {
        const sCost = parseFloat(servCostInput.value) || 0;
        const pCost = parseFloat(partCostInput.value) || 0;
        totalCostInput.value = sCost + pCost;
    }

    servCostInput.addEventListener('input', calculateTotal);
    partCostInput.addEventListener('input', calculateTotal);

    // Handle form submission
    invoiceForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Get values from form
        const customer = document.getElementById('custName').value;
        const vehicle = document.getElementById('vehName').value;
        const service = document.getElementById('servType').value;
        const total = totalCostInput.value;
        const status = document.getElementById('payStatus').value;
        const invID = "INV" + Math.floor(Math.random() * 1000);

        // Simple Validation
        if(!service || !total) {
            alert("Please fill in all fields");
            return;
        }

        // Add new row to table
        const tableBody = document.getElementById('invoiceTableBody');
        const newRow = `
            <tr>
                <td>${invID}</td>
                <td>${customer}</td>
                <td>${vehicle}</td>
                <td>${service}</td>
                <td>$${total}</td>
                <td><span class="badge ${status === 'Paid' ? 'bg-success' : 'bg-warning'}">${status}</span></td>
                <td><button class="btn btn-sm btn-primary">View</button></td>
            </tr>
        `;

        tableBody.innerHTML += newRow;

        // Close Modal
        const modalElement = document.getElementById('createInvoiceModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        // Reset Form
        invoiceForm.reset();
        alert("Invoice Saved Successfully!");
    });
});