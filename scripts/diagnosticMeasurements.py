import requests
import json
from datetime import datetime, timedelta
import os 
import pandas as pd

API_TOKEN = os.getenv("API_TOKEN")

header = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

stations_url = "https://api.hcdp.ikewai.org/mesonet/db/stations"
measurements_url = "https://api.hcdp.ikewai.org/mesonet/db/measurements"

now = datetime.utcnow()
start_time = now - timedelta(hours=24)
start_time_str = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")  # Convert to API format

# Fetch station data
try:
    response = requests.get(stations_url, headers=header, timeout=10)
    response.raise_for_status()  # Raises an HTTPError for bad responses
    stations = response.json()
except requests.exceptions.RequestException as e:
    print(f"Error fetching stations: {e}")
    stations = []

variables = ["BattVolt", "RHenc", "CellStr", "CellQlt"]
measurements_by_variable = {
    "BattVolt": {},
    "RHenc_50": {},   # % time RHenc > 80
    "RHenc_max": {},  # max RHenc
    "CellStr": {},
    "CellQlt": {}
}


# Fetch measurements
for station in stations:
    station_id = station.get("station_id")
    
    for variable in variables:
        query = f"station_ids={station_id}&var_ids={variable}&start_date={start_time_str}"
        url = f"{measurements_url}?{query}"

        try:
            response = requests.get(url, headers=header, timeout=10)
            data = response.json()
            if not data:
                continue
            values = [entry["value"] for entry in data if entry.get("value") is not None]

            if values:
                if variable == "BattVolt":
                    result_value = min(values)  # Get min for BattVolt
                elif variable == "RHenc":
                    above_50 = [float(v) for v in values if float(v) > 50]
                    percent_above_50 = (len(above_50) / len(values)) * 100 if values else 0

                    max_rh = max([float(v) for v in values])
                    latest_timestamp = max(entry["timestamp"] for entry in data if "timestamp" in entry)

                    measurements_by_variable["RHenc_50"][station_id] = {
                        "value": percent_above_50,
                        "timestamp": latest_timestamp
                    }

                    measurements_by_variable["RHenc_max"][station_id] = {
                        "value": max_rh,
                        "timestamp": latest_timestamp
                    }

                    continue

                else:
                    result_value = max(values)  # Get max for other variables

                latest_timestamp = max(entry["timestamp"] for entry in data if "timestamp" in entry)

                measurements_by_variable[variable][station_id] = {
                    "value": result_value,
                    "timestamp": latest_timestamp
                }

        except requests.exceptions.Timeout:
            print(f"Timeout for {variable} at station {station_id}")
        except requests.exceptions.RequestException as e:
            print(f"Error fetching {variable} at station {station_id}: {e}")

# Process special case for stations 0520 and 0521
station_0520 = "0520"
station_0521 = "0521"

for variable in ["BattVolt", "CellStr", "CellQlt"]:
    if station_0520 in measurements_by_variable[variable] and station_0521 in measurements_by_variable[variable]:
        if variable == "BattVolt":
            val_0520 = float(measurements_by_variable[variable][station_0520]["value"])
            val_0521 = float(measurements_by_variable[variable][station_0521]["value"])
            measurements_by_variable[variable][station_0521]["value"] = min(val_0520, val_0521)
        else:  # CellStr and CellQlt
            measurements_by_variable[variable][station_0521] = measurements_by_variable[variable][station_0520].copy()

# Also copy RHenc_50 and RHenc_max from 0520 to 0521
for variable in ["RHenc_50", "RHenc_max"]:
    if station_0520 in measurements_by_variable[variable]:
        measurements_by_variable[variable][station_0521] = measurements_by_variable[variable][station_0520].copy()

    
var_pairs = [('Tair_1_Avg', 'Tair_2_Avg', 'Tair'), ('RH_1_Avg', 'RH_2_Avg','RH')]
diff_vars = ["Tair","RH"]
measurements_by_vardiff = {var: {} for var in diff_vars}
for station in stations:
    station_id = station.get("station_id")
    for var1, var2, var_name in var_pairs:
        url = f"https://api.hcdp.ikewai.org/mesonet/db/measurements?station_ids={station_id}&var_ids={var1},{var2}&start_date={start_time_str}"

        response = requests.get(url, headers=header, timeout=10)
        data = response.json()
        if not data:
            continue

        df = pd.DataFrame(data)

        df['timestamp'] = pd.to_datetime(df['timestamp'])

        pivot_df = df.pivot(index='timestamp', columns='variable', values='value').sort_index()
        pivot_df = pivot_df.astype(float)

        # Skip if either variable is missing
        if var1 not in pivot_df.columns or var2 not in pivot_df.columns:
            continue

        pivot_df[f'{var_name}_diff'] = (pivot_df[f'{var1}'] - pivot_df[f'{var2}']).abs()
        diff_mean = pivot_df[f'{var_name}_diff'].mean()

        measurements_by_vardiff[var_name][station_id] = {
            "value": diff_mean
        }

        
for variable, measurements in measurements_by_variable.items():
    filename = f"{variable}.json"
    with open(filename, "w") as json_file:
        json.dump(measurements, json_file, indent=4)
    print(f"Saved {filename}")

# Save sensor difference files: Tair_diff.json and RH_diff.json
for variable, measurements in measurements_by_vardiff.items():
    filename = f"{variable}_diff.json"
    with open(filename, "w") as json_file:
        json.dump(measurements, json_file, indent=4)
    print(f"Saved {filename}")
