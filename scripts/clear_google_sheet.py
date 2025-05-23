import os
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Load credentials from env
creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
if not creds_path or not os.path.exists(creds_path):
    raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS is not set or file does not exist")

creds = Credentials.from_service_account_file(creds_path, scopes=["https://www.googleapis.com/auth/spreadsheets"])

# Setup Sheet info
SPREADSHEET_ID = '1yovub3qO0T1MQCC-KXGicq8BlzkAEE9IcCFTdEWW3tQ'
RANGE = 'Logs!2:100000000'


service = build('sheets', 'v4', credentials=creds)
service.spreadsheets().values().clear(spreadsheetId=SPREADSHEET_ID, range=RANGE).execute()

print("Sheet cleared.")
