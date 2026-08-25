import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT || 8080);
const app = createApp();

app.listen(port, () => {
  console.log(`CloudFS API listening on http://localhost:${port}`);
});
