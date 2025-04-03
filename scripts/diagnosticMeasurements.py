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
variables = ["BattVolt", "RHenc","CellStr","CellQlt"]  

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

# Dictionary to store results
measurements_by_variable = {var: {} for var in variables}

# Fetch measurements
for station in stations:
    station_id = station.get("station_id")
    
    for variable in variables:
        query = f"station_ids={station_id}&var_ids={variable}&start_date={start_time_str}&limit=288"
        url = f"{measurements_url}?{query}"

        try:
            response = requests.get(url, headers=header, timeout=10)
            
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

# Save results to JSON files
for variable, measurements in measurements_by_variable.items():
    filename = f"{variable}.json"
    with open(filename, "w") as json_file:
        json.dump(measurements, json_file, indent=4)
    print(f"Saved {filename}")

var_pairs = [('Tair_1_Avg', 'Tair_2_Avg', 'Tair'), ('RH_1_Avg', 'RH_2_Avg','RH')]
diff_vars = ["Tair","RH"]
measurements_by_vardiff = {var: {} for var in diff_vars}
for station in stations:
    station_id = station.get("station_id")
    for var1, var2, var_name in var_pairs:
        url = f"https://api.hcdp.ikewai.org/mesonet/db/measurements?station_ids=0119&var_ids={var1},{var2}&start_date={start_time_str}"

        response = requests.get(url, headers=header, timeout=10)
        data = response.json()

        df = pd.DataFrame(data)

        df['timestamp'] = pd.to_datetime(df['timestamp'])

        pivot_df = df.pivot(index='timestamp', columns='variable', values='value').sort_index()

        pivot_df = pivot_df.astype(float)

        pivot_df[f'{var_name}_diff']=pivot_df[f'{var1}']-pivot_df[f'{var2}']
        diff_mean = pivot_df[f'{var_name}_diff'].mean()
        measurements_by_vardiff[var_name][station_id] = {
                        "value": diff_mean
                    }
        
for variable, measurements in measurements_by_vardiff.items():
    filename = f"{variable}_diff.json"
    with open(filename, "w") as json_file:
        json.dump(measurements, json_file, indent=4)