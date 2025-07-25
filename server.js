const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes=require('./routes/authRoute');
const profileRoutes = require('./routes/profileRoute');

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: "*" }
});

// Attach Socket.IO to app
app.set('io', io);

app.use(cors());
app.use(express.json());


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected')
  })
  .catch((err) => {
    console.log('Mongo Error:', err)}
);

app.use('/api',profileRoutes);
app.use('/api',authRoutes);


// Socket.IO connection
io.on('connection', (socket) => {
  console.log(' Socket connected:', socket.id);

  socket.on('disconnect', () => {
    console.log(' Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
});
