import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI as string;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conexion exitosa con la Base de datos");
  } catch (err: any) {
    console.log(`Error al conectar con la BD: ${err}`);
    process.exit(1);
  }
};
export default connectDB;
