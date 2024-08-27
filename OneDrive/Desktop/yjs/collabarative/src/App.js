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

const socket = io('http://localhost:5000');

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

  useEffect(() => {
    const handleSetAdmin = (isAdminUser) => {
      console.log('Set as admin:', isAdminUser);
      setIsAdmin(isAdminUser);
    };

    const handleUpdateFlow = ({ nodes: updatedNodes, edges: updatedEdges }) => {
      if (Array.isArray(updatedNodes) && updatedNodes.every(node => node && typeof node.position === 'object')) {
        setNodes(updatedNodes);
      }
      if (Array.isArray(updatedEdges)) {
        setEdges(updatedEdges);
      }
    };

    const handleUpdateCursors = (updatedCursors) => {
      console.log('Cursors updated:', updatedCursors);
      setCursors(updatedCursors);
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

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (containerRef.current && name) {
        const rect = containerRef.current.getBoundingClientRect();
        const newCursor = {
          x: event.clientX -rect.left,
          y: event.clientY -rect.top
        };
        socket.emit('cursorMove', newCursor);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [name]);

  const onConnect = useCallback((params) => {
    const newEdge = { ...params, id: `e${params.source}-${params.target}` };
    setEdges((eds) => addEdge(newEdge, eds));
    socket.emit('flowUpdate', { nodes, edges: [...edges, newEdge] });
  }, [nodes, edges, setEdges]);

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    const updatedNodes = nodes.map(node => {
      const change = changes.find(c => c.id === node.id && c.type === 'position');
      return change ? { ...node, position: change.position } : node;
    });
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
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
      {Object.entries(cursors).map(([id, cursor]) => (
        cursor && (
          <div
            key={id}
            className="cursor"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 5
            }}
          >
            {id !== socket.id && (
              <span className="cursor-name" style={{ color: 'blue' }}>
                {cursor.name}
              </span>
            )}
          </div>
        )
      ))}
    </div>
  );
}

export default App;

