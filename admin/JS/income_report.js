async function loadIncomeReport() {
    const selectedMonth = document.getElementById('reportMonth').value;
    const res = await fetch(`http://localhost:3000/reports/income/${selectedMonth}`);
    const data = await res.json();

    let totalRev = 0, laborTotal = 0, partsTotal = 0, pendingTotal = 0;
    let tableHtml = '';
    
    // For Charts
    const dailyData = {};
    const serviceData = {};

    data.forEach(inv => {
        const total = parseFloat(inv.total_amount);
        const labor = parseFloat(inv.service_fee);
        const parts = parseFloat(inv.parts_fee);

        // Calculate Totals
        totalRev += total;
        laborTotal += labor;
        partsTotal += parts;
        if (inv.status === 'Pending') pendingTotal += total;

        // Group by Day for Line Chart
        dailyData[inv.day] = (dailyData[inv.day] || 0) + total;

        // Build Table
        tableHtml += `
            <tr>
                <td>${new Date(inv.created_at).toLocaleDateString()}</td>
                <td class="fw-bold">${inv.invoice_no}</td>
                <td>${inv.full_name}</td>
                <td>Rs.${labor.toFixed(2)}</td>
                <td>Rs.${parts.toFixed(2)}</td>
                <td class="text-primary fw-bold">Rs.${total.toFixed(2)}</td>
                <td><span class="badge ${inv.status === 'Paid' ? 'bg-success' : 'bg-warning'}">${inv.status}</span></td>
            </tr>
        `;
    });

    // Update KPI Cards
    document.getElementById('totalRevenue').innerText = `Rs. ${totalRev.toLocaleString()}`;
    document.getElementById('laborIncome').innerText = `Rs. ${laborTotal.toLocaleString()}`;
    document.getElementById('partsIncome').innerText = `Rs. ${partsTotal.toLocaleString()}`;
    document.getElementById('pendingIncome').innerText = `Rs. ${pendingTotal.toLocaleString()}`;
    document.getElementById('incomeTableBody').innerHTML = tableHtml;

    renderCharts(dailyData);
}

function renderCharts(dailyData) {
    // Logic for Daily Revenue Line Chart
    const ctx = document.getElementById('dailyIncomeChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(dailyData),
            datasets: [{
                label: 'Revenue (Rs)',
                data: Object.values(dailyData),
                borderColor: '#198754',
                tension: 0.3,
                fill: true,
                backgroundColor: 'rgba(25, 135, 84, 0.1)'
            }]
        }
    });
}