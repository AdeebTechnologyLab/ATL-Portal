import urllib.request
import json

try:
    req = urllib.request.Request('http://localhost:5000/api/users/role/teacher')
    # Note: we need a token for authorize('admin').
    # But let's see if it responds immediately with 401 or hangs.
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Data:", response.read().decode('utf-8')[:200])
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Reason:", e.reason)
except Exception as e:
    print("Other Error:", str(e))
