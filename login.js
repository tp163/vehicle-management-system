function setLoginType(type) {
    const title = document.getElementById('loginTitle');
    title.innerText = type + " Login";
    document.getElementById('loginForm').dataset.type = type;
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const type = this.dataset.type || "Customer"; 
    const emailInput = this.querySelector('input[type="email"]').value;
    const passwordInput = this.querySelector('input[type="password"]').value;

    if(type === "Admin") {
        // Admin logic stays the same
        if (emailInput === "admin@vsms.com" && passwordInput === "admin123") {
            window.location.href = "admin/HTML/dashboard.html"; 
        } else {
            alert("Invalid Admin Credentials!");
        }
    } 
    else {
        // --- REAL CUSTOMER LOGIN LOGIC ---
        
        // 1. Get the list of customers created by the Admin
        const savedCustomers = JSON.parse(localStorage.getItem('vsms_customers')) || [];

        // 2. Find a customer with the matching email
        const customer = savedCustomers.find(c => c.email === emailInput);

        if (customer) {
            // 3. Check password 
            // (Note: If you haven't added a password field yet, we use their phone number as the default password)
            const correctPassword = customer.password || customer.phone; 

            if (passwordInput === correctPassword) {
                alert("Login Successful! Welcome " + customer.name);
                
                // 4. Save the ENTIRE customer object so the dashboard knows who is logged in
                localStorage.setItem('currentUser', JSON.stringify(customer));
                
                window.location.href = "customer/customer-dashboard.html";
            } else {
                alert("Incorrect password. (Hint: Use your registered phone number)");
            }
        } else {
            alert("Email not found. Please contact the service center to register.");
        }
    }
});