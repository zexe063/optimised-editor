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
let flow = null;

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('setName', (name) => {
    console.log('Name set:', name);
    if (!admin) {
      admin = socket.id;
      socket.emit('setAdmin', true);
    }
    cursors[socket.id] = { name, x: 0, y: 0 };
    io.emit('updateCursors', cursors);
  });

  socket.on('requestFlow', () => {
    if (flow) {
      socket.emit('updateFlow', flow);
    }
  });

  socket.on('flowUpdate', (updatedFlow) => {
    flow = updatedFlow;
    socket.broadcast.emit('updateFlow', flow);
  });

  socket.on('cursorMove', (data) => {
    if (cursors[socket.id]) {
      cursors[socket.id] = { ...cursors[socket.id], ...data };
      socket.broadcast.emit('updateCursors', { [socket.id]: cursors[socket.id] });
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