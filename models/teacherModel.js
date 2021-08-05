const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    teacherName: { type: String, required: true},
    teacherID: { type: String, required: true},

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