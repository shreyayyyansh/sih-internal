import mongoose from "mongoose";
import Administration from "./src/models/urbanconnect/administrationModel.js";
import dotenv from "dotenv";
dotenv.config();

const testAuthorities = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const authorities = [
      { city: "Delhi", postName: "SDM", department: "Revenue" },
      { city: "Delhi", postName: "Municipal Corporation", department: "Civic" },
      { city: "Delhi", postName: "Fire Department", department: "Emergency Services" },
      { city: "Mumbai", postName: "BMC Commissioner", department: "Civic" },
      { city: "Mumbai", postName: "Traffic Police", department: "Police" },
    ];

    for (const auth of authorities) {
      await Administration.updateOne(
        { city: auth.city, postName: auth.postName },
        { $set: auth },
        { upsert: true }
      );
    }
    console.log("Test authorities inserted successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error inserting test authorities:", error);
    process.exit(1);
  }
};

testAuthorities();
