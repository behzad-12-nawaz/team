from dosecare_ai.models import Medicine, Extraction


def test_medicine():
    medicine = Medicine(
        name="Metformin",
        dose="500 mg",
        times=["08:00", "20:00"],
        days=30,
        instructions="after meals",
        unclear=False,
    )

    assert medicine.name == "Metformin"
    assert medicine.dose == "500 mg"
    assert medicine.days == 30


def test_extraction():
    extraction = Extraction(
        medicines=[
            Medicine(
                name="Metformin",
                dose="500 mg",
                times=["08:00", "20:00"],
                days=30,
                instructions="after meals",
                unclear=False,
            )
        ],
        warnings=[],
    )

    assert len(extraction.medicines) == 1
    assert extraction.medicines[0].name == "Metformin"