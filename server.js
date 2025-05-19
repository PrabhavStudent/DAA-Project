
const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500']
}));
app.use(express.static(__dirname));

let users = [];
let drivers = [];
let graphData = { nodes: {}, edges: [] };

function loadCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', err => reject(err));
  });
}

function loadGraph() {
  const raw = fs.readFileSync(path.join(__dirname, 'graph.json'));
  graphData = JSON.parse(raw);
  const graph = {};

  graphData.edges.forEach(({ from, to, weight }) => {
    if (!graph[from]) graph[from] = {};
    if (!graph[to]) graph[to] = {};
    graph[from][to] = weight;
    graph[to][from] = weight;
  });

  return graph;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Math.PI / 180) * lat1) *
      Math.cos((Math.PI / 180) * lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function findNearestDriver(user, availableDrivers) {
  let nearestDriver = null;
  let minDistance = Infinity;

  for (let driver of availableDrivers) {
    let dist = calculateDistance(user.latitude, user.longitude, driver.latitude, driver.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestDriver = driver;
    }
  }
  return nearestDriver;
}

const dijkstraWithTraffic = require('./dijkstra');

async function calculateRoute(startLat, startLng, endLat, endLng, graph, nodes) {
  try {
    console.log("calculateRoute called with:", { startLat, startLng, endLat, endLng });

    let startNode = null;
    let minStartDistance = Infinity;
    const DISTANCE_THRESHOLD = 100.0;
    let potentialStartNodes = [];

    for (const nodeKey in nodes) {
      const node = nodes[nodeKey];
      const dist = calculateDistance(startLat, startLng, node.lat, node.lng);
      console.log(`  - Checking start node ${nodeKey} with distance: ${dist}`);
      if (dist <= minStartDistance && dist <= DISTANCE_THRESHOLD) {
        minStartDistance = dist;
        startNode = nodeKey;
        console.log(`    - New nearest start node: ${startNode}`);
      }
      if (dist <= DISTANCE_THRESHOLD) {
        potentialStartNodes.push({ nodeKey, dist });
      }
    }

    let endNode = null;
    let minEndDistance = Infinity;
    let potentialEndNodes = [];

    for (const nodeKey in nodes) {
      const node = nodes[nodeKey];
      const dist = calculateDistance(endLat, endLng, node.lat, node.lng);
      console.log(`  - Checking end node ${nodeKey} with distance: ${dist}`);
      if (dist <= minEndDistance && dist <= DISTANCE_THRESHOLD) {
        minEndDistance = dist;
        endNode = nodeKey;
        console.log(`    - New nearest end node: ${endNode}`);
      }
      if (dist <= DISTANCE_THRESHOLD) {
        potentialEndNodes.push({ nodeKey, dist });
      }
    }

    if (!startNode || !endNode) {
      console.warn("Warning: No suitable start or end nodes found. Adjusting threshold or check data.");
      return [];
    }

    if (startNode === endNode) {
        if (potentialEndNodes.length > 1) {
            potentialEndNodes.sort((a, b) => a.dist - b.dist);
            endNode = potentialEndNodes[1].nodeKey;
            console.log(`  - Fallback: Selected second nearest end node: ${endNode}`);
        } else if (potentialStartNodes.length > 1) {
            potentialStartNodes.sort((a,b) => a.dist - b.dist);
            startNode = potentialStartNodes[1].nodeKey;
            console.log(`  - Fallback: Selected second nearest start node: ${startNode}`);
        } else {
            console.warn("Warning: Start and end nodes are the same and no alternatives found.");
            return [];
        }
    }


    console.log(`Start Node: ${startNode}, End Node: ${endNode}`);

    const path = await dijkstraWithTraffic(graph, startNode, endNode, nodes);
    return path;
  } catch (error) {
    console.error("Error calculating route:", error);
    throw error;
  }
}

app.get('/api/ride/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const availableDrivers = drivers.filter(driver => driver.available);
    if (availableDrivers.length === 0) {
      return res.status(404).json({ error: 'No available drivers' });
    }

    // Convert lat/lng to numbers
    user.latitude = parseFloat(user.latitude);
    user.longitude = parseFloat(user.longitude);

    for (let driver of availableDrivers) {
      driver.latitude = parseFloat(driver.latitude);
      driver.longitude = parseFloat(driver.longitude);
    }

    const driver = findNearestDriver(user, availableDrivers);
    if (!driver) {
      return res.status(404).json({ error: 'No available drivers' });
    }

    driver.available = false;

    const path = await calculateRoute(user.latitude, user.longitude, driver.latitude, driver.longitude, loadGraph(), graphData.nodes);

    if (!path || path.length === 0) {
      return res.status(500).json({ error: 'No route found' });
    }

    console.log("Calculated Path (Node IDs):", path);

    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const prevNodeKey = path[i];
      const currNodeKey = path[i + 1];

      if (!graphData.nodes[prevNodeKey] || !graphData.nodes[currNodeKey]) {
        console.warn(`Warning: Node data not found for node(s) in path: ${prevNodeKey}, ${currNodeKey}`);
        continue;
      }

      const prevNode = graphData.nodes[prevNodeKey];
      const currNode = graphData.nodes[currNodeKey];
      const segmentDistance = calculateDistance(prevNode.lat, prevNode.lng, currNode.lat, currNode.lng);
      totalDistance += segmentDistance;

      const averageSpeed = 40;
      totalDuration += (segmentDistance / averageSpeed) * 60;
    }

    const fare = totalDistance * 10;

    const pathCoordinates = path.map(nodeKey => {
      const node = graphData.nodes[nodeKey];
      if (!node) {
        console.warn(`Warning: Node data not found for node key: ${nodeKey}`);
        return { lat: 0, lng: 0 };
      }
      return { lat: node.lat, lng: node.lng };
    });

    console.log("Path Coordinates:", pathCoordinates);

    res.json({
      driverName: driver.name,
      eta: (totalDuration + 5).toFixed(2),
      duration: totalDuration.toFixed(2),
      distance: totalDistance.toFixed(2),
      fare: fare.toFixed(2),
      path: pathCoordinates
    });

  } catch (err) {
    console.error("Server Error in /api/ride/:userId:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function initializeData() {
  try {
    const usersData = await loadCSV(path.join(__dirname, 'users.csv'));
    if (usersData && usersData.length > 0) {
      users = usersData;
    } else {
      console.warn("users.csv is empty or could not be loaded.");
    }

    const driversData = await loadCSV(path.join(__dirname, 'drivers.csv'));
    if (driversData && driversData.length > 0) {
      drivers = driversData.map(driver => ({ ...driver, available: true }));
    } else {
      console.warn("drivers.csv is empty or could not be loaded.");
    }

    loadGraph();
    console.log('Data initialized');
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`Smart Ride Hailing backend running on http://localhost:${PORT}`);
  initializeData();
});