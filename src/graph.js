export default class Graph {
  constructor() {
    this.adjacencyList = {};
    this.valueList = {};
  }

  addVertex(vertex, value) {
    if (!this.adjacencyList[vertex]) {
      this.adjacencyList[vertex] = [];
      this.valueList[vertex] = value;
    }
  }

  addEdge(source, destination) {
    if (!this.adjacencyList[source]) this.addVertex(source);

    if (!this.adjacencyList[destination]) this.addVertex(destination);

    this.adjacencyList[source].push(destination);
    this.adjacencyList[destination].push(source);
  }

  removeEdge(source, destination) {
    this.adjacencyList[source] = this.adjacencyList[source].filter(
      (vertex) => vertex !== destination,
    );
    this.adjacencyList[destination] = this.adjacencyList[destination].filter(
      (vertex) => vertex !== source,
    );
  }

  removeVertex(vertex) {
    while (this.adjacencyList[vertex].length > 0) {
      const connectedVertex = this.adjacencyList[vertex].pop();
      this.removeEdge(vertex, connectedVertex);
    }

    delete this.adjacencyList[vertex];
    delete this.valueList[vertex];
  }
}
