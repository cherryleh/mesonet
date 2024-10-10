// Original date string
let isoDate = '2024-10-01T12:00:00-10:00';

// Create a Date object from the ISO string
let dateObj = new Date(isoDate);

// Format the date parts (YYYY-MM-DD)
let year = dateObj.getFullYear();
let month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are zero-based
let day = String(dateObj.getDate()).padStart(2, '0');

// Format the time parts (HH:MM)
let hours = String(dateObj.getHours()).padStart(2, '0');
let minutes = String(dateObj.getMinutes()).padStart(2, '0');

// Combine the parts into your desired format
let formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;

console.log(formattedDate);  // Output: "2024-10-01 12:00"
