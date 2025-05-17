function dijkstra(graph, start, end) {
  const distances = {};
  const prev = {};
  const pq = new Set();

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

module.exports = dijkstra;
