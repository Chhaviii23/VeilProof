"""R02 health check: full staff portal API walkthrough."""
import urllib.request, json, uuid

BASE = 'http://localhost:8000'

def req(method, path, data=None, token=None, capability=None, extra_headers=None):
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if capability:
        headers['X-Intake-Capability'] = capability
    if extra_headers:
        headers.update(extra_headers)
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(f'{BASE}{path}', data=body, headers=headers, method=method)
    try:
        res = urllib.request.urlopen(r)
        raw = res.read()
        return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        print(f'  FAIL {e.code}: {e.read().decode()}')
        raise

print('=== VeilProof Staff Portal API E2E (R02 health check) ===')

# 1. Reporter submits case
print('[1] Create intake')
intake = req('POST', '/api/v1/intakes', {})
intake_id = intake['intake_id']
capability = intake['capability']
print(f'    intake_id={intake_id}')

print('[2] Finalize report (no evidence)')
case = req('POST', f'/api/v1/intakes/{intake_id}/finalize', {
    'title': 'R02 health check report',
    'description': 'Verifying that the staff portal sees submitted cases via API. This is a synthetic test.',
    'category': 'safety_concern',
    'risk_factors': ['public_safety'],
    'no_immediate_risk': False,
    'objects': [],
    'tracking_secret': 'r02-secret-test'
}, capability=capability, extra_headers={'Idempotency-Key': str(uuid.uuid4())})
case_id = case['case_id']
case_ref = case['case_reference']
print(f'    case_id={case_id}  ref={case_ref}')

# 2. Privacy Officer logs in and sees the case
print('[3] Privacy Officer login')
priv_tok = req('POST', '/api/v1/staff/sessions', {'username': 'priya.nair', 'password': 'demo-priv'})['token']
print('    login OK')

print('[4] GET /staff/cases -- case visible?')
cases = req('GET', '/api/v1/staff/cases', token=priv_tok)
matched = [c for c in cases if c.get('id') == case_id]
print(f'    total={len(cases)}  matched={len(matched)}')
assert matched, 'Case not visible to Privacy Officer'

print('[5] GET /staff/privacy/queue')
queue = req('GET', '/api/v1/staff/privacy/queue', token=priv_tok)
q_matched = [c for c in queue if c.get('id') == case_id]
print(f'    queue_len={len(queue)}  matched={len(q_matched)}')

print('[6] Release copies (get evidence list first)')
case_detail = req('GET', f'/api/v1/staff/cases/{case_id}', token=priv_tok)
evidence_list = case_detail.get('evidence', [])
if evidence_list:
    ev_id = evidence_list[0]['id']
    r = req('POST', f'/api/v1/staff/cases/{case_id}/releases', {'evidence_id': ev_id}, token=priv_tok)
    print(f'    released evidence_id={ev_id}')
else:
    print('    no evidence items on this case — release step skipped (correct: no-evidence case)')

print('[7] GET officers list')
officers = req('GET', '/api/v1/staff/officers', token=priv_tok)
codes = [o['code'] for o in officers]
print(f'    officers={codes}')

print('[8] Assign to ACO-04')
req('POST', f'/api/v1/staff/cases/{case_id}/assignments', {'officer_code': 'ACO-04'}, token=priv_tok)
print('    assigned')

# 3. Investigator logs in
print('[9] Investigator login (arjun.mehta / ACO-04)')
inv_tok = req('POST', '/api/v1/staff/sessions', {'username': 'arjun.mehta', 'password': 'demo-inv'})['token']
print('    login OK')

print('[10] GET /staff/cases -- investigator sees assigned case?')
inv_cases = req('GET', '/api/v1/staff/cases', token=inv_tok)
inv_matched = [c for c in inv_cases if c.get('id') == case_id]
print(f'    matched={len(inv_matched)}')
assert inv_matched, 'Case not visible to investigator after assignment'

print('[11] GET case detail')
detail = req('GET', f'/api/v1/staff/cases/{case_id}', token=inv_tok)
print(f'    status={detail.get("status")}  assigned_to={detail.get("assigned_officer_code")}')

print('[12] Post internal note')
req('POST', f'/api/v1/staff/cases/{case_id}/internal-notes', {'text': 'R02 check: note created successfully.'}, token=inv_tok)
print('    note OK')

print('[13] POST public update')
req('POST', f'/api/v1/staff/cases/{case_id}/public-updates', {
    'status': 'under_investigation',
    'text': 'Your report is under investigation.'
}, token=inv_tok)
print('    public update OK')

print('[14] GET tracking status (reporter side)')
tracking = req('POST', '/api/v1/tracking/sessions', {
    'case_reference': case_ref,
    'tracking_secret': 'r02-secret-test'
})
status = req('GET', '/api/v1/tracking/status', token=tracking['session_token'])
print(f'    tracking_status={status.get("status")}  updates={len(status.get("public_updates", []))}')
assert status.get('status') == 'under_investigation', f'Expected under_investigation, got {status.get("status")}'

print()
print('=== ALL 14 CHECKS PASSED ===')
