import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './src/models/urbanconnect/questionModel.js';
import User from './src/models/urbanconnect/userModel.js';
dotenv.config();

async function debugPopulation() {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);

    // Fetch the most recent question
    const q1 = await Question.findOne().sort({_id: -1}).populate('author');
    console.log("Q1 Author Object:", q1?.author);

    // Fetch raw without populate
    const q2 = await Question.findOne().sort({_id: -1});
    console.log("Q2 Raw Author ID:", q2?.author);

    // Manually query the User Table for that ID
    if(q2?.author) {
       const u = await User.findById(q2.author);
       console.log("Manually Fetched User:", u);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

debugPopulation();
