const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classroom = require("../models/classroomModel");
const classroomRouter = express.Router();
const { response } = require("express");

classroomRouter.post(
    "/addStudent",
    expressAsyncHandler(async (req, res) => {
      const { courseDataID, studentName, studentGoogleName, studentID } =
        req.body;
      const course = await Course.findById(courseDataID);
      if (course) {
        var studentExisted = false;
        course.classmates.forEach((element) => {
          if (element.studentID == studentID) studentExisted = true;
        });
  
        if (studentExisted == true) res.send("此學生已存在");
        else {
          course.classmates.push({
            studentName: studentName,
            studentGoogleName: studentGoogleName || "",
            studentID: studentID,
          });
          //將學生名單依照學號排序
          course.classmates = ClassmatesSorting(course.classmates);
  
          const uploadedCourse = await course.save();
          res.send(uploadedCourse.classmates);
        }
      } else {
        res.send("尚無此堂課程");
      }
    })
  );



module.exports = classroomRouter;