const express = require('express');
const expressAsyncHandler = require("express-async-handler");
const Teacher = require('../models/teacherModel');
const Course = require('../models/courseModel');
const Classroom = require('../models/classroomModel');
const teacherRouter = express.Router();
const { response } = require('express');


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
    
    const newClassroom = new Classroom({
      teacherName: teacherName,
      classroomMeetID: classroomMeetID,
      date: newTime.getFullYear() + "/" + (newTime.getMonth()+1) + "/" + newTime.getDate(),
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
      classroom.startTime = GetTime_H_M(),
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
      classroom.endTime = GetTime_H_M(),
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
            "restStartTime": GetTime_H_M(),
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
          updateRest.restEndTime = GetTime_H_M();
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

    if(!teacherName || !teacherID) res.status(400).send("缺少老師姓名或ID");

    const teacher = await Teacher.findOne({ 
      $and: [{
        'teacherName': teacherName
      }, {
       'teacherID': teacherID
      }] });

    if (teacher) {
      res.status(201).send({
        "teacherDataID": teacher._id,
        "teacherName": teacher.teacherName,
        "teacherID": teacher.teacherID,
        "courses": teacher.courses
      });
    } else {
      const newTeacher = new Teacher({
        teacherName: teacherName,
        teacherID: teacherID,
      });
      const uploadedTeacher = await newTeacher.save();
      res.status(201).send({
        "teacherDataID": uploadedTeacher._id,
        "teacherName": uploadedTeacher.teacherName,
        "teacherID": uploadedTeacher.teacherID,
        "courses": uploadedTeacher.courses
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
      let courseExisted = false;
      teacher.courses.forEach(element => {
        if(element.courseName == courseName) courseExisted = true;
      });

      if(courseExisted){res.status(403).send("此課程已存在");}
      else{
        const newCourse = new Course({
          "teacherName": teacher.teacherName,
          "teacherID": teacher.teacherID,
          "courseName": courseName
        })
        const uploadedCourse = await newCourse.save();

        teacher.courses.push({
            "courseDataID": uploadedCourse._id,
            "courseName": uploadedCourse.courseName
        })
        const uploadedTeacher = await teacher.save()

        res.status(201).send({
          "teacherName": uploadedTeacher.teacherName,
          "teacherID": uploadedTeacher.teacherID,
          "courses": uploadedTeacher.courses
        });
      }
    }else{
      res.status(404).send("尚無此位老師");
    }
  })
);
//#endregion ==========進階功能==========

function GetTime_H_M(){
  newTime = new Date();
  return newTime.getHours() + ":" + ((newTime.getMinutes() < 10 ? '0' : '') + newTime.getMinutes());
}


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

// teacherRouter.post(
//   "/getPersonConcernDiagram",
//   expressAsyncHandler(async (req, res) => {
//     const { classroomMeetID, DataID, timeSpacing } = req.body;
//     let newConcernArray = new Array;
//     let concernAdder = 0;
//     let newTimeArray = new Array;
//     let dataCount = 0;
//     let dataMax = timeSpacing;

//     const classmate = await Classmate.findById(DataID);
    
//     for (let i = 0; i < classmate.concernDegreeArray.length; i++) {
//       if (dataCount < dataMax) {
//         concernAdder += (Number)(classmate.concernDegreeArray[i]);
//         dataCount += 1;
//       }
//       if (dataCount >= dataMax || i >= (classmate.concernDegreeArray.length - 1)) {

//         let judgedConcern = 0;
//         if ((concernAdder / dataCount) > 1) judgedConcern = 1;
//         else if ((concernAdder / dataCount) < 0) judgedConcern = 0;
//         else judgedConcern = (Math.round((concernAdder / dataCount) * 10)) / 10;

//         newConcernArray.push(judgedConcern);
//         newTimeArray.push(classmate.timeLineArray[i]);
//         dataCount = 0;
//         concernAdder = 0;
//       }
//     }

//     res.send({
//       "studentName": classmate.studentName,
//       "concernArray": newConcernArray,
//       "timeLineArray": newTimeArray
//     });
//   })
// )


// teacherRouter.post(
//   "/getAllConcernCalcDiagram",
//   expressAsyncHandler(async (req, res) => {

//     const { classroomMeetID, timeSpacing } = req.body;
//     const classroom = await Classroom.findOne({ classroomMeetID });
//     if (!classroom) {
//       res.send("無此課堂資訊");
//     }

//     const concernLimit1 = 0.5;
//     const concernLimit2 = 0.8;

//     const startTime = classroom.startTime;
//     const endTime = classroom.endTime;

//     let newTimelineArray = new Array;
//     do {
//       if (newTimelineArray.length === 0) {
//         newTimelineArray.push(DateToInt(startTime))
//       }
//       else {
//         let newTime = newTimelineArray[newTimelineArray.length - 1] + timeSpacing;

//         if (newTime % 100 >= 60) { newTime += 40; }
//         if (newTime % 10000 >= 6000) { newTime += 4000; }
//         if (newTime / 10000 >= 24) { newTime -= 240000; }

//         if (newTime > DateToInt(endTime)) newTime = DateToInt(endTime)

//         newTimelineArray.push(newTime);
//       }
//     } while (newTimelineArray[newTimelineArray.length - 1] < DateToInt(endTime));

//     let redConcernCountArray = new Array(newTimelineArray.length);
//     let yellowConcernCountArray = new Array(newTimelineArray.length);
//     let greenConcernCountArray = new Array(newTimelineArray.length);
//     redConcernCountArray.fill(0);
//     yellowConcernCountArray.fill(0);
//     greenConcernCountArray.fill(0);

//     const classmates = await Classmate.find({
//       "_id" : {
//         "$in" : classroom.studentDataIDList
//        }
//     });
//     classmates.map(classmate => {
//       let concernAdder = 0;
//       let dataCount = 0;
//       let index = 0;

//       for (let i = 0; i < classmate.timeLineArray.length; i++) {
//         if (DateToInt(classmate.timeLineArray[i]) >= newTimelineArray[index] && DateToInt(classmate.timeLineArray[i]) < newTimelineArray[index + 1]) {
//           concernAdder += (Number)(classmate.concernDegreeArray[i]);
//           dataCount += 1;
//         }
//         else if (DateToInt(classmate.timeLineArray[i]) >= newTimelineArray[index + 1]) {
//           let averageConcern = concernAdder / dataCount;
//           if (averageConcern < concernLimit1) redConcernCountArray[index] += 1;
//           else if (averageConcern >= concernLimit1 && averageConcern < concernLimit2) { yellowConcernCountArray[index] += 1; }
//           else greenConcernCountArray[index] += 1;

//           concernAdder = 0; dataCount = 0;
//           index += 1;
//         }
//       }
//     })

//     for (let i = 0; i < newTimelineArray.length; i++) {
//       newTimelineArray[i] = IntToDate(newTimelineArray[i]);
//     }

//     res.send({
//       timelineArray: newTimelineArray,
//       redConcernCountArray: redConcernCountArray,
//       yellowConcernCountArray: yellowConcernCountArray,
//       greenConcernCountArray: greenConcernCountArray
//     });
//   })
// )

// function DateToInt(dateString) {

//   if (typeof dateString != "string") { return dateString; }

//   let newDateString = "";
//   let index = 0;

//   do {
//     if (dateString[index + 1] === ":") {
//       newDateString += "0";
//       newDateString += dateString[index];
//       index += 2;
//     }
//     else if (index >= dateString.length - 1) {
//       newDateString += "0";
//       newDateString += dateString[index];
//       index += 2;
//     }
//     else if (dateString[index] != ":" && dateString[index + 1] != ":") {
//       newDateString += dateString[index];
//       newDateString += dateString[index + 1];
//       index += 3;
//     }
//   } while (index < dateString.length);

//   return (Number)(newDateString);
// }
// function IntToDate(number) {

//   if (typeof number != "number") { console.log("NOT"); return number; }

//   let newDateString = "";

//   let hour = parseInt(number / 10000);
//   if (hour >= 10) newDateString += hour;
//   else if (hour === 0) newDateString += "00";
//   else { newDateString += "0"; newDateString += hour };

//   newDateString += ":";

//   let min = parseInt((number % 10000) / 100);
//   if (min >= 10) newDateString += min;
//   else if (min === 0) newDateString += "00";
//   else { newDateString += "0"; newDateString += min };

//   newDateString += ":";

//   let second = parseInt(number % 100);
//   if (second >= 10) newDateString += second;
//   else if (second === 0) newDateString += "00";
//   else { newDateString += "0"; newDateString += second };


//   return newDateString;
// }



module.exports = teacherRouter;