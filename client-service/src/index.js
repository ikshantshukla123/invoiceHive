import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 3002;

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\nClient Service running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
};

process.on("SIGTERM", () => { console.log("SIGTERM — shutting down"); process.exit(0); });
process.on("SIGINT",  () => { console.log("SIGINT  — shutting down"); process.exit(0); });
process.on("unhandledRejection", (err) => { console.error("Unhandled:", err); process.exit(1); });

start();