import os
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Load credentials from env
creds_json = os.environ['GSHEET_CREDS']
creds = Credentials.from_service_account_info(json.loads(creds_json), scopes=["https://www.googleapis.com/auth/spreadsheets"])

# Setup Sheet info
SPREADSHEET_ID = '1yovub3qO0T1MQCC-KXGicq8BlzkAEE9IcCFTdEWW3tQ'
RANGE = 'Logs'

service = build('sheets', 'v4', credentials=creds)
service.spreadsheets().values().clear(spreadsheetId=SPREADSHEET_ID, range=RANGE).execute()

print("Sheet cleared.")
