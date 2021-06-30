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
      let indexInList = classroom.classmates.findIndex(element => (element.studentID == studentID));
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
    let timeSpacing_millis = timeSpacing * 1000;

    const classroom = await Classroom.findById(classroomDataID);

    if(classroom){
      let classmate = classroom.classmates[indexInList];
      let endTime = classroom.endTime || classmate.timeLineArray[classmate.timeLineArray.length-1];

      do{
        if(newTimeArray.length == 0 ) newTimeArray.push(classroom.startTime);
        else newTimeArray.push(newTimeArray[newTimeArray.length-1] + timeSpacing_millis);

        while(classmate.timeLineArray[dataIndex] < newTimeArray[newTimeArray.length-1] + timeSpacing_millis){
          concernAdder += classmate.concernDegreeArray[dataIndex];
          aveCounter += 1;
          
          dataIndex += 1;
        }
        
        newConcernArray.push(concernAdder/aveCounter);
        concernAdder = 0;
        aveCounter = 0;

      }while(newTimeArray[newTimeArray.length-1] + timeSpacing_millis < endTime)

      let timeStringFormat = timeSpacing < 60? "hh:mm:ss" : "hh:mm";
      for(let i = 0; i < newTimeArray.length; i++){
        newTimeArray[i] = ConvertUNIXTimeToTimeString(timeStringFormat, newTimeArray[i]);
      }

      res.status(200).send({
        "studentName": classmate.studentName,
        "studentID": classmate.studentID,
        "concernArray": newConcernArray,
        "timeLineArray": newTimeArray
      });
      
    }else{
      res.status(404).send("無此課堂教室");
    }
  })
)

function ConvertUNIXTimeToTimeString(format, dateNumber){

  newTime = new Date(dateNumber);

  let timeString = format
    .replace("YYYY", newTime.getFullYear())
    .replace("MM", ((newTime.getMonth() < 10 ? '0' : '') + newTime.getMonth()))
    .replace("DD", ((newTime.getDate() < 10 ? '0' : '') + newTime.getDate()))
    .replace("hh", ((newTime.getHours() < 10 ? '0' : '') + newTime.getHours()))
    .replace("mm", ((newTime.getMinutes() < 10 ? '0' : '') + newTime.getMinutes()))
    .replace("ss", ((newTime.getSeconds() < 10 ? '0' : '') + newTime.getSeconds()))
 
  return timeString;
}




module.exports = studentRouter;
