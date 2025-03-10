import requests
import json
from datetime import datetime
import os 

#Diagnostic script that retrieves the latest measurements for each variable from each station

API_TOKEN = os.getenv("API_TOKEN")

header = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

stations_url = "https://api.hcdp.ikewai.org/mesonet/db/stations"
measurements_url = "https://api.hcdp.ikewai.org/mesonet/db/measurements"

variables = ["RF_1_Tot300s", "Tair_1_Avg", "RH_1_Avg","SWin_1_Avg","WS_1_Avg"]

# Get all stations
response = requests.get(stations_url, headers=header)
if response.status_code == 200:
    stations = response.json()
else:
    print("Failed to retrieve stations:", response.text)
    stations = []

# Dictionary to store latest measurements
latest_measurements = []

for station in stations:
    station_id = station["station_id"]

    # **Check if station has any valid data before continuing**
    test_query = f"station_ids={station_id}&var_ids={variables[0]}&limit=1"
    test_url = f"{measurements_url}?{test_query}"

    try:
        test_response = requests.get(test_url, headers=header, timeout=5)  # Set timeout
        test_data = test_response.json() if test_response.status_code == 200 else None

        if not test_data:
            print(f"Skipping station {station_id} (no valid data or request failed)")
            continue  # Skip this station

    except requests.exceptions.Timeout:
        print(f"Skipping station {station_id} (request timed out)")
        continue  # Skip this station

    # If station passes the test, fetch all variables
    for var in variables:
        query_string = f"station_ids={station_id}&var_ids={var}&limit=1"
        full_url = f"{measurements_url}?{query_string}"
        print(full_url)

        try:
            response = requests.get(full_url, headers=header, timeout=5)  # Set timeout

            if response.status_code == 200:
                data = response.json()
                if data:
                    # Store only required fields
                    latest_measurements.append({
                        "station_id": data[0]["station_id"],
                        "variable": data[0]["variable"],
                        "timestamp": data[0]["timestamp"]
                    })

        except requests.exceptions.Timeout:
            print(f"Skipping variable {var} for station {station_id} (request timed out)")
            continue  # Skip this variable and move to the next one

sorted_data = sorted(latest_measurements, key=lambda x: (x['station_id'], x['variable']))
print(sorted_data)
json_filename = "latest_measurements.json"
with open(json_filename, "w") as json_file:
    json.dump(sorted_data, json_file, indent=4)

earliest_per_station = {}

for entry in latest_measurements:
    station_id = entry["station_id"]
    timestamp_str = entry["timestamp"]  # Keep original string
    timestamp_dt = datetime.fromisoformat(timestamp_str.replace("Z", ""))  # Convert to datetime

    if station_id not in earliest_per_station or timestamp_dt < earliest_per_station[station_id]["timestamp_dt"]:
        earliest_per_station[station_id] = {
            "station_id": station_id,
            "timestamp": timestamp_str,  # Keep string format for final output
            "timestamp_dt": timestamp_dt,  # Store datetime for comparison
            "variable": entry["variable"]
        }

filtered_data = [{"station_id": v["station_id"], "timestamp": v["timestamp"], "variable": v["variable"]} for v in earliest_per_station.values()]

json_filename = "earliest_measurements.json"
with open(json_filename, "w") as json_file:
    json.dump(filtered_data, json_file, indent=4)