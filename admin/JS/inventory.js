document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.getElementById('inventoryTableBody');
    const inventoryForm = document.getElementById('inventoryForm');

    // 1. Load Data
    function loadInventory() {
        fetch('http://localhost:3000/inventory')
            .then(res => res.json())
            .then(data => renderInventory(data))
            .catch(err => {
                console.error("Fetch error:", err);
                tableBody.innerHTML = '<tr><td colspan="7">Server Error. Make sure Node.js is running.</td></tr>';
            });
    }

    // 2. Render Table & Stats
    function renderInventory(data) {
        tableBody.innerHTML = '';
        let lowStockCount = 0;
        let totalValue = 0;

        data.forEach((item) => {
            const price = parseFloat(item.price) || 0;
            const qty = parseInt(item.qty) || 0;
            totalValue += (price * qty);
            if (qty < 10) lowStockCount++;

            let statusBadge = qty <= 0 ? '<span class="badge bg-dark">Out of Stock</span>' : 
                              qty < 10 ? '<span class="badge bg-danger">Low Stock</span>' : 
                              '<span class="badge bg-success">In Stock</span>';

            tableBody.innerHTML += `
                <tr>
                    <td class="fw-bold">${item.part_id}</td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>Rs.${price.toFixed(2)}</td>
                    <td class="fw-bold">${qty}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-success" onclick="adjustStock(${item.id}, 1, event)">+</button>
                        <button class="btn btn-sm btn-outline-warning" onclick="adjustStock('${item.id}, -1, event)">-</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        });

        // Update Stats (MAKE SURE THESE IDS EXIST IN HTML)
        if(document.getElementById('totalItems')) document.getElementById('totalItems').innerText = data.length;
        if(document.getElementById('lowStockCount')) document.getElementById('lowStockCount').innerText = lowStockCount;
        if(document.getElementById('totalValue')) {
            document.getElementById('totalValue').innerText = 'Rs.' + totalValue.toLocaleString(undefined, {minimumFractionDigits: 2});
        }
    }

    // 3. Save New Item
    inventoryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newItem = {
            part_id: 'PRT-' + Math.floor(1000 + Math.random() * 9000),
            name: document.getElementById('pName').value,
            category: document.getElementById('pCategory').value,
            price: parseFloat(document.getElementById('pPrice').value),
            qty: parseInt(document.getElementById('pQty').value)
        };

        fetch('http://localhost:3000/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        }).then(() => {
            loadInventory();
            bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
            inventoryForm.reset();
        });
    });

   // 4. Adjust Stock (GLOBAL)
window.adjustStock = function(dbId, change, event) {

    const row = event.target.closest('tr');
    const qtyCell = row.querySelector('td:nth-child(5)');

    let currentQty = parseInt(qtyCell.innerText);
    let newQty = currentQty + change;

    console.log("Updating ID:", dbId, "New Qty:", newQty);

    if (newQty < 0) return;


    // Update UI instantly
    qtyCell.innerText = newQty;

    fetch(`http://localhost:3000/inventory/${dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty: newQty })
    })
    .then(res => res.json())
    .then(() => loadInventory())
    .catch(err => {
        console.error(err);
        loadInventory();
    });
};
    

    // 5. Delete Item (GLOBAL - YOU WERE MISSING THIS)
    window.deleteItem = function(dbId) {
        if (!confirm("Are you sure you want to delete this?")) return;
        
        fetch(`http://localhost:3000/inventory/${dbId}`, {
            method: 'DELETE'
        })
        .then(() => loadInventory())
        .catch(err => console.error("Delete error:", err));
    };

    loadInventory();
});