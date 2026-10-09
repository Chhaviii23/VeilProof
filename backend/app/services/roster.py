"""Fictional ten-officer roster (P02B/P05B). All persons are invented.

ACO-04 is the canonical eligible procurement specialist. ACO-09 has a declared conflict and is
ineligible. The server decides eligibility; client-supplied officer fields are ignored.
"""

from __future__ import annotations

OFFICERS: list[dict] = [
    {"code": "ACO-01", "name": "Deepak Verma", "specialization": "Infrastructure fraud", "jurisdiction": "North Zone", "active_cases": 4, "availability": "Available", "conflict": False},
    {"code": "ACO-02", "name": "Sunita Pillai", "specialization": "Financial crimes", "jurisdiction": "Central Zone", "active_cases": 6, "availability": "High workload", "conflict": False},
    {"code": "ACO-03", "name": "Ramesh Iyer", "specialization": "Municipal corruption", "jurisdiction": "South Zone", "active_cases": 1, "availability": "Available", "conflict": False},
    {"code": "ACO-04", "name": "Arjun Mehta", "specialization": "Public procurement", "jurisdiction": "All zones", "active_cases": 2, "availability": "Available", "conflict": False},
    {"code": "ACO-05", "name": "Nandan Gupta", "specialization": "Environmental compliance", "jurisdiction": "West Zone", "active_cases": 3, "availability": "Available", "conflict": False},
    {"code": "ACO-06", "name": "Leela Bose", "specialization": "Healthcare procurement", "jurisdiction": "East Zone", "active_cases": 0, "availability": "Available", "conflict": False},
    {"code": "ACO-07", "name": "Aditya Saxena", "specialization": "Financial fraud", "jurisdiction": "All zones", "active_cases": 5, "availability": "Moderate", "conflict": False},
    {"code": "ACO-08", "name": "Priti Rajan", "specialization": "Land records", "jurisdiction": "Central Zone", "active_cases": 7, "availability": "High workload", "conflict": False},
    {"code": "ACO-09", "name": "Suresh Nambiar", "specialization": "PWD investigations", "jurisdiction": "All zones", "active_cases": 3, "availability": "Available", "conflict": True},
    {"code": "ACO-10", "name": "Meghna Das", "specialization": "Corruption prevention", "jurisdiction": "North Zone", "active_cases": 2, "availability": "Available", "conflict": False},
]

# Real login-able principal for ACO-04 (the canonical assignable investigator).
OFFICER_PRINCIPAL_MAP = {"ACO-04": "arjun"}


def get_officer(code: str) -> dict | None:
    return next((o for o in OFFICERS if o["code"] == code), None)


def is_eligible(code: str) -> bool:
    officer = get_officer(code)
    if not officer or officer["conflict"]:
        return False
    return officer["availability"] in ("Available", "Moderate")


def recommendation_reason(code: str) -> str:
    officer = get_officer(code)
    if not officer:
        return "Unknown officer"
    if officer["conflict"]:
        return "Declared conflict of interest — ineligible"
    if officer["availability"] == "High workload":
        return "High current workload — not recommended"
    if code == "ACO-04":
        return "Specialist in public procurement with available capacity — recommended"
    return f"Available {officer['specialization']} specialist ({officer['jurisdiction']})"


def view(code: str) -> dict:
    o = get_officer(code)
    assert o is not None
    return {
        "code": o["code"],
        "name": o["name"],
        "specialization": o["specialization"],
        "jurisdiction": o["jurisdiction"],
        "activeCases": o["active_cases"],
        "availability": o["availability"],
        "conflictDetected": o["conflict"],
        "status": "Ineligible" if o["conflict"] else ("Recommended" if code == "ACO-04" else "Available"),
        "recommendationReason": recommendation_reason(code),
    }
