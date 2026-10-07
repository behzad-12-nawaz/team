"""
DoseCare Weekly Report PDF Generator (Task 5 deliverable).
Contract: make_weekly_pdf(report: dict) -> bytes
Input is the JSON from GET /reports/{id}/weekly.
"""

import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)

def make_weekly_pdf(report: dict) -> bytes:
    """
    Generates a professional weekly adherence report PDF in bytes.
    
    Args:
        report (dict): JSON data matching the DoseCare weekly report schema:
            {
                "patient_name": "Ali Khan",
                "week_start": "2026-09-28",
                "week_end": "2026-10-04",
                "adherence": 86,
                "rows": [
                    {"date": "2026-09-28", "medicine": "Metformin 500 mg", "status": "CONFIRMED"},
                    ...
                ]
            }
            
    Returns:
        bytes: PDF binary content.
    """
    buffer = io.BytesIO()
    
    # 0.75 in (54 pt) margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Brand Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a')
    )
    
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b')
    )
    
    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
    )
    
    meta_val = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0f172a')
    )
    
    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#ffffff')
    )
    
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1e293b')
    )
    
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#94a3b8'),
        alignment=1  # Centered
    )

    story = []

    # Header section: Branding and Document Type
    header_data = [
        [
            Paragraph("<b>DoseCare</b> <font color='#0284c7'>Clinic Portal</font>", title_style),
            Paragraph("Weekly Medication Adherence Report<br/><font color='#64748b'>UN SDG 3 Good Health</font>", ParagraphStyle('RAlign', parent=subtitle_style, alignment=2))
        ]
    ]
    header_table = Table(header_data, colWidths=[320, 212])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceAfter=14))

    # Patient & Report Overview Cards
    patient_name = report.get("patient_name", "Unknown Patient")
    week_start = report.get("week_start", "")
    week_end = report.get("week_end", "")
    adherence = report.get("adherence", 0)
    
    # Color badge for adherence
    adh_color = '#16a34a' if adherence >= 80 else ('#d97706' if adherence >= 60 else '#dc2626')

    overview_data = [
        [
            Paragraph("<b>PATIENT NAME</b>", meta_label),
            Paragraph("<b>REPORTING PERIOD</b>", meta_label),
            Paragraph("<b>7-DAY ADHERENCE</b>", meta_label)
        ],
        [
            Paragraph(f"<b>{patient_name}</b>", meta_val),
            Paragraph(f"{week_start} to {week_end}", meta_val),
            Paragraph(f"<font color='{adh_color}'><b>{adherence}%</b></font>", ParagraphStyle('AdhVal', parent=meta_val, fontSize=14, leading=16))
        ]
    ]
    overview_table = Table(overview_data, colWidths=[200, 200, 132])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 16))

    # Medication Log Table
    rows = report.get("rows", [])
    table_rows = [
        [
            Paragraph("<b>Date</b>", th_style),
            Paragraph("<b>Prescribed Medicine</b>", th_style),
            Paragraph("<b>Status</b>", th_style)
        ]
    ]

    status_color_map = {
        "CONFIRMED": ("#dcfce7", "#15803d"),      # light green bg, dark green text
        "CONFIRMED_LATE": ("#dcfce7", "#15803d"),
        "SKIPPED": ("#f1f5f9", "#475569"),        # light gray bg, dark gray text
        "NOTIFIED": ("#fef3c7", "#b45309"),       # light amber bg, dark amber text
        "MISSED": ("#ffe4e6", "#b91c1c"),         # light rose bg, dark red text
        "SCHEDULED": ("#e0f2fe", "#0369a1")       # light sky bg, dark sky text
    }

    tstyle_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]

    for idx, r in enumerate(rows, start=1):
        status_val = r.get("status", "SCHEDULED").upper()
        _, text_hex = status_color_map.get(status_val, ("#f1f5f9", "#334155"))
        
        status_html = f"<font color='{text_hex}'><b>{status_val}</b></font>"
        
        table_rows.append([
            Paragraph(r.get("date", ""), cell_style),
            Paragraph(r.get("medicine", ""), cell_style),
            Paragraph(status_html, cell_style)
        ])
        
        # Zebra striping
        row_bg = colors.HexColor('#ffffff') if idx % 2 == 1 else colors.HexColor('#f8fafc')
        tstyle_commands.append(('BACKGROUND', (0, idx), (-1, idx), row_bg))
        tstyle_commands.append(('TOPPADDING', (0, idx), (-1, idx), 6))
        tstyle_commands.append(('BOTTOMPADDING', (0, idx), (-1, idx), 6))

    if len(rows) == 0:
        table_rows.append([
            Paragraph("-", cell_style),
            Paragraph("No dose records available for this period", cell_style),
            Paragraph("-", cell_style)
        ])

    dose_table = Table(table_rows, colWidths=[120, 272, 140])
    dose_table.setStyle(TableStyle(tstyle_commands))
    story.append(dose_table)

    story.append(Spacer(1, 24))

    # Summary note & Disclaimer
    footer_elements = [
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=8),
        Paragraph("For information only. This is not medical advice. DoseCare reminders assist treatment adherence under physician supervision.", disclaimer_style),
        Paragraph(f"Generated automatically by DoseCare Clinic Portal • {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", disclaimer_style)
    ]
    story.append(KeepTogether(footer_elements))

    doc.build(story)
    return buffer.getvalue()
