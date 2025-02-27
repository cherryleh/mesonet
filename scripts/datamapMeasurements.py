import requests
import json
from datetime import datetime
import os 

API_TOKEN = os.getenv("API_TOKEN")

header = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

stations_url = "https://api.hcdp.ikewai.org/mesonet/db/stations"
measurements_url = "https://api.hcdp.ikewai.org/mesonet/db/measurements"
variables = ["Tair_1_Avg", "SM_1_Avg", "RH_1_Avg", "SWin_1_Avg"]

current_time = datetime.now(timezone.utc)

response = requests.get(stations_url, headers=header)
stations = response.json() if response.status_code == 200 else []

measurements_by_variable = {var: {} for var in variables}

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
                        value = float("nan")

                    measurements_by_variable[variable][station_id] = {
                        "value": value, 
                        "timestamp": timestamp_str
                    }

        except requests.exceptions.Timeout:
            print(f"Skipping {variable} for station {station_id} (request timed out)")
            continue  

# Save measurements to JSON files
for variable, measurements in measurements_by_variable.items():
    filename = f"{variable}.json"
    with open(filename, "w") as json_file:
        json.dump(measurements, json_file, indent=4)
        print(f"Saved {filename}")
