document.addEventListener('DOMContentLoaded', function() {
    const invForm = document.getElementById('invoiceForm');
    const invTable = document.getElementById('invoiceTableBody');
    const vehicleSelect = document.getElementById('vehPlate');
    const customerInput = document.getElementById('custName');
    const serviceDescInput = document.getElementById('servDesc');
    const serviceFeeInput = document.getElementById('servFee');
    const partsFeeInput = document.getElementById('partsFee');
    const totalAmtInput = document.getElementById('totalAmt');
    const paidAmtInput = document.getElementById('paidAmt');
    const balanceAmtInput = document.getElementById('balanceAmt');
    const jobNoInput = document.getElementById('jobNo');
    const jobStatusInput = document.getElementById('jobStatus');
    const partsRowsBody = document.getElementById('partsRowsBody');
    const addPartRowBtn = document.getElementById('addPartRowBtn');
    const estVehicleSelect = document.getElementById('estVehicle');
    const estCustomerInput = document.getElementById('estCustomer');
    const estJobRowsBody = document.getElementById('estJobRowsBody');
    const estAddJobRowBtn = document.getElementById('estAddJobRowBtn');
    const estExtraFeeInput = document.getElementById('estExtraFee');
    const estServiceFeeInput = document.getElementById('estServiceFee');
    const estPartsRowsBody = document.getElementById('estPartsRowsBody');
    const estAddPartRowBtn = document.getElementById('estAddPartRowBtn');
    const estTotalLabel = document.getElementById('estTotal');
    const applyEstimateBtn = document.getElementById('applyEstimateBtn');

    let invoices = [];
    let vehicles = [];
    let services = [];
    let inventory = [];
    let selectedService = null;
    const ESTIMATE_JOB_TYPES = [
        { name: 'Full Service', charge: 12500 },
        { name: 'Oil Change', charge: 5000 },
        { name: 'Brake Service', charge: 8500 },
        { name: 'Engine Repair', charge: 18000 },
        { name: 'AC Service', charge: 7000 },
        { name: 'Battery Replacement', charge: 6500 }
    ];

    function normalizeAmount(value) {
        return Number.parseFloat(value || 0) || 0;
    }

    function formatDateTime(date) {
        const current = date || new Date();
        const dateStr = current.toLocaleDateString('en-GB');
        const timeStr = current.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        return `${dateStr} ${timeStr}`;
    }

    // Load all invoices from database
    async function loadInvoices() {
        try {
            const response = await fetch('http://localhost:3000/api/invoices');
            if (!response.ok) throw new Error('Failed to load invoices');
            invoices = await response.json();
            renderInvoices();
        } catch (error) {
            console.error('Error loading invoices:', error);
            alert('Could not load invoices from database');
        }
    }

    function renderInvoices() {
        invTable.innerHTML = '';

        if (invoices.length === 0) {
            invTable.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No invoices yet</td></tr>';
            return;
        }

        invoices.forEach((inv, index) => {
            const total = normalizeAmount(inv.total_amount);
            const statusClass = inv.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark';
            const customerName = inv.customer_name || `Customer #${inv.customer_id}`;
            const vehicleLabel = inv.plate_no
                ? `${inv.plate_no}${inv.brand ? ` (${inv.brand} ${inv.model || ''})` : ''}`
                : `Vehicle #${inv.vehicle_id}`;
            const statusToggleButton = inv.status === 'Pending'
                ? `<button class="btn btn-sm btn-outline-success me-1" onclick="setInvoiceStatus(${inv.invoice_id}, 'Paid', ${normalizeAmount(inv.total_amount)})"><i class="bi bi-check-circle"></i> Set Paid</button>`
                : `<button class="btn btn-sm btn-outline-warning me-1" onclick="setInvoiceStatus(${inv.invoice_id}, 'Pending', ${normalizeAmount(inv.paid_amount)})"><i class="bi bi-arrow-counterclockwise"></i> Set Pending</button>`;

            const actionButtons = `
                    ${statusToggleButton}
                    <button class="btn btn-sm btn-outline-primary" onclick="viewPaperInvoice(${inv.invoice_id}, '${inv.invoice_no}')">
                        <i class="bi bi-printer"></i> View / Print
                    </button>
                `;
            const row = `
                <tr>
                    <td class="fw-bold">${inv.invoice_no}</td>
                    <td>${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</td>
                    <td>${customerName}</td>
                    <td><span class="badge bg-light text-dark border">${vehicleLabel}</span></td>
                    <td class="fw-bold text-primary">Rs.${total.toFixed(2)}</td>
                    <td><span class="badge ${statusClass}">${inv.status}</span></td>
                    <td>
                        ${actionButtons}
                    </td>
                </tr>
            `;
            invTable.insertAdjacentHTML('beforeend', row);
        });
    }

    async function loadReferenceData() {
        try {
            const [vehiclesRes, servicesRes, inventoryRes] = await Promise.all([
                fetch('http://localhost:3000/api/vehicles'),
                fetch('http://localhost:3000/api/services'),
                fetch('http://localhost:3000/inventory')
            ]);

            if (!vehiclesRes.ok || !servicesRes.ok || !inventoryRes.ok) {
                throw new Error('Failed to load vehicle/service/inventory data');
            }

            vehicles = await vehiclesRes.json();
            services = await servicesRes.json();
            inventory = await inventoryRes.json();
            populateVehicleDropdown();
        } catch (error) {
            console.error('Invoice reference load error:', error);
            alert('Could not load data for invoice auto-fill. Make sure backend is running.');
        }
    }

    function populateVehicleDropdown() {
        vehicleSelect.innerHTML = '<option value="" selected disabled>Select Vehicle</option>';
        if (estVehicleSelect) {
            estVehicleSelect.innerHTML = '<option value="" selected disabled>Select Vehicle</option>';
        }

        vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = String(vehicle.vehicle_id);
            option.textContent = `${vehicle.plate_no} - ${vehicle.brand || ''} ${vehicle.model || ''}`.trim();
            vehicleSelect.appendChild(option);

            if (estVehicleSelect) {
                const estOption = document.createElement('option');
                estOption.value = String(vehicle.vehicle_id);
                estOption.textContent = option.textContent;
                estVehicleSelect.appendChild(estOption);
            }
        });
    }

    function updateEstimateTotal() {
        if (!estTotalLabel) return;
        const service = getEstimateJobsTotal() + normalizeAmount(estExtraFeeInput?.value);
        const parts = getEstimatePartsTotal();
        const total = service + parts;
        if (estServiceFeeInput) {
            estServiceFeeInput.value = service.toFixed(2);
        }
        estTotalLabel.innerText = `Rs. ${total.toFixed(2)}`;
    }

    function getEstimatePartsTotal() {
        let parts = 0;
        if (estPartsRowsBody) {
            estPartsRowsBody.querySelectorAll('tr.est-part-row').forEach(row => {
                const lineTotal = normalizeAmount(row.querySelector('.est-part-line-total')?.value);
                parts += lineTotal;
            });
        }
        return parts;
    }

    function buildEstimateJobTypeOptions() {
        return ESTIMATE_JOB_TYPES
            .map(job => `<option value="${job.name}" data-charge="${job.charge}">${job.name} (Rs. ${job.charge.toLocaleString()})</option>`)
            .join('');
    }

    function recalculateEstimateJobRow(row) {
        const jobSelect = row.querySelector('.est-job-select');
        const qtyInput = row.querySelector('.est-job-qty');
        const unitChargeInput = row.querySelector('.est-job-unit-charge');
        const lineTotalInput = row.querySelector('.est-job-line-total');

        const selectedOption = jobSelect.options[jobSelect.selectedIndex];
        const unitCharge = selectedOption ? normalizeAmount(selectedOption.getAttribute('data-charge')) : 0;
        const qty = normalizeAmount(qtyInput.value);
        const lineTotal = unitCharge * qty;

        unitChargeInput.value = unitCharge.toFixed(2);
        lineTotalInput.value = lineTotal.toFixed(2);
    }

    function addEstimateNoJobsRowIfNeeded() {
        if (!estJobRowsBody) return;
        const rows = estJobRowsBody.querySelectorAll('tr.est-job-row');
        if (rows.length === 0) {
            estJobRowsBody.innerHTML = `
                <tr class="text-muted" id="estNoJobsRow">
                    <td colspan="5" class="text-center py-2">No job types added</td>
                </tr>
            `;
        }
    }

    function addEstimateJobRow() {
        if (!estJobRowsBody) return;
        const noJobs = document.getElementById('estNoJobsRow');
        if (noJobs) noJobs.remove();

        const row = document.createElement('tr');
        row.className = 'est-job-row';
        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm est-job-select" required>
                    <option value="" selected disabled>Select Job Type</option>
                    ${buildEstimateJobTypeOptions()}
                </select>
            </td>
            <td>
                <input type="number" min="1" value="1" class="form-control form-control-sm est-job-qty" required>
            </td>
            <td>
                <input type="text" value="0.00" class="form-control form-control-sm est-job-unit-charge" readonly>
            </td>
            <td>
                <input type="text" value="0.00" class="form-control form-control-sm est-job-line-total" readonly>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger est-remove-job-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        estJobRowsBody.appendChild(row);
        row.querySelector('.est-job-select').addEventListener('change', () => {
            recalculateEstimateJobRow(row);
            updateEstimateTotal();
        });
        row.querySelector('.est-job-qty').addEventListener('input', () => {
            recalculateEstimateJobRow(row);
            updateEstimateTotal();
        });
        row.querySelector('.est-remove-job-btn').addEventListener('click', () => {
            row.remove();
            addEstimateNoJobsRowIfNeeded();
            updateEstimateTotal();
        });

        updateEstimateTotal();
    }

    function getEstimateJobsTotal() {
        let jobsTotal = 0;
        if (estJobRowsBody) {
            estJobRowsBody.querySelectorAll('tr.est-job-row').forEach(row => {
                jobsTotal += normalizeAmount(row.querySelector('.est-job-line-total')?.value);
            });
        }
        return jobsTotal;
    }

    function getEstimateJobSummary() {
        const labels = [];
        if (estJobRowsBody) {
            estJobRowsBody.querySelectorAll('tr.est-job-row').forEach(row => {
                const jobSelect = row.querySelector('.est-job-select');
                const qty = normalizeAmount(row.querySelector('.est-job-qty')?.value);
                const name = jobSelect?.value;
                if (name) {
                    labels.push(qty > 1 ? `${name} x${qty}` : name);
                }
            });
        }
        return labels.join(', ');
    }

    function buildEstimatePartOptions() {
        return inventory
            .map(part => `<option value="${part.id}">${part.part_id} - ${part.name} (Stock: ${part.qty})</option>`)
            .join('');
    }

    function recalculateEstimatePartRow(row) {
        const partSelect = row.querySelector('.est-part-select');
        const qtyInput = row.querySelector('.est-part-qty');
        const unitPriceInput = row.querySelector('.est-part-unit-price');
        const lineTotalInput = row.querySelector('.est-part-line-total');

        const selectedPart = inventory.find(part => String(part.id) === partSelect.value);
        const unitPrice = selectedPart ? normalizeAmount(selectedPart.price) : 0;
        const qty = normalizeAmount(qtyInput.value);
        const lineTotal = unitPrice * qty;

        unitPriceInput.value = unitPrice.toFixed(2);
        lineTotalInput.value = lineTotal.toFixed(2);
    }

    function addEstimateNoPartsRowIfNeeded() {
        if (!estPartsRowsBody) return;
        const rows = estPartsRowsBody.querySelectorAll('tr.est-part-row');
        if (rows.length === 0) {
            estPartsRowsBody.innerHTML = `
                <tr class="text-muted" id="estNoPartsRow">
                    <td colspan="5" class="text-center py-2">No parts added</td>
                </tr>
            `;
        }
    }

    function addEstimatePartRow() {
        if (!estPartsRowsBody) return;
        const noParts = document.getElementById('estNoPartsRow');
        if (noParts) noParts.remove();

        const row = document.createElement('tr');
        row.className = 'est-part-row';
        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm est-part-select" required>
                    <option value="" selected disabled>Select Part</option>
                    ${buildEstimatePartOptions()}
                </select>
            </td>
            <td>
                <input type="number" min="1" value="1" class="form-control form-control-sm est-part-qty" required>
            </td>
            <td>
                <input type="text" value="0.00" class="form-control form-control-sm est-part-unit-price" readonly>
            </td>
            <td>
                <input type="text" value="0.00" class="form-control form-control-sm est-part-line-total" readonly>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger est-remove-part-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        estPartsRowsBody.appendChild(row);
        row.querySelector('.est-part-select').addEventListener('change', () => {
            recalculateEstimatePartRow(row);
            updateEstimateTotal();
        });
        row.querySelector('.est-part-qty').addEventListener('input', () => {
            recalculateEstimatePartRow(row);
            updateEstimateTotal();
        });
        row.querySelector('.est-remove-part-btn').addEventListener('click', () => {
            row.remove();
            addEstimateNoPartsRowIfNeeded();
            updateEstimateTotal();
        });

        updateEstimateTotal();
    }

    function onEstimateVehicleChange() {
        if (!estVehicleSelect || !estCustomerInput) return;
        const selectedVehicleId = estVehicleSelect.value;
        const vehicle = vehicles.find(v => String(v.vehicle_id) === selectedVehicleId);
        estCustomerInput.value = vehicle ? (vehicle.owner_name || '') : '';
    }

    function getLatestServiceForVehicle(vehicleId) {
        const linkedServices = services
            .filter(service => String(service.vehicle_id) === String(vehicleId))
            .sort((a, b) => new Date(b.service_date) - new Date(a.service_date));

        return linkedServices.length > 0 ? linkedServices[0] : null;
    }

    function onVehicleChange() {
        const selectedVehicleId = vehicleSelect.value;
        const vehicle = vehicles.find(v => String(v.vehicle_id) === selectedVehicleId);
        const latestService = getLatestServiceForVehicle(selectedVehicleId);
        selectedService = latestService;

        customerInput.value = vehicle ? (vehicle.owner_name || '') : '';

        if (latestService) {
            jobNoInput.value = latestService.job_no || '';
            jobStatusInput.value = latestService.status || '';
            serviceDescInput.value = latestService.service_type || '';
            serviceFeeInput.value = normalizeAmount(latestService.cost).toFixed(2);
        } else {
            jobNoInput.value = '';
            jobStatusInput.value = 'No service record found';
            serviceDescInput.value = '';
            serviceFeeInput.value = '0.00';
        }

        recalculateTotals();
    }

    function buildPartOptions() {
        return inventory
            .map(part => `<option value="${part.id}">${part.part_id} - ${part.name} (Stock: ${part.qty})</option>`)
            .join('');
    }

    function removeNoPartsRow() {
        const noPartsRow = document.getElementById('noPartsRow');
        if (noPartsRow) noPartsRow.remove();
    }

    function addNoPartsRowIfNeeded() {
        const dynamicRows = partsRowsBody.querySelectorAll('tr.part-row');
        if (dynamicRows.length === 0) {
            partsRowsBody.innerHTML = `
                <tr class="text-muted" id="noPartsRow">
                    <td colspan="5" class="text-center py-3">No parts added</td>
                </tr>
            `;
        }
    }

    function recalculatePartRow(row) {
        const partSelect = row.querySelector('.part-select');
        const qtyInput = row.querySelector('.part-qty');
        const unitPriceInput = row.querySelector('.part-unit-price');
        const lineTotalInput = row.querySelector('.part-line-total');

        const selectedPart = inventory.find(part => String(part.id) === partSelect.value);
        const unitPrice = selectedPart ? normalizeAmount(selectedPart.price) : 0;
        const qty = normalizeAmount(qtyInput.value);
        const lineTotal = unitPrice * qty;

        unitPriceInput.value = unitPrice.toFixed(2);
        lineTotalInput.value = lineTotal.toFixed(2);
    }

    function recalculateTotals() {
        const serviceFee = normalizeAmount(serviceFeeInput.value);
        const paidAmount = normalizeAmount(paidAmtInput.value);
        let partsTotal = 0;

        partsRowsBody.querySelectorAll('tr.part-row').forEach(row => {
            recalculatePartRow(row);
            const lineTotal = normalizeAmount(row.querySelector('.part-line-total').value);
            partsTotal += lineTotal;
        });

        partsFeeInput.value = partsTotal.toFixed(2);
        const grandTotal = serviceFee + partsTotal;
        const difference = grandTotal - Math.max(paidAmount, 0);
        const balance = Math.abs(difference);
        totalAmtInput.value = grandTotal.toFixed(2);
        balanceAmtInput.value = balance.toFixed(2);

        // Visual cue: red when amount due, green when excess paid.
        if (difference < 0) {
            balanceAmtInput.classList.remove('border-danger');
            balanceAmtInput.classList.add('border-success', 'text-success');
        } else {
            balanceAmtInput.classList.remove('border-success', 'text-success');
            balanceAmtInput.classList.add('border-danger');
        }
    }

    function addPartRow() {
        removeNoPartsRow();
        const row = document.createElement('tr');
        row.className = 'part-row';
        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm part-select" required>
                    <option value="" selected disabled>Select Part</option>
                    ${buildPartOptions()}
                </select>
            </td>
            <td>
                <input type="number" min="1" value="1" class="form-control form-control-sm part-qty" required>
            </td>
            <td>
                <input type="text" value="0.00" class="form-control form-control-sm part-unit-price" readonly>
            </td>
            <td>
                <input type="text" value="0.00" class="form-control form-control-sm part-line-total" readonly>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger remove-part-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;

        partsRowsBody.appendChild(row);

        row.querySelector('.part-select').addEventListener('change', recalculateTotals);
        row.querySelector('.part-qty').addEventListener('input', recalculateTotals);
        row.querySelector('.remove-part-btn').addEventListener('click', () => {
            row.remove();
            addNoPartsRowIfNeeded();
            recalculateTotals();
        });

        recalculateTotals();
    }

    function collectPartsFromForm() {
        const parts = [];

        partsRowsBody.querySelectorAll('tr.part-row').forEach(row => {
            const partSelect = row.querySelector('.part-select');
            const qty = normalizeAmount(row.querySelector('.part-qty').value);
            const part = inventory.find(item => String(item.id) === partSelect.value);
            if (!part) return;

            parts.push({
                part_id: part.part_id,
                part_name: part.name,
                qty: qty,
                unit_price: normalizeAmount(part.price),
                line_total: normalizeAmount(row.querySelector('.part-line-total').value)
            });
        });

        return parts;
    }

    function resetInvoiceForm() {
        invForm.reset();
        jobNoInput.value = '';
        jobStatusInput.value = '';
        partsRowsBody.innerHTML = `
            <tr class="text-muted" id="noPartsRow">
                <td colspan="5" class="text-center py-3">No parts added</td>
            </tr>
        `;
        partsFeeInput.value = '0.00';
        totalAmtInput.value = '0.00';
        paidAmtInput.value = '0.00';
        balanceAmtInput.value = '0.00';
    }

    invForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Ensure balance/total are fresh even if user submits immediately after typing
        recalculateTotals();

        const selectedVehicle = vehicles.find(v => String(v.vehicle_id) === vehicleSelect.value);
        if (!selectedVehicle) {
            alert('Please select a vehicle.');
            return;
        }

        const parts = collectPartsFromForm();
        const totalAmount = normalizeAmount(totalAmtInput.value);
        const paidAmount = normalizeAmount(paidAmtInput.value);
        const balanceAmount = Math.max(totalAmount - paidAmount, 0);
        const customerId = Number.parseInt(selectedVehicle.customer_id, 10);
        const vehicleId = Number.parseInt(selectedVehicle.vehicle_id, 10);
        const invoiceNo = (jobNoInput.value || '').trim() || `INV-${Date.now().toString().slice(-10)}`;

        if (!Number.isInteger(customerId) || !Number.isInteger(vehicleId)) {
            alert('Failed to save invoice: Invalid customer or vehicle data.');
            return;
        }

        const invoiceData = {
            invoice_no: invoiceNo,
            customer_id: customerId,
            vehicle_id: vehicleId,
            service_id: selectedService?.service_id || null,
            description: serviceDescInput.value,
            service_fee: normalizeAmount(serviceFeeInput.value),
            parts_fee: normalizeAmount(partsFeeInput.value),
            paid_amount: Math.max(paidAmount, 0),
            status: Math.max(paidAmount, 0) >= totalAmount ? 'Paid' : 'Pending'
        };

        try {
            const response = await fetch('http://localhost:3000/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });

            const responseText = await response.text();
            let responseJson = null;
            try {
                responseJson = responseText ? JSON.parse(responseText) : null;
            } catch (_) {
                responseJson = null;
            }

            if (!response.ok) {
                const msg = responseJson?.error || responseJson?.message || `Server error (${response.status})`;
                alert('Failed to save invoice: ' + msg);
                return;
            }

            alert('Invoice created successfully!');
            
            const createModal = bootstrap.Modal.getInstance(document.getElementById('createInvoiceModal'));
            if (createModal) createModal.hide();

            resetInvoiceForm();
            loadInvoices(); // Reload from database
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Error connecting to server: ' + error.message);
        }
    });

    vehicleSelect.addEventListener('change', onVehicleChange);
    serviceFeeInput.addEventListener('input', recalculateTotals);
    serviceFeeInput.addEventListener('change', recalculateTotals);
    paidAmtInput.addEventListener('input', recalculateTotals);
    paidAmtInput.addEventListener('change', recalculateTotals);
    addPartRowBtn.addEventListener('click', addPartRow);

    if (estVehicleSelect) {
        estVehicleSelect.addEventListener('change', onEstimateVehicleChange);
    }
    if (estAddJobRowBtn) {
        estAddJobRowBtn.addEventListener('click', addEstimateJobRow);
    }
    if (estExtraFeeInput) {
        estExtraFeeInput.addEventListener('input', updateEstimateTotal);
    }
    if (estAddPartRowBtn) {
        estAddPartRowBtn.addEventListener('click', addEstimatePartRow);
    }
    if (applyEstimateBtn) {
        applyEstimateBtn.addEventListener('click', () => {
            const selectedVehicleId = estVehicleSelect?.value;
            if (!selectedVehicleId) {
                alert('Please select a vehicle in estimate first.');
                return;
            }

            let estimatedPartsTotal = 0;
            if (estPartsRowsBody) {
                estPartsRowsBody.querySelectorAll('tr.est-part-row').forEach(row => {
                    estimatedPartsTotal += normalizeAmount(row.querySelector('.est-part-line-total')?.value);
                });
            }
            const estimatedServiceTotal = getEstimateJobsTotal() + normalizeAmount(estExtraFeeInput?.value);

            // Apply estimate values to invoice form
            vehicleSelect.value = selectedVehicleId;
            onVehicleChange();
            serviceFeeInput.value = estimatedServiceTotal.toFixed(2);

            // Mirror estimated parts into actual invoice part rows.
            partsRowsBody.innerHTML = `
                <tr class="text-muted" id="noPartsRow">
                    <td colspan="5" class="text-center py-3">No parts added</td>
                </tr>
            `;
            if (estPartsRowsBody) {
                const estRows = estPartsRowsBody.querySelectorAll('tr.est-part-row');
                estRows.forEach(estRow => {
                    addPartRow();
                    const newRow = partsRowsBody.querySelector('tr.part-row:last-child');
                    if (!newRow) return;

                    const estPartId = estRow.querySelector('.est-part-select')?.value;
                    const estQty = estRow.querySelector('.est-part-qty')?.value || '1';

                    const newPartSelect = newRow.querySelector('.part-select');
                    const newQtyInput = newRow.querySelector('.part-qty');
                    if (newPartSelect && estPartId) {
                        newPartSelect.value = estPartId;
                    }
                    if (newQtyInput) {
                        newQtyInput.value = estQty;
                    }
                });
            }

            partsFeeInput.value = estimatedPartsTotal.toFixed(2);
            const jobSummary = getEstimateJobSummary();
            if (jobSummary) {
                serviceDescInput.value = jobSummary;
            }
            recalculateTotals();

            const estimateModal = bootstrap.Modal.getInstance(document.getElementById('estimateInvoiceModal'));
            if (estimateModal) estimateModal.hide();

            const createModal = new bootstrap.Modal(document.getElementById('createInvoiceModal'));
            createModal.show();
        });
    }

    window.setInvoiceStatus = async (invoiceId, status, paidAmount) => {
        const invoice = invoices.find(inv => inv.invoice_id === invoiceId);
        if (!invoice) {
            alert('Invoice not found');
            return;
        }

        if (invoice.status === status) {
            alert(`Invoice is already ${status}`);
            return;
        }

        const confirmed = confirm(`Set invoice ${invoice.invoice_no} as ${status}?`);
        if (!confirmed) return;

        try {
            const response = await fetch(`http://localhost:3000/api/invoices/${invoiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paid_amount: normalizeAmount(paidAmount),
                    status: status
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert('Failed to update invoice: ' + (error.error || 'Unknown error'));
                return;
            }

            alert(`Invoice status updated to ${status}!`);
            loadInvoices(); // Reload from database
        } catch (error) {
            console.error('Error updating invoice:', error);
            alert('Error connecting to server: ' + error.message);
        }
    };

    window.viewPaperInvoice = (invoiceId) => {
        const data = invoices.find(inv => inv.invoice_id === invoiceId);
        if (!data) {
            alert('Invoice not found');
            return;
        }

        const total = normalizeAmount(data.total_amount);
        const serviceFee = normalizeAmount(data.service_fee);
        const partsFee = normalizeAmount(data.parts_fee);
        const customerName = data.customer_name || `Customer #${data.customer_id}`;
        const vehicleLabel = data.plate_no
            ? `${data.plate_no}${data.brand ? ` (${data.brand} ${data.model || ''})` : ''}`
            : `Vehicle #${data.vehicle_id}`;

        document.getElementById('p-invID').innerText = '#' + data.invoice_no;
        document.getElementById('p-customer').innerText = customerName;
        document.getElementById('p-vehicle').innerText = 'Vehicle: ' + vehicleLabel;
        document.getElementById('p-date').innerText = 'Date: ' + (data.created_at ? new Date(data.created_at).toLocaleString() : '-');
        document.getElementById('p-subtotal').innerText = 'Rs.' + total.toFixed(2);
        document.getElementById('p-total').innerText = 'Rs.' + total.toFixed(2);
        document.getElementById('p-paid').innerText = 'Rs.' + normalizeAmount(data.paid_amount).toFixed(2);
        document.getElementById('p-balance').innerText = 'Rs.' + normalizeAmount(data.balance).toFixed(2);

        let serviceLine = '';
        if (serviceFee > 0) {
            serviceLine = `<tr><td>Service Fee</td><td class="text-end">Rs.${serviceFee.toFixed(2)}</td></tr>`;
        }
        
        let descLine = '';
        if (data.description) {
            descLine = `<tr class="text-muted"><td><small>${data.description}</small></td><td></td></tr>`;
        }
        
        let partLine = '';
        if (partsFee > 0) {
            partLine = `<tr><td>Parts Fee</td><td class="text-end">Rs.${partsFee.toFixed(2)}</td></tr>`;
        }
        

        document.getElementById('p-items').innerHTML = serviceLine + partLine + descLine;
        new bootstrap.Modal(document.getElementById('printPreviewModal')).show();
    };

    // Initialize
    loadInvoices();
    loadReferenceData();
    recalculateTotals();
    addEstimateNoJobsRowIfNeeded();
    updateEstimateTotal();
});
