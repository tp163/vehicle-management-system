document.addEventListener('DOMContentLoaded', function () {
    const reportTypeSelect = document.getElementById('reportType');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const generateBtn = document.getElementById('generateReportBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const vehicleFilterWrap = document.getElementById('vehicleFilterWrap');
    const reportVehicleSelect = document.getElementById('reportVehicle');
    const printVehicleReportBtn = document.getElementById('printVehicleReportBtn');
    const printIncomeReportBtn = document.getElementById('printIncomeReportBtn');
    const printInventoryReportBtn = document.getElementById('printInventoryReportBtn');

    const kpi1Label = document.getElementById('kpi1Label');
    const kpi1Value = document.getElementById('kpi1Value');
    const kpi1Meta = document.getElementById('kpi1Meta');
    const kpi2Label = document.getElementById('kpi2Label');
    const kpi2Value = document.getElementById('kpi2Value');
    const kpi2Meta = document.getElementById('kpi2Meta');
    const kpi3Label = document.getElementById('kpi3Label');
    const kpi3Value = document.getElementById('kpi3Value');
    const kpi3Meta = document.getElementById('kpi3Meta');
    const kpi4Label = document.getElementById('kpi4Label');
    const kpi4Value = document.getElementById('kpi4Value');
    const kpi4Meta = document.getElementById('kpi4Meta');

    const chart1Title = document.getElementById('chart1Title');
    const chart2Title = document.getElementById('chart2Title');
    const detailsTitle = document.getElementById('detailsTitle');
    const detailsHead = document.getElementById('detailsHead');
    const detailsBody = document.getElementById('detailsBody');

    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    const ctxService = document.getElementById('serviceChart').getContext('2d');

    let chart1 = null;
    let chart2 = null;
    let services = [];
    let vehicles = [];
    let inventory = [];
    let customers = [];
    let invoices = [];

    function currency(value) {
        return `Rs.${(Number(value) || 0).toFixed(2)}`;
    }

    function parseDate(value) {
        if (!value) return null;
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function inDateRange(value, fromDate, toDate) {
        const current = parseDate(value);
        if (!current) return false;
        const from = parseDate(fromDate);
        const to = parseDate(toDate);
        if (!from || !to) return true;

        const currentDay = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
        const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
        const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
        return currentDay >= fromDay && currentDay <= toDay;
    }

    function mapCount(items, keyGetter) {
        const map = {};
        items.forEach(item => {
            const key = keyGetter(item) || 'Unknown';
            map[key] = (map[key] || 0) + 1;
        });
        return map;
    }

    function getIncomeRows(fromDate, toDate) {
        const serviceByJob = {};
        services.forEach(svc => {
            if (svc.job_no) serviceByJob[svc.job_no] = svc;
        });

        const filteredInvoices = invoices.filter(inv => inDateRange(inv.date, fromDate, toDate));
        if (filteredInvoices.length > 0) {
            return filteredInvoices.map(inv => {
                const total = (Number(inv.sFee) || 0) + (Number(inv.pFee) || 0);
                const service = serviceByJob[inv.job_no] || null;
                return {
                    id: inv.id,
                    date: inv.date,
                    customer: inv.customer,
                    plate: inv.plate,
                    service_type: service?.service_type || inv.desc || 'General Service',
                    total,
                    paid: Number(inv.paid_amount || 0),
                    balance: Number(inv.balance || 0),
                    status: inv.status || 'Pending'
                };
            });
        }

        return services.filter(svc => inDateRange(svc.service_date, fromDate, toDate)).map(svc => ({
            id: svc.job_no,
            date: svc.service_date,
            customer: 'N/A',
            plate: svc.plate_no || 'N/A',
            service_type: svc.service_type || 'General Service',
            total: Number(svc.cost) || 0,
            paid: Number(svc.cost) || 0,
            balance: 0,
            status: 'Paid'
        }));
    }

    function generateReportId() {
        return `VSR-${Date.now().toString().slice(-8)}`;
    }

    function getVehicleLabel(vehicle) {
        return vehicle ? `${vehicle.plate_no} - ${vehicle.owner_name || 'Unknown Owner'}` : '-';
    }

    function populateVehicleFilter() {
        if (!reportVehicleSelect) return;
        const current = reportVehicleSelect.value;
        reportVehicleSelect.innerHTML = '<option value="" selected disabled>Select Vehicle</option>';
        vehicles.forEach(vehicle => {
            const option = document.createElement('option');
            option.value = String(vehicle.vehicle_id);
            option.textContent = getVehicleLabel(vehicle);
            reportVehicleSelect.appendChild(option);
        });

        if (current && vehicles.some(v => String(v.vehicle_id) === current)) {
            reportVehicleSelect.value = current;
        }
    }

    function toggleVehicleFilter() {
        const isVehicleReport = reportTypeSelect.value === 'Vehicle Service Report';
        if (!vehicleFilterWrap) return;
        vehicleFilterWrap.classList.toggle('d-none', !isVehicleReport);
    }

    function updateChart(target, config) {
        if (target === 'chart1' && chart1) chart1.destroy();
        if (target === 'chart2' && chart2) chart2.destroy();

        const chart = new Chart(target === 'chart1' ? ctxRevenue : ctxService, config);
        if (target === 'chart1') chart1 = chart;
        if (target === 'chart2') chart2 = chart;
    }

    function setKpis(k1, k2, k3, k4) {
        kpi1Label.textContent = k1.label;
        kpi1Value.textContent = k1.value;
        kpi1Meta.textContent = k1.meta;
        kpi2Label.textContent = k2.label;
        kpi2Value.textContent = k2.value;
        kpi2Meta.textContent = k2.meta;
        kpi3Label.textContent = k3.label;
        kpi3Value.textContent = k3.value;
        kpi3Meta.textContent = k3.meta;
        kpi4Label.textContent = k4.label;
        kpi4Value.textContent = k4.value;
        kpi4Meta.textContent = k4.meta;
    }

    function renderDetails(columns, rows) {
        detailsHead.innerHTML = `<tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>`;

        if (rows.length === 0) {
            detailsBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No data for selected range</td></tr>';
            return;
        }

        detailsBody.innerHTML = rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');
    }

    function generateIncomeReport(fromDate, toDate) {
        const incomeRows = getIncomeRows(fromDate, toDate);

        const totalRevenue = incomeRows.reduce((sum, row) => sum + row.total, 0);
        const totalPaid = incomeRows.reduce((sum, row) => sum + row.paid, 0);
        const totalBalance = incomeRows.reduce((sum, row) => sum + row.balance, 0);
        const avgInvoice = incomeRows.length ? totalRevenue / incomeRows.length : 0;

        setKpis(
            { label: 'TOTAL REVENUE', value: currency(totalRevenue), meta: 'Within selected date range' },
            { label: 'COLLECTED AMOUNT', value: currency(totalPaid), meta: `${incomeRows.length} invoices/jobs included` },
            { label: 'AVG. INVOICE VALUE', value: currency(avgInvoice), meta: 'Average gross per invoice' },
            { label: 'OUTSTANDING BALANCE', value: currency(totalBalance), meta: 'Pending customer payments' }
        );

        chart1Title.textContent = 'Daily Revenue Trend';
        const dayMap = {};
        incomeRows.forEach(row => {
            const key = parseDate(row.date)?.toISOString().split('T')[0] || 'Unknown';
            dayMap[key] = (dayMap[key] || 0) + row.total;
        });

        updateChart('chart1', {
            type: 'line',
            data: {
                labels: Object.keys(dayMap),
                datasets: [{
                    label: 'Revenue (Rs)',
                    data: Object.values(dayMap),
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13,110,253,0.15)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        chart2Title.textContent = 'Payment Status Split';
        const statusMap = mapCount(incomeRows, row => row.status);
        updateChart('chart2', {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusMap),
                datasets: [{
                    data: Object.values(statusMap),
                    backgroundColor: ['#198754', '#ffc107', '#dc3545', '#0d6efd']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        detailsTitle.textContent = 'Income Report Details';
        renderDetails(
            ['Invoice/Job', 'Date', 'Customer', 'Vehicle', 'Total', 'Paid', 'Balance', 'Status'],
            incomeRows.map(row => [
                row.id,
                (parseDate(row.date)?.toISOString().split('T')[0]) || '-',
                row.customer || '-',
                row.plate || '-',
                currency(row.total),
                currency(row.paid),
                currency(row.balance),
                row.status
            ])
        );
    }

    function generateIncomePrintableReport(fromDate, toDate) {
        const incomeRows = getIncomeRows(fromDate, toDate);
        if (incomeRows.length === 0) {
            alert('No income data found for the selected date range.');
            return;
        }

        const totalRevenue = incomeRows.reduce((sum, row) => sum + row.total, 0);
        const totalServices = incomeRows.length;
        const avgInvoice = totalServices ? totalRevenue / totalServices : 0;

        const serviceRevenue = {};
        incomeRows.forEach(row => {
            const key = row.service_type || 'General Service';
            serviceRevenue[key] = (serviceRevenue[key] || 0) + row.total;
        });

        const topService = Object.keys(serviceRevenue).sort((a, b) => serviceRevenue[b] - serviceRevenue[a])[0] || 'N/A';

        const weekly = [0, 0, 0, 0];
        incomeRows.forEach(row => {
            const day = parseDate(row.date)?.getDate() || 1;
            const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
            weekly[weekIndex] += row.total;
        });

        const monthText = parseDate(fromDate)?.toLocaleString('en-US', { month: 'long', year: 'numeric' }) || '-';
        document.getElementById('irMonth').textContent = monthText;
        document.getElementById('irGeneratedDate').textContent = new Date().toISOString().split('T')[0];

        document.getElementById('irTotalRevenue').textContent = currency(totalRevenue);
        document.getElementById('irTotalServices').textContent = String(totalServices);
        document.getElementById('irAvgInvoice').textContent = currency(avgInvoice);
        document.getElementById('irTopService').textContent = topService;

        const revenueBody = document.getElementById('irRevenueBreakdownBody');
        revenueBody.innerHTML = incomeRows.map(row => `
            <tr>
                <td>${(parseDate(row.date)?.toISOString().split('T')[0]) || '-'}</td>
                <td>${row.id || '-'}</td>
                <td>${row.customer || '-'}</td>
                <td>${row.service_type || '-'}</td>
                <td>${currency(row.total)}</td>
            </tr>
        `).join('');

        document.getElementById('irWeek1').textContent = currency(weekly[0]);
        document.getElementById('irWeek2').textContent = currency(weekly[1]);
        document.getElementById('irWeek3').textContent = currency(weekly[2]);
        document.getElementById('irWeek4').textContent = currency(weekly[3]);
        document.getElementById('irWeekTotal').textContent = currency(weekly.reduce((sum, value) => sum + value, 0));

        const distributionBody = document.getElementById('irServiceDistributionBody');
        distributionBody.innerHTML = Object.keys(serviceRevenue).map(serviceType => {
            const revenue = serviceRevenue[serviceType];
            const percentage = totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(2) : '0.00';
            return `
                <tr>
                    <td>${serviceType}</td>
                    <td>${currency(revenue)}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }).join('');

        const analysisText = `Revenue for ${monthText} reached ${currency(totalRevenue)} across ${totalServices} completed billing entries. ` +
            `${topService} was the top earning service, while weekly performance indicates a peak in the highest-value week. ` +
            `Use this trend to optimize staffing and promotions during lower revenue weeks.`;
        document.getElementById('irAnalysisText').textContent = analysisText;
        document.getElementById('irPreparedBy').textContent = 'System User';

        const modal = new bootstrap.Modal(document.getElementById('incomeReportPreviewModal'));
        modal.show();
    }

    function generateServiceReport(fromDate, toDate) {
        const filtered = services.filter(svc => inDateRange(svc.service_date, fromDate, toDate));
        const completed = filtered.filter(svc => svc.status === 'Ready').length;
        const pending = filtered.filter(svc => svc.status !== 'Ready').length;
        const avgCost = filtered.length
            ? filtered.reduce((sum, svc) => sum + (Number(svc.cost) || 0), 0) / filtered.length
            : 0;

        const typeMap = mapCount(filtered, svc => svc.service_type);
        const topType = Object.keys(typeMap).sort((a, b) => typeMap[b] - typeMap[a])[0] || 'N/A';

        setKpis(
            { label: 'TOTAL JOBS', value: String(filtered.length), meta: 'Services opened in selected range' },
            { label: 'COMPLETED JOBS', value: String(completed), meta: `${pending} still active/pending` },
            { label: 'AVG. SERVICE COST', value: currency(avgCost), meta: 'Based on job cost values' },
            { label: 'TOP SERVICE TYPE', value: topType, meta: `${typeMap[topType] || 0} jobs` }
        );

        chart1Title.textContent = 'Service Type Frequency';
        updateChart('chart1', {
            type: 'bar',
            data: {
                labels: Object.keys(typeMap),
                datasets: [{
                    label: 'Jobs',
                    data: Object.values(typeMap),
                    backgroundColor: '#0d6efd'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        chart2Title.textContent = 'Job Status Distribution';
        const statusMap = mapCount(filtered, svc => svc.status);
        updateChart('chart2', {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusMap),
                datasets: [{
                    data: Object.values(statusMap),
                    backgroundColor: ['#20c997', '#ffc107', '#0d6efd', '#dc3545']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        detailsTitle.textContent = 'Vehicle Service Report Details';
        renderDetails(
            ['Job No', 'Date', 'Vehicle', 'Service', 'Mechanic', 'Status', 'Cost'],
            filtered.map(svc => [
                svc.job_no || '-',
                (parseDate(svc.service_date)?.toISOString().split('T')[0]) || '-',
                svc.plate_no || '-',
                svc.service_type || '-',
                svc.mechanic_name || '-',
                svc.status || '-',
                currency(svc.cost)
            ])
        );
    }

    function generateInventoryReport() {
        const rows = inventory.map(item => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.price) || 0;
            return {
                part_id: item.part_id,
                name: item.name,
                category: item.category || 'Other',
                qty,
                price,
                value: qty * price,
                status: qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock'
            };
        });

        const totalValue = rows.reduce((sum, item) => sum + item.value, 0);
        const lowStockCount = rows.filter(item => item.qty <= 5).length;
        const topValueItem = rows.slice().sort((a, b) => b.value - a.value)[0];

        setKpis(
            { label: 'TOTAL PART TYPES', value: String(rows.length), meta: 'Current inventory records' },
            { label: 'LOW STOCK ITEMS', value: String(lowStockCount), meta: 'Qty <= 5 requires reorder' },
            { label: 'TOTAL STOCK VALUE', value: currency(totalValue), meta: 'Qty x unit price' },
            { label: 'TOP VALUE ITEM', value: topValueItem ? topValueItem.name : 'N/A', meta: topValueItem ? currency(topValueItem.value) : '-' }
        );

        chart1Title.textContent = 'Top 8 Items by Stock Value';
        const topItems = rows.slice().sort((a, b) => b.value - a.value).slice(0, 8);
        updateChart('chart1', {
            type: 'bar',
            data: {
                labels: topItems.map(item => item.name),
                datasets: [{
                    label: 'Value (Rs)',
                    data: topItems.map(item => item.value),
                    backgroundColor: '#198754'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        chart2Title.textContent = 'Inventory Category Split';
        const categoryMap = mapCount(rows, item => item.category);
        updateChart('chart2', {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryMap),
                datasets: [{
                    data: Object.values(categoryMap),
                    backgroundColor: ['#0d6efd', '#6610f2', '#20c997', '#fd7e14', '#6c757d']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        detailsTitle.textContent = 'Inventory Report Details';
        renderDetails(
            ['Part ID', 'Part Name', 'Category', 'Unit Price', 'Qty', 'Stock Value', 'Status'],
            rows.map(item => [
                item.part_id || '-',
                item.name || '-',
                item.category || '-',
                currency(item.price),
                item.qty,
                currency(item.value),
                item.status
            ])
        );
    }

    function generateInventoryPrintableReport(fromDate, toDate) {
        const rows = inventory.map(item => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.price) || 0;
            return {
                name: item.name || 'Unknown Item',
                category: item.category || 'Other',
                qty,
                price,
                value: qty * price,
                part_id: item.part_id || ''
            };
        });

        const totalItems = rows.length;
        const totalValue = rows.reduce((sum, item) => sum + item.value, 0);
        const lowStock = rows.filter(item => item.qty > 0 && item.qty <= 5).length;
        const outOfStock = rows.filter(item => item.qty === 0).length;

        const usageMap = {};
        const filteredInvoices = invoices.filter(inv => inDateRange(inv.date, fromDate, toDate));
        filteredInvoices.forEach(inv => {
            (inv.parts || []).forEach(part => {
                const key = part.part_name || part.part_id || 'Unknown Item';
                if (!usageMap[key]) usageMap[key] = 0;
                usageMap[key] += Number(part.qty) || 0;
            });
        });

        const topConsumed = Object.keys(usageMap)
            .map(name => ({ name, used: usageMap[name] }))
            .sort((a, b) => b.used - a.used)
            .slice(0, 5);

        const mostUsedItem = topConsumed[0]?.name || 'N/A';

        document.getElementById('invReportId').textContent = `IR-${Date.now().toString().slice(-8)}`;
        document.getElementById('invMonth').textContent = parseDate(fromDate)?.toLocaleString('en-US', { month: 'long', year: 'numeric' }) || '-';
        document.getElementById('invGeneratedDate').textContent = new Date().toISOString().split('T')[0];

        document.getElementById('invSummaryItems').textContent = String(totalItems);
        document.getElementById('invSummaryValue').textContent = currency(totalValue);
        document.getElementById('invSummaryLow').textContent = String(lowStock);
        document.getElementById('invSummaryOut').textContent = String(outOfStock);
        document.getElementById('invSummaryMostUsed').textContent = mostUsedItem;

        const currentStatusBody = document.getElementById('invCurrentStatusBody');
        const topStatusRows = rows.slice().sort((a, b) => b.value - a.value).slice(0, 12);
        if (topStatusRows.length === 0) {
            currentStatusBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No inventory data available</td></tr>';
        } else {
            currentStatusBody.innerHTML = topStatusRows.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.qty}</td>
                    <td>${currency(item.price)}</td>
                    <td>${currency(item.value)}</td>
                </tr>
            `).join('');
        }

        const consumedBody = document.getElementById('invTopConsumedBody');
        const totalUsedQty = topConsumed.reduce((sum, item) => sum + item.used, 0);
        if (topConsumed.length === 0) {
            consumedBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No part usage found in selected period</td></tr>';
        } else {
            consumedBody.innerHTML = topConsumed.map(item => {
                const usagePct = totalUsedQty > 0 ? ((item.used / totalUsedQty) * 100).toFixed(2) : '0.00';
                return `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.used}</td>
                        <td>${usagePct}%</td>
                    </tr>
                `;
            }).join('');
        }

        document.getElementById('invPreparedBy').textContent = 'System User';
        document.getElementById('invAuthorizedOfficer').textContent = 'Store Manager';

        const modal = new bootstrap.Modal(document.getElementById('inventoryReportPreviewModal'));
        modal.show();
    }

    function generateVehicleServicePrintableReport(fromDate, toDate) {
        const selectedVehicleId = reportVehicleSelect.value;
        if (!selectedVehicleId) {
            alert('Please select a vehicle for Vehicle Service Report.');
            return;
        }

        const vehicle = vehicles.find(v => String(v.vehicle_id) === String(selectedVehicleId));
        if (!vehicle) {
            alert('Selected vehicle was not found.');
            return;
        }

        const customer = customers.find(c => String(c.customer_id) === String(vehicle.customer_id));
        const vehicleServices = services
            .filter(svc => String(svc.vehicle_id) === String(selectedVehicleId))
            .filter(svc => inDateRange(svc.service_date, fromDate, toDate));

        if (vehicleServices.length === 0) {
            alert('No service records found for the selected vehicle in this date range.');
            return;
        }

        const vehicleInvoices = invoices.filter(inv => {
            const matchesVehicle = String(inv.vehicle_id) === String(selectedVehicleId) || inv.plate === vehicle.plate_no;
            return matchesVehicle && inDateRange(inv.date, fromDate, toDate);
        });

        const partsAggregated = {};
        vehicleInvoices.forEach(inv => {
            (inv.parts || []).forEach(part => {
                const key = part.part_name || part.part_id || 'Unknown Item';
                if (!partsAggregated[key]) {
                    partsAggregated[key] = { name: key, qty: 0, cost: 0 };
                }
                partsAggregated[key].qty += Number(part.qty) || 0;
                partsAggregated[key].cost += Number(part.line_total) || 0;
            });
        });

        const partsRows = Object.values(partsAggregated);
        const partsTotal = partsRows.reduce((sum, item) => sum + item.cost, 0);
        const laborTotalFromInvoices = vehicleInvoices.reduce((sum, inv) => sum + (Number(inv.sFee) || 0), 0);
        const laborTotalFromServices = vehicleServices.reduce((sum, svc) => sum + (Number(svc.cost) || 0), 0);
        const laborCharges = laborTotalFromInvoices > 0 ? laborTotalFromInvoices : laborTotalFromServices;
        const grandTotal = laborCharges + partsTotal;

        document.getElementById('vrReportId').textContent = generateReportId();
        document.getElementById('vrDate').textContent = new Date().toISOString().split('T')[0];
        document.getElementById('vrCustomerName').textContent = customer?.full_name || vehicle.owner_name || 'N/A';
        document.getElementById('vrCustomerPhone').textContent = customer?.phone || 'N/A';
        document.getElementById('vrVehicleNo').textContent = vehicle.plate_no || 'N/A';
        document.getElementById('vrVehicleType').textContent = vehicle.vehicle_type || 'Car';
        document.getElementById('vrBrandModel').textContent = `${vehicle.brand || '-'} ${vehicle.model || '-'}`;
        document.getElementById('vrMileage').textContent = vehicle.mileage || 'N/A';

        const serviceBody = document.getElementById('vrServiceDetailsBody');
        serviceBody.innerHTML = vehicleServices.map(svc => `
            <tr>
                <td>${svc.service_type || '-'}</td>
                <td>${svc.status || '-'}</td>
                <td>${svc.mechanic_name ? `Handled by ${svc.mechanic_name}` : 'Completed service record'}</td>
            </tr>
        `).join('');

        const partsBody = document.getElementById('vrPartsBody');
        if (partsRows.length === 0) {
            partsBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No parts/consumables recorded</td></tr>';
        } else {
            partsBody.innerHTML = partsRows.map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.qty}</td>
                    <td>${currency(item.cost)}</td>
                </tr>
            `).join('');
        }

        document.getElementById('vrTotalParts').textContent = currency(partsTotal);
        document.getElementById('vrLaborCharges').textContent = currency(laborCharges);
        document.getElementById('vrSummaryLabor').textContent = currency(laborCharges);
        document.getElementById('vrSummaryParts').textContent = currency(partsTotal);
        document.getElementById('vrSummaryGrand').textContent = currency(grandTotal);
        document.getElementById('vrPreparedBy').textContent = 'System User';
        document.getElementById('vrAuthorizedOfficer').textContent = 'Service Manager';

        const modal = new bootstrap.Modal(document.getElementById('vehicleReportPreviewModal'));
        modal.show();
    }

    function generateReport() {
        const reportType = reportTypeSelect.value;
        const fromDate = fromDateInput.value;
        const toDate = toDateInput.value;

        if (reportType === 'Income Report') {
            generateIncomeReport(fromDate, toDate);
            return;
        }

        if (reportType === 'Vehicle Service Report') {
            generateServiceReport(fromDate, toDate);
            return;
        }

        generateInventoryReport();
    }

    async function loadDataAndGenerate(openPrintable) {
        try {
            const [servicesRes, vehiclesRes, inventoryRes, customersRes] = await Promise.all([
                fetch('http://localhost:3000/api/services'),
                fetch('http://localhost:3000/api/vehicles'),
                fetch('http://localhost:3000/inventory'),
                fetch('http://localhost:3000/customers')
            ]);

            if (!servicesRes.ok || !vehiclesRes.ok || !inventoryRes.ok || !customersRes.ok) {
                throw new Error('Failed to load report data from server');
            }

            services = await servicesRes.json();
            vehicles = await vehiclesRes.json();
            inventory = await inventoryRes.json();
            customers = await customersRes.json();
            invoices = JSON.parse(localStorage.getItem('vsms_invoices') || '[]');

            populateVehicleFilter();
            toggleVehicleFilter();

            generateReport();

            if (openPrintable && reportTypeSelect.value === 'Vehicle Service Report') {
                generateVehicleServicePrintableReport(fromDateInput.value, toDateInput.value);
            }

            if (openPrintable && reportTypeSelect.value === 'Income Report') {
                generateIncomePrintableReport(fromDateInput.value, toDateInput.value);
            }

            if (openPrintable && reportTypeSelect.value === 'Inventory Report') {
                generateInventoryPrintableReport(fromDateInput.value, toDateInput.value);
            }
        } catch (error) {
            console.error('Report load error:', error);
            alert('Unable to load report data. Ensure backend server is running.');
        }
    }

    function exportReportToPDF() {
        const isVehicleReport = reportTypeSelect.value === 'Vehicle Service Report';
        const isIncomeReport = reportTypeSelect.value === 'Income Report';
        const isInventoryReport = reportTypeSelect.value === 'Inventory Report';
        let element = document.querySelector('.main-content');
        if (isVehicleReport) element = document.getElementById('vehicleReportPaper');
        if (isIncomeReport) element = document.getElementById('incomeReportPaper');
        if (isInventoryReport) element = document.getElementById('inventoryReportPaper');

        // Hide only top-level action buttons during export.
        const buttonsToHide = [
            document.getElementById('generateReportBtn'),
            document.getElementById('exportPdfBtn'),
            document.getElementById('printVehicleReportBtn'),
            document.getElementById('printIncomeReportBtn'),
            document.getElementById('printInventoryReportBtn')
        ].filter(Boolean);
        buttonsToHide.forEach(btn => { btn.style.visibility = 'hidden'; });

        const opt = {
            margin: 0.5,
            filename: `VSMS_${reportTypeSelect.value.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf()
            .set(opt)
            .from(element)
            .save()
            .catch((error) => {
                console.error('PDF export failed:', error);
                alert('PDF export failed. Please try again.');
            })
            .finally(() => {
                buttonsToHide.forEach(btn => { btn.style.visibility = 'visible'; });
            });
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    fromDateInput.value = firstDay.toISOString().split('T')[0];
    toDateInput.value = today.toISOString().split('T')[0];

    generateBtn.addEventListener('click', () => loadDataAndGenerate(true));
    reportTypeSelect.addEventListener('change', () => loadDataAndGenerate(false));
    exportPdfBtn.addEventListener('click', exportReportToPDF);
    printVehicleReportBtn.addEventListener('click', () => {
        window.print();
    });
    printIncomeReportBtn.addEventListener('click', () => {
        window.print();
    });
    printInventoryReportBtn.addEventListener('click', () => {
        window.print();
    });

    loadDataAndGenerate(false);
});