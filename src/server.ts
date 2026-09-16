import app from "./app.ts";
import connectDB from "./config/db.ts";
import "dotenv/config";

const PORT = Number(process.env.PORT) || 3001;

const server = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
};

server();

export default server;
