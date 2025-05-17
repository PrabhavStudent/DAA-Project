const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Enable CORS for frontend origin
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500']
}));

// Serve frontend files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Load CSV data
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

// Load graph from graph.json
function loadGraph() {
  const raw = fs.readFileSync(path.join(__dirname, 'graph.json'));
  const { nodes, edges } = JSON.parse(raw);
  const graph = {};

  // Build adjacency list
  edges.forEach(({ from, to, weight }) => {
    if (!graph[from]) graph[from] = {};
    if (!graph[to]) graph[to] = {};
    graph[from][to] = weight;
    graph[to][from] = weight; // Assuming undirected graph
  });

  return { graph, nodes };
}

// Dijkstra's algorithm
function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const queue = new Set(Object.keys(graph));

  for (let node of queue) {
    distances[node] = Infinity;
    previous[node] = null;
  }

  distances[start] = 0;

  while (queue.size > 0) {
    const current = [...queue].reduce((min, node) =>
      distances[node] < distances[min] ? node : min
    );

    if (current === end) break;
    queue.delete(current);

    for (let neighbor in graph[current]) {
      const alt = distances[current] + graph[current][neighbor];
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  const route = [];
  let curr = end;
  while (previous[curr]) {
    route.unshift(curr);
    curr = previous[curr];
  }

  if (curr === start) route.unshift(start);
  return route;
}

// API Route: Get ride info by user ID
app.get('/api/ride/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const testNoDrivers = req.query.testNoDrivers === 'true';
    const testNoRoute = req.query.testNoRoute === 'true';

    const users = await loadCSV(path.join(__dirname, 'users.csv'));
    let drivers = await loadCSV(path.join(__dirname, 'drivers.csv'));
    const { graph, nodes } = loadGraph();

    if (testNoDrivers) {
      drivers = [];
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      console.log(`User ID ${userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get nearest driver (by straight-line distance for now)
    let nearestDriver = null;
    let minDistance = Infinity;

    for (const driver of drivers) {
      const dist = Math.sqrt(
        Math.pow(user.latitude - driver.latitude, 2) +
        Math.pow(user.longitude - driver.longitude, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestDriver = driver;
      }
    }

    if (!nearestDriver) {
      return res.status(404).json({ error: 'No available drivers' });
    }

    // Use hardcoded node names (replace with real node mapping logic)
    const startNode = 'A'; // Example start node
    const endNode = 'F';   // Example end node

    let route = [];
    if (testNoRoute) {
      route = [];
    } else {
      route = dijkstra(graph, startNode, endNode);
    }

    if (route.length === 0) {
      return res.status(500).json({ error: 'No route found' });
    }

    const distance = route.length * 1.5; // Simulate 1.5 km per edge
    const duration = (distance / 40) * 60; // Assuming 40 km/h speed
    const fare = distance * 10; // 10 currency units/km

    res.json({
      driverName: nearestDriver.name,
      eta: duration.toFixed(2),
      duration: duration.toFixed(2),
      distance: distance.toFixed(2),
      fare: fare.toFixed(2),
      path: route.map(node => nodes[node])
    });

  } catch (err) {
    console.error("Server Error:", err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Smart Ride Hailing backend running on http://localhost:${PORT}`);
});
