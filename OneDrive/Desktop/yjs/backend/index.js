// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

// const PORT = process.env.PORT || 5000;

// let admin = null;
// const cursors = {};

// io.on('connection', (socket) => {
//   console.log('New client connected');

//   socket.on('setName', (name) => {
//     console.log('Name set:', name);
//     if (!admin) {
//       admin = socket.id;
//       socket.emit('setAdmin', true);
//     }
//     cursors[socket.id] = { name, x: 0, y: 0 };
//     io.emit('updateCursors', cursors);
//   });

//   socket.on('cursorMove', (data) => {
//     if (cursors[socket.id]) {
//       cursors[socket.id] = { ...cursors[socket.id], ...data };
//       io.emit('updateCursors', cursors);  // Emit to all connected clients
//     }
//   });
//   socket.on('disconnect', () => {
//     console.log('Client disconnected:', socket.id);
//     delete cursors[socket.id];
//     if (socket.id === admin) {
//       admin = Object.keys(cursors)[0] || null;
//       if (admin) {
//         io.to(admin).emit('setAdmin', true);
//       }
//     }
//     io.emit('updateCursors', cursors);
//   });
// });

// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

let admin = null;
const cursors = {};
let flow = {
  nodes: [
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
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
  ],
};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('setName', (name) => {
    console.log('Name set:', name);
    if (!admin) {
      admin = socket.id;
      socket.emit('setAdmin', true);
    }
    cursors[socket.id] = { name, x: 0, y: 0 };
    socket.emit('updateFlow', flow);
    io.emit('updateCursors', cursors);
  });

  socket.on('flowUpdate', (updatedFlow) => {
    flow = updatedFlow;
    socket.broadcast.emit('updateFlow', flow);
  });

  socket.on('cursorMove', (data) => {
    if (cursors[socket.id]) {
      cursors[socket.id] = { ...cursors[socket.id], ...data };
      io.emit('updateCursors', cursors);

    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete cursors[socket.id];
    if (socket.id === admin) {
      admin = Object.keys(cursors)[0] || null;
      if (admin) {
        io.to(admin).emit('setAdmin', true);
      }
    }
    io.emit('updateCursors', cursors);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));