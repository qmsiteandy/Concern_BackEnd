const express = require("express");
const router = express.Router();
const Teacher = require("../models/teacherModel");
const Course = require("../models/courseModel");
const Classroom = require("../models/classroomModel");

// 取得課程資訊
router.post("/getCourseData/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const course = await Course.findById(courseDataID);
  if (course) {
    return res.status(200).send({ course });
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

// 新課程
router.post("/addCourse", async (req, res, next) => {
  const { teacherDataID, courseName } = req.body;

  teacher = await Teacher.findById(teacherDataID);
  if (teacher) {
    let courseExisted = false;
    teacher.courses.forEach((element) => {
      if (element.courseName == courseName) courseExisted = true;
    });

    if (courseExisted) {
      return res.status(403).send("此課程已存在");
    } else {
      const newCourse = new Course({
        teacherName: teacher.teacherName,
        teacherID: teacher.teacherID,
        courseName: courseName,
      });
      const uploadedCourse = await newCourse.save();

      teacher.courses.push({
        courseDataID: uploadedCourse._id,
        courseName: uploadedCourse.courseName,
      });
      const uploadedTeacher = await teacher.save();

      return res.status(201).send({
        teacherName: uploadedTeacher.teacherName,
        teacherID: uploadedTeacher.teacherID,
        courses: uploadedTeacher.courses,
      });
    }
  } else {
    return res.status(404).send("尚無此位老師");
  }
});

// 取得該課程每一週的點名狀況
router.get("/getTotalRollcallStatus/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const course = await Course.findById(courseDataID);
  if (course) {
    let sign_attend = 1, //出席
      sign_miss = 0, //錯過點名
      sign_personalLeave = -1, //請假
      sign_absence = -2; //曠課缺席

    let result = {
      weekName: new Array(),
      classmatesList: new Array(),
    };

    //將學生名單建立在result中
    course.classmates.forEach((element) => {
      result.classmatesList.push({
        studentName: element.studentName,
        studentID: element.studentID,
        rollcallStatus: new Array(),
      });
    });

    //指向每一週
    for (
      let weekIndex = 0;
      weekIndex < course.courseWeeks.length;
      weekIndex++
    ) {
      courseWeek = course.courseWeeks[weekIndex];

      result.weekName.push(courseWeek.weekName);

      let classroom = await Classroom.findById(courseWeek.classroomDataID);
      let rollcallCount = classroom.rollcallTime.length;

      //foreach已存入result的學生名單
      for (
        let resultClassmateIndex = 0;
        resultClassmateIndex < result.classmatesList.length;
        resultClassmateIndex++
      ) {
        resultClassmate = result.classmatesList[resultClassmateIndex];
        resultClassmate.rollcallStatus.push(null);

        //如果本次有點名
        if (rollcallCount > 0) {
          let indexInClassroom = classroom.classmates.findIndex((c) => {
            return c.studentID == resultClassmate.studentID;
          });

          //資料有在教室中
          if (indexInClassroom >= 0) {
            let attendCount =
              classroom.classmates[indexInClassroom].attendance.length;

            //每一次都有完成點名
            if (rollcallCount == attendCount)
              resultClassmate.rollcallStatus[weekIndex] = sign_attend;
            //完全沒點到名
            if (attendCount == 0)
              resultClassmate.rollcallStatus[weekIndex] = sign_absence;
            //漏掉部分點名
            else resultClassmate.rollcallStatus[weekIndex] = sign_miss;
          }
          //此學生有請假
          else if (
            courseWeek.personalLeaveIDList.findIndex((item) => {
              return item == resultClassmate.studentID;
            }) >= 0
          ) {
            resultClassmate.rollcallStatus[weekIndex] = sign_personalLeave;
          }
          //曠課沒出現在教室
          else {
            resultClassmate.rollcallStatus[weekIndex] = sign_absence;
          }
        }

        //把更新後的學生更新至 result.classmatesList
        result.classmatesList.splice(resultClassmateIndex, 1, resultClassmate);
      }
    }

    return res.status(200).send(result);
  } else {
    return res.status(404).send("尚無此課程");
  }
});

//#region ==========課程週設定部分==========

// 將已開啟的classroom資料連結至courseData
router.post("/linkClassroomToCourseWeek", async (req, res, next) => {
  const { courseDataID, classroomDataID } = req.body;
  const course = await Course.findById(courseDataID);
  if (course) {
    const classroom = await Classroom.findById(classroomDataID);
    if (classroom) {
      if (classroom.isLinkToCourse == false) {
        newTime = new Date();
        let weekName =
          newTime.getFullYear() +
          "/" +
          (newTime.getMonth() + 1) +
          "/" +
          newTime.getDate();
        switch (newTime.getDay()) {
          case 0:
            weekName += " (日)";
            break;
          case 1:
            weekName += " (一)";
            break;
          case 2:
            weekName += " (二)";
            break;
          case 3:
            weekName += " (三)";
            break;
          case 4:
            weekName += " (四)";
            break;
          case 5:
            weekName += " (五)";
            break;
          case 6:
            weekName += " (六)";
            break;
        }

        course.courseWeeks.splice(0, 0, {
          weekName: weekName,
          classroomDataID: classroomDataID,
          personalLeaveIDList: new Array(),
        });
        const uploadedCourse = await course.save();

        classroom.courseName = course.courseName;
        classroom.isLinkToCourse = true;
        classroom.courseDataID = course._id;
        const uploadedClassroom = await classroom.save();

        return res.status(201).send({
          courseName: uploadedCourse.courseName,
          weekName:
            uploadedCourse.courseWeeks[uploadedCourse.courseWeeks.length - 1]
              .weekName,
        });
      } else {
        res
          .status(400)
          .send(
            "此教室已與courseDataID:" +
              classroom.courseDataID +
              " 連結，無法重複連結"
          );
      }
    } else {
      return res.status(403).send("尚無此教室");
    }
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

router.delete("/deleteOneCourseWeek/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const { courseWeekIndex } = req.query;

  const course = await Course.findById(courseDataID);
  if (course) {
    if (courseWeekIndex != null) {
      //未完成，刪除指定classroom Data
      course.courseWeeks.splice(courseWeekIndex, 1);
    } else {
      return res.status(403).send("請指定courseWeekIndex");
    }

    const uploadedCourse = await course.save();
    return res.status(200).send(uploadedCourse.courseWeeks);
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

//#endregion==========課程週設定部分==========

//#region ==========學生名單設定部分==========

//用來自動允許學生加入google meet
router.get("/checkStudentInList/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.body;
  const { studentGoogleName } = req.query;

  const course = await Course.findById(courseDataID);
  if (course) {
    //確認更改後學號是否重複
    let studentInList = false;
    for (let i = 0; i < course.classmates.length; i++) {
      if (course.classmates[i].studentGoogleName == studentGoogleName) {
        studentInList = true;
      }
    }
    return res.status(200).send(studentInList);
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

// 取得名單
router.get("/classmates/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const course = await Course.findById(courseDataID);
  if (course) {
    return res.status(200).send(course.classmates);
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

// 新增學生名單
router.post("/addStudent/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const { studentName, studentGoogleName, studentID } = req.body;
  const course = await Course.findById(courseDataID);
  if (course) {
    let studentExisted = false;
    course.classmates.forEach((element) => {
      if (element.studentID == studentID) studentExisted = true;
    });

    if (studentExisted == true) return res.status(403).send("此學號已在名單中");
    else {
      course.classmates.push({
        studentName: studentName,
        studentGoogleName: studentGoogleName,
        studentID: studentID,
      });
      //將學生名單依照學號排序
      course.classmates = ClassmatesSorting(course.classmates);

      const uploadedCourse = await course.save();
      return res.status(201).send(uploadedCourse.classmates);
    }
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

// 批量新增學生
router.post("/addMultipleStudents/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const { studentsDataArray } = req.body;
  const course = await Course.findById(courseDataID);
  if (course) {
    let updateClassmates = course.classmates;
    let addFailList = new Array();

    if (studentsDataArray) {
      studentsDataArray.forEach((student) => {
        let studentExisted =
          updateClassmates.findIndex((element) => {
            return element.studentID == student.studentID;
          }) >= 0
            ? true
            : false;

        //新增學生
        if (!studentExisted) {
          updateClassmates.push(student);
        }
        //已存在的學號
        else {
          addFailList.push(student);
        }
      });
    }

    updateClassmates = ClassmatesSorting(updateClassmates);
    addFailList = ClassmatesSorting(addFailList);

    course.classmates = updateClassmates;
    const uploadedCourse = await course.save();

    return res.status(201).send({
      updatedClassmates: uploadedCourse.classmates,
      addFailList: addFailList,
    });
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

// 修改一位學生
router.put("/editOneStudent/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const { studentIndex, studentName, studentGoogleName, studentID } = req.body;
  const course = await Course.findById(courseDataID);
  if (course) {
    //確認更改後學號是否重複
    let studentIDExisted = false;
    for (let i = 0; i < course.classmates.length; i++) {
      if (i != studentIndex && course.classmates[i].studentID == studentID) {
        studentIDExisted = true;
      }
    }

    if (studentIDExisted == true) {
      return res.status(403).send("此學號已存在");
    } else {
      //取代資料。注意，無法直接設定course.classmates[studentIndex]內的物件，必須取代一整個Object
      const newDate = {
        studentName: studentName,
        studentGoogleName: studentGoogleName,
        studentID: studentID,
      };
      course.classmates.splice(studentIndex, 1, newDate);

      //將學生名單依照學號排序
      course.classmates = ClassmatesSorting(course.classmates);

      const uploadedCourse = await course.save();
      return res.status(201).send(uploadedCourse.classmates);
    }
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

// 刪除一位學生
router.delete("/deleteOneStudent/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const { studentID } = req.query;
  const course = await Course.findById(courseDataID);
  if (course) {
    let studentIndex = null;
    for (let i = 0; i < course.classmates.length; i++)
      if (course.classmates[i].studentID == studentID) studentIndex = i;

    if (studentIndex != null) {
      course.classmates.splice(studentIndex, 1);
    } else {
      return res.status(403).send("此學號不在名單中");
    }

    const uploadedCourse = await course.save();
    return res.status(201).send(uploadedCourse.classmates);
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

// 刪除全部學生名單
router.delete("/deleteAllStudents/:courseDataID", async (req, res, next) => {
  const { courseDataID } = req.params;
  const course = await Course.findById(courseDataID);
  if (course) {
    course.classmates = [];
    const uploadedCourse = await course.save();
    return res.status(201).send(uploadedCourse.classmates);
  } else {
    return res.status(404).send("尚無此堂課程");
  }
});

function ClassmatesSorting(ClassmateDataArray) {
  let storage;
  //console.log(ClassmateDataArray)
  for (let i = 0; i < ClassmateDataArray.length; i++) {
    let minIndex = i;
    for (let j = i + 1; j < ClassmateDataArray.length; j++) {
      let ID_smallest = parseInt(
        ClassmateDataArray[minIndex].studentID.replace(/[^0-9]/gi, "")
      );
      let ID_j = parseInt(
        ClassmateDataArray[j].studentID.replace(/[^0-9]/gi, "")
      );

      if (ID_smallest > ID_j) minIndex = j;
    }
    storage = ClassmateDataArray[i];
    ClassmateDataArray[i] = ClassmateDataArray[minIndex];
    ClassmateDataArray[minIndex] = storage;
  }
  return ClassmateDataArray;
}

//#endregion ==========學生名單設定部分==========

module.exports = router;
