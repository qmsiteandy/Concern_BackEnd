const express = require('express');
const expressAsyncHandler = require("express-async-handler");
const Teacher = require('../models/teacherModel');
const Course = require("../models/courseModel");
const Classroom = require('../models/classroomModel');
const teacherRouter = express.Router();
const { response } = require('express');

const concernLimit0 = 0.5, concernLimit1 = 0.8;

teacherRouter.post(
  "/getTeacherData",
  expressAsyncHandler(async (req, res) => {
    const { teacherDataID } = req.body;
    const teacher = await Teacher.findById(teacherDataID);
    if (teacher) {
      res.status(200).send({teacher});
    } else {
      res.status(404).send("尚無此位教師");
    }
  })
);

//#region ==========課程部分==========

teacherRouter.post(
  "/openClassroom",
  expressAsyncHandler(async (req, res) => {
    const { teacherName, classroomMeetID } = req.body;

    newTime = new Date();
    let date = newTime.getFullYear() + "/" + (newTime.getMonth()+1) + "/" + newTime.getDate()
    switch(newTime.getDay()){ 
      case 0: date += " (日)"; break;
      case 1: date += " (一)"; break;
      case 2: date += " (二)"; break;
      case 3: date += " (三)"; break;
      case 4: date += " (四)"; break;
      case 5: date += " (五)"; break;
      case 6: date += " (六)"; break;
    }
    
    const newClassroom = new Classroom({
      teacherName: teacherName,
      classroomMeetID: classroomMeetID,
      date: date,
      startTime: null,
      endTime: null
    });

    const updatedClassroom = await newClassroom.save();
    res.status(201).send({classroomDataID: updatedClassroom._id});

  })
);

teacherRouter.post(
  "/closeClassroom",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;

    const classroom = await Classroom.findById(classroomDataID);
    if(classroom){
      if(classroom.isLinkToCourse == false){
        //未完成，Classroom.remove({"_id" : ObjectId(classroomDataID)});
        res.status(200).send("教室刪除");
      }else{
        res.status(200).send("教室關閉");
      }
    }else{
      res.status(404).send("無此教室資訊");
    }
  })
);

teacherRouter.post(
  "/startClass",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;

    const classroom = await Classroom.findById(classroomDataID);
    if(classroom){
      classroom.startTime = Date.now(),  //以UNIX時間格式儲存
      classroom.isClassing = true

      const updatedClassroom = await classroom.save();
      
      res.status(200).send("課程開始");

    }else{
      res.status(404).send("無此教室資訊");
    }
  })
);

teacherRouter.post(
  "/endClass",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;

    const classroom = await Classroom.findById(classroomDataID);
    if (classroom) {
      classroom.endTime = Date.now(),  //以UNIX時間格式儲存
      classroom.isClassing = false;
      const updatedClassroom = await classroom.save();
      res.status(200).send("課程結束");
    }
    else{
      res.status(404).send("無此教室資訊");
    }
  })
);

teacherRouter.post(
  "/startRest",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;

    const classroom = await Classroom.findById(classroomDataID);
    if(classroom){
      if(classroom.isClassing){
        if(!classroom.isResting){
          classroom.isResting = true;
          classroom.restTime.push({
            "restStartTime": Date.now(),  //以UNIX時間格式儲存
            "restEndTime": ""
          })
          await classroom.save();
        }
        res.status(200).send("下課休息時間");
      }else{
        res.status(403).send("課堂尚未開始");
      }
    }else{
      res.status(404).send("無此教室資訊");
    }
  })
);

teacherRouter.post(
  "/endRest",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;

    const classroom = await Classroom.findById(classroomDataID);
    if(classroom){
      if(classroom.isClassing){
        if(classroom.isResting){
          classroom.isResting = false;

          let updateRest = classroom.restTime[classroom.restTime.length-1];
          updateRest.restEndTime = Date.now();  //以UNIX時間格式儲存
          classroom.restTime.splice(classroom.restTime.length-1, 1, updateRest);
          
          const uploadedClassroom = await classroom.save();
          res.status(200).send("下課時間結束");
        }else{
          res.status(400).send("非下課時間");
        }
      }else{
        res.status(403).send("課堂尚未開始");
      }
    }else{
      res.status(404).send("無此教室資訊");
    }
  })
);

teacherRouter.post(
  "/getAllNewData",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;
    const classroom = await Classroom.findById(classroomDataID);
    if(classroom){
      let dataList = new Array();
      classroom.classmates.map(classmate => {
        dataList.push({
          "studentName": classmate.studentName,
          "studentGoogleName": classmate.studentGoogleName,
          "studentID": classmate.studentID,
          "newConcernDegree": classmate.newConcernDegree,
        })
      })
      res.status(200).send(dataList);

    }else{
      res.status(404).send("無此教室資訊");
    }
  })
)

//#endregion ==========課程部分==========



//#region ==========進階功能==========

teacherRouter.post(
  "/teacherRegisterLogin",
  expressAsyncHandler(async (req, res) => {
    const { teacherName, teacherID } = req.body;

    if(teacherName == "" || teacherID =="") res.status(400).send("缺少老師姓名或ID");
    else{
      const teacher = await Teacher.findOne({ 
        $and: [
          {'teacherName': teacherName}, 
          {'teacherID': teacherID}
        ] 
      });

      console.log(teacher);

  
      let result = {
        teacherDataID: null,
        teacherName: null,
        teacherID: null,
        courses: new Array(),
        lastCourseDataID: null,
        lastClassroomDataID: null
      }
  
      if (teacher) {
        result.teacherDataID = teacher._id;
        result.teacherName = teacher.teacherName;
        result.teacherID = teacher.teacherID;
        result.courses = teacher.courses;
  
        if(teacher.courses.length > 0){
          
          result.lastCourseDataID = teacher.courses[teacher.courses.length-1].courseDataID;
  
          const lastCourse = await Course.findById( result.lastCourseDataID);
  
          if(lastCourse.courseWeeks.length > 0){
            result.lastClassroomDataID = lastCourse.courseWeeks[0].classroomDataID;
          }
        }
  
        res.status(201).send(result);
  
      } else {
        const newTeacher = new Teacher({
          teacherName: teacherName,
          teacherID: teacherID,
        });
  
        const uploadedTeacher = await newTeacher.save();
  
        result.teacherDataID = uploadedTeacher._id;
        result.teacherName = uploadedTeacher.teacherName;
        result.teacherID = uploadedTeacher.teacherID;
  
        res.status(201).send(result);
      }
    }
  })
);


//#endregion ==========進階功能==========


// teacherRouter.post(
//   "/getClassmatesList",
//   expressAsyncHandler(async (req, res) => {
//     const { classroomMeetID } = req.body;
//     let NameList = new Array
//     let IDList = new Array;
//     let DataIDList = new Array;
//     let classroomCount = 0;

//     const classroom = await Classroom.findOne({ classroomMeetID });
//     const classmates = await Classmate.find({
//       "_id" : {
//         "$in" : classroom.studentDataIDList
//        }
//     });

//     classroomCount = classroom.studentDataIDList.length
//     classmates.map(classmate =>{
//       NameList.push(classmate.studentName);
//       IDList.push(classmate.studentID);
//       DataIDList.push(classmate.id);
//     })

//     res.send({
//       NameList,
//       IDList,
//       DataIDList
//     });
//   })
// )

module.exports = teacherRouter;