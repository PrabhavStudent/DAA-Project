const axios = require('axios');

const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your actual API key

async function getTrafficData(originLat, originLng, destLat, destLng) {
  // Replace with your actual Google Maps Directions API endpoint
  const trafficApiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${apiKey}&departure_time=now`;
  try {
    const response = await axios.get(trafficApiUrl);
    const route = response.data.routes[0];
    if (route && route.legs && route.legs[0]) {
      const leg = route.legs[0];
      const duration_in_traffic = leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value;

      return {
        duration_in_traffic,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching traffic data:", error);
    return null;
  }
}

async function dijkstraWithTraffic(graph, start, end, nodes) {
  const distances = {};
  const prev = {};
  const pq = new Set(Object.keys(graph));

  for (let node in graph) {
    distances[node] = Infinity;
    prev[node] = null;
    pq.add(node);
  }
  distances[start] = 0;

  while (pq.size > 0) {
    let minNode = null;
    for (let node of pq) {
      if (minNode === null || distances[node] < distances[minNode]) {
        minNode = node;
      }
    }

    if (minNode === end) break;

    pq.delete(minNode);

    for (let neighbor in graph[minNode]) {
      let alt = distances[minNode] + graph[minNode][neighbor];

      // Fetch traffic data and adjust 'alt'
      if (nodes[minNode] && nodes[neighbor]) {
        try {
          const traffic = await getTrafficData(
            nodes[minNode].lat,
            nodes[minNode].lng,
            nodes[neighbor].lat,
            nodes[neighbor].lng
          );
          if (traffic && traffic.duration_in_traffic) {
            alt += (traffic.duration_in_traffic / 60) || 0; // Use duration_in_traffic
          }
        } catch (trafficError) {
          console.error("Traffic API error:", trafficError);
          //  Handle the error gracefully - e.g., don't add traffic data
        }
      }

      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        prev[neighbor] = minNode;
      }
    }
  }

  const path = [];
  let u = end;
  while (prev[u]) {
    path.unshift(u);
    u = prev[u];
  }
  if (u === start) path.unshift(start);
  return path;
}

module.exports = dijkstraWithTraffic;