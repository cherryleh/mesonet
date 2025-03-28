import requests
import json
from datetime import datetime, timezone
import os 

API_TOKEN = os.getenv("API_TOKEN")

header = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

stations_url = "https://api.hcdp.ikewai.org/mesonet/db/stations"
measurements_url = "https://api.hcdp.ikewai.org/mesonet/db/measurements"
variables = ["Tair_1_Avg", "SM_1_Avg", "RH_1_Avg", "SWin_1_Avg", "Tsoil_1_Avg"]

current_time = datetime.now(timezone.utc)

response = requests.get(stations_url, headers=header)
stations = response.json() if response.status_code == 200 else []

measurements_by_variable = {var: {} for var in variables}
rainfall_24H = {}

for station in stations:
    station_id = station["station_id"]

    for variable in variables:
        test_query = f"station_ids={station_id}&var_ids={variable}&limit=1"
        test_url = f"{measurements_url}?{test_query}"

        try:
            test_response = requests.get(test_url, headers=header, timeout=5)  
            test_data = test_response.json() if test_response.status_code == 200 else None

            if not isinstance(test_data, list) or len(test_data) == 0:
                print(f"Skipping station {station_id} for {variable} (no valid data or request failed)")
                continue 

        except requests.exceptions.Timeout:
            print(f"Skipping station {station_id} for {variable} (request timed out)")
            continue  

        query_string = f"station_ids={station_id}&var_ids={variable}&limit=1"
        full_url = f"{measurements_url}?{query_string}"

        try:
            response = requests.get(full_url, headers=header, timeout=5)  

            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    timestamp_str = data[0]["timestamp"]
                    value = data[0]["value"]

                    # Convert timestamp to datetime object in UTC
                    observation_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

                    # Check if observation is older than 1 hour
                    if (current_time - observation_time).total_seconds() > 3600:
                        value = None

                    measurements_by_variable[variable][station_id] = {
                        "value": value, 
                        "timestamp": timestamp_str
                    }

        except requests.exceptions.Timeout:
            print(f"Skipping {variable} for station {station_id} (request timed out)")
            continue  
            
    rainfall_query = f"station_ids={station_id}&var_ids=RF_1_Tot300s&limit=288"
    rainfall_url = f"{measurements_url}?{rainfall_query}"

    try:
        rainfall_response = requests.get(rainfall_url, headers=header, timeout=5)

        if rainfall_response.status_code == 200:
            rainfall_data = rainfall_response.json()
            if isinstance(rainfall_data, list) and len(rainfall_data) > 0:
                total_rainfall = sum(float(entry["value"]) for entry in rainfall_data if isinstance(entry.get("value"), (int, float)) or entry["value"].replace(".", "", 1).isdigit())

                # Use the most recent timestamp
                latest_timestamp = rainfall_data[0]["timestamp"] if "timestamp" in rainfall_data[0] else None

                rainfall_24H[station_id] = {
                    "value": total_rainfall,
                    "timestamp": latest_timestamp
                }
            else:
                rainfall_24H[station_id] = {
                    "value": None,
                    "timestamp": None
                }

    except requests.exceptions.Timeout:
        print(f"Skipping 24H Rainfall for station {station_id} (request timed out)")
        continue

# Save measurements to JSON files
for variable, measurements in measurements_by_variable.items():
    filename = f"{variable}.json"
    with open(filename, "w") as json_file:
        json.dump(measurements, json_file, indent=4)
        print(f"Saved {filename}")
        
rainfall_filename = "RF_1_Tot300s_24H.json"
with open(rainfall_filename, "w") as json_file:
    json.dump(rainfall_24H, json_file, indent=4)
    print(f"Saved {rainfall_filename}")

stations_url = "https://api.hcdp.ikewai.org/mesonet/db/stations"
measurements_url = "https://api.hcdp.ikewai.org/mesonet/db/measurements"

wind_data = {}

# Get all stations
response = requests.get(stations_url, headers=header)
stations = response.json() if response.status_code == 200 else []

for station in stations:
    station_id = station["station_id"]
    lat = station.get("lat")
    lon = station.get("lng")

    # Query for wind direction and speed
    wind_query = f"station_ids={station_id}&var_ids=WDrs_1_Avg,WS_1_Avg&limit=2"
    wind_url = f"{measurements_url}?{wind_query}"

    try:
        response = requests.get(wind_url, headers=header, timeout=5)

        if response.status_code == 200:
            data = response.json()

            wind_entry = {"value_WDrs": None, "value_WS": None, "timestamp": None, "lat": lat, "lon": lon}

            for entry in data:
                var_id = entry["variable"]
                value = entry["value"]
                timestamp = entry["timestamp"]

                if var_id == "WDrs_1_Avg":
                    wind_entry["value_WDrs"] = value
                elif var_id == "WS_1_Avg":
                    wind_entry["value_WS"] = value

                # Use the most recent timestamp available
                if not wind_entry["timestamp"] or timestamp > wind_entry["timestamp"]:
                    wind_entry["timestamp"] = timestamp

            # Only add if at least one value is present
            if wind_entry["value_WDrs"] is not None or wind_entry["value_WS"] is not None:
                wind_data[station_id] = wind_entry

    except requests.exceptions.Timeout:
        print(f"Skipping wind data for station {station_id} (request timed out)")
        continue
        
with open("wind.json", "w") as json_file:
    json.dump(wind_data, json_file, indent=4)