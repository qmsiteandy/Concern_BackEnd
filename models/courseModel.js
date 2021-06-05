const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    teacherName: { type: String, required: true},
    teacherID: { type: String, required: true},
    courseName: { type: String, required: true},

    classmates: {type: Array,
        studentName: { type: String},
        studentGoogleName: { type: String},
        studentID: { type: String},
    },
    
    courseWeeks: {type: Array,
        weekName: { type: String},
        classroomID: { type: String},
    }
  },
  {
    timestamps: true,
  }
);

const courseModel = mongoose.model("Course", courseSchema);

module.exports = courseModel;