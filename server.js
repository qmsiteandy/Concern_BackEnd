const express = require("express");
const app = express();
const routes = require("./routes");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const server = http.createServer(app);

// MongoDB 連線
mongoose
  .connect(process.env.MONGODB_CONNECT_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connect successfully!");
  })
  .catch((e) => {
    console.log(e);
  });

//socket監聽server
const io = require("socket.io")(server);
app.set("io", io);

// socket 連線：當新的client建立連線
io.on("connection", function (socket) {
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//設定API路徑
app.use("/api/student", routes.studentRouter);
app.use("/api/teacher", routes.teacherRouter);
app.use("/api/classroom", routes.classroomRouter);
app.use("/api/course", routes.courseRouter);

//伺服器回應
app.get("/", (req, res, next) => {
  res.send("Server is ready");
});

// Error Handler
app.use((err, req, res, next) => {
  console.log(err);
  return res.status(500).send({ error: "Something is wrong. Error: " + err });
});

//設定監聽PORT
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on PORT ${port}`);
});
