const http = require("http");
const serverUrl = "http://localhost:5002/api/quit";

var post_options = {
  host: "localhost",
  port: "5002",
  path: "/api/quit",
  method: "POST",
};

let req = http.request(post_options, (res) => {
  if (res.statusCode !== 200) {
    throw new Error("Unexpected status code " + res.statusCode);
  }
  console.log("Shutdown complete");
});
req.on("error", (err) => {
  if (err.code === "ECONNREFUSED") {
    console.log("Webserver not running");
    process.exit(1);
  }
  throw err;
});
req.end();
