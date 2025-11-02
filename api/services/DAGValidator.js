/**
 * DAGValidator - Validates recipe DAG structure
 * Ensures no cycles, all dependencies exist, and proper structure
 */

export class DAGValidator {
  /**
   * Validate entire DAG structure
   * @throws {Error} If validation fails
   */
  static validateDAG(nodes, edges) {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error('Nodes must be a non-empty array');
    }

    if (!Array.isArray(edges)) {
      throw new Error('Edges must be an array');
    }

    // Validate individual nodes
    this.validateNodes(nodes);

    // Validate edges reference existing nodes
    this.validateEdges(nodes, edges);

    // Check for cycles
    this.checkForCycles(nodes, edges);

    // Validate dependencies
    this.validateDependencies(nodes, edges);

    return true;
  }

  /**
   * Validate individual nodes
   */
  static validateNodes(nodes) {
    const nodeIds = new Set();

    nodes.forEach((node, index) => {
      if (!node.id) {
        throw new Error(`Node at index ${index} is missing required field: id`);
      }

      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID found: ${node.id}`);
      }
      nodeIds.add(node.id);

      if (!node.name) {
        throw new Error(`Node ${node.id} is missing required field: name`);
      }

      if (!node.type) {
        throw new Error(`Node ${node.id} is missing required field: type`);
      }

      const validTypes = ['text_generation', 'image_generation', 'video_generation', 'data_processing'];
      if (!validTypes.includes(node.type)) {
        throw new Error(
          `Node ${node.id} has invalid type: ${node.type}. Must be one of: ${validTypes.join(', ')}`
        );
      }

      if (!node.outputKey) {
        throw new Error(`Node ${node.id} is missing required field: outputKey`);
      }

      // Validate AI model for non-data-processing nodes
      if (node.type !== 'data_processing' && !node.aiModel) {
        throw new Error(`Node ${node.id} (type: ${node.type}) is missing aiModel configuration`);
      }

      if (node.aiModel && !node.aiModel.provider) {
        throw new Error(`Node ${node.id} aiModel is missing required field: provider`);
      }

      if (node.aiModel && !node.aiModel.modelName) {
        throw new Error(`Node ${node.id} aiModel is missing required field: modelName`);
      }

      // Validate dependencies array
      if (node.dependencies && !Array.isArray(node.dependencies)) {
        throw new Error(`Node ${node.id} dependencies must be an array`);
      }

      // Validate error handling
      if (node.errorHandling) {
        const validErrorStrategies = ['fail', 'skip', 'retry'];
        if (!validErrorStrategies.includes(node.errorHandling.onError)) {
          throw new Error(
            `Node ${node.id} has invalid errorHandling.onError: ${node.errorHandling.onError}`
          );
        }
      }
    });
  }

  /**
   * Validate edges reference existing nodes
   */
  static validateEdges(nodes, edges) {
    const nodeIds = new Set(nodes.map((n) => n.id));

    edges.forEach((edge, index) => {
      if (!edge.from) {
        throw new Error(`Edge at index ${index} is missing required field: from`);
      }

      if (!edge.to) {
        throw new Error(`Edge at index ${index} is missing required field: to`);
      }

      if (!nodeIds.has(edge.from)) {
        throw new Error(`Edge references non-existent node: ${edge.from}`);
      }

      if (!nodeIds.has(edge.to)) {
        throw new Error(`Edge references non-existent node: ${edge.to}`);
      }

      if (edge.from === edge.to) {
        throw new Error(`Self-loops are not allowed. Edge: ${edge.from} -> ${edge.to}`);
      }
    });
  }

  /**
   * Check for cycles in the DAG using DFS
   */
  static checkForCycles(nodes, edges) {
    const adjacencyList = new Map();
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Build adjacency list
    for (const nodeId of nodeIds) {
      adjacencyList.set(nodeId, []);
    }

    edges.forEach((edge) => {
      adjacencyList.get(edge.from).push(edge.to);
    });

    const visited = new Set();
    const recursionStack = new Set();

    const hasCycleDFS = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of adjacencyList.get(nodeId)) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        if (hasCycleDFS(nodeId)) {
          throw new Error('Cycle detected in DAG. All paths must be acyclic.');
        }
      }
    }
  }

  /**
   * Validate node dependencies match edges
   */
  static validateDependencies(nodes, edges) {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const incomingEdges = new Map();

    // Build incoming edges map
    for (const nodeId of nodeMap.keys()) {
      incomingEdges.set(nodeId, []);
    }

    edges.forEach((edge) => {
      incomingEdges.get(edge.to).push(edge.from);
    });

    // Validate node dependencies
    nodes.forEach((node) => {
      const expectedDependencies = incomingEdges.get(node.id);

      if (node.dependencies) {
        for (const dep of node.dependencies) {
          if (!expectedDependencies.includes(dep)) {
            throw new Error(
              `Node ${node.id} declares dependency on ${dep}, but no edge exists from ${dep} to ${node.id}`
            );
          }
        }
      }

      // Ensure at least first nodes have no dependencies
      if (expectedDependencies.length === 0 && node.dependencies && node.dependencies.length > 0) {
        throw new Error(`Node ${node.id} has no incoming edges but declares dependencies`);
      }
    });
  }

  /**
   * Perform topological sort using DFS (Kahn's algorithm)
   * Returns nodes in execution order
   */
  static topologicalSort(nodes, edges) {
    const adjacencyList = new Map();
    const inDegree = new Map();

    // Initialize
    for (const node of nodes) {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    // Build graph
    edges.forEach((edge) => {
      adjacencyList.get(edge.from).push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    });

    // Find all nodes with no incoming edges (starting nodes)
    const queue = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const result = [];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      result.push(nodeId);

      // For each neighbor
      for (const neighbor of adjacencyList.get(nodeId)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);

        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== nodes.length) {
      throw new Error('Topological sort failed - likely due to cycle in graph');
    }

    return result;
  }

  /**
   * Get all ancestors of a node in the DAG
   */
  static getAncestors(nodeId, edges) {
    const ancestors = new Set();
    const visited = new Set();

    const dfs = (id) => {
      if (visited.has(id)) return;
      visited.add(id);

      edges.forEach((edge) => {
        if (edge.to === id && !ancestors.has(edge.from)) {
          ancestors.add(edge.from);
          dfs(edge.from);
        }
      });
    };

    dfs(nodeId);
    return Array.from(ancestors);
  }

  /**
   * Get all descendants of a node in the DAG
   */
  static getDescendants(nodeId, edges) {
    const descendants = new Set();
    const visited = new Set();

    const dfs = (id) => {
      if (visited.has(id)) return;
      visited.add(id);

      edges.forEach((edge) => {
        if (edge.from === id && !descendants.has(edge.to)) {
          descendants.add(edge.to);
          dfs(edge.to);
        }
      });
    };

    dfs(nodeId);
    return Array.from(descendants);
  }
}

export default DAGValidator;
