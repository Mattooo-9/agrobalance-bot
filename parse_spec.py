import json

file_path = r"C:\Users\Imya\.gemini\antigravity\brain\823c9f6b-5b39-4c4a-905b-d45a0448197b\.system_generated\steps\317\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Line 9 (index 8) is the minified JSON
json_str = lines[8].strip()
data = json.loads(json_str)

static_details = data["components"]["schemas"]["staticSiteDetailsPOST"]
print("--- staticSiteDetailsPOST Schema ---")
print(json.dumps(static_details, indent=2))
