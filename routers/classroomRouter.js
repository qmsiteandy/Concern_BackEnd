const express = require("express");
const expressAsyncHandler = require("express-async-handler");
const Classroom = require("../models/classroomModel");
const classroomRouter = express.Router();
const { response } = require("express");

classroomRouter.post(
    "/getCourseData",
    expressAsyncHandler(async (req, res) => {
        const { classroomDataID } = req.body;
        const classroom = await Classroom.findById(classroomDataID);
        if (classroom) {
            res.status(200).send({classroom});
        } else {
            res.status(404).send("尚無此教室");
        }
    })
);



module.exports = classroomRouter;