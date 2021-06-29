const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classroom = require("../models/classroomModel");
const studentRouter = express.Router();
const { response } = require("express");

studentRouter.post(
  "/enterClassroom",
  expressAsyncHandler(async (req, res) => {
    const { classroomMeetID, studentName, studentID } = req.body;

    const classroom = await Classroom.findOne({
      'classroomMeetID': classroomMeetID
    }).sort({$natural:-1}); //尋找最後一個

    if(classroom){
      let indexInList = classroom.classmates.findIndex(element => (element.studentName == studentName && element.studentID == studentID));
      //此學生尚未在名單中，需創建
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
        res.status(201).send({
          "classroomDataID": classroom._id,
          "indexInList":uploadedClassroom.classmates.length-1
        });
      //此學生已在名單中，不需再創建
      }else{
        res.status(201).send({
          "classroomDataID": classroom._id,
          "indexInList":indexInList
        });
      }
    }else{
      res.status(404).send("此教室尚未開啟");
    }
  })
);

studentRouter.put(
  "/upload",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, indexInList, concernDegree } = req.body;
    const classroom = await Classroom.findById(classroomDataID);

    if(classroom){
      if(classroom.isClassing == false) res.status(400).send("課程尚未開始");
      else if(classroom.isResting == true) res.status(401).send("下課休息時間");
      else{
        let updateClassmate = classroom.classmates[indexInList];

        updateClassmate.newConcernDegree = concernDegree;
        updateClassmate.concernDegreeArray.push(concernDegree);
        updateClassmate.timeLineArray.push(Date.now()); //以UNIX時間格式儲存

        // //製作測試數據
        // let newTime = Date.now();
        // for(let i = 0; i<1000; i++){
        //   newTime += 250;
        //   updateClassmate.concernDegreeArray.push(Math.random());
        //   updateClassmate.timeLineArray.push(Math.floor(newTime)); //以UNIX時間格式儲存
        // }
        
        classroom.classmates.splice(indexInList, 1, updateClassmate);

        const updatedClassroom = await classroom.save();
        res.status(200).send("上傳成功");
      }
    }else{
      res.status(404).send("無此課堂教室");
    }
  })
);

studentRouter.post(
  "/rollcall",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, indexInList } = req.body;
    const classroom = await Classroom.findById(classroomDataID);

    if(classroom){

      let rollcallIndex = classroom.rollcallTime.length -1;
      
      let updateClassmate = classroom.classmates[indexInList];

      while(updateClassmate.rollcall.length <= rollcallIndex){
        if(rollcallIndex - updateClassmate.rollcall.length > 0)
          updateClassmate.rollcall.push(false);
        else
          updateClassmate.rollcall.push(true);
      }
      
      classroom.classmates.splice(indexInList, 1, updateClassmate);
      const updatedClassroom = await classroom.save();

      let result = new Array();
      for(let i = 0; i < updatedClassroom.rollcallTime.length; i++){
        result.push({
          "rollcallIndex": i,
          "rollcallTime": updatedClassroom.rollcallTime[i],
          "rollcallStatus": updatedClassroom.classmates[indexInList].rollcall[i]
        })
      }
      res.status(200).send(result);
    }else{
      res.status(404).send("無此課堂教室");
    }
  })
);

studentRouter.post(
  "/getPersonConcernDiagram",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, indexInList, timeSpacing } = req.body;
    let newConcernArray = new Array;
    let newTimeArray = new Array;
    let concernAdder = 0;
    let aveCounter = 0;
    let dataIndex = 0;
    let timeSpacing_second = timeSpacing * 1000;

    const classroom = await Classroom.findById(classroomDataID);

    if(classroom){
      let classmate = classroom.classmates[indexInList];
      let endTime = classroom.endTime || classmate.timeLineArray[classmate.timeLineArray.length-1];

      do{
        if(newTimeArray.length == 0 ) newTimeArray.push(classroom.startTime);
        else newTimeArray.push(newTimeArray[newTimeArray.length-1] + timeSpacing_second);

        while(classmate.timeLineArray[dataIndex] < newTimeArray[newTimeArray.length-1] + timeSpacing_second){
          concernAdder += classmate.concernDegreeArray[dataIndex];
          aveCounter += 1;
          
          dataIndex += 1;
        }
        
        newConcernArray.push(concernAdder/aveCounter);
        concernAdder = 0;
        aveCounter = 0;

      }while(newTimeArray[newTimeArray.length-1] + timeSpacing_second < endTime)

      for(let i = 0; i < newTimeArray.length; i++){
        newTimeArray[i] = ConvertDateNumberToTimeString(timeSpacing, newTimeArray[i]);
      }

      res.send({
        "studentName": classmate.studentName,
        "concernArray": newConcernArray,
        "timeLineArray": newTimeArray
      });
      
    }else{
      res.status(404).send("無此課堂教室");
    }
  })
)

function ConvertDateNumberToTimeString(timeSpacing, dateNumber){
  newTime = new Date(dateNumber);

  if(timeSpacing > 60) return newTime.getHours() + ":" + ((newTime.getMinutes() < 10 ? '0' : '') + newTime.getMinutes());
  else return newTime.getHours() + ":" + ((newTime.getMinutes() < 10 ? '0' : '') + newTime.getMinutes()) + ":" + ((newTime.getSeconds() < 10 ? '0' : '') + newTime.getSeconds());
}

// function DateToInt(dateString) {
//   if (typeof dateString != "string") {
//     return dateString;
//   }

//   let newDateString = "";
//   let index = 0;

//   do {
//     if (dateString[index + 1] === ":") {
//       newDateString += "0";
//       newDateString += dateString[index];
//       index += 2;
//     } else if (index >= dateString.length - 1) {
//       newDateString += "0";
//       newDateString += dateString[index];
//       index += 2;
//     } else if (dateString[index] != ":" && dateString[index + 1] != ":") {
//       newDateString += dateString[index];
//       newDateString += dateString[index + 1];
//       index += 3;
//     }
//   } while (index < dateString.length);

//   return Number(newDateString);
// }
// function IntToDate(number) {
//   if (typeof number != "number") {
//     console.log("NOT");
//     return number;
//   }

//   let newDateString = "";

//   if (number % 100 >= 60) {
//     number += 40;
//   }
//   if (number % 10000 >= 6000) {
//     number += 4000;
//   }
//   if (number / 10000 >= 24) {
//     number -= 240000;
//   }

//   let hour = parseInt(number / 10000);
//   if (hour >= 10) newDateString += hour;
//   else if (hour === 0) newDateString += "00";
//   else {
//     newDateString += "0";
//     newDateString += hour;
//   }

//   newDateString += ":";

//   let min = parseInt((number % 10000) / 100);
//   if (min >= 10) newDateString += min;
//   else if (min === 0) newDateString += "00";
//   else {
//     newDateString += "0";
//     newDateString += min;
//   }

//   newDateString += ":";

//   let second = parseInt(number % 100);
//   if (second >= 10) newDateString += second;
//   else if (second === 0) newDateString += "00";
//   else {
//     newDateString += "0";
//     newDateString += second;
//   }

//   return newDateString;
// }

module.exports = studentRouter;
