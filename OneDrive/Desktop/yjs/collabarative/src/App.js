import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, { 
  addEdge, 
  MiniMap, 
  Controls, 
  Background,
  useNodesState,
  useEdgesState
} from 'reactflow'
import 'reactflow/dist/style.css';
import io from 'socket.io-client';
import './App.css';
import { applyNodeChanges } from 'reactflow';

const socket = io('http://localhost:5000');

const generateRandomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16);

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: 'Default Node' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Output Node' },
    position: { x: 250, y: 250 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [cursors, setCursors] = useState({});
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const throttleRef = useRef(null);

  useEffect(() => {
    const handleSetAdmin = (isAdminUser) => setIsAdmin(isAdminUser);
    const handleUpdateFlow = ({ nodes: updatedNodes, edges: updatedEdges }) => {
      if (Array.isArray(updatedNodes) && updatedNodes.every(node => node && typeof node.position === 'object')) {
        setNodes(updatedNodes);
      }
      if (Array.isArray(updatedEdges)) {
        setEdges(updatedEdges);
      }
    };
    const handleUpdateCursors = (updatedCursors) => {
      setCursors(prevCursors => {
        const newCursors = { ...prevCursors };
        Object.entries(updatedCursors).forEach(([id, cursor]) => {
          if (!newCursors[id]) {
            newCursors[id] = { ...cursor, color: cursor.color || generateRandomColor() };
          } else {
            newCursors[id] = { ...newCursors[id], ...cursor };
          }
        });
        return newCursors;
      });
    };

    socket.on('setAdmin', handleSetAdmin);
    socket.on('updateFlow', handleUpdateFlow);
    socket.on('updateCursors', handleUpdateCursors);

    return () => {
      socket.off('setAdmin', handleSetAdmin);
      socket.off('updateFlow', handleUpdateFlow);
      socket.off('updateCursors', handleUpdateCursors);
    };
  }, [setNodes, setEdges]);

  const throttledEmit = useCallback((newCursor) => {
    if (!throttleRef.current) {
      throttleRef.current = setTimeout(() => {
        socket.emit('cursorMove', newCursor);
        throttleRef.current = null;
      }, 16); // Approximately 60fps
    }
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (containerRef.current && name) {
      const rect = containerRef.current.getBoundingClientRect();
      const newCursor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        pageX: event.pageX,
        pageY: event.pageY,
        clientX: event.clientX,
        clientY: event.clientY,
        isDragging: isDraggingRef.current
      };
      throttledEmit(newCursor);
    }
  }, [name, throttledEmit]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const onConnect = useCallback((params) => {
    const newEdge = { ...params, id: `e${params.source}-${params.target}` };
    setEdges((eds) => addEdge(newEdge, eds));
    socket.emit('flowUpdate', { nodes, edges: [...edges, newEdge] });
  }, [nodes, edges, setEdges]);

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    const updatedNodes = applyNodeChanges(changes, nodes);
    setNodes(updatedNodes);
    socket.emit('flowUpdate', { nodes: updatedNodes, edges });
  }, [nodes, edges, onNodesChange]);

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    socket.emit('flowUpdate', { nodes, edges });
  }, [nodes, edges, onEdgesChange]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name) {
      socket.emit('setName', name);
    }
  };

  const onNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onNodeDrag = useCallback((event, node) => {
    if (containerRef.current && name) {
      const rect = containerRef.current.getBoundingClientRect();
      const newCursor = {
        x: node.position.x + rect.left,
        y: node.position.y + rect.top,
        pageX: node.position.x + rect.left + window.scrollX,
        pageY: node.position.y + rect.top + window.scrollY,
        clientX: node.position.x + rect.left,
        clientY: node.position.y + rect.top,
        isDragging: true
      };
      throttledEmit(newCursor);
    }
  }, [name, throttledEmit]);

  const onNodeDragStop = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw' }} ref={containerRef}>
      <form onSubmit={handleNameSubmit} style={{ position: 'absolute', top: 10, left: 10, zIndex: 4 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
        <button type="submit">Set Name</button>
      </form>
      <p style={{ position: 'absolute', top: 40, left: 10, zIndex: 4 }}>
        You are {isAdmin ? 'the admin' : 'a regular user'}.
      </p>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
      {Object.entries(cursors).map(([id, cursor]) => (
        cursor && id !== socket.id && (
          <div
            key={id}
            className="cursor"
            style={{
              left: `${cursor.clientX}px`,
              top: `${cursor.clientY}px`,
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: cursor.color,
                position: 'absolute',
                top: '-5px',
                left: '-5px'
              }}
            />
            <div
              style={{
                width: '2px',
                height: '20px',
                backgroundColor: cursor.color,
                position: 'absolute',
                top: '5px',
                left: '0'
              }}
            />
            <div
              style={{
                width: '20px',
                height: '2px',
                backgroundColor: cursor.color,
                position: 'absolute',
                top: '0',
                left: '5px'
              }}
            />
            <span
              className="cursor-name"
              style={{
                color: cursor.color,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                padding: '2px 4px',
                borderRadius: '4px',
                position: 'absolute',
                top: '20px',
                left: '10px',
                whiteSpace: 'nowrap'
              }}
            >
              {cursor.name}
            </span>
          </div>
        )
      ))}
    </div>
  );
}

export default App;
