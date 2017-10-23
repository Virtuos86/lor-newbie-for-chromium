var TRACKER_URL_PATTERN = /\w*?:\/\/www.linux.org.ru\/tracker\/\w*/;
var NICKNAME_IN_TRACKER_PATTERN = /\((\w*?)<span class="hideon-desktop"> в <\/span><span class="hideon-desktop">/;

var PROFILE_URL_PATTERN = /https:\/\/www.linux.org.ru\/people\/\w+\/profile/;
var DATE_OF_REGISTRATION_PATTERN = /<b>Дата регистрации:<\/b>\s<time datetime="[0-9\-\:\.\+T]+" >/;
var UNIQ_NICKNAMES = {};
var STORED_NICKNAMES;
var COUNTER;

var DEFAULT_CSS_STYLE = "border-radius: 3px; border: 1px solid yellow; color: ";
var ONE_WEEK_NEWBIE_COLOR = "#ff0000";
var TWO_WEEKS_NEWBIE_COLOR = "#ffff00";

function decCounter() {
    COUNTER -= 1;
    if (COUNTER == 0)
        storeSettings();
}

function getExtractedNicknameFromUrl(profile_url) {
    var prefix = "https://www.linux.org.ru/people/";
    var suffix = "/profile";
    var start = profile_url.indexOf("https://www.linux.org.ru/people/");
    start +=  prefix.length;
    var end = profile_url.indexOf(suffix, start);
    return profile_url.slice(start, end);
}

function request(elem, callback, isTracker=false, cell=null) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", elem.href, true);
    var timeout = setTimeout(() => { xhr.abort(); }, 60000);
    xhr.onreadystatechange = () => {
        clearTimeout(timeout);
        callback(xhr, elem, isTracker, cell);
    };
    xhr.send(null);
};

function handler(xhr, elem, isTracker=false, cell=null) {
    if ( xhr.readyState == 4 ) {
        if (xhr.status == 200) {
            var pageSource = xhr.responseText;
            UNIQ_NICKNAMES[getExtractedNicknameFromUrl(elem.href)] = pageSource;
            findDateOfRegistration(pageSource, elem, isTracker, cell);
        };
    };
};

function changeStyleOfElem(elem, color) {
    elem.style = DEFAULT_CSS_STYLE + color;
}

function findDateOfRegistration(profile_page_data, elem, isTracker=false, cell=null) {
    var nickname = getExtractedNicknameFromUrl(elem.href);
    if (DATE_OF_REGISTRATION_PATTERN.test(profile_page_data)) {
        var prefix = '<b>Дата регистрации:</b> <time datetime="';
        var suffix = '" >';
        var start = profile_page_data.indexOf(prefix) + prefix.length;
        var end = profile_page_data.indexOf(suffix, start);
    } else {
        // У старых регистрантов дата создания аккаунта вообще не указана :).
        STORED_NICKNAMES[nickname] = 1;
        decCounter();
        return;
    }

    var now = new Date();
    var dateOfRegistration = new Date(profile_page_data.slice(start, end));
    var oneWeekNewbieDate = new Date(1970, 0, 8, 0, 0, 0, 0);
    var twoWeeksNewbieDate = new Date(1970, 0, 15, 0, 0, 0, 0);
    if ((new Date(now - dateOfRegistration) - oneWeekNewbieDate) < 0) {
        if (!isTracker) changeStyleOfElem(elem, ONE_WEEK_NEWBIE_COLOR);
        else {
            //TODO
            var html = cell.innerHTML;
            var start = html.indexOf(nickname);
            var end = start + nickname.length;
            cell.innerHTML = html.slice(0, start) + '<font style="' + DEFAULT_CSS_STYLE + ONE_WEEK_NEWBIE_COLOR + '">' + nickname + "</font>" + html.slice(end);
        }
    } else if ((new Date(now - dateOfRegistration) - twoWeeksNewbieDate) < 0) {
        if (!isTracker) changeStyleOfElem(elem, TWO_WEEKS_NEWBIE_COLOR);
        else {
            //TODO
            var html = cell.innerHTML;
            var start = html.indexOf(nickname);
            var end = start + nickname.length;
            cell.innerHTML = html.slice(0, start) + '<font style="' + DEFAULT_CSS_STYLE + TWO_WEEKS_NEWBIE_COLOR + '">' + nickname + "</font>" + html.slice(end);
        }
    } else {
        STORED_NICKNAMES[nickname] = 1;
    }
    decCounter();
}

function onOk(item) {
    if (typeof item.nicknames === "undefined") {
        setDefaultSettings();
    } else {
        STORED_NICKNAMES = item.nicknames;//alert(JSON.stringify(STORED_NICKNAMES));
    }
    main();
}


function setDefaultSettings() {
    STORED_NICKNAMES = UNIQ_NICKNAMES;
    chrome.storage.sync.set({nicknames: STORED_NICKNAMES}, () => {});
}

function loadSettings() {
    chrome.storage.sync.get("nicknames", onOk);
}

function storeSettings() {
    chrome.storage.sync.set({nicknames: STORED_NICKNAMES}, () => {});
}

function main() {
    if (TRACKER_URL_PATTERN.test(document.location.href)) {
        var table_rows = document.body.children[2].children[2].children[0].rows;
        var parsed_nicknames = [];
        for (var i = 1; i < table_rows.length; i++) {
            var cell = table_rows[i].cells[1];
            var html = cell.innerHTML;
            var nickname = html.match(NICKNAME_IN_TRACKER_PATTERN);
            if (nickname === null) {
                continue;
            } else {
                parsed_nicknames.push([nickname[1], cell]);
            }
        }
        COUNTER = parsed_nicknames.length;
        for (var i = 0; i < parsed_nicknames.length; i++) {
            var nickname = parsed_nicknames[i][0];
            if (typeof STORED_NICKNAMES[nickname] !== "undefined") {
                decCounter();
                continue;
            } else {
                var elem = { href: "https://www.linux.org.ru/people/" + nickname + "/profile/" };
                if (typeof UNIQ_NICKNAMES[nickname] === "undefined") {
                    request(elem, handler, true, parsed_nicknames[i][1]);
                } else {
                    findDateOfRegistration(UNIQ_NICKNAMES[nickname], elem, true, parsed_nicknames[i][1]);
                }
            }
        }
    } else {
        var elems = document.getElementsByTagName("a");
        COUNTER = elems.length;
        for (var i = 0; i < elems.length; i++) {
            var elem = elems[i];
            if (PROFILE_URL_PATTERN.test(elem.href)) {
                if (typeof STORED_NICKNAMES[getExtractedNicknameFromUrl(elem.href)] !== "undefined") {
                    decCounter();
                    continue;
                } else {
                    if (typeof UNIQ_NICKNAMES[getExtractedNicknameFromUrl(elem.href)] === "undefined") {
                        request(elem, handler);
                    } else {
                        findDateOfRegistration(UNIQ_NICKNAMES[getExtractedNicknameFromUrl(elem.href)], elem);
                    }
                }
            } else {
                decCounter();
            }
        }
    }
}

loadSettings();
