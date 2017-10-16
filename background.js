function msgHandler(message, msgSender, sendResponce) {
    chrome.tabs.executeScript(
        {
            file: "highlight.js",
            runAt: "document_idle"
        },
        () => { console.log("Ok"); }
    );
}

chrome.runtime.onMessage.addListener(msgHandler);
