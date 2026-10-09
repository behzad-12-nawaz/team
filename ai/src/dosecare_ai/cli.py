import argparse

from . import answer_medicine_question, extract_prescription, transcribe


def main():
    parser = argparse.ArgumentParser(description="DoseCare AI CLI")

    parser.add_argument(
        "--question",
        type=str,
        help="Ask a medicine question",
    )

    parser.add_argument(
        "--medicine",
        type=str,
        help="Medicine name for the question",
    )

    parser.add_argument(
        "--prescription",
        type=str,
        help="Path to a prescription image",
    )

    parser.add_argument(
        "--audio",
        type=str,
        help="Path to an audio file",
    )


    args = parser.parse_args()

    if args.prescription:
        with open(args.prescription, "rb") as file:
            image_bytes = file.read()

        result = extract_prescription(image_bytes)

        print(result)
        return

    if args.audio:
        with open(args.audio, "rb") as file:
            audio_bytes = file.read()

        result = transcribe(audio_bytes)

        print(result)
        return

    if args.question and args.medicine:
        answer = answer_medicine_question(
            args.question,
            args.medicine,
        )
        print(answer)
        return

    parser.print_help()


if __name__ == "__main__":
    main()