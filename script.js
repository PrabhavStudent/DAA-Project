let map;
let directionsService;
let directionsRenderer;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 30.7333, lng: 76.7794 },
    zoom: 13,
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map: map });
}

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

      if (directionsRenderer) {
        directionsRenderer.set('directions', null);
      }

      if (data.path && data.path.length > 1) {
        const start = data.path[0];
        const end = data.path[data.path.length - 1];

        const request = {
          origin: { lat: start.lat, lng: start.lng },
          destination: { lat: end.lat, lng: end.lng },
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        };

        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
          } else {
            alert('Could not display directions due to: ' + status);
          }
        });
      } else if (data.path && data.path.length === 1) {
        map.setCenter({ lat: data.path[0].lat, lng: data.path[0].lng });
        map.setZoom(15);
      } else {
        map.setCenter({ lat: 30.7333, lng: 76.7794 });
        map.setZoom(13);
        document.getElementById('info').innerHTML = "<p>No route found.</p>";
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
