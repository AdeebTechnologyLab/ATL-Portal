import urllib.request
import urllib.parse
import json

try:
    # 1. Login
    login_data = json.dumps({
        "email": "admin@lms.com",
        "password": "admin123"
    }).encode('utf-8')
    
    login_req = urllib.request.Request(
        'http://localhost:5000/api/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(login_req) as response:
        login_res = json.loads(response.read().decode('utf-8'))
        token = login_res.get('token')
        print("Logged in successfully. Token length:", len(token) if token else "No token")
        
    if not token:
        print("No token received.")
        exit(1)
        
    # 2. Call the endpoint
    req = urllib.request.Request(
        'http://localhost:5000/api/users/role/teacher',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        data = response.read().decode('utf-8')
        print("Data length:", len(data))
        print("Preview:", data[:200])

except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Error Reason:", e.reason)
    print("Response body:", e.read().decode('utf-8'))
except Exception as e:
    print("Other Error:", str(e))
