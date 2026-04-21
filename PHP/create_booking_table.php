<?php
// Create booking_requests table if it doesn't exist
include "connect.php";

$sql = "CREATE TABLE IF NOT EXISTS booking_requests (
    booking_request_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    plate_no VARCHAR(20),
    service_date DATE,
    service_type VARCHAR(100),
    description TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date DATETIME,
    rejected_date DATETIME,
    rejection_reason TEXT,
    service_id INT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if (mysqli_query($conn, $sql)) {
    echo json_encode(['success' => true, 'message' => 'booking_requests table created successfully!']);
} else {
    echo json_encode(['success' => false, 'error' => mysqli_error($conn)]);
}

mysqli_close($conn);
?>
