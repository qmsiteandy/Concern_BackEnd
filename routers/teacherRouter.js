const express = require('express');
const expressAsyncHandler = require("express-async-handler");
const Teacher = require('../models/teacherModel');
const Course = require('../models/courseModel');
const teacherRouter = express.Router();
const { response } = require('express');

teacherRouter.post(
  "/getTeacherData",
  expressAsyncHandler(async (req, res) => {
    const { teacherDataID } = req.body;

    teacher = await Teacher.findById(teacherDataID);
    if(teacher){
      res.send({
        "teacherName": teacher.teacherName,
        "teacherID": teacher.teacherID,
        "courses": teacher.courses
      })
    }else{
      res.send("尚無此位老師");
    }
  })
);

teacherRouter.post(
  "/teacherRegister",
  expressAsyncHandler(async (req, res) => {
    const { teacherName, teacherID } = req.body;

    const teacher = await Teacher.findOne({ teacherID });
    if (teacher) {
      res.send({"teacherDataID": teacher.id});
    } else {
      const newTeacher = new Teacher({
        teacherName: teacherName,
        teacherID: teacherID,
      });
      const uploadedTeacher = await newTeacher.save();
      res.send({
        "teacherDataID" : uploadedTeacher.id,
        "teacherName": uploadedTeacher.teacherName,
        "teacherID": uploadedTeacher.teacherID,
      })
    }
  })
);

teacherRouter.post(
  "/addCourse",
  expressAsyncHandler(async (req, res) => {
    const { teacherDataID, courseName } = req.body;

    teacher = await Teacher.findById(teacherDataID);
    if(teacher){
      var courseExisted = false;
      teacher.courses.forEach(element => {
        if(element.courseName == courseName) courseExisted = true;
      });

      if(courseExisted){res.send("此課程已存在");}
      else{
        const newCourse = new Course({
          "teacherName": teacher.teacherName,
          "teacherID": teacher.teacherID,
          "courseName": courseName
        })
        const uploadedCourse = await newCourse.save();
        teacher.courses.push({
            "courseDataID": uploadedCourse.id,
            "courseName": uploadedCourse.courseName
        })
        const uploadedTeacher = await teacher.save()
        res.send({
          "teacherName": uploadedTeacher.teacherName,
          "teacherID": uploadedTeacher.teacherID,
          "courses": uploadedTeacher.courses
        });
      }
    }else{
      res.send("尚無此位老師");
    }
  })
);




// teacherRouter.post(
//   "/startClass",
//   expressAsyncHandler(async (req, res) => {
//     const { classroomID, startTime } = req.body;

//     const classroom = await Classroom.findOne({ classroomID });
//     if (classroom) {
//       classroom.startTime = startTime;
//       classroom.endTime = "";
//       classroom.isClassing = true;
//       const updatedClassroom = await classroom.save();
//     } else {
//       const newClassroom = new Classroom({
//         classroomID: classroomID,
//         startTime: startTime,
//         endTime: "",
//         isClassing: true
//       });
//       const updatedClassroom = await newClassroom.save();
//     }
//     res.send("課堂初始化成功");
//   })
// );

// teacherRouter.post(
//   "/endClass",
//   expressAsyncHandler(async (req, res) => {
//     const { classroomID, endTime } = req.body;

//     const classroom = await Classroom.findOne({ classroomID });
//     if (classroom) {
//       classroom.endTime = endTime;
//       classroom.isClassing = false;
//       const updatedClassroom = await classroom.save();
//     }
//     res.send("課堂結束");
//   })
// );


module.exports = teacherRouter;