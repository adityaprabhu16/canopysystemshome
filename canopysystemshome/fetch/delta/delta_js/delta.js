const tag = "0C:DC:7E:57:A7:5C"; //FIXME Update based on tag!
//const tag = 0;
let humidChart = null; let tempChart = null; let pressureChart = null;        
let lightChart = null; let moistChart = null; let batteryChart = null;       
let vpdChart = null;  

let wait_duration = 60000*15;     //Time between sensor chart updates (15 minutes)
let check_duration = 1000;
let updateOnLoad = true;          //On load of the DOM, setup chart data.                     
let totalEntries = 50;            //Total entries to be displayed per chart - default is 50 data-points.

let moistColor = 'rgb(0,164,255)'; let tempColor = 'rgb(255,0,43)'; let humidColor = 'rgb(7,168,23)';
let lightColor = 'rgb(242,158,32)'; let batteryColor = 'rgb(18,131,97)'; let pressureColor = 'rgb(90,90,90)';
let vpdColor = 'rgb(128,0,128)';
let exceededColor = 'rgba(255,0,43,0.3)'; let subceededColor = 'rgba(26,75,229,0.50)'; let resetColor = 'rgb(238,88,96)';
let saveColor = 'rgb(76,175,80)'; let backgroundColor = 'rgb(255,255,255)';

let humidity = []; let temperature = []; let pressure = []; let moisture = []; let battery = []; let vpd = [];
let timestamp = []; let timestampPopUp = [];

let hThresh = null; let tThresh = null; let pThresh = null; let mThresh = null; let vpdThresh = null;

let permission = null;      //If notifications permission granted by user, send notifications when metrics too low.
let prevTime = null;

let latestSensorReadings = {
    "humidity": 0,
    "temperature": 0,
    "moisture": 0,
    "battery": 0
}

let humidText;
let tempText;
let pressureText;
let batteryText;
let timeStampText;

window.addEventListener("DOMContentLoaded", loadedHandler)

//window.setInterval(loadedHandler, wait_duration);
//window.setInterval(checkThresholds, check_duration);

//FIX For ensuring charts render on load:
//1. Make loadedHandler() asynchronous
//2. Make readGoogleSheetsAPI() await (asynchronous)
//New stuff with battery progress animations!

async function loadedHandler() {
    humidText = document.getElementById("humidityText");
    tempText = document.getElementById("temperatureText");
    pressureText = document.getElementById("pressureText");             //FIXME - update pressure correctly.
    batteryText = document.getElementById("batteryText");

    timestampText = document.getElementById("timestampText");
    if(localStorage.getItem("humidity")) {hThresh=localStorage.getItem("humidity");}
    if(localStorage.getItem("temperature")) {tThresh=localStorage.getItem("temperature");}
    if(localStorage.getItem("pressure")) {pThresh=localStorage.getItem("pressure");}
    if(localStorage.getItem("moisture")) {mThresh=localStorage.getItem("moisture");}
    if(localStorage.getItem("permission")) {permission = localStorage.getItem("permission");}

    //Fetch the data & then process it.
    await readGoogleSheetsAPI();

    //Finally, render the charts:
    if(humidChart != null) { humidChart.destroy();}
    if(tempChart != null) { tempChart.destroy();}
    if(pressureChart != null) { pressureChart.destroy();}
    if(moistChart != null) { moistChart.destroy();}
    if(batteryChart != null) { batteryChart.destroy();}

    if(vpdChart != null) { vpdChart.destroy();}
    let tuple = updateChart('Relative Humidity (%)', '%', humidity, humidColor, 5, 0, 100, 'humidchart',hThresh);
    humidChart = new Chart(tuple[0], tuple[1]);
    tuple = updateChart('Temperature (°F)', '°F', temperature, tempColor, 5, 0, 120, 'tempchart',tThresh);
    tempChart = new Chart(tuple[0], tuple[1]);
    tuple = updateChart('GIT UPDATES', 'hPa', pressure, pressureColor, 5, 0, 40000, 'pressurechart',pThresh);
    pressureChart = new Chart(tuple[0], tuple[1]);
    tuple = updateChart('IRRIGATION STATUS (%)', '%', moisture, moistColor, 5, 0, 40000, 'moistchart',mThresh);
    moistChart = new Chart(tuple[0], tuple[1]);
    tuple = updateChart('Vapor Pressure Deficit (kPa)', 'kPa', vpd, vpdColor, 0.2, 0, 7, 'vpdchart', null);
    vpdChart = new Chart(tuple[0], tuple[1]);
    tuple = updateChart('Battery (V)', 'V', battery, batteryColor, 0.5, 3.0, 4.2, 'batterychart',null);
    batteryChart = new Chart(tuple[0],tuple[1]);
    
    setTimeout(function() {                 //This fixes the window resize issue - data automatically displays after 1 second.
        humidChart.update();
        tempChart.update();
        pressureChart.update();
        moistChart.update();
        batteryChart.update();
        vpdChart.update();
    },1000);   

    //---------------PROGRESS CIRCLE STUFF----------------------:
    console.log("Latest Sensor Readings: ");
    console.log(latestSensorReadings);
    let circularProgress = document.querySelector(".humidity-progress");
    let progressValue = document.querySelector(".humidity-value");
    
    let progressStartValue = 0,
    progressEndValue = latestSensorReadings.humidity,
    speed = 10;

    console.log(progressEndValue);
    
    let progress = setInterval(()=> {
        if(progressStartValue >= progressEndValue) {
            clearInterval(progress);
        }
        else {
            progressStartValue++;
            progressValue.textContent = `${progressStartValue}RH%`;
            circularProgress.style.background = `conic-gradient(#1efb22, ${progressStartValue * 3.6}deg, #444444 0deg)`;
        }
    }, speed);

    let tempProgress = document.querySelector(".temp-progress");
    let tempValue = document.querySelector(".temp-value");
    let tempStartValue = 0;
    let tempEndValue = latestSensorReadings.temperature;
    
    let temp = setInterval(()=> {
        if(tempStartValue >= tempEndValue) {
            clearInterval(temp);
        }
        else {
            tempStartValue++;
            tempValue.textContent = `${tempStartValue}°F`;
            tempProgress.style.background = `conic-gradient(#fb1e1e, ${tempStartValue * 3.6}deg, #444444 0deg)`;
        }
    }, speed);

    let moistProgress = document.querySelector(".moist-progress");
    let moistValue = document.querySelector(".moist-value");
    let moistStartValue = 0;
    let moistEndValue = latestSensorReadings.moisture;
    
    let moist = setInterval(()=> {
        if(moistStartValue >= moistEndValue) {
            clearInterval(moist);
        }
        else {
            moistStartValue++;
            moistValue.textContent = `${moistStartValue}%`;
            moistProgress.style.background = `conic-gradient(#1ef0fb, ${moistStartValue * 3.6}deg, #444444 0deg)`;
        }
    }, speed);

    let battProgress = document.querySelector(".battery-progress");
    let battValue = document.querySelector(".battery-value");
    let battStartValue = 0;
    let battEndValue = latestSensorReadings.battery;
    
    let batt = setInterval(()=> {
        if(battStartValue >= battEndValue) {
            clearInterval(batt);
        }
        else {
            battStartValue += 0.05;
            battValue.textContent = `${battStartValue.toFixed(2)} V`;
            battProgress.style.background = `conic-gradient(#ecfb1e, ${battStartValue * 85.7}deg, #444444 0deg)`;
        }
    }, speed);
    //---------------PROGRESS CIRCLE STUFF----------------------:

}

//Components for Building the Charts:
//(3.) Callbacks:
const title = (tooltipItems) => {
    let description = "";
    tooltipItems.forEach(function(tooltipItem) {
        description += timestampPopUp[tooltipItem.parsed.x];
    });
    return description;
}

async function readGoogleSheetsAPI() {
    let responseData = "";
    try {
        const response = await fetch(
            "https://script.google.com/macros/s/AKfycbxhMvhCmGyyAIByQiH5LTOy8G6BlWbIZfC_s6QeOBAqKRTpF273cNFHxt6pAySqLwLj4g/exec"
        );
        //If the response is not ok (404 or 500) throw an error
        if(!response.ok) {
            throw new Error("Failed to fetch sensor data");
        }
        //print the response headers to see what they look like!
        const contentType = response.headers.get("Content-Type");
        //if contentType exists and it's application/json:
        if(contentType && contentType.includes("application/json")) {
            //Response is JSON
            console.log("JSON DATA");
            responseData = await response.json();
        }
        else {
            let data = await response.text();
            console.log("TEXT FORMAT");
            responseData = JSON.parse(data);
        }
    }
    catch(err) {
        console.log("Error fetching data: ", err);
    }
    processData(responseData);
}

function processData(data) {
    //console.log(data);
    //data post-processing:
    //filter based on sensor id (tag)
    data = data.filter((element => element["tag"] == tag));
    let backIdx = data.length - 1;
    if(backIdx < 0) { backIdx = 1 }

    if(backIdx < 50) { totalEntries = backIdx + 1;}
    else if (backIdx >= 50 && backIdx < 100) {totalEntries = 50;}
    else if (backIdx >= 100 && backIdx < 200) {totalEntries = 100;}
    else if (backIdx >= 200 && backIdx < 300) {totalEntries = 200;}
    else if (backIdx >= 300) {totalEntries = 300;}

    for(let count = 0; count < totalEntries; count++) {
        //Data validation checks: if ["field"] is undefined, set to 0 to allow charts to render.
        let temp = ((parseFloat((data[backIdx]?.['temp']) ?? 0)*1.8)+32).toPrecision(4);
        let tempC = parseFloat(data[backIdx]?.['temp'] ?? 0); //temperature in celcius
        let humid = parseFloat(data[backIdx]?.['humidity'] ?? 0);
        let press = parseFloat(data[backIdx]?.['moist3'] ?? 0);
        let batt = parseFloat(data[backIdx]?.['battery'] ?? 0);
        let moist1 = parseFloat(data[backIdx]?.['moist1'] ?? 0);
        let time = (data[backIdx]?.['timestamp'] ?? 0);

        if (count == 0) {
            if(!isNaN(humid)) { latestSensorReadings["humidity"] = humid; }
            else { latestSensorReadings["humidity"] = 0; }

            if(!isNaN(temp)) { latestSensorReadings["temperature"] = temp; }
            else { latestSensorReadings["temperature"] = 0; }

            if(!isNaN(moist1)) { latestSensorReadings["moisture"] = moist1; }
            else { latestSensorReadings["moisture"] = 0; }

            if(!isNaN(batt)) {latestSensorReadings["battery"] = batt;}
            else { latestSensorReadings["battery"] = 0; }

            humidText.textContent = humid + " %";
            tempText.textContent = temp + " °F";
            pressureText.textContent = press + " hPa";
            batteryText.textContent =  batt + " V";
            timestampText.textContent = processTimeStamp(time);
        }

        timestamp.push(processTimeStamp(time).slice(-8));
        timestampPopUp.push(processTimeStamp(time));
        humidity.push([timestamp[count],humid]);
        temperature.push([timestamp[count],temp]);
        pressure.push([timestamp[count], press]);
        moisture.push([timestamp[count], moist1]);
        battery.push([timestamp[count], batt]);

        //Temp in celsius here!
        let vpSat = parseFloat((610.7*(10**((7.5*tempC)/(237.3+tempC))))/1000);
        let vpAir = parseFloat((610.7*(10**((7.5*tempC)/(237.3+tempC))))/1000)*(humid/100);

        vpd.push([timestamp[count], vpSat-vpAir]); 

        backIdx = backIdx - 1;   //Helps us iterate through DB array (above)
    }

    humidity = humidity.reverse();                //reverse the data from (moist-recent -> least recent) to (least-recent -> most-recent)
    temperature = temperature.reverse();
    pressure = pressure.reverse();
    moisture = moisture.reverse();
    battery = battery.reverse();
    timestamp = timestamp.reverse();
    timestampPopUp = timestampPopUp.reverse();

    vpd = vpd.reverse();
}

function processTimeStamp(timestamp) {
    //Leaves details for times popUp
    let year = 0;
    let month = 0;
    let day = 0;
    let hour = 0;
    let min = 0;
    let sec = 0;
    let utcDate = 0;
    //format: Date(2023,11,18,18,4,15);
    let strArray = (((timestamp.replace("Date(", "")).replace(")","")).split(","));
    let numArray = strArray.map(Number);
    //console.log(numArray);
    //strArray = ['2023', '11', '22', '14', '52', '6']
    year = numArray[0];
    month = numArray[1];
    day = numArray[2];
    hour = numArray[3];
    min = numArray[4];
    sec = numArray[5];
    utcDate = new Date(Date.UTC(year, month, day, hour, min, sec));
    //dates are already being logged locally.
    var localDate = utcDate.toLocaleString("en-US", {
        dateStyle: "short",
        timeStyle: "short"
    });
    //let loc = localDate.slice(-8);
    return localDate;
}


function processTimeStamp(timestamp) {
    // Given UTC time string:
    // Convert UTC time string to Date object
    const utcDate = new Date(timestamp);
    //Convert UTC time to Chicago time (CST)
    const chicagoDate = new Date(utcDate.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    //Customizable options
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    //Format Chicago time string
    return chicagoDate.toLocaleString("en-US", options);
}


function updateChart(label, units, dataArr, color, steps, min, max, chartID, threshold) {
    //(1.) Data:
    let sensorData = {
        label: label, data: dataArr,
        type: 'line',
        lineTension: 0.1,                           //curviness of the line
        borderColor: color,                         //line border color
        pointRadius: 2.5,                           //data point radius
        pointBorderColor: color,                    //border of the datapoint
        pointBackgroundColor: color,                //dark blue
        pointBorderWidth: 1,                        //width of the point border when hovering
        pointHoverRadius: 5,                        //radius of the data point when hovering
        borderWidth: 3,                             //width of the data label border
        //backgroundColor: batteryBgColor,          //background color of the data label border
        yAxisID: 'y',
        tension: 0.4,
        fill: {
            //target: 'origin',
            target: {
                value: threshold
            },
            below: subceededColor,
            above: exceededColor
        }
    }
    const data = { labels: timestamp, datasets: [sensorData]}
    //(2.) Axis Titles:
    const X = { title: {color: 'black', display: true, text: 'Timestamp'},  ticks: { color: 'black', stepsize: 10}, min: 0, max: 1000}
    const YPercent = { title: { color: 'black', display: true, text: label}, 
                beginAtZero: true, type: 'linear', position: 'left', 
                ticks: { color: 'black', stepsize: steps, 
                    callback: function(value, index, values) {
                        return value + units;
                }}, min: min, max: max}

    //(3.) Options:
    const options = {
        plugins: {
            autocolors: false,
            tooltip: {
                callbacks: {
                    title: title
                }
            }
        }, 
        scales: {
            x: X,
            y: YPercent
        },
        responsive:true,
        maintainAspectRatio: true,
        animation: {duration: 0}                   //gets rid of the graph rendering that happens b/w updates
    }
    const config = {
        data: data,
        options: options
    }
    let context = document.getElementById(chartID).getContext('2d'); //FIXME
    return [context, config];
}

function createCSV() { //Create VPD here!
    let i = 0;
    let csvContent = "humidity,temperature,pressure,moisture,battery,timestamp\n";
    for(i = 0; i < totalEntries; i++) {
        let row = humidity[i][1]+","+temperature[i][1]+","+pressure[i][1]+
        ","+moisture[i][1]+","+battery[i][1]+","+timestampPopUp[i]+"\n";
        csvContent+=row;
    }
    let data  = new Blob([csvContent], {type: "text/csv"});
    saveFile(data, "data.csv");
}

function saveFile(blob, filename) {
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
    }
    else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 0);
    }
}

function allowNotification() {
    //alert("hi");
    Notification.requestPermission().then(perm => {
        localStorage.setItem("permission", perm);
        if(perm === "granted") {    //If permission granted, send new notification
            const notification = new Notification("Notifications enabled", {
                body: "You'll get threshold alerts."
            });
        }
    });
}

function checkThresholds() {
    if(permission === "granted") {
        hThresh = parseFloat(hThresh);
        tThresh = parseFloat(tThresh);
        mThresh = parseFloat(mThresh);

        if(hThresh != 'null') { //You're inputting a string into the form, so 'null' is a string.
            if(humidity[totalEntries - 1][1] >= hThresh && timestampPopUp[totalEntries-1] != prevTime) {
                let notification = new Notification("Humidity has gone above " + hThresh + "%!", {
                    body: "Happened at " + timestampPopUp[totalEntries-1],
                    requireInteraction: true            //Notification stays open until closed. Make sure to allow notifications in system settings
                });
                notification.addEventListener("close", event => {
                    console.log(event);
                });
            }
            /*
            if(humidity[totalEntries-1][1] <= hThresh && timestampPopUp[totalEntries-1] != prevTime) {
                let notification = new Notification("Humidity has gone below " + hThresh + "%!", {
                    body: "Happened at " + timestampPopUp[totalEntries-1],
                    requireInteraction: true            //Notification stays open until closed. Make sure to allow notifications in system settings
                });
                notification.addEventListener("close", event => {
                    console.log(event);
                });
            }
            */
        }
        if(tThresh != 'null') {
            if(temperature[totalEntries-1][1] >= tThresh && timestampPopUp[totalEntries-1] != prevTime) {
                let notification = new Notification("Temperature has gone above " + tThresh + "°F!", {
                    body: "Happened at " + timestampPopUp[totalEntries-1],
                    requireInteraction: true            //Notification stays open until closed. Make sure to allow notifications in system settings
                });
                notification.addEventListener("close", event => {
                    console.log(event);
                });
            }
            /*
            if(temperature[totalEntries-1][1] <= tThresh && timestampPopUp[totalEntries-1] != prevTime) {
                let notification = new Notification("Temperature has gone below " + tThresh + "°F!", {
                    body: "Happened at " + timestampPopUp[totalEntries-1],
                    requireInteraction: true            //Notification stays open until closed. Make sure to allow notifications in system settings
                });
                notification.addEventListener("close", event => {
                    console.log(event);
                });
            }
            */
        }
        if(mThresh != 'null') {
            /*
            if(moisture[totalEntries-1][1] >= mThresh && timestampPopUp[totalEntries-1] != prevTime) {
                let notification = new Notification("Moisture has gone above " + mThresh + "%!", {
                    body: "Happened at " + timestampPopUp[totalEntries-1],
                    requireInteraction: true            //Notification stays open until closed. Make sure to allow notifications in system settings
                });
                notification.addEventListener("close", event => {
                    console.log(event);
                });
            }
            */
            if(moisture[totalEntries-1][1] <= mThresh && timestampPopUp[totalEntries-1] != prevTime) {
                let notification = new Notification("Moisture has gone below " + mThresh + "%!", {
                    body: "Happened at " + timestampPopUp[totalEntries-1],
                    requireInteraction: true            //Notification stays open until closed. Make sure to allow notifications in system settings
                });
                notification.addEventListener("close", event => {
                    console.log(event);
                });
            }
        }
        prevTime = timestampPopUp[totalEntries-1];
    }
}