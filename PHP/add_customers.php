<?php

include "connect.php";

$name = $_POST['name'];
$phone = $_POST['phone'];
$email = $_POST['email'];
$address = $_POST['address'];

$sql = "INSERT INTO customers(name,phone,email,address)
VALUES('$name','$phone','$email','$address')";

mysqli_query($conn,$sql);

header("Location: customers.html");

?>