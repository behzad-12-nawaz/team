"""
Generates sample_report.pdf from contract fixtures to verify make_weekly_pdf.
Run: python reports/generate_sample_pdf.py
"""

import json
from pathlib import Path
from make_weekly_pdf import make_weekly_pdf

def main():
    base_dir = Path(__file__).resolve().parent
    fixtures_path = base_dir.parent / "contract" / "fixtures.json"
    
    with open(fixtures_path, "r", encoding="utf-8") as f:
        fixtures = json.load(f)
        
    report_data = fixtures["weekly_report"]
    pdf_bytes = make_weekly_pdf(report_data)
    
    out_file = base_dir / "sample_report.pdf"
    with open(out_file, "wb") as f:
        f.write(pdf_bytes)
        
    print(f"Successfully generated {out_file} ({len(pdf_bytes)} bytes)")

if __name__ == "__main__":
    main()
