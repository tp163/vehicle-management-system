document.addEventListener('DOMContentLoaded', function() {
    const invForm = document.getElementById('invoiceForm');
    const invTable = document.getElementById('invoiceTableBody');

    // Sample Invoice Data
    let invoices = [
        { id: 'INV-1001', date: '2026-03-18', customer: 'A. Sandaruwan', plate: 'WP CAL-5050', desc: 'Full Engine Service & Oil Filter Change', sFee: 8000, pFee: 4500, status: 'Paid' }
    ];

    function renderInvoices() {
        invTable.innerHTML = '';
        invoices.forEach((inv, index) => {
            const row = `
                <tr>
                    <td class="fw-bold">${inv.id}</td>
                    <td>${inv.date}</td>
                    <td>${inv.customer}</td>
                    <td><span class="badge bg-light text-dark border">${inv.plate}</span></td>
                    <td class="fw-bold text-primary">Rs.${(inv.sFee + inv.pFee).toFixed(2)}</td>
                    <td><span class="badge ${inv.status === 'Paid' ? 'badge-paid' : 'badge-estimated bill'}">Rs.${inv.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewPaperInvoice(${index})">
                            <i class="bi bi-printer"></i> View / Print
                        </button>
                    </td>
                </tr>
            `;
            invTable.innerHTML += row;
        });
    }

    // Auto-calculate Grand Total in Modal
    const feeInputs = [document.getElementById('servFee'), document.getElementById('partsFee')];
    feeInputs.forEach(input => {
        input.addEventListener('input', () => {
            const total = parseFloat(document.getElementById('servFee').value || 0) + 
                          parseFloat(document.getElementById('partsFee').value || 0);
            document.getElementById('totalAmt').value = total.toFixed(2);
        });
    });

    // Save New Invoice
    invForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newInv = {
            id: 'INV-' + (1001 + invoices.length),
            date: new Date().toISOString().split('T')[0],
            customer: document.getElementById('custName').value,
            plate: document.getElementById('vehPlate').value.toUpperCase(),
            desc: document.getElementById('servDesc').value,
            sFee: parseFloat(document.getElementById('servFee').value),
            pFee: parseFloat(document.getElementById('partsFee').value),
            status: 'Pending'
        };
        invoices.push(newInv);
        renderInvoices();
        bootstrap.Modal.getInstance(document.getElementById('createInvoiceModal')).hide();
        invForm.reset();
    });

    // Fill the "Paper" Invoice Modal with Data
    window.viewPaperInvoice = (index) => {
        const data = invoices[index];
        const total = data.sFee + data.pFee;

        document.getElementById('p-invID').innerText = "#" + data.id;
        document.getElementById('p-customer').innerText = data.customer;
        document.getElementById('p-vehicle').innerText = "Vehicle: " + data.plate;
        document.getElementById('p-date').innerText = "Date: " + data.date;
        document.getElementById('p-subtotal').innerText = "Rs." + total.toFixed(2);
        document.getElementById('p-total').innerText = "Rs." + total.toFixed(2);

        document.getElementById('p-items').innerHTML = `
            <tr><td>Service Labor: ${data.desc}</td><td class="text-end">Rs.${data.sFee.toFixed(2)}</td></tr>
            <tr><td>Consumables & Spare Parts</td><td class="text-end">Rs.${data.pFee.toFixed(2)}</td></tr>
        `;

        new bootstrap.Modal(document.getElementById('printPreviewModal')).show();
    };

    renderInvoices();








    // ... existing code ...

document.getElementById('invoiceForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // ────────────────────────────────
    // ADD THESE 3–4 LINES HERE
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).replace(/\//g, '/');   // 15/05/2026 or similar

    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    });  // 14:35

    const dateTimeStr = `Date: ${dateStr} ${timeStr}`;
    // ────────────────────────────────

    // Example: fill preview fields (you probably already have similar code)
    document.getElementById('p-date').textContent = dateTimeStr;

    // ... rest of your code: fill customer, vehicle, items, totals ...
    
    // Show preview modal
    const previewModal = new bootstrap.Modal(document.getElementById('printPreviewModal'));
    previewModal.show();

    // ... save to backend if you have that part ...
});
});