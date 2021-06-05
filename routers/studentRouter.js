const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classmate = require("../models/studentModel");
const Classroom = require("../models/classroomModel");
const studentRouter = express.Router();
const { response } = require("express");

studentRouter.post(
  "/startClass",
  expressAsyncHandler(async (req, res) => {
    const { classroomID, studentName, studentID } = req.body;

    var studentDataID = "";

    const classmate = await Classmate.findOne({ studentName });

    if(classmate){
      studentDataID = classmate.id;
      if(classmate.lastedClassroom !== classroomID){
        classmate.newConcernDegree = 0;
        classmate.concernDegreeArray = [];
        classmate.timeLineArray = [];
        classmate.lastedClassroom = classroomID;
        await classmate.save();
      }
    }
    else{
      const newClassmate = new Classmate({
        studentName:studentName,
        studentID: studentID,
        newConcernDegree: 0,
        concernDegreeArray: new Array(),
        timeLineArray: new Array(),
        lastedClassroom: classroomID
      });
      const createdClassmate = await newClassmate.save();
      studentDataID = createdClassmate.id;
    }

    const classroom = await Classroom.findOne({ classroomID });
    if (classroom) {
      if (
        !classroom.studentDataIDList.find(
          (element) => element === studentDataID
        )
      ) {
        classroom.studentDataIDList.push(studentDataID);
      }
      const updatedClassroom = await classroom.save();
    } else {
      const newClassroom = new Classroom({
        classroomID: classroomID,
      });
      newClassroom.studentDataIDList.push(studentDataID);
      const updatedClassroom = await newClassroom.save();
    }

    res.send(studentDataID);
  })
);


studentRouter.put(
  "/update",
  expressAsyncHandler(async (req, res) => {
    const {classroomID, DataID, concernDegree, time,} = req.body;
    const classroom = await Classroom.findOne({ classroomID });

    if (classroom && classroom.isClassing === true) {
      const classmate = await Classmate.findById(DataID);
      if (classmate) {
        classmate.newConcernDegree = concernDegree;
        classmate.concernDegreeArray.push(concernDegree);
        classmate.timeLineArray.push(time);

        const updatedClassmate = await classmate.save();
        res.send("資料上傳成功");
      } else {
        res.send("無此學生，請確認姓名學號是否正確");
      }
    } else {
      res.send("此課堂尚未開始");
    }
  })
);

studentRouter.post(
  "/getPersonConcernDiagram",
  expressAsyncHandler(async (req, res) => {
    const { classroomID, DataID, timeSpacing } = req.body;
    var newConcernArray = new Array;
    var concernAdder = 0;
    var newTimeArray = new Array;
    var dataCount = 0;
    var dataMax = timeSpacing;

    const classmate = await Classmate.findById(DataID);
    
    for (var i = 0; i < classmate.concernDegreeArray.length; i++) {
      if (dataCount < dataMax) {
        concernAdder += (Number)(classmate.concernDegreeArray[i]);
        dataCount += 1;
      }
      if (dataCount >= dataMax || i >= (classmate.concernDegreeArray.length - 1)) {

        var judgedConcern = 0;
        if ((concernAdder / dataCount) > 1) judgedConcern = 1;
        else if ((concernAdder / dataCount) < 0) judgedConcern = 0;
        else judgedConcern = (Math.round((concernAdder / dataCount) * 10)) / 10;

        newConcernArray.push(judgedConcern);
        newTimeArray.push(classmate.timeLineArray[i]);
        dataCount = 0;
        concernAdder = 0;
      }
    }

    res.send({
      "studentName": classmate.studentName,
      "concernArray": newConcernArray,
      "timeLineArray": newTimeArray
    });
  })
)

function DateToInt(dateString) {
  if (typeof dateString != "string") {
    return dateString;
  }

  var newDateString = "";
  var index = 0;

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

  var newDateString = "";

  if (number % 100 >= 60) {
    number += 40;
  }
  if (number % 10000 >= 6000) {
    number += 4000;
  }
  if (number / 10000 >= 24) {
    number -= 240000;
  }

  var hour = parseInt(number / 10000);
  if (hour >= 10) newDateString += hour;
  else if (hour === 0) newDateString += "00";
  else {
    newDateString += "0";
    newDateString += hour;
  }

  newDateString += ":";

  var min = parseInt((number % 10000) / 100);
  if (min >= 10) newDateString += min;
  else if (min === 0) newDateString += "00";
  else {
    newDateString += "0";
    newDateString += min;
  }

  newDateString += ":";

  var second = parseInt(number % 100);
  if (second >= 10) newDateString += second;
  else if (second === 0) newDateString += "00";
  else {
    newDateString += "0";
    newDateString += second;
  }

  return newDateString;
}

module.exports = studentRouter;
