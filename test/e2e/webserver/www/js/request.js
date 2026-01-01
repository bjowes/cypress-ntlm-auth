function typeToUrl(baseUrl, type) {
  if (type.toUpperCase() === "POST" || type.toUpperCase() === "PUT") {
    return baseUrl + "/api/" + type.toLowerCase();
  }
  return baseUrl + "/api/" + type.toLowerCase() + "?id=1234";
}

function typeToBody(type) {
  if (type.toUpperCase() === "POST" || type.toUpperCase() === "PUT") {
    return JSON.stringify({ test: "message is here" });
  }
  return null;
}

function request(baseUrl, type, cb) {
  $.ajax({
    url: typeToUrl(baseUrl, type),
    type: type.toUpperCase(),
    contentType: "application/json",
    data: typeToBody(type),
    success: function (data, status) {
      console.log(type, "completed");
      if (cb) {
        cb(status);
      }
    },
    error: function (xhr, status, errorThrown) {
      console.error(errorThrown);
      if (cb) {
        cb(status, errorThrown);
      }
    },
  });
}
