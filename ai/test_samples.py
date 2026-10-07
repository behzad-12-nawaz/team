from pathlib import Path

from dosecare_ai import extract_prescription


SAMPLES_DIR = Path(__file__).parent / "samples" / "prescriptions"


def main():
    images = sorted(SAMPLES_DIR.glob("*"))

    print(f"Found {len(images)} prescription images.")

    for image_path in images:
        print(f"\n--- {image_path.name} ---")

        try:
            result = extract_prescription(image_path.read_bytes())

            print(f"Medicines: {len(result['medicines'])}")
            print(f"Warnings: {result['warnings']}")

            for medicine in result["medicines"]:
                print(
                    f"  {medicine['name']} | "
                    f"{medicine['dose']} | "
                    f"{medicine['times']} | "
                    f"{medicine['days']} days | "
                    f"unclear={medicine['unclear']}"
                )

        except Exception as exc:
            print(f"ERROR: {exc}")


if __name__ == "__main__":
    main()