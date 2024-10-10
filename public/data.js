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

const series1 = [];
const series2 = [];

fetch('/api/data2')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        const tempRaw = data['Tair_1_Avg']; // Temperature data
        const rainRaw = data['RF_1_Tot'];   // Rainfall data

        // Convert object to array of [timestamp, value] pairs
        function formatObjectToSeries(rawData) {
            return Object.entries(rawData).map(([timestamp, value]) => {
                return [new Date(timestamp).getTime(), parseFloat(value)];
            });
        }

        // Format the data
        const series1 = formatObjectToSeries(tempRaw);
        const series2 = formatObjectToSeries(rainRaw);
        const chart = createChart(series1, series2);

        // Create a function to update the chart based on the selected timeframe
        function updateChart() {
            const selectedTimeframe = parseInt(document.getElementById('timeframe').value, 10);
            const cutoffTime = series1[series1.length - 1][0] - (selectedTimeframe * 60 * 60 * 1000); // Adjust cutoffTime based on dropdown

            // Filter the data for the selected timeframe
            const filteredSeries1 = series1.filter(([timestamp]) => timestamp >= cutoffTime);
            const filteredSeries2 = series2.filter(([timestamp]) => timestamp >= cutoffTime);

            console.log(filteredSeries1);
            console.log(filteredSeries2);

            createChart(filteredSeries1, filteredSeries2);
        }

        // Initial chart creation
        updateChart();

        // Update the chart when the dropdown value changes
        document.getElementById('timeframe').addEventListener('change', updateChart);
    })
    .catch(error => {
        console.error('Error fetching the data:', error);
    });

function createChart(filteredSeries1, filteredSeries2) {
    Highcharts.chart('highcharts-container', {
        chart: {
            type: 'line'
        },
        title: {
            text: 'Temperature and Precipitation for the Selected Timeframe'
        },
        xAxis: {
            type: 'datetime',
            labels: {
                formatter: function () {
                    return Highcharts.dateFormat('%b %d %I:%M %p', this.value);
                }
            },
            tickInterval: 1000 * 60 * 60
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

        },
        plotOptions: {
            series: {
                pointWidth: 5,
                marker: {
                    enabled: false
                },
                animation: {
                    duration: 800, // Animation duration for series update
                }
            }
        },
        series: [{
            name: 'Temperature',
            type: 'spline',
            data: filteredSeries1,
            tooltip: {
                valueSuffix: '°C'
            }
        },{
            name: 'Precipitation',
            type: 'column',
            yAxis: 1,
            data: filteredSeries2,
            tooltip: {
                valueSuffix: ' mm'
            }
        }]
    });
}