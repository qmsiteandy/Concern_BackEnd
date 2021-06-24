const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    teacherName: { type: String},
    courseName: { type: String},
    weekName: { type: String},
    classroomMeetID: { type: String},
    isLinkToCourse: {type: Boolean, default: false },

    isClassing:{type: Boolean, default: false },
    date:{type: String},
    startTime:{type: String},
    endTime:{type: String},

    isResting:{type: Boolean, default: false },
    restTime: {type: Array,
      restStartTime: {type: String},
      restEndTime:{type: String}
    },

    rollcallTime: { type: Array },

    classmates: {type: Array,
      studentName: { type: String, required: true},
      studentID: { type: String, required: true},
      rollcall:{ type: Array},
      personalLeave:{ type: Boolean, default: false },
      newConcernDegree:{ type: Number},
      concernDegreeArray:{ type: Array},
      timeLineArray:{ type: Array},
    },
  },
  {
    timestamps: true,
  }
);

const classroomModel = mongoose.model("Classroom", classroomSchema);

module.exports = classroomModel;