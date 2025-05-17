let map = L.map('map').setView([30.7333, 76.7794], 13);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentRoute; // To keep reference of current polyline

function findRide() {
  const userId = document.getElementById('userId').value;

  if (!userId || userId < 1 || userId > 10) {
    alert('Please enter a valid User ID between 1 and 10.');
    return;
  }

  fetch(`http://127.0.0.1:3000/api/ride/${userId}`)
    .then(response => {
      if (!response.ok) throw new Error("User or route not found.");
      return response.json();
    })
    .then(data => {
      // Clear previous route if exists
      if (currentRoute) {
        map.removeLayer(currentRoute);
      }

      // Set map view to first point
      if (data.path && data.path.length > 0) {
        const latlngs = data.path.map(point => [point.lat, point.lng]);

        // Draw route on map
        currentRoute = L.polyline(latlngs, { color: 'blue', weight: 4 }).addTo(map);
        map.fitBounds(currentRoute.getBounds());
      }

      // Show ride info
      document.getElementById('info').innerHTML = `
        <h3>Ride Details</h3>
        <p><strong>Driver Name:</strong> ${data.driverName}</p>
        <p><strong>ETA:</strong> ${data.eta} minutes</p>
        <p><strong>Duration:</strong> ${data.duration} minutes</p>
        <p><strong>Distance:</strong> ${data.distance} km</p>
        <p><strong>Fare:</strong> ₹${data.fare}</p>
      `;
    })
    .catch(err => {
      console.error(err);
      alert("Error fetching ride. Please check the console for details.");
    });
}
