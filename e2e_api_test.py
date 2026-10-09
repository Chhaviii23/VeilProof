import urllib.request, json, time, hashlib, uuid

BASE = "http://localhost:8000"
def p(msg): print(f"[*] {msg}")

def req(method, path, data=None, token=None, capability=None, raw_data=None, extra_headers=None):
    headers = {}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if token: headers["Authorization"] = f"Bearer {token}"
    if capability: headers["X-Intake-Capability"] = capability
    if extra_headers: headers.update(extra_headers)
    
    body = raw_data if raw_data else (json.dumps(data).encode() if data else None)
    req_obj = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(req_obj)
        resp_body = res.read()
        return json.loads(resp_body) if resp_body else None
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        raise e

# 1. Start intake
p("Starting intake")
intake = req("POST", "/api/v1/intakes", {"capability": "report"})
intake_id = intake["intake_id"]
capability = intake["capability"]
p(f"Intake ID: {intake_id}")

# 4. Finalize
p("Finalizing report without objects")
case_data = req("POST", f"/api/v1/intakes/{intake_id}/finalize", {
    "title": "Fictional bridge report",
    "description": "I observed severe structural issues at the bridge under construction. I am providing photographic evidence.",
    "category": "safety_concern",
    "risk_factors": ["public_safety"],
    "no_immediate_risk": False,
    "objects": [],
    "tracking_secret": "my_secret_123456"
}, capability=capability, extra_headers={"Idempotency-Key": str(uuid.uuid4())})
case_id = case_data["case_id"]
case_ref = case_data["case_reference"]
p(f"Case Reference: {case_ref}")

# 5. Privacy Officer Login
p("Privacy Officer login")
tok_priv = req("POST", "/api/v1/staff/sessions", {"username": "priya.nair", "password": "demo-priv"})["token"]

# 6. Assign
p("Assigning ACO-04")
req("POST", f"/api/v1/staff/cases/{case_id}/assignments", {"officer_code": "ACO-04"}, token=tok_priv)

# 7. Investigator Login
p("Investigator login (ACO-04 / Arjun)")
tok_inv = req("POST", "/api/v1/staff/sessions", {"username": "arjun.mehta", "password": "demo-inv"})["token"]

# 8. Investigator writes notes
p("Adding internal note")
req("POST", f"/api/v1/staff/cases/{case_id}/internal-notes", {"text": "Reviewed initial report. No evidence attached."}, token=tok_inv)
p("Adding public update")
req("POST", f"/api/v1/staff/cases/{case_id}/public-updates", {"status": "under_investigation", "text": "We are reviewing your submission securely."}, token=tok_inv)

p("SUCCESS - Full API E2E Walkthrough Completed (No-Evidence)")
