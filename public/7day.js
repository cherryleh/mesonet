const queryString = window.location.search;

const urlParams = new URLSearchParams(queryString);

const id = urlParams.get('id');

document.getElementById('displayId').textContent = id;
const tempTimestamps = [];
const rainTimestamps = [];
const tempValues = [];
const rainValues = [];
let tempRaw = [];
let rainRaw = [];

fetch('/api/data2')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        const tempRaw = data['Tair_1_Avg'];
        const tempTimestamps = [];
        const tempValues = [];

        for (const [isoTimestamp, value] of Object.entries(tempRaw)) {
            const date = new Date(isoTimestamp);
            const utcMilliseconds = date.getTime();
            const hstOffset = -10 * 60 * 60 * 1000;
            const formattedDate = utcMilliseconds + hstOffset;
            tempTimestamps.push(formattedDate);
            tempValues.push(value);
        }

        const rainRaw = data['RF_1_Tot'];
        const rainTimestamps = [];
        const rainValues = [];

        for (const [isoTimestamp, value] of Object.entries(rainRaw)) {
            const date = new Date(isoTimestamp);
            const utcMilliseconds = date.getTime();
            const hstOffset = -10 * 60 * 60 * 1000;
            const formattedDate = utcMilliseconds + hstOffset;
            rainTimestamps.push(formattedDate);
            rainValues.push(value);
        }

        // Create cutoff timestamp (now - 24 hours)
        const lastTimestamp = tempTimestamps[tempTimestamps.length - 1];
        const cutoff = lastTimestamp - (24 * 60 * 60 * 1000); // 24 hours in milliseconds

        // Filter data for the last 24 hours
        const filteredTempData = tempTimestamps
            .map((ts, i) => [ts, tempValues[i]])  // Pair each timestamp with its value
            .filter(pair => pair[0] >= cutoff);   // Filter pairs by timestamp

        const filteredRainData = rainTimestamps
            .map((ts, i) => [ts, rainValues[i]])  // Pair each timestamp with its value
            .filter(pair => pair[0] >= cutoff);   // Filter pairs by timestamp

        createChart(filteredTempData, filteredRainData);
    })
    .catch(error => {
        console.error('Error fetching the data:', error);
    });

function createChart(filteredTempData, filteredRainData) {
    Highcharts.chart('highcharts-container', {
        chart: {
            type: 'line'
        },
        title: {
            text: 'Temperature and Precipitation for the Last 24 Hours'
        },
        xAxis: {
            type: 'datetime',
            labels: {
                formatter: function () {
                    return Highcharts.dateFormat('%b %d %I:%M %p', this.value);
                }
            },
            tickInterval: 1000 * 60 * 60 * 4
        },
        yAxis: [{
            labels: {
                format: '{value}°C',
            },
            title: {
                text: 'Temperature'
            }
        }, {
            title: {
                text: 'Precipitation'
            },
            labels: {
                format: '{value} mm',
            },
            opposite: true
        }],
        tooltip: {
            xDateFormat: '%A, %b %e, %Y %l:%M %p',
            shared: true,
            pointFormat: '<span style="color:{series.color}">{series.name}: <b>{point.y:.2f}</b><br/>'
        },
        series: [{
            name: 'Precipitation',
            type: 'column',
            yAxis: 1,
            data: filteredRainData,
            tooltip: {
                valueSuffix: ' mm'
            }
        }, {
            name: 'Temperature',
            type: 'spline',
            data: filteredTempData,
            tooltip: {
                valueSuffix: '°C'
            }
        }]
    });
}