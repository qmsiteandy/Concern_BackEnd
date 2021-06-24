const express = require('express');
const cors = require('cors')
const mongoose = require('mongoose');
const http = require("http");

require('dotenv').config();

mongoose.connect(process.env.MONGODB_ATLAS_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const app = express();
const server = http.createServer(app);

//socket監聽server
const io = require("socket.io")(server);
app.set('io', io);

//當新的client建立連線
io.on("connection", function (socket) {
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const teacherRouter = require("./routers/teacherRouter");
const courseRouter = require("./routers/courseRouter");
const classroomRouter = require("./routers/classroomRouter");
const studentRouter = require("./routers/studentRouter");


app.use("/api/teacher", teacherRouter);
app.use("/api/course", courseRouter);
app.use("/api/classroom", classroomRouter);
app.use("/api/student", studentRouter);

app.get("/", (req, res) => { res.send("Server is ready！！"); }); 

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Serve at http://localhost:${port}`);
});