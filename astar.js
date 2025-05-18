
 

function heuristic(nodeA, nodeB) {
  // Using Euclidean distance as heuristic
  const dx = nodeA.lat - nodeB.lat;
  const dy = nodeA.lng - nodeB.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * A* search algorithm
 * @param {Object} graph - adjacency list graph where graph[node] = {neighbor: weight, ...}
 * @param {Object} nodes - node coordinates { nodeKey: {lat, lng}, ... }
 * @param {string} start - start node key
 * @param {string} goal - goal node key
 * @returns {Array} path - array of node keys representing the shortest path
 */
function aStarSearch(graph, nodes, start, goal) {
  const openSet = new Set([start]);
  const cameFrom = {};

  const gScore = {};
  const fScore = {};

  for (const node in graph) {
    gScore[node] = Infinity;
    fScore[node] = Infinity;
  }
  gScore[start] = 0;
  fScore[start] = heuristic(nodes[start], nodes[goal]);

  while (openSet.size > 0) {
    // Get node in openSet with lowest fScore
    let current = null;
    let lowestF = Infinity;
    for (const node of openSet) {
      if (fScore[node] < lowestF) {
        lowestF = fScore[node];
        current = node;
      }
    }

    if (current === goal) {
      // Reconstruct path
      const path = [];
      let temp = current;
      while (temp) {
        path.unshift(temp);
        temp = cameFrom[temp];
      }
      return path;
    }

    openSet.delete(current);

    for (const neighbor in graph[current]) {
      const tentativeG = gScore[current] + graph[current][neighbor];
      if (tentativeG < gScore[neighbor]) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(nodes[neighbor], nodes[goal]);
        if (!openSet.has(neighbor)) {
          openSet.add(neighbor);
        }
      }
    }
  }

  // No path found
  return [];
}

module.exports = aStarSearch;
