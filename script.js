
let map = L.map('map').setView([30.7333, 76.7794], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let currentRoute;
let startMarker;
let endMarker;

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
      console.log("Client-side Data:", data);

      if (currentRoute) {
        map.removeLayer(currentRoute);
      }
      if (startMarker) {
        map.removeLayer(startMarker);
      }
      if (endMarker) {
        map.removeLayer(endMarker);
      }

      if (data.path && data.path.length > 0) {
        const latlngs = data.path.map(point => [point.lat, point.lng]);

        if (latlngs.length > 1) {
          currentRoute = L.polyline(latlngs, { color: 'blue', weight: 4 }).addTo(map);
          map.fitBounds(currentRoute.getBounds());

          startMarker = L.marker(latlngs[0]).addTo(map).bindPopup("Start");
          endMarker = L.marker(latlngs[latlngs.length - 1]).addTo(map).bindPopup("End");
        } else if (latlngs.length === 1) {
          startMarker = L.marker(latlngs[0]).addTo(map).bindPopup("User Location");
          map.setView(latlngs[0], 15);
        }
      } else {
        document.getElementById('info').innerHTML = "<p>No route found.</p>";
        // Removed undefined 'users' reference to avoid errors
        // Optionally, set map view to default location
        map.setView([30.7333, 76.7794], 13);
      }

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
      document.getElementById('info').innerHTML = "<p>Error fetching ride. Please check console.</p>";
      alert("Error fetching ride. Please check the console for details.");
    });
}