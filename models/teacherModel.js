const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    teacherID: { type: String, required: true, unique:true},
    teacherName: { type: String, required: true},

    courses: {type: Array,
        courseDataID: { type: String},
        courseName: { type: String},
    }
  },
  {
    timestamps: true,
  }
);

const classroomModel = mongoose.model("Teacher", teacherSchema);

module.exports = classroomModel;