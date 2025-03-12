import requests
import json
from datetime import datetime, timedelta
import os 

API_TOKEN = os.getenv("API_TOKEN")

header = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

stations_url = "https://api.hcdp.ikewai.org/mesonet/db/stations"
measurements_url = "https://api.hcdp.ikewai.org/mesonet/db/measurements"
variables = ["BattVolt", "RHenc", "CellStr", "CellQlt"]

now = datetime.utcnow()
start_time = now - timedelta(hours=24)
start_time_str = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")  # Convert to API format

try:
    response = requests.get(stations_url, headers=header, timeout=10)
    response.raise_for_status()  # Raises an HTTPError for bad responses
    stations = response.json()
except requests.exceptions.RequestException as e:
    print(f"Error fetching stations: {e}")
    stations = []

# Dictionary to store results
measurements_by_variable = {var: {} for var in variables}

# Fetch measurements
for station in stations:
    station_id = station.get("station_id")
    
    for variable in variables:
        query = f"station_ids={station_id}&var_ids={variable}&start_date={start_time_str}&limit=288"
        url = f"{measurements_url}?{query}"

        try:
            response = requests.get(url, headers=headers, timeout=10)
            data = response.json()

            if isinstance(data, list) and len(data) > 0:
                values = [entry["value"] for entry in data if entry.get("value") is not None]

                if values:
                    if variable == "BattVolt":
                        result_value = min(values)  # Get min for BattVolt
                    else:
                        result_value = max(values)  # Get max for other variables

                    latest_timestamp = max(entry["timestamp"] for entry in data if "timestamp" in entry)

                    measurements_by_variable[variable][station_id] = {
                        "value": result_value,
                        "timestamp": latest_timestamp
                    }
            else:
                print(f"No valid data for {variable} at station {station_id}")

        except requests.exceptions.Timeout:
            print(f"Timeout for {variable} at station {station_id}")
        except requests.exceptions.RequestException as e:
            print(f"Error fetching {variable} at station {station_id}: {e}")

# Process special case for stations 0520 and 0521
station_0520 = "0520"
station_0521 = "0521"

for variable in variables:
    if station_0520 in measurements_by_variable[variable] and station_0521 in measurements_by_variable[variable]:
        if variable == "BattVolt":
            # Take the lowest value between 0520 and 0521
            val_0520 = float(measurements_by_variable[variable][station_0520]["value"])
            val_0521 = float(measurements_by_variable[variable][station_0521]["value"])
            measurements_by_variable[variable][station_0521]["value"] = min(val_0520, val_0521)

        elif variable == "RHenc":
            # Take the highest value between 0520 and 0521
            val_0520 = float(measurements_by_variable[variable][station_0520]["value"])
            val_0521 = float(measurements_by_variable[variable][station_0521]["value"])
            measurements_by_variable[variable][station_0521]["value"] = max(val_0520, val_0521)

        elif variable in ["CellStr", "CellQlt"]:
            # Copy values from 0520 to 0521
            measurements_by_variable[variable][station_0521] = measurements_by_variable[variable][station_0520].copy()

for variable, measurements in measurements_by_variable.items():
    filename = f"{variable}.json"
    with open(filename, "w") as json_file:
        json.dump(measurements, json_file, indent=4)
    print(f"Saved {filename}")