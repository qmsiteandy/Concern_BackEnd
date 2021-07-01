const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classroom = require("../models/classroomModel");
const studentRouter = express.Router();
const { response } = require("express");

const concernLimit0 = 0.5, concernLimit1 = 0.8;

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
  "/createFakeConcernData",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, indexInList, dataCount } = req.body;
    const classroom = await Classroom.findById(classroomDataID);

    if(classroom){
      if(classroom.isClassing == false) res.status(400).send("課程尚未開始");
      else if(classroom.isResting == true) res.status(401).send("下課休息時間");
      else{
        let updateClassmate = classroom.classmates[indexInList];
        if(updateClassmate){

          let newTime = classroom.startTime;
          for(let i = 0; i < dataCount; i++){

            newTime += 250;
            updateClassmate.concernDegreeArray.push(parseFloat((Math.random() * 0.5 + 0.6).toFixed(4)));
            updateClassmate.timeLineArray.push(newTime); //以UNIX時間格式儲存
          }
          
          classroom.classmates.splice(indexInList, 1, updateClassmate);

          const updatedClassroom = await classroom.save();
          res.status(200).send("上傳成功");

        }else{
          res.status(403).send("無此學生");
        } 
      }
    }else{
      res.status(404).send("無此課堂教室");
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

        if(updateClassmate){

          updateClassmate.newConcernDegree = parseFloat(concernDegree.toFixed(4));
          updateClassmate.concernDegreeArray.push(parseFloat(concernDegre.toFixed(4)));
          updateClassmate.timeLineArray.push(Date.now()); //以UNIX時間格式儲存
          
          classroom.classmates.splice(indexInList, 1, updateClassmate);

          const updatedClassroom = await classroom.save();
          res.status(200).send("上傳成功");
        }else{
          res.status(403).send("無此學生");
        } 
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
    const classroom = await Classroom.findById(classroomDataID);
    if(classroom){
      let classmate = classroom.classmates[indexInList];
      if(classmate){

        //用來記錄專注平均
        let aveConcernAdder = 0;
        //用來記錄專注百分比
        let concernCounter = 0;
        //用來記錄最常持續時間
        let isLasting = false;
        let lastedTime = 0;
        let bestlasted = 0;

        for (let i = 0; i < classmate.timeLineArray.length; i++) {
          //用來記錄專注平均
          aveConcernAdder += classmate.concernDegreeArray[i];

          //用來記錄專注百分比，之後會除以concernDegreeArray.length
          if (classmate.concernDegreeArray[i] >= concernLimit1)
            concernCounter += 1;

          //用來記錄最常持續時間
          if (classmate.concernDegreeArray[i] >= concernLimit1) {
            if (i < classmate.timeLineArray.length - 1) {
              isLasting = true;
              lastedTime +=
                classmate.timeLineArray[i + 1] - classmate.timeLineArray[i];
            }
          } else if (
            isLasting &&
            classmate.concernDegreeArray[i] < concernLimit1
          ) {
            if (lastedTime > bestlasted) bestlasted = lastedTime;
            lastedTime = 0;
          }
        }

        //計算專注平均
        let aveConcern = (
          aveConcernAdder / classmate.concernDegreeArray.length
        ).toFixed(2);

        //計算專注百分比
        let concernPercentage =
          Math.floor(
            (concernCounter / classmate.concernDegreeArray.length) * 100
          ) + "%";

        //最常持續時間顯示格式
        let bestlastedString = "";
        let hour = bestlasted / (60 * 60 * 1000);
        bestlastedString += hour < 1 ? "0:" : hour + ":";
        let min = Math.floor(bestlasted / (60 * 1000));
        bestlastedString += min < 10 ? "0" + min + ":" : min + ":";
        let second = Math.floor(bestlasted / 1000);
        bestlastedString += second < 10 ? "0" + second : second;

        
        //紀錄參與時長
        var attendTimeAddr = 0;

        let newConcernArray = new Array;
        let newTimeArray = new Array;
        let concernAdder = 0;
        let aveCounter = 0;
        let dataIndex = 0;
        let timeSpacing_millis = timeSpacing * 1000;
      
        let endTime = classroom.endTime || classmate.timeLineArray[classmate.timeLineArray.length-1];

        do{
          if(newTimeArray.length == 0 ) newTimeArray.push(classroom.startTime);
          else newTimeArray.push(newTimeArray[newTimeArray.length-1] + timeSpacing_millis);

          while(classmate.timeLineArray[dataIndex] < newTimeArray[newTimeArray.length-1] + timeSpacing_millis){
            concernAdder += classmate.concernDegreeArray[dataIndex];
            aveCounter += 1;

            //紀錄參與課程時間長
            if(dataIndex < classmate.timeLineArray.length-1)
            attendTimeAddr += classmate.timeLineArray[dataIndex+1] - classmate.timeLineArray[dataIndex];
            
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

        let attendTimePercentage = Math.floor(attendTimeAddr / (endTime - classroom.startTime) *100) + "%";

        res.status(200).send({
          studentName: classmate.studentName,
          studentID: classmate.studentID,
          aveConcern: aveConcern,
          concernPercentage: concernPercentage,
          bestLasted: bestlastedString,
          attendTimePercentage: attendTimePercentage,
          timeLineArray: newTimeArray,
          concernDegreeArray: newConcernArray,
        });
      }else{
        res.status(403).send("教室無此學生資料");
      }
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
