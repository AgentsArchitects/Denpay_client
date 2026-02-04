"""
Quick script to investigate duplicate integration names in Gold Layer
"""
import sys
sys.path.append('Workfin_backend')

from app.services.azure_blob_service import azure_blob_service

# Get all integrations
integrations = azure_blob_service.get_soe_distinct_integrations()

# Group by name to find duplicates
from collections import defaultdict
name_groups = defaultdict(list)

for item in integrations:
    name = item.get('integration_name', 'Unknown')
    name_groups[name].append(item)

# Print duplicates
print("=== Integrations with duplicate names ===\n")
for name, items in name_groups.items():
    if len(items) > 1:
        print(f"\n{name} has {len(items)} integration IDs:")
        for item in items:
            print(f"  - {item['integration_id']}")

# Print all Charsfield entries
print("\n=== All Charsfield entries ===")
for item in integrations:
    if 'Charsfield' in item.get('integration_name', ''):
        print(f"  ID: {item['integration_id']}, Name: {item['integration_name']}")
