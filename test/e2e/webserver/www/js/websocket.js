function initWs(wsUri, elementId, closeAfterFirstMessage) {
  output = document.getElementById(elementId);
  output.hidden = false;
  testWebSocket(wsUri, output, closeAfterFirstMessage);
}

function initAllWs() {
  initWs("ws://" + document.location.hostname + ":5002/ws/echo", "ws-output");
  initWs(
    "ws://" + document.location.hostname + ":5000/ws/echo",
    "ws-ntlm-output"
  );
  initWs("wss://" + document.location.hostname + ":5003/ws/echo", "wss-output");
  initWs(
    "wss://" + document.location.hostname + ":5001/ws/echo",
    "wss-ntlm-output"
  );
}

function testWebSocket(wsUri, outputElement, closeAfterFirstMessage) {
  let ws = new WebSocket(wsUri);
  ws.onopen = function (evt) {
    onOpen(evt, ws, outputElement);
  };
  ws.onclose = function (evt) {
    onClose(evt, outputElement);
  };
  ws.onmessage = function (evt) {
    onMessage(evt, ws, outputElement, closeAfterFirstMessage);
  };
  ws.onerror = function (evt) {
    onError(evt, outputElement);
  };
}

function onOpen(evt, ws, outputElement) {
  writeToScreen("CONNECTED", outputElement);
  doSend(ws, "WebSocket rocks", outputElement);
}

function onClose(evt, outputElement) {
  writeToScreen("DISCONNECTED", outputElement);
}

function onMessage(evt, ws, outputElement, close) {
  writeToScreen(
    '<span style="color: blue;">RESPONSE: ' + evt.data + "</span>",
    outputElement
  );
  if (close) {
    ws.close();
  }
}

function onError(evt, outputElement) {
  writeToScreen(
    '<span style="color: red;">ERROR:</span> ' + evt.data,
    outputElement
  );
}

function doSend(ws, message, outputElement) {
  writeToScreen("SENT: " + message, outputElement);
  ws.send(message);
}

function writeToScreen(message, outputElement) {
  var pre = document.createElement("p");
  pre.style.wordWrap = "break-word";
  pre.innerHTML = message;
  outputElement.appendChild(pre);
}
