"""Fix 2 (map your own columns) and fix 3 (decisions from the customer's
own data), exercised end to end through the API."""

import io

import numpy as np
import pandas as pd

from app.pipeline.schema import suggest_mapping
from tests.conftest import create_use_case, run_pipeline


def _customer_csv(with_marketing: bool, months: int = 18, seed: int = 1) -> bytes:
    """A sales export in a customer's own words: different column names, a
    real date column, and only some of DIP's levers."""
    rng = np.random.default_rng(seed)
    rows = []
    dates = pd.date_range("2024-01-01", periods=months, freq="MS")
    for d_i, d in enumerate(dates):
        for territory in ["North", "South", "East", "West"]:
            for line in ["Bikes", "Helmets", "Parts"]:
                price = 50 + 10 * np.sin(d_i / 3) + rng.normal(0, 2)
                promo = 1000 + 400 * np.cos(d_i / 2) + rng.normal(0, 50)
                for _ in range(5):
                    qty = max(1, int(rng.normal(20, 4) - 0.2 * price + (0.01 * promo if with_marketing else 0)))
                    row = {
                        "Invoice Date": (d + pd.Timedelta(days=int(rng.integers(0, 27)))).strftime("%d/%m/%Y"),
                        "Territory": territory,
                        "Product Line": line,
                        "Net Sales": round(price * qty, 2),
                        "Selling Price": round(price, 2),
                        "Units": qty,
                    }
                    if with_marketing:
                        row["Ad Spend"] = round(promo, 2)
                    rows.append(row)
    return pd.DataFrame(rows).to_csv(index=False).encode()


def test_suggest_mapping_reads_customer_column_names():
    m = suggest_mapping(["Invoice Date", "Territory", "Product Line", "Net Sales", "Selling Price", "Units", "Ad Spend"])
    assert m == {
        "date": "Invoice Date", "revenue": "Net Sales", "region": "Territory", "category": "Product Line",
        "unit_price": "Selling Price", "quantity": "Units", "marketing_spend": "Ad Spend",
    }


def test_upload_map_and_run_pipeline_on_customer_data(client, alice):
    uc = create_use_case(client, alice)
    res = client.post(f"/api/use-cases/{uc}/data/upload", headers=alice,
                      files={"file": ("sales.csv", io.BytesIO(_customer_csv(with_marketing=True)), "text/csv")})
    body = res.json()
    assert res.status_code == 200 and body["needs_mapping"] is True
    assert body["suggested_mapping"]["revenue"] == "Net Sales"

    # The pipeline refuses to run until the columns are mapped.
    token = alice["Authorization"].removeprefix("Bearer ")
    assert client.get(f"/api/use-cases/{uc}/pipeline/stream?token={token}").status_code == 409

    screen = client.get(f"/api/use-cases/{uc}/data/mapping", headers=alice).json()
    assert "Territory" in screen["columns"] and screen["samples"]["Territory"]

    res = client.post(f"/api/use-cases/{uc}/data/mapping", headers=alice,
                      json={"mapping": body["suggested_mapping"]})
    assert res.status_code == 200, res.text
    assert res.json()["month_count"] == 18
    assert client.get(f"/api/use-cases/{uc}", headers=alice).json()["status"] == "data_ready"

    quality = client.get(f"/api/use-cases/{uc}/data/quality", headers=alice).json()
    profiled = {c["column"] for c in quality["columns"]}
    assert "marketing_spend" in profiled and "inventory_level" not in profiled  # no placeholder columns

    events = run_pipeline(client, alice, uc)
    assert events[-1]["stage"] == "final_dashboard", events[-1]

    decisions = client.get(f"/api/use-cases/{uc}/decisions", headers=alice).json()
    levers = {d["id"].split("-")[0] for d in decisions}
    assert levers <= {"price", "marketing"}, levers  # never discount/inventory: not in this data
    assert "marketing" in levers
    assert all("Sized from your data" in d["methodology"] for d in decisions)

    dashboard = client.get(f"/api/use-cases/{uc}/dashboard", headers=alice).json()
    assert dashboard["kpis"]["churn_rate_pct"] is None  # not in the data, so not reported as 0
    assert set(dashboard["revenue_by_region"]) == {"North", "South", "East", "West"}


def test_decisions_differ_with_the_data(client, alice):
    """Same pipeline, different data -> different recommendations."""
    results = {}
    for with_marketing in (True, False):
        uc = create_use_case(client, alice)
        body = client.post(f"/api/use-cases/{uc}/data/upload", headers=alice,
                           files={"file": ("s.csv", io.BytesIO(_customer_csv(with_marketing)), "text/csv")}).json()
        assert client.post(f"/api/use-cases/{uc}/data/mapping", headers=alice,
                           json={"mapping": body["suggested_mapping"]}).status_code == 200
        run_pipeline(client, alice, uc)
        results[with_marketing] = {d["id"] for d in client.get(f"/api/use-cases/{uc}/decisions", headers=alice).json()}
    assert not any(i.startswith("marketing") for i in results[False])
    assert results[True] != results[False]


def test_mapping_errors_are_explained(client, alice):
    uc = create_use_case(client, alice)
    client.post(f"/api/use-cases/{uc}/data/upload", headers=alice,
                files={"file": ("s.csv", io.BytesIO(_customer_csv(True, months=4)), "text/csv")})
    res = client.post(f"/api/use-cases/{uc}/data/mapping", headers=alice, json={"mapping": {"date": "Invoice Date"}})
    assert res.status_code == 422 and "KPI" in res.json()["detail"]
    res = client.post(f"/api/use-cases/{uc}/data/mapping", headers=alice,
                      json={"mapping": {"date": "Invoice Date", "revenue": "Net Sales"}})
    assert res.status_code == 422 and "at least 6 months" in res.json()["detail"]
    res = client.post(f"/api/use-cases/{uc}/data/mapping", headers=alice,
                      json={"mapping": {"date": "Territory", "revenue": "Net Sales"}})
    assert res.status_code == 422 and "dates" in res.json()["detail"]


def test_synthetic_demo_still_runs_and_lock_in_works(client, alice):
    uc = create_use_case(client, alice)
    assert client.post(f"/api/use-cases/{uc}/data/generate", headers=alice).status_code == 200
    events = run_pipeline(client, alice, uc)
    assert events[-1]["stage"] == "final_dashboard", events[-1]

    decisions = client.get(f"/api/use-cases/{uc}/decisions", headers=alice).json()
    assert 1 <= len(decisions) <= 6
    titles = [d["title"] for d in decisions]
    assert not any("pre-Q2" in t for t in titles)  # no demo-specific copy

    strategy = client.get(f"/api/use-cases/{uc}/strategies", headers=alice).json()[0]
    res = client.post(f"/api/strategies/{strategy['id']}/lock-in", headers=alice,
                      json={"deltas": {"price_delta_pct": 0, "marketing_delta_pct": 10, "discount_delta_pct": 0,
                                       "inventory_delta_pct": 0, "inflation_delta_pct": 0, "demand_delta_pct": 0,
                                       "churn_delta_pct": 0}})
    assert res.status_code == 200, res.text
    assert res.json()["lifecycle_status"] == "locked_in"
