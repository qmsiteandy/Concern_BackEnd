const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true},
    weekName: { type: String, required: true},
    classroomID: { type: String, required: true},
    isClassing:{type: Boolean, default: false },

    classmates:{type: Array},
    
    startTime:{type: String},
    endTime:{type: String},
  },
  {
    timestamps: true,
  }
);

const classroomModel = mongoose.model("Classroom", classroomSchema);

module.exports = classroomModel;