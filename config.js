require('dotenv').config();

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.ivnyf.mongodb.net/amazona?retryWrites=true&w=majority`;
const uri1 = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.u4s4h.mongodb.net/amazona?retryWrites=true&w=majority`;
module.exports = {
  MONGODB_URL: "mongodb://localhost/test",
  MONGODB_ATLAS_URL: uri1,
  //JWT_SECRET: process.env.JWT_SECRET || "somethingsecret",
};