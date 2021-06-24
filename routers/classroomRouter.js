const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classroom = require("../models/classroomModel");
const classroomRouter = express.Router();
const { response } = require("express");

classroomRouter.post(
  "/getCourseData",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;
    const classroom = await Classroom.findById(classroomDataID);
    if (classroom) {
      res.status(200).send({ classroom });
    } else {
      res.status(404).send("尚無此教室");
    }
  })
);

classroomRouter.post(
  "/startRollcall",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, duration } = req.body;
    const classroom = await Classroom.findById(classroomDataID);
    if (classroom) {
      
      if (!classroom.rollcallTime) classroom.rollcallTime = new Array();
      rollcallIndex = classroom.rollcallTime.length;

      classroom.rollcallTime.push( GetTime_H_M());

      const updatedClassroom = await classroom.save();

      const io = req.app.get("io");
      io.to(classroomDataID).emit("rollcallStart", {
        duration: duration,
        rollcallIndex: rollcallIndex,
      });

      res.status(200).send("第" + (rollcallIndex+1) + "次點名 ：" + duration + "s");
    } else {
      res.status(404).send("尚無此教室");
    }
  })
);

function GetTime_H_M(){
    newTime = new Date();
    return newTime.getHours() + ":" + ((newTime.getMinutes() < 10 ? '0' : '') + newTime.getMinutes());
}

module.exports = classroomRouter;
