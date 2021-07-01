const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classroom = require("../models/classroomModel");
const classroomRouter = express.Router();
const { response } = require("express");

classroomRouter.post(
  "/getClassroomTimeStatus",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID } = req.body;
    const classroom = await Classroom.findById(classroomDataID);
    if (classroom) {
      let newRestTimeArray = classroom.restTime;
      newRestTimeArray.forEach((element) => {
        element.restStartTime = element.restStartTime
          ? ConvertUNIXTimeToTimeString("hh:mm", element.restStartTime)
          : "";
        element.restEndTime = element.restEndTime
          ? ConvertUNIXTimeToTimeString("hh:mm", element.restEndTime)
          : "";
      });

      res.status(200).send({
        isClassing: classroom.isClassing,
        isResting: classroom.isResting,
        startTime: ConvertUNIXTimeToTimeString("hh:mm", classroom.startTime),
        restTime: newRestTimeArray,
        endTime: classroom.endTime
          ? ConvertUNIXTimeToTimeString("hh:mm", classroom.endTime)
          : "",
      });
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

      classroom.rollcallTime.push(GetTime_H_M());

      const updatedClassroom = await classroom.save();

      const io = req.app.get("io");
      io.to(classroomDataID).emit("rollcallStart", {
        duration: duration,
        rollcallIndex: rollcallIndex,
      });

      res
        .status(200)
        .send("第" + (rollcallIndex + 1) + "次點名 ：" + duration + "s");
    } else {
      res.status(404).send("尚無此教室");
    }
  })
);

classroomRouter.post(
  "/getStatisticsDiagram",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, timeSpacing } = req.body;
    const classroom = await Classroom.findById(classroomDataID);

    const concernLimit0 = 0.5, concernLimit1 = 0.8;

    if (classroom) {
      if (classroom.classmates.length > 0) {

        let result = new Array();

        classroom.classmates.forEach((classmate) => {
          if(classmate.timeLineArray.length > 0) {
            
            //整理專注時序表
            let diagramConcernAdder = 0;
            let aveCounter = 0;
            let dataIndex = 0;
            let timeSpacing_millis = timeSpacing * 1000; 
            let endTime = classroom.endTime || classmate.timeLineArray[classmate.timeLineArray.length - 1];

            if (result.length == 0){
              result.push({
                time: classroom.startTime,
                aveConcernDegree: null,
                concentratedCount: 0,
                normalCount: 0,
                unconcentratedCount: 0,
                dataCount: 0
              });       
            } 
            //將result時間軸從startTime拉到endTime
            while(result[result.length - 1].time + timeSpacing_millis < endTime){
              result.push({
                time: result[result.length-1].time + timeSpacing_millis,
                aveConcernDegree: null,
                concentratedCount: 0,
                normalCount: 0,
                unconcentratedCount: 0,
                dataCount: 0
              });
            }


            //定位此classmate的第一筆資料會在result的哪個index
            let resultIndex = 0;
            for(let i = 0; i < result.length - 1 ; i++){
              if(result[i].time <= classmate.timeLineArray[0] && classmate.timeLineArray[0] < (result[i+1].time || endTime)){
                resultIndex = i; break;
              }
            }

            //將學生資料放入result計算
            do {

              while (classmate.timeLineArray[dataIndex] < result[resultIndex].time + timeSpacing_millis && dataIndex < classmate.timeLineArray.length) {
                diagramConcernAdder += parseFloat(classmate.concernDegreeArray[dataIndex]);
                aveCounter += 1;
              
                dataIndex += 1;
              }

              let classmateAveConcern = parseFloat((diagramConcernAdder / aveCounter).toFixed(4));

              //紀錄專注狀態人數
              if(classmateAveConcern >= concernLimit1) result[resultIndex].concentratedCount += 1;
              else if(classmateAveConcern >= concernLimit0) result[resultIndex].normalCount += 1;
              else result[resultIndex].unconcentratedCount += 1;

              //紀錄平均專注數值
              let ratio = result[resultIndex].dataCount / (result[resultIndex].dataCount + 1);
              let result_aveConcernDegree = result[resultIndex].aveConcernDegree || 0;
              result[resultIndex].aveConcernDegree = parseFloat((result_aveConcernDegree * ratio + classmateAveConcern * (1 - ratio)).toFixed(4));

              //紀錄資料筆數
              result[resultIndex].dataCount += 1;


              diagramConcernAdder = 0;
              aveCounter = 0;

              resultIndex += 1;

            } while (dataIndex < classmate.timeLineArray.length - 1 && resultIndex < result.length);
          }
        });

        let timeStringFormat = timeSpacing < 60 ? "hh:mm:ss" : "hh:mm" ;
        for (let i = 0; i < result.length; i++) {
          result[i].time = ConvertUNIXTimeToTimeString(timeStringFormat,result[i].time);
        }

        res.status(200).send(result);

      } else {
        res.status(403).send("此教室尚無學生資料");
      }
    } else {
      res.status(404).send("尚無此教室");
    }
  })
);

classroomRouter.post(
  "/getPersonDiagramList",
  expressAsyncHandler(async (req, res) => {
    const { classroomDataID, timeSpacing } = req.body;
    const classroom = await Classroom.findById(classroomDataID);
    if (classroom) {
      if (classroom.classmates.length > 0) {
        let result = new Array();

        classroom.classmates.forEach((classmate) => {
          let concernLimit = 0.8;
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
            if (classmate.concernDegreeArray[i] >= concernLimit)
              concernCounter += 1;

            //用來記錄最常持續時間
            if (classmate.concernDegreeArray[i] >= concernLimit) {
              if (i < classmate.timeLineArray.length - 1) {
                isLasting = true;
                lastedTime +=
                  classmate.timeLineArray[i + 1] - classmate.timeLineArray[i];
              }
            } else if (
              isLasting &&
              classmate.concernDegreeArray[i] < concernLimit
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

          //整理專注時序表
          let newConcernArray = new Array;
          let newTimeArray = new Array;
          let diagramConcernAdder = 0;
          let aveCounter = 0;
          let dataIndex = 0;
          let timeSpacing_millis = timeSpacing * 1000; 

          let endTime = classroom.endTime || classmate.timeLineArray[classmate.timeLineArray.length - 1];

          do {
            if (newTimeArray.length == 0)
              newTimeArray.push(classroom.startTime);
            else
              newTimeArray.push(newTimeArray[newTimeArray.length - 1] + timeSpacing_millis);

            while (classmate.timeLineArray[dataIndex] < newTimeArray[newTimeArray.length - 1] + timeSpacing_millis) {
              diagramConcernAdder += classmate.concernDegreeArray[dataIndex];
              aveCounter += 1;

              //紀錄參與課程時間長
              if(dataIndex < classmate.timeLineArray.length-1)
                attendTimeAddr += classmate.timeLineArray[dataIndex+1] - classmate.timeLineArray[dataIndex];
             
              dataIndex += 1;
            }

            newConcernArray.push(diagramConcernAdder / aveCounter);
            diagramConcernAdder = 0;
            aveCounter = 0;
          } while (newTimeArray[newTimeArray.length - 1] + timeSpacing_millis < endTime);

          

          let timeStringFormat = timeSpacing < 60 ? "hh:mm:ss" : "hh:mm";
          for (let i = 0; i < newTimeArray.length; i++) {
            newTimeArray[i] = ConvertUNIXTimeToTimeString(timeStringFormat,newTimeArray[i]);
          }

          let attendTimePercentage = Math.floor(attendTimeAddr / (endTime - classroom.startTime) *100) + "%";

          result.push({
            studentName: classmate.studentName,
            studentID: classmate.studentID,
            aveConcern: aveConcern,
            concernPercentage: concernPercentage,
            bestLasted: bestlastedString,
            attendTimePercentage: attendTimePercentage,
            timeLineArray: newTimeArray,
            concernDegreeArray: newConcernArray,
          });
        });

        //將學生依照學號排序
        result = SortClassmateDataByID(result);

        res.status(200).send(result);

      } else {
        res.status(403).send("此教室尚無學生資料");
      }
    } else {
      res.status(404).send("尚無此教室");
    }
  })
);

function SortClassmateDataByID(classmateDataArray){
  for(let i = 0; i < classmateDataArray.length - 1; i++){

    let smallestIDIndex = i;
    for(let j = i + 1; j < classmateDataArray.length; j++){

      let ID_smallest = parseInt(classmateDataArray[smallestIDIndex].studentID.replace(/[^0-9]/ig,""));
      let ID_j = parseInt(classmateDataArray[j].studentID.replace(/[^0-9]/ig,""));

      if(ID_smallest > ID_j) smallestIDIndex = j;
    }

    let storage = classmateDataArray[i];
    classmateDataArray[i] = classmateDataArray[smallestIDIndex];
    classmateDataArray[smallestIDIndex] = storage;
  }
  return classmateDataArray;
}

function ConvertUNIXTimeToTimeString(format, dateNumber) {
  newTime = new Date(dateNumber);

  let timeString = format
    .replace("YYYY", newTime.getFullYear())
    .replace("MM", (newTime.getMonth() < 10 ? "0" : "") + newTime.getMonth())
    .replace("DD", (newTime.getDate() < 10 ? "0" : "") + newTime.getDate())
    .replace("hh", (newTime.getHours() < 10 ? "0" : "") + newTime.getHours())
    .replace(
      "mm",
      (newTime.getMinutes() < 10 ? "0" : "") + newTime.getMinutes()
    )
    .replace(
      "ss",
      (newTime.getSeconds() < 10 ? "0" : "") + newTime.getSeconds()
    );

  return timeString;
}

function GetTime_H_M() {
  newTime = new Date();
  return (
    newTime.getHours() +
    ":" +
    ((newTime.getMinutes() < 10 ? "0" : "") + newTime.getMinutes())
  );
}

module.exports = classroomRouter;
