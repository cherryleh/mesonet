import requests
import json
from datetime import datetime, timedelta, timezone
import os 
import time
import numpy as np

API_TOKEN = os.getenv("API_TOKEN")

header = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

stations_url = "https://api.hcdp.ikewai.org/mesonet/db/stations"
measurements_url = "https://api.hcdp.ikewai.org/mesonet/db/measurements"
variables_list = "Tair_1_Avg,SM_1_Avg,RH_1_Avg,SWin_1_Avg,Tsoil_1_Avg,WDrs_1_Avg,WS_1_Avg"
expected_variables = variables_list.split(',')
current_time = datetime.now(timezone.utc)
start_time = current_time - timedelta(hours=24)
start_time_str = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")

response = requests.get(stations_url, headers=header)
stations = response.json() if response.status_code == 200 else []

rainfall_24H = {}
measurements_by_variable = {}
wind_data = {}

now_utc = datetime.now(timezone.utc)

active_stations = [s for s in stations if s.get("status") == "active"]
for station in active_stations:
    station_id = station["station_id"]
    lat = station.get("lat")
    lon = station.get("lng")

    # Query for latest values of all variables
    query_string = f"station_ids={station_id}&var_ids={variables_list}&limit=7"
    full_url = f"{measurements_url}?{query_string}"
    print(full_url)

    try:
        response = requests.get(full_url, headers=header, timeout=5)

        if response.status_code == 200:
            data = response.json()
            found_vars = set()
            wind_values = {}

            for entry in data:
                variable = entry["variable"]
                timestamp_str = entry["timestamp"]
                observation_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

                # Value is None if too old
                if (now_utc - observation_time) > timedelta(hours=24):
                    value = None
                else:
                    value = float(entry["value"])

                if variable not in measurements_by_variable:
                    measurements_by_variable[variable] = {}
                measurements_by_variable[variable][station_id] = {
                    "value": value,
                    "timestamp": timestamp_str
                }

                found_vars.add(variable)

                # Store wind vars for later comparison
                if variable in ["WDrs_1_Avg", "WS_1_Avg"]:
                    wind_values[variable] = {
                        "value": value,
                        "timestamp": timestamp_str
                    }

            # Fill in any missing variables
            for variable in expected_variables:
                if variable not in found_vars:
                    if variable not in measurements_by_variable:
                        measurements_by_variable[variable] = {}
                    measurements_by_variable[variable][station_id] = {
                        "value": None,
                        "timestamp": None
                    }

            # Validate wind timestamps
            if (
                "WDrs_1_Avg" in wind_values and
                "WS_1_Avg" in wind_values and
                wind_values["WDrs_1_Avg"]["timestamp"] == wind_values["WS_1_Avg"]["timestamp"]
            ):
                wind_data[station_id] = {
                    "value_WDrs": str(wind_values["WDrs_1_Avg"]["value"]),
                    "value_WS": str(wind_values["WS_1_Avg"]["value"]),
                    "timestamp": str(wind_values["WS_1_Avg"]["timestamp"]),
                    "lat": lat,
                    "lon": lon
                }
            else:
                print(f"Station {station_id}: mismatched wind timestamps, setting to null")
                wind_data[station_id] = {
                    "value_WDrs": None,
                    "value_WS": None,
                    "timestamp": None,
                    "lat": lat,
                    "lon": lon
                }

    except requests.exceptions.Timeout:
        print(f"Skipping station {station_id} (main query timed out)")
        continue

    # Separate query for 24-hour rainfall total
    rainfall_query = f"station_ids={station_id}&var_ids=RF_1_Tot300s&limit=288"
    rainfall_url = f"{measurements_url}?{rainfall_query}"
    print(rainfall_url)

    try:
        rainfall_response = requests.get(rainfall_url, headers=header, timeout=5)
        time.sleep(0.2)

        if rainfall_response.status_code == 200:
            rainfall_data = rainfall_response.json()
            if isinstance(rainfall_data, list) and len(rainfall_data) > 0:
                total_rainfall = sum(
                    float(entry["value"]) for entry in rainfall_data
                    if isinstance(entry.get("value"), (int, float)) or entry["value"].replace(".", "", 1).isdigit()
                )
                latest_timestamp = rainfall_data[0]["timestamp"]
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

# Save wind data
with open("wind.json", "w") as json_file:
    json.dump(wind_data, json_file, indent=4)
    print("Saved wind.json")

# Save individual variable files
for variable, measurements in measurements_by_variable.items():
    if variable in ["WS_1_Avg", "WDrs_1_Avg"]:
        continue  # Skip saving these
    filename = f"{variable}.json"
    converted = {
        sid: {
            "value": str(data["value"]) if data["value"] is not None else "No Data",
            "timestamp": str(data["timestamp"]) if data["timestamp"] is not None else "No Timestamp"
        }
        for sid, data in measurements.items()
    }
    with open(filename, "w") as json_file:
        json.dump(converted, json_file, indent=4)
        print(f"Saved {filename}")


# Save rainfall total
rainfall_filename = "RF_1_Tot300s_24H.json"
converted_rainfall = {
    sid: {
        "value": str(data["value"]) if data["value"] is not None else "No Data",
        "timestamp": str(data["timestamp"]) if data["timestamp"] is not None else "No Timestamp"
    }
    for sid, data in rainfall_24H.items()
}
with open(rainfall_filename, "w") as json_file:
    json.dump(converted_rainfall, json_file, indent=4)
    print(f"Saved {rainfall_filename}")

