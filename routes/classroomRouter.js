const express = require("express");
const Course = require("../models/courseModel");
const Classroom = require("../models/classroomModel");
const router = express.Router();

// 設定專注程度閾值，0.8專心、0.5普通
const concernLimit0 = 0.5,
  concernLimit1 = 0.8;

router.post("/getClassroomTimeStatus", async (req, res, next) => {
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
});

router.put("/setPersonalLeave", async (req, res, next) => {
  const { classroomDataID, studentID, truefalse } = req.body;
  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    const course = await Course.findById(classroom.courseDataID);

    let courseWeekIndex = course.courseWeeks.findIndex((week) => {
      return week.classroomDataID == classroomDataID;
    });

    let updateCourseWeek = course.courseWeeks[courseWeekIndex];
    let indexInLeaveIDList = updateCourseWeek.personalLeaveIDList.findIndex(
      (elemenet) => {
        return elemenet == studentID;
      }
    );
    //標註請假
    if (truefalse == true) {
      if (indexInLeaveIDList < 0) {
        updateCourseWeek.personalLeaveIDList.push(studentID);

        course.courseWeeks.splice(courseWeekIndex, 1, updateCourseWeek);
        const updatedCourse = await course.save();
      }

      res.status(200).send(studentID + " 請假登記完成");
    }
    //取消請假
    else {
      if (indexInLeaveIDList >= 0) {
        updateCourseWeek.personalLeaveIDList.splice(indexInLeaveIDList, 1);

        course.courseWeeks.splice(courseWeekIndex, 1, updateCourseWeek);
        const updatedCourse = await course.save();
      }
      res.status(201).send(studentID + " 已取消請假");
    }
  } else {
    res.status(404).send("尚無此教室");
  }
});

router.post("/startRollcall", async (req, res, next) => {
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
});

router.post("/getRollcallStatus", async (req, res, next) => {
  const { classroomDataID } = req.body;
  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    let rollcallCount = classroom.rollcallTime.length;
    let sign_attend = 1, //出席
      sign_miss = 0, //錯過點名
      sign_personalLeave = -1; //請假

    let result = {
      isLinkToCourse: classroom.isLinkToCourse,

      shouldAttendCount: 0,
      attentCount: 0,
      personalLeaveCount: 0,
      absenceCount: 0,

      rollcallCount: rollcallCount,
      rollcallTime: classroom.rollcallTime,
      classmatesInList: new Array(),
      classmatesUnlisted: new Array(),
    };

    //將登記在course的學生資料加入
    if (classroom.isLinkToCourse) {
      const course = await Course.findById(classroom.courseDataID);
      if (course) {
        let courseWeekIndex = course.courseWeeks.findIndex((week) => {
          return week.classroomDataID == classroomDataID;
        });

        course.classmates.forEach((classmate) => {
          let isPersonalLeave =
            course.courseWeeks[courseWeekIndex].personalLeaveIDList.findIndex(
              (elemenet) => {
                return elemenet == classmate.studentID;
              }
            ) >= 0
              ? true
              : false;

          result.classmatesInList.push({
            studentName: classmate.studentName,
            studentID: classmate.studentID,
            hasEnteredClassroom: false,
            personalLeave: isPersonalLeave,
            attendance: new Array(rollcallCount).fill(sign_miss),
          });
        });

        //應到人數
        result.shouldAttendCount = course.classmates.length;
      } else {
        res.status(403).send("無符合courseDataID的課程資料");
      }
    }

    //將classroom資料填入
    classroom.classmates.forEach((classmate) => {
      let indexClassmatesInList = result.classmatesInList.findIndex(
        (element) => {
          return element.studentID == classmate.studentID;
        }
      );

      //此學生是登錄在course中的
      if (indexClassmatesInList >= 0) {
        for (let i = 0; i < classmate.attendance.length; i++) {
          result.classmatesInList[indexClassmatesInList].attendance[
            classmate.attendance[i]
          ] = sign_attend;
        }
        //登記有加入會議
        result.classmatesInList[
          indexClassmatesInList
        ].hasEnteredClassroom = true;
        //紀錄實到人數
        result.attentCount += 1;
      }
      //此學生是不在course中的
      else {
        let newAttendance = new Array(rollcallCount);
        newAttendance.fill(sign_miss);
        for (let i = 0; i < classmate.attendance.length; i++) {
          newAttendance[classmate.attendance[i]] = sign_attend;
        }

        result.classmatesUnlisted.push({
          studentName: classmate.studentName,
          studentID: classmate.studentID,
          attendance: newAttendance,
        });
      }
    });

    //更新有請假的人的資料
    result.classmatesInList.forEach((classmate) => {
      if (
        classmate.personalLeave == true &&
        classmate.hasEnteredClassroom == false
      ) {
        //attendance陣列紀錄請假符號
        classmate.attendance.fill(sign_personalLeave);
        //紀錄請假人數
        result.personalLeaveCount += 1;
      }
    });

    //將沒在名單的學生 依據學號排序
    result.classmatesUnlisted = SortClassmateDataByID(
      result.classmatesUnlisted
    );

    //計算缺席人數
    result.absenceCount =
      result.shouldAttendCount - result.attentCount - result.personalLeaveCount;

    res.status(200).send(result);
  } else {
    res.status(404).send("尚無此教室");
  }
});

router.post("/getRankData", async (req, res, next) => {
  const { classroomDataID, rankCount } = req.body;
  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    if (classroom.classmates.length > 0) {
      let classmateData = new Array();

      classroom.classmates.forEach((classmate) => {
        //用來記錄專注平均
        let aveConcernAdder = 0;
        //用來記錄專注百分比
        let concernCounter = 0;
        //用來記錄最常持續時間
        let isLasting = false;
        let lastedTime = 0;
        let bestLasted = 0;

        for (let i = 0; i < classmate.timeLineArray.length; i++) {
          //用來記錄專注平均
          aveConcernAdder += classmate.concernDegreeArray[i];

          //用來記錄專注百分比，之後會除以concernDegreeArray.length
          if (classmate.concernDegreeArray[i] >= concernLimit1) {
            concernCounter += 1;
          }

          //用來記錄持續時間
          if (i < classmate.timeLineArray.length - 1) {
            if (classmate.concernDegreeArray[i] >= concernLimit1) {
              //若兩筆數據間格超過10秒也視為中斷
              timeSpace =
                classmate.timeLineArray[i + 1] - classmate.timeLineArray[i];
              if (timeSpace < 10000) {
                isLasting = true;
                lastedTime += timeSpace;
              } else {
                isLasting = false;
                if (lastedTime > bestLasted) bestLasted = lastedTime;
                lastedTime = 0;
              }
            }
            if (isLasting && classmate.concernDegreeArray[i] < concernLimit1) {
              isLasting = false;
              if (lastedTime > bestLasted) bestLasted = lastedTime;
              lastedTime = 0;
            }
          } else {
            isLasting = false;
            if (lastedTime > bestLasted) bestLasted = lastedTime;
            lastedTime = 0;
          }
        }

        //計算專注平均
        let aveConcern =
          parseFloat(
            (aveConcernAdder / classmate.concernDegreeArray.length).toFixed(2)
          ) || 0;

        //計算專注百分比
        let concernPercentage =
          concernCounter / classmate.concernDegreeArray.length || 0;
        let concernPercentageString = Math.floor(concernPercentage * 100) + "%";

        //最常持續時間
        let bestLastedString = ConvertMillisecondToTimeString(
          "h時mm分ss秒",
          bestLasted
        );

        classmateData.push({
          studentName: classmate.studentName,
          studentID: classmate.studentID,
          aveConcern: aveConcern,
          concernPercentage: concernPercentage,
          concernPercentageString: concernPercentageString,
          bestLasted: bestLasted,
          bestLastedString: bestLastedString,
        });
      });

      let result = {
        aveConcernRank: new Array(),
        concernPercentageRank: new Array(),
        bestLastedRank: new Array(),
      };

      //避免要求人數大於同學人數
      let newRankCount =
        rankCount < classmateData.length ? rankCount : classmateData.length;

      //aveConcernRank排序
      for (let rank = 0; rank < newRankCount; rank++) {
        let bestIndex = rank;
        for (let i = rank + 1; i < classmateData.length; i++) {
          if (classmateData[bestIndex].aveConcern < classmateData[i].aveConcern)
            bestIndex = i;
        }
        let storage = classmateData[bestIndex];
        classmateData[bestIndex] = classmateData[rank];
        classmateData[rank] = storage;

        result.aveConcernRank.push({
          rank: rank + 1,
          studentName: storage.studentName,
          studentID: storage.studentID,
          aveConcern: storage.aveConcern,
        });
      }
      //concernPercentage排序
      for (let rank = 0; rank < newRankCount; rank++) {
        let bestIndex = rank;
        for (let i = rank + 1; i < classmateData.length; i++) {
          if (
            parseFloat(classmateData[bestIndex].concernPercentage) <
            parseFloat(classmateData[i].concernPercentage)
          )
            bestIndex = i;
        }
        let storage = classmateData[bestIndex];
        classmateData[bestIndex] = classmateData[rank];
        classmateData[rank] = storage;

        result.concernPercentageRank.push({
          rank: rank + 1,
          studentName: storage.studentName,
          studentID: storage.studentID,
          concernPercentage: storage.concernPercentageString,
        });
      }
      //bestLasted排序
      for (let rank = 0; rank < newRankCount; rank++) {
        let bestIndex = rank;
        for (let i = rank + 1; i < classmateData.length; i++) {
          if (classmateData[bestIndex].bestLasted < classmateData[i].bestLasted)
            bestIndex = i;
        }
        let storage = classmateData[bestIndex];
        classmateData[bestIndex] = classmateData[rank];
        classmateData[rank] = storage;

        result.bestLastedRank.push({
          rank: rank + 1,
          studentName: storage.studentName,
          studentID: storage.studentID,
          bestLasted: storage.bestLastedString,
        });
      }
      res.status(200).send(result);
    } else {
      res.status(403).send("此教室尚無學生資料");
    }
  } else {
    res.status(404).send("尚無此教室");
  }
});

router.post("/getStatisticsDiagram", async (req, res, next) => {
  const { classroomDataID, timeSpacing } = req.body;
  const classroom = await Classroom.findById(classroomDataID);

  if (classroom) {
    if (classroom.classmates.length > 0) {
      let result = new Array();

      classroom.classmates.forEach((classmate) => {
        if (classmate.timeLineArray.length > 0) {
          //整理專注時序表
          let diagramConcernAdder = 0;
          let aveCounter = 0;
          let dataIndex = 0;
          let timeSpacing_millis = timeSpacing * 1000;
          let endTime =
            classroom.endTime ||
            classmate.timeLineArray[classmate.timeLineArray.length - 1];

          if (result.length == 0) {
            result.push({
              time: classroom.startTime,
              aveConcernDegree: null,
              concentratedCount: 0,
              normalCount: 0,
              unconcentratedCount: 0,
              dataCount: 0,
            });
          }
          //將result時間軸從startTime拉到endTime
          while (
            result[result.length - 1].time + timeSpacing_millis <
            endTime
          ) {
            result.push({
              time: result[result.length - 1].time + timeSpacing_millis,
              aveConcernDegree: null,
              concentratedCount: 0,
              normalCount: 0,
              unconcentratedCount: 0,
              dataCount: 0,
            });
          }

          //定位此classmate的第一筆資料會在result的哪個index
          let resultIndex = 0;
          for (let i = 0; i < result.length - 1; i++) {
            if (
              result[i].time <= classmate.timeLineArray[0] &&
              classmate.timeLineArray[0] < (result[i + 1].time || endTime)
            ) {
              resultIndex = i;
              break;
            }
          }

          //將學生資料放入result計算
          do {
            while (
              classmate.timeLineArray[dataIndex] <
                result[resultIndex].time + timeSpacing_millis &&
              dataIndex < classmate.timeLineArray.length
            ) {
              diagramConcernAdder += parseFloat(
                classmate.concernDegreeArray[dataIndex]
              );
              aveCounter += 1;

              dataIndex += 1;
            }

            let classmateAveConcern = parseFloat(
              (diagramConcernAdder / aveCounter).toFixed(4)
            );

            //紀錄專注狀態人數
            if (classmateAveConcern >= concernLimit1)
              result[resultIndex].concentratedCount += 1;
            else if (classmateAveConcern >= concernLimit0)
              result[resultIndex].normalCount += 1;
            else result[resultIndex].unconcentratedCount += 1;

            //紀錄平均專注數值
            let ratio =
              result[resultIndex].dataCount /
              (result[resultIndex].dataCount + 1);
            let result_aveConcernDegree =
              result[resultIndex].aveConcernDegree || 0;
            result[resultIndex].aveConcernDegree = parseFloat(
              (
                result_aveConcernDegree * ratio +
                classmateAveConcern * (1 - ratio)
              ).toFixed(4)
            );

            //紀錄資料筆數
            result[resultIndex].dataCount += 1;

            diagramConcernAdder = 0;
            aveCounter = 0;

            resultIndex += 1;
          } while (
            dataIndex < classmate.timeLineArray.length - 1 &&
            resultIndex < result.length
          );
        }
      });

      let timeStringFormat = timeSpacing < 60 ? "hh:mm:ss" : "hh:mm";
      for (let i = 0; i < result.length; i++) {
        result[i].time = ConvertUNIXTimeToTimeString(
          timeStringFormat,
          result[i].time
        );
      }

      res.status(200).send(result);
    } else {
      res.status(403).send("此教室尚無學生資料");
    }
  } else {
    res.status(404).send("尚無此教室");
  }
});

router.post("/getPersonDiagramList", async (req, res, next) => {
  const { classroomDataID, timeSpacing } = req.body;
  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    if (classroom.classmates.length > 0) {
      let result = new Array();

      classroom.classmates.forEach((classmate) => {
        //用來記錄專注平均
        let aveConcernAdder = 0;
        //用來記錄專注百分比
        let concernCounter = 0;
        //用來記錄最常持續時間
        let isLasting = false;
        let lastedTime = 0;
        let bestLasted = 0;

        for (let i = 0; i < classmate.timeLineArray.length; i++) {
          //用來記錄專注平均
          aveConcernAdder += classmate.concernDegreeArray[i];

          //用來記錄專注百分比，之後會除以concernDegreeArray.length
          if (classmate.concernDegreeArray[i] >= concernLimit1)
            concernCounter += 1;

          //用來記錄持續時間
          if (i < classmate.timeLineArray.length - 1) {
            if (classmate.concernDegreeArray[i] >= concernLimit1) {
              //若兩筆數據間格超過10秒也視為中斷
              timeSpace =
                classmate.timeLineArray[i + 1] - classmate.timeLineArray[i];
              if (timeSpace < 10000) {
                isLasting = true;
                lastedTime += timeSpace;
              } else {
                isLasting = false;
                if (lastedTime > bestLasted) bestLasted = lastedTime;
                lastedTime = 0;
              }
            }
            if (isLasting && classmate.concernDegreeArray[i] < concernLimit1) {
              isLasting = false;
              if (lastedTime > bestLasted) bestLasted = lastedTime;
              lastedTime = 0;
            }
          } else {
            isLasting = false;
            if (lastedTime > bestLasted) bestLasted = lastedTime;
            lastedTime = 0;
          }
        }

        //計算專注平均
        let aveConcern =
          parseFloat(
            (aveConcernAdder / classmate.concernDegreeArray.length).toFixed(2)
          ) || 0;

        //計算專注百分比
        let concernPercentage =
          (Math.floor(
            (concernCounter / classmate.concernDegreeArray.length) * 100
          ) || 0) + "%";

        //最常持續時間
        let bestLastedString = ConvertMillisecondToTimeString(
          "h時mm分ss秒",
          bestLasted
        );

        //紀錄參與時長
        var attendTimeAddr = 0;

        //整理專注時序表
        let newConcernArray = new Array();
        let newTimeArray = new Array();
        let diagramConcernAdder = 0;
        let aveCounter = 0;
        let dataIndex = 0;
        let timeSpacing_millis = timeSpacing * 1000;

        let endTime =
          classroom.endTime ||
          classmate.timeLineArray[classmate.timeLineArray.length - 1];

        do {
          if (newTimeArray.length == 0) newTimeArray.push(classroom.startTime);
          else
            newTimeArray.push(
              newTimeArray[newTimeArray.length - 1] + timeSpacing_millis
            );

          while (
            classmate.timeLineArray[dataIndex] <
            newTimeArray[newTimeArray.length - 1] + timeSpacing_millis
          ) {
            diagramConcernAdder += classmate.concernDegreeArray[dataIndex];
            aveCounter += 1;

            //紀錄參與課程時間長
            if (dataIndex < classmate.timeLineArray.length - 1)
              attendTimeAddr +=
                classmate.timeLineArray[dataIndex + 1] -
                classmate.timeLineArray[dataIndex];

            dataIndex += 1;
          }

          newConcernArray.push(diagramConcernAdder / aveCounter);
          diagramConcernAdder = 0;
          aveCounter = 0;
        } while (
          newTimeArray[newTimeArray.length - 1] + timeSpacing_millis <
          endTime
        );

        let timeStringFormat = timeSpacing < 60 ? "hh:mm:ss" : "hh:mm";
        for (let i = 0; i < newTimeArray.length; i++) {
          newTimeArray[i] = ConvertUNIXTimeToTimeString(
            timeStringFormat,
            newTimeArray[i]
          );
        }

        let attendTimePercentage =
          Math.floor((attendTimeAddr / (endTime - classroom.startTime)) * 100) +
          "%";

        result.push({
          studentName: classmate.studentName,
          studentGoogleName: classmate.studentGoogleName,
          studentID: classmate.studentID,
          aveConcern: aveConcern,
          concernPercentage: concernPercentage,
          bestLasted: bestLastedString,
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
});

function SortClassmateDataByID(classmateDataArray) {
  for (let i = 0; i < classmateDataArray.length - 1; i++) {
    let smallestIDIndex = i;
    for (let j = i + 1; j < classmateDataArray.length; j++) {
      let ID_smallest = parseInt(
        classmateDataArray[smallestIDIndex].studentID.replace(/[^0-9]/gi, "")
      );
      let ID_j = parseInt(
        classmateDataArray[j].studentID.replace(/[^0-9]/gi, "")
      );

      if (ID_smallest > ID_j) smallestIDIndex = j;
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

function ConvertMillisecondToTimeString(format, millisecond) {
  let newTimeString = format;

  let hour = Math.floor(millisecond / (60 * 60 * 1000));
  millisecond -= hour * (60 * 60 * 1000);
  newTimeString = newTimeString.replace("h", hour < 1 ? "0" : hour);

  let min = Math.floor(millisecond / (60 * 1000));
  millisecond -= min * (60 * 1000);
  newTimeString = newTimeString.replace("mm", min < 10 ? "0" + min : min);

  let second = Math.floor(millisecond / 1000);
  millisecond -= second * 1000;
  newTimeString = newTimeString.replace(
    "ss",
    second < 10 ? "0" + second : second
  );

  return newTimeString;
}

function GetTime_H_M() {
  newTime = new Date();

  let timeString =
    (newTime.getHours() < 10 ? "0" : "") +
    newTime.getHours() +
    ":" +
    ((newTime.getMinutes() < 10 ? "0" : "") + newTime.getMinutes());

  return timeString;
}

module.exports = router;
