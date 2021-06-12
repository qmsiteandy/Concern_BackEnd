const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classroom = require("../models/classroomModel");
const studentRouter = express.Router();
const { response } = require("express");

studentRouter.post(
  "/enterClassroom",
  expressAsyncHandler(async (req, res) => {
    const { classroomMeetID, studentName, studentID } = req.body;

    newTime = new Date();
    const classroom = await Classroom.findOne({
      'classroomMeetID': classroomMeetID
    }).sort({$natural:-1});

    if(classroom){
      let indexInList = classroom.classmates.findIndex(element => (element.studentName == studentName && element.studentID == studentID));
      if(indexInList == -1){
        const newClassmate = {
          studentName:studentName,
          studentID: studentID,
          rollcall: new Array(),
          personalLeave: false,
          newConcernDegree: 0,
          concernDegreeArray: new Array(),
          timeLineArray: new Array()
        };
        classroom.classmates.push(newClassmate);
        const uploadedClassroom = await classroom.save();
        res.send({
          "classroomDataID": classroom._id,
          "indexInList":uploadedClassroom.classmates.length-1
        });
      }else{
        res.send({
          "classroomDataID": classroom._id,
          "indexInList":indexInList
        });
      }
    }else{
      res.send("此教室尚未開啟");
    }
  })
);

studentRouter.put(
  "/upload",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, indexInList, concernDegree } = req.body;
    const classroom = await Classroom.findById(classroomDataID);

    if(classroom){
      if(classroom.isClassing == false) res.send("課程尚未開始");
      else if(classroom.isResting == true) res.send("下課休息時間");
      else{
        let updateClassmate = classroom.classmates[indexInList];

        updateClassmate.newConcernDegree = concernDegree;
        updateClassmate.concernDegreeArray.push(concernDegree);
        newTime = new Date();
        updateClassmate.timeLineArray.push(newTime.getHours() + ":" + newTime.getMinutes());

        classroom.classmates.splice(indexInList, 1, updateClassmate);

        const updatedClassroom = await classroom.save();
        res.send("上傳成功");
      }
    }else{
      res.send("無此課堂教室");
    }
  })
);

// studentRouter.post(
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

function DateToInt(dateString) {
  if (typeof dateString != "string") {
    return dateString;
  }

  let newDateString = "";
  let index = 0;

  do {
    if (dateString[index + 1] === ":") {
      newDateString += "0";
      newDateString += dateString[index];
      index += 2;
    } else if (index >= dateString.length - 1) {
      newDateString += "0";
      newDateString += dateString[index];
      index += 2;
    } else if (dateString[index] != ":" && dateString[index + 1] != ":") {
      newDateString += dateString[index];
      newDateString += dateString[index + 1];
      index += 3;
    }
  } while (index < dateString.length);

  return Number(newDateString);
}
function IntToDate(number) {
  if (typeof number != "number") {
    console.log("NOT");
    return number;
  }

  let newDateString = "";

  if (number % 100 >= 60) {
    number += 40;
  }
  if (number % 10000 >= 6000) {
    number += 4000;
  }
  if (number / 10000 >= 24) {
    number -= 240000;
  }

  let hour = parseInt(number / 10000);
  if (hour >= 10) newDateString += hour;
  else if (hour === 0) newDateString += "00";
  else {
    newDateString += "0";
    newDateString += hour;
  }

  newDateString += ":";

  let min = parseInt((number % 10000) / 100);
  if (min >= 10) newDateString += min;
  else if (min === 0) newDateString += "00";
  else {
    newDateString += "0";
    newDateString += min;
  }

  newDateString += ":";

  let second = parseInt(number % 100);
  if (second >= 10) newDateString += second;
  else if (second === 0) newDateString += "00";
  else {
    newDateString += "0";
    newDateString += second;
  }

  return newDateString;
}

module.exports = studentRouter;
