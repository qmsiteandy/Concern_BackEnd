const express = require("express");
const router = express.Router();
const Teacher = require("../models/teacherModel");
const Course = require("../models/courseModel");
const Classroom = require("../models/classroomModel");

// 取得教師資訊
router.get("/getTeacherData/:id", async (req, res, next) => {
  const { id } = req.params;
  const teacher = await Teacher.findById(id);
  if (teacher) {
    return res.status(200).send({ teacher });
  } else {
    return res.status(404).send("尚無此位教師");
  }
});

//#region ==========課程部分==========

// 開啟教室 (新增教室資料)
router.post("/openClassroom/:classroomMeetID", async (req, res, next) => {
  const { teacherName } = req.body;
  const { classroomMeetID } = req.params;

  newTime = new Date();
  let date =
    newTime.getFullYear() +
    "/" +
    (newTime.getMonth() + 1) +
    "/" +
    newTime.getDate();
  switch (newTime.getDay()) {
    case 0:
      date += " (日)";
      break;
    case 1:
      date += " (一)";
      break;
    case 2:
      date += " (二)";
      break;
    case 3:
      date += " (三)";
      break;
    case 4:
      date += " (四)";
      break;
    case 5:
      date += " (五)";
      break;
    case 6:
      date += " (六)";
      break;
  }

  const newClassroom = new Classroom({
    teacherName: teacherName,
    classroomMeetID: classroomMeetID,
    date: date,
    startTime: null,
    endTime: null,
  });

  const updatedClassroom = await newClassroom.save();
  return res.status(201).send({ classroomDataID: updatedClassroom._id });
});

// 關閉教室
router.get("/closeClassroom/:classroomDataID", async (req, res, next) => {
  const { classroomDataID } = req.params;

  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    if (classroom.isLinkToCourse == false) {
      //可再加入刪除功能
      return res.status(200).send("教室刪除");
    } else {
      return res.status(200).send("教室關閉");
    }
  } else {
    return res.status(404).send("無此教室資訊");
  }
});

// 課程開始
router.get("/startClass/:classroomDataID", async (req, res, next) => {
  const { classroomDataID } = req.params;

  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    (classroom.startTime = Date.now()), //以UNIX時間格式儲存
      (classroom.isClassing = true);

    const updatedClassroom = await classroom.save();

    return res.status(200).send("課程開始");
  } else {
    return res.status(404).send("無此教室資訊");
  }
});

// 課程結束
router.get("/endClass:classroomDataID", async (req, res, next) => {
  const { classroomDataID } = req.params;

  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    (classroom.endTime = Date.now()), //以UNIX時間格式儲存
      (classroom.isClassing = false);
    const updatedClassroom = await classroom.save();
    return res.status(200).send("課程結束");
  } else {
    return res.status(404).send("無此教室資訊");
  }
});

// 進入課間休息
router.get("/startRest/:classroomDataID", async (req, res, next) => {
  const { classroomDataID } = req.params;

  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    if (classroom.isClassing) {
      if (!classroom.isResting) {
        classroom.isResting = true;
        classroom.restTime.push({
          restStartTime: Date.now(), //以UNIX時間格式儲存
          restEndTime: "",
        });
        await classroom.save();
      }
      return res.status(200).send("下課休息時間");
    } else {
      return res.status(403).send("課堂尚未開始");
    }
  } else {
    return res.status(404).send("無此教室資訊");
  }
});

// 課間休息結束
router.get("/endRest/:classroomDataID", async (req, res, next) => {
  const { classroomDataID } = req.params;

  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    if (classroom.isClassing) {
      if (classroom.isResting) {
        classroom.isResting = false;

        let updateRest = classroom.restTime[classroom.restTime.length - 1];
        updateRest.restEndTime = Date.now(); //以UNIX時間格式儲存
        classroom.restTime.splice(classroom.restTime.length - 1, 1, updateRest);

        const uploadedClassroom = await classroom.save();
        return res.status(200).send("下課時間結束");
      } else {
        return res.status(400).send("非下課時間");
      }
    } else {
      return res.status(403).send("課堂尚未開始");
    }
  } else {
    return res.status(404).send("無此教室資訊");
  }
});

// 取的所有學生最新的專注數值
router.get("/getAllNewData/:classroomDataID", async (req, res, next) => {
  const { classroomDataID } = req.params;
  const classroom = await Classroom.findById(classroomDataID);
  if (classroom) {
    let dataList = new Array();
    classroom.classmates.map((classmate) => {
      dataList.push({
        studentName: classmate.studentName,
        studentGoogleName: classmate.studentGoogleName,
        studentID: classmate.studentID,
        newConcernDegree: classmate.newConcernDegree,
      });
    });
    return res.status(200).send(dataList);
  } else {
    return res.status(404).send("無此教室資訊");
  }
});

//#endregion ==========課程部分==========

//#region ==========進階功能==========

// 教師註冊並直接登入後台 (建立 Teacher Document)
router.post("/teacherRegisterLogin", async (req, res, next) => {
  const { teacherName, teacherID } = req.body;

  if (teacherName == "" || teacherID == "")
    return res.status(400).send("缺少老師姓名或ID");
  else {
    const teacher = await Teacher.findOne({
      $and: [{ teacherName: teacherName }, { teacherID: teacherID }],
    });

    console.log(teacher);

    let result = {
      teacherDataID: null,
      teacherName: null,
      teacherID: null,
      courses: new Array(),
      lastCourseDataID: null,
      lastClassroomDataID: null,
    };

    if (teacher) {
      result.teacherDataID = teacher._id;
      result.teacherName = teacher.teacherName;
      result.teacherID = teacher.teacherID;
      result.courses = teacher.courses;

      if (teacher.courses.length > 0) {
        result.lastCourseDataID =
          teacher.courses[teacher.courses.length - 1].courseDataID;

        const lastCourse = await Course.findById(result.lastCourseDataID);

        if (lastCourse.courseWeeks.length > 0) {
          result.lastClassroomDataID =
            lastCourse.courseWeeks[0].classroomDataID;
        }
      }

      return res.status(201).send(result);
    } else {
      const newTeacher = new Teacher({
        teacherName: teacherName,
        teacherID: teacherID,
      });

      const uploadedTeacher = await newTeacher.save();

      result.teacherDataID = uploadedTeacher._id;
      result.teacherName = uploadedTeacher.teacherName;
      result.teacherID = uploadedTeacher.teacherID;

      return res.status(201).send(result);
    }
  }
});

//#endregion ==========進階功能==========

module.exports = router;
