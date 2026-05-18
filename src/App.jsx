import { useState, useEffect, useRef, useCallback } from "react";

const ROWS = 22;
const COLS = 45;
const CELL = 24;

const NODE = { EMPTY: 0, WALL: 1, START: 2, END: 3, VISITED: 4, PATH: 5, FRONTIER: 6 };

const ALGOS = [
  { id: "bfs", label: "BFS", desc: "Breadth-First Search — guarantees shortest path (unweighted)" },
  { id: "dfs", label: "DFS", desc: "Depth-First Search — fast but no shortest path guarantee" },
  { id: "dijkstra", label: "Dijkstra", desc: "Dijkstra's Algorithm — shortest path with weighted edges" },
  { id: "astar", label: "A*", desc: "A* Algorithm — heuristic-guided, fastest to goal" },
];

const SPEEDS = [
  { id: "slow", label: "Slow", ms: 60 },
  { id: "normal", label: "Normal", ms: 25 },
  { id: "fast", label: "Fast", ms: 8 },
  { id: "instant", label: "Instant", ms: 0 },
];

function makeGrid() {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({ type: NODE.EMPTY, row: r, col: c }))
  );
}

function heuristic(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function getNeighbors(grid, node) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  return dirs.reduce((acc, [dr, dc]) => {
    const r = node.row + dr, c = node.col + dc;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c].type !== NODE.WALL) {
      acc.push(grid[r][c]);
    }
    return acc;
  }, []);
}

function runBFS(grid, start, end) {
  const visited = new Set();
  const prev = new Map();
  const queue = [start];
  const steps = [];
  visited.add(`${start.row},${start.col}`);
  while (queue.length) {
    const curr = queue.shift();
    const key = `${curr.row},${curr.col}`;
    if (curr.row === end.row && curr.col === end.col) {
      return { steps, path: buildPath(prev, end, start) };
    }
    steps.push({ type: "visit", row: curr.row, col: curr.col });
    for (const nb of getNeighbors(grid, curr)) {
      const nk = `${nb.row},${nb.col}`;
      if (!visited.has(nk)) {
        visited.add(nk);
        prev.set(nk, curr);
        steps.push({ type: "frontier", row: nb.row, col: nb.col });
        queue.push(nb);
      }
    }
  }
  return { steps, path: [] };
}

function runDFS(grid, start, end) {
  const visited = new Set();
  const prev = new Map();
  const stack = [start];
  const steps = [];
  while (stack.length) {
    const curr = stack.pop();
    const key = `${curr.row},${curr.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (curr.row === end.row && curr.col === end.col) {
      return { steps, path: buildPath(prev, end, start) };
    }
    steps.push({ type: "visit", row: curr.row, col: curr.col });
    for (const nb of getNeighbors(grid, curr)) {
      const nk = `${nb.row},${nb.col}`;
      if (!visited.has(nk)) {
        prev.set(nk, curr);
        steps.push({ type: "frontier", row: nb.row, col: nb.col });
        stack.push(nb);
      }
    }
  }
  return { steps, path: [] };
}

function runDijkstra(grid, start, end) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  const steps = [];
  const key = (n) => `${n.row},${n.col}`;
  dist.set(key(start), 0);
  const pq = [[0, start]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, curr] = pq.shift();
    const ck = key(curr);
    if (visited.has(ck)) continue;
    visited.add(ck);
    if (curr.row === end.row && curr.col === end.col) {
      return { steps, path: buildPath(prev, end, start) };
    }
    steps.push({ type: "visit", row: curr.row, col: curr.col });
    for (const nb of getNeighbors(grid, curr)) {
      const nk = key(nb);
      const nd = d + 1;
      if (!dist.has(nk) || nd < dist.get(nk)) {
        dist.set(nk, nd);
        prev.set(nk, curr);
        steps.push({ type: "frontier", row: nb.row, col: nb.col });
        pq.push([nd, nb]);
      }
    }
  }
  return { steps, path: [] };
}

function runAStar(grid, start, end) {
  const key = (n) => `${n.row},${n.col}`;
  const g = new Map([[key(start), 0]]);
  const f = new Map([[key(start), heuristic(start, end)]]);
  const prev = new Map();
  const closed = new Set();
  const open = [start];
  const steps = [];
  while (open.length) {
    open.sort((a, b) => (f.get(key(a)) || Infinity) - (f.get(key(b)) || Infinity));
    const curr = open.shift();
    const ck = key(curr);
    if (curr.row === end.row && curr.col === end.col) {
      return { steps, path: buildPath(prev, end, start) };
    }
    if (closed.has(ck)) continue;
    closed.add(ck);
    steps.push({ type: "visit", row: curr.row, col: curr.col });
    for (const nb of getNeighbors(grid, curr)) {
      const nk = key(nb);
      if (closed.has(nk)) continue;
      const ng = (g.get(ck) || 0) + 1;
      if (!g.has(nk) || ng < g.get(nk)) {
        g.set(nk, ng);
        f.set(nk, ng + heuristic(nb, end));
        prev.set(nk, curr);
        steps.push({ type: "frontier", row: nb.row, col: nb.col });
        open.push(nb);
      }
    }
  }
  return { steps, path: [] };
}

function buildPath(prev, end, start) {
  const path = [];
  let curr = end;
  const key = (n) => `${n.row},${n.col}`;
  while (curr && !(curr.row === start.row && curr.col === start.col)) {
    path.unshift(curr);
    curr = prev.get(key(curr));
  }
  return path;
}

export default function Pathfinder() {
  const [grid, setGrid] = useState(makeGrid);
  const [startNode, setStartNode] = useState({ row: 10, col: 5 });
  const [endNode, setEndNode] = useState({ row: 10, col: 39 });
  const [algo, setAlgo] = useState("astar");
  const [speed, setSpeed] = useState("normal");
  const [mode, setMode] = useState("wall"); // wall | start | end
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [mouseDown, setMouseDown] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  const pausedRef = useRef(false);
  const cancelRef = useRef(false);
  const stepIdxRef = useRef(0);
  const stepsRef = useRef([]);
  const pathRef = useRef([]);

  const visGrid = useRef(makeGrid());

  const resetGrid = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
    setPaused(false);
    setDone(false);
    setStats(null);
    const g = makeGrid();
    visGrid.current = makeGrid();
    setGrid(g);
    setResults([]);
  }, []);

  const clearPath = useCallback(() => {
    cancelRef.current = true;
    setRunning(false);
    setPaused(false);
    setDone(false);
    setStats(null);
    setGrid(prev => prev.map(row => row.map(cell => {
      if (cell.type === NODE.VISITED || cell.type === NODE.PATH || cell.type === NODE.FRONTIER) {
        return { ...cell, type: NODE.EMPTY };
      }
      return cell;
    })));
  }, []);

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const runAlgorithm = useCallback(async () => {
    clearPath();
    await sleep(50);
    cancelRef.current = false;
    pausedRef.current = false;
    setRunning(true);
    setPaused(false);
    setDone(false);
    setStats(null);

    const currentGrid = visGrid.current.map(r => r.map(c => ({ ...c })));
    const start = currentGrid[startNode.row][startNode.col];
    const end = currentGrid[endNode.row][endNode.col];

    const algoFn = { bfs: runBFS, dfs: runDFS, dijkstra: runDijkstra, astar: runAStar }[algo];
    const t0 = performance.now();
    const { steps, path } = algoFn(currentGrid, start, end);
    const t1 = performance.now();

    stepsRef.current = steps;
    pathRef.current = path;
    stepIdxRef.current = 0;

    const speedMs = SPEEDS.find(s => s.id === speed)?.ms ?? 25;

    if (speedMs === 0) {
      // Instant mode
      setGrid(prev => {
        const g = prev.map(r => r.map(c => ({ ...c })));
        steps.forEach(s => {
          if (g[s.row][s.col].type === NODE.EMPTY) {
            g[s.row][s.col].type = s.type === "visit" ? NODE.VISITED : NODE.FRONTIER;
          }
        });
        path.forEach(n => {
          if (g[n.row][n.col].type !== NODE.START && g[n.row][n.col].type !== NODE.END) {
            g[n.row][n.col].type = NODE.PATH;
          }
        });
        return g;
      });
      setStats({ visited: steps.filter(s => s.type === "visit").length, pathLen: path.length, time: (t1 - t0).toFixed(2), found: path.length > 0 });
      setDone(true);
      setRunning(false);
    } else {
      for (let i = 0; i < steps.length; i++) {
        if (cancelRef.current) return;
        while (pausedRef.current) {
          await sleep(50);
          if (cancelRef.current) return;
        }
        const s = steps[i];
        setGrid(prev => {
          const g = prev.map(r => r.map(c => ({ ...c })));
          if (g[s.row][s.col].type === NODE.EMPTY) {
            g[s.row][s.col].type = s.type === "visit" ? NODE.VISITED : NODE.FRONTIER;
          }
          return g;
        });
        await sleep(speedMs);
      }
      for (let i = 0; i < path.length; i++) {
        if (cancelRef.current) return;
        const n = path[i];
        setGrid(prev => {
          const g = prev.map(r => r.map(c => ({ ...c })));
          if (g[n.row][n.col].type !== NODE.START && g[n.row][n.col].type !== NODE.END) {
            g[n.row][n.col].type = NODE.PATH;
          }
          return g;
        });
        await sleep(speedMs * 2);
      }
      setStats({ visited: steps.filter(s => s.type === "visit").length, pathLen: path.length, time: (t1 - t0).toFixed(2), found: path.length > 0 });
      setDone(true);
      setRunning(false);
    }

    setResults(prev => {
      const newResult = { algo, visited: steps.filter(s => s.type === "visit").length, pathLen: path.length, time: (t1 - t0).toFixed(2), found: path.length > 0 };
      const updated = [...prev.filter(r => r.algo !== algo), newResult];
      return updated;
    });
  }, [algo, speed, startNode, endNode, clearPath]);

  const handlePause = () => {
    pausedRef.current = true;
    setPaused(true);
  };
  const handleResume = () => {
    pausedRef.current = false;
    setPaused(false);
  };

  const handleCellInteract = (r, c, isDown = false) => {
    if (running) return;
    const cellType = grid[r][c].type;

    if (isDown) {
      if (mode === "start") {
        setStartNode({ row: r, col: c });
        setGrid(prev => {
          const g = prev.map(row => row.map(cell => ({ ...cell })));
          g[startNode.row][startNode.col].type = NODE.EMPTY;
          if (g[r][c].type !== NODE.END) g[r][c].type = NODE.START;
          return g;
        });
        return;
      }
      if (mode === "end") {
        setEndNode({ row: r, col: c });
        setGrid(prev => {
          const g = prev.map(row => row.map(cell => ({ ...cell })));
          g[endNode.row][endNode.col].type = NODE.EMPTY;
          if (g[r][c].type !== NODE.START) g[r][c].type = NODE.END;
          return g;
        });
        return;
      }
      // Wall mode
      const erasing = cellType === NODE.WALL;
      setIsErasing(erasing);
      setGrid(prev => {
        const g = prev.map(row => row.map(cell => ({ ...cell })));
        if (g[r][c].type !== NODE.START && g[r][c].type !== NODE.END) {
          g[r][c].type = erasing ? NODE.EMPTY : NODE.WALL;
        }
        return g;
      });
    } else {
      // drag
      if (mode !== "wall") return;
      setGrid(prev => {
        const g = prev.map(row => row.map(cell => ({ ...cell })));
        if (g[r][c].type !== NODE.START && g[r][c].type !== NODE.END) {
          g[r][c].type = isErasing ? NODE.EMPTY : NODE.WALL;
        }
        return g;
      });
    }
  };

  // Sync visGrid with grid (walls/start/end)
  useEffect(() => {
    visGrid.current = grid.map(r => r.map(c => ({ ...c })));
  }, [grid]);

  // Initialize start/end on mount
  useEffect(() => {
    setGrid(prev => {
      const g = prev.map(r => r.map(c => ({ ...c })));
      g[startNode.row][startNode.col].type = NODE.START;
      g[endNode.row][endNode.col].type = NODE.END;
      return g;
    });
  }, []);

  const cellColor = (type) => {
    switch (type) {
      case NODE.WALL: return "#1a1a2e";
      case NODE.START: return "#10b981";
      case NODE.END: return "#ef4444";
      case NODE.VISITED: return "#3b82f620";
      case NODE.FRONTIER: return "#8b5cf640";
      case NODE.PATH: return "#f59e0b";
      default: return "transparent";
    }
  };

  const cellBorder = (type) => {
    switch (type) {
      case NODE.WALL: return "1px solid #23b8cf";
      case NODE.START: return "2px solid #059669";
      case NODE.END: return "2px solid #dc2626";
      case NODE.PATH: return "1px solid #d97706";
      case NODE.VISITED: return "1px solid #3b82f630";
      case NODE.FRONTIER: return "1px solid #8b5cf630";
      default: return "1px solid #e5e7eb18";
    }
  };

  const algoInfo = ALGOS.find(a => a.id === algo);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", background: "var(--color-background-tertiary)", minHeight: "100vh", padding: "0", userSelect: "none" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "12px 20px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444" }} />
        </div>
        <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>pathfinder.viz</span>
        <span style={{ color: "#475569", fontSize: 11, marginLeft: "auto" }}>
          {algoInfo?.desc}
        </span>
      </div>

      <div style={{ padding: "14px 20px", background: "#0f172a" }}>
        {/* Controls Row 1: Algorithm + Speed */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {ALGOS.map(a => (
              <button key={a.id} onClick={() => !running && setAlgo(a.id)}
                style={{
                  padding: "6px 14px", fontSize: 12, fontFamily: "inherit", fontWeight: 500,
                  background: algo === a.id ? "#6366f1" : "#1e293b",
                  color: algo === a.id ? "#fff" : "#64748b",
                  border: algo === a.id ? "1px solid #818cf8" : "1px solid #334155",
                  borderRadius: 6, cursor: running ? "not-allowed" : "pointer",
                  transition: "all 0.15s", letterSpacing: "0.05em"
                }}>
                {a.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: "#1e293b" }} />

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ color: "#475569", fontSize: 11 }}>SPEED</span>
            {SPEEDS.map(s => (
              <button key={s.id} onClick={() => setSpeed(s.id)}
                style={{
                  padding: "6px 10px", fontSize: 11, fontFamily: "inherit",
                  background: speed === s.id ? "#1e40af" : "#1e293b",
                  color: speed === s.id ? "#93c5fd" : "#64748b",
                  border: speed === s.id ? "1px solid #3b82f6" : "1px solid #334155",
                  borderRadius: 6, cursor: "pointer", transition: "all 0.15s"
                }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: "#1e293b" }} />

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ color: "#475569", fontSize: 11 }}>DRAW</span>
            {[
              { id: "wall", label: "◼ Wall" },
              { id: "start", label: "◉ Start" },
              { id: "end", label: "◎ End" },
            ].map(m => (
              <button key={m.id} onClick={() => !running && setMode(m.id)}
                style={{
                  padding: "6px 10px", fontSize: 11, fontFamily: "inherit",
                  background: mode === m.id ? "#0f2d1f" : "#1e293b",
                  color: mode === m.id ? "#10b981" : "#64748b",
                  border: mode === m.id ? "1px solid #10b981" : "1px solid #334155",
                  borderRadius: 6, cursor: running ? "not-allowed" : "pointer", transition: "all 0.15s"
                }}>
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {!running && !done && (
              <button onClick={runAlgorithm}
                style={{
                  padding: "7px 20px", fontSize: 12, fontFamily: "inherit", fontWeight: 700,
                  background: "#6366f1", color: "#fff", border: "1px solid #818cf8",
                  borderRadius: 6, cursor: "pointer", letterSpacing: "0.08em"
                }}>
                ▶ RUN
              </button>
            )}
            {running && !paused && (
              <button onClick={handlePause}
                style={{
                  padding: "7px 20px", fontSize: 12, fontFamily: "inherit", fontWeight: 700,
                  background: "#1e293b", color: "#f59e0b", border: "1px solid #f59e0b",
                  borderRadius: 6, cursor: "pointer"
                }}>
                ⏸ PAUSE
              </button>
            )}
            {running && paused && (
              <button onClick={handleResume}
                style={{
                  padding: "7px 20px", fontSize: 12, fontFamily: "inherit", fontWeight: 700,
                  background: "#1e293b", color: "#10b981", border: "1px solid #10b981",
                  borderRadius: 6, cursor: "pointer"
                }}>
                ▶ RESUME
              </button>
            )}
            {done && (
              <button onClick={() => { clearPath(); setDone(false); }}
                style={{
                  padding: "7px 20px", fontSize: 12, fontFamily: "inherit", fontWeight: 700,
                  background: "#1e293b", color: "#6366f1", border: "1px solid #6366f1",
                  borderRadius: 6, cursor: "pointer"
                }}>
                ▶ RE-RUN
              </button>
            )}
            <button onClick={clearPath} disabled={running && !paused}
              style={{
                padding: "7px 14px", fontSize: 12, fontFamily: "inherit",
                background: "#1e293b", color: "#64748b", border: "1px solid #334155",
                borderRadius: 6, cursor: "pointer"
              }}>
              ↺ Clear Path
            </button>
            <button onClick={resetGrid}
              style={{
                padding: "7px 14px", fontSize: 12, fontFamily: "inherit",
                background: "#1e293b", color: "#64748b", border: "1px solid #334155",
                borderRadius: 6, cursor: "pointer"
              }}>
              ⊗ Reset
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div style={{ display: "flex", gap: 16, marginBottom: 12, padding: "8px 14px", background: "#0a0f1e", borderRadius: 8, border: "1px solid #1e293b", alignItems: "center" }}>
            <span style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>{ALGOS.find(a => a.id === algo)?.label} result</span>
            <div style={{ display: "flex", gap: 20, marginLeft: 8 }}>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>Nodes visited: <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{stats.visited}</span></span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>
                Path length: <span style={{ color: stats.found ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>
                  {stats.found ? stats.pathLen : "No path"}
                </span>
              </span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>Compute time: <span style={{ color: "#10b981", fontWeight: 700 }}>{stats.time}ms</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div
        style={{ display: "inline-block", margin: "0 20px 16px", cursor: mode === "wall" ? "crosshair" : "pointer" }}
        onMouseLeave={() => setMouseDown(false)}
        onMouseUp={() => setMouseDown(false)}
      >
        {grid.map((row, r) => (
          <div key={r} style={{ display: "flex" }}>
            {row.map((cell, c) => (
              <div
                key={c}
                style={{
                  width: CELL, height: CELL,
                  background: cellColor(cell.type),
                  border: cellBorder(cell.type),
                  borderRadius: cell.type === NODE.START || cell.type === NODE.END ? 4 : cell.type === NODE.PATH ? 3 : 0,
                  transition: cell.type === NODE.VISITED ? "background 0.1s" : cell.type === NODE.PATH ? "background 0.05s" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                  boxSizing: "border-box",
                  position: "relative",
                  zIndex: cell.type === NODE.START || cell.type === NODE.END ? 2 : 1,
                }}
                onMouseDown={() => { setMouseDown(true); handleCellInteract(r, c, true); }}
                onMouseEnter={() => { if (mouseDown) handleCellInteract(r, c, false); }}
              >
                {cell.type === NODE.START && <span style={{ color: "#fff", fontSize: 13, pointerEvents: "none" }}>S</span>}
                {cell.type === NODE.END && <span style={{ color: "#fff", fontSize: 13, pointerEvents: "none" }}>E</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend + Comparison */}
      <div style={{ display: "flex", gap: 20, padding: "0 20px 20px", flexWrap: "wrap" }}>
        {/* Legend */}
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {[
            { color: "#10b981", label: "Start" },
            { color: "#ef4444", label: "End" },
            { color: "#1a1a2e", border: "1px solid #334155", label: "Wall" },
            { color: "#8b5cf640", border: "1px solid #8b5cf630", label: "Frontier" },
            { color: "#3b82f620", border: "1px solid #3b82f630", label: "Visited" },
            { color: "#f59e0b", label: "Path" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, background: item.color, border: item.border || "none", borderRadius: 3 }} />
              <span style={{ color: "#64748b", fontSize: 11 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Performance comparison */}
        {results.length > 0 && (
          <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", flex: 1, minWidth: 280 }}>
            <div style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Performance Comparison</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {results.map(r => (
                <div key={r.algo} style={{
                  background: "#0f172a", borderRadius: 6,
                  border: `1px solid ${r.algo === algo ? "#6366f1" : "#1e293b"}`,
                  padding: "6px 10px", minWidth: 110
                }}>
                  <div style={{ color: r.algo === algo ? "#818cf8" : "#475569", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    {ALGOS.find(a => a.id === r.algo)?.label}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10 }}>
                    Visited: <span style={{ color: "#8b5cf6" }}>{r.visited}</span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10 }}>
                    Path: <span style={{ color: r.found ? "#f59e0b" : "#ef4444" }}>{r.found ? r.pathLen : "none"}</span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10 }}>
                    Time: <span style={{ color: "#10b981" }}>{r.time}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tip bar */}
      <div style={{ padding: "8px 20px 14px", color: "#334155", fontSize: 11 }}>
        Tip: Click & drag to draw walls · Switch draw mode to reposition Start/End · Run multiple algorithms to compare performance
      </div>
    </div>
  );
}
