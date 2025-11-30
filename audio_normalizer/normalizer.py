import os
import argparse
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError

def normalize_audio_files(input_dir, output_dir, bitrate="128k"):
    """
    Scans a directory for .mp3 files, normalizes them to a specific bitrate,
    and saves them to an output directory.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory: {output_dir}")

    processed_count = 0
    skipped_count = 0
    error_count = 0
    
    print(f"\nScanning directory: {input_dir}")
    print("-" * 30)

    for root, _, files in os.walk(input_dir):
        for filename in files:
            if not filename.lower().endswith('.mp3'):
                continue

            input_path = os.path.join(root, filename)
            output_filename = f"{os.path.splitext(filename)[0]}_normalized.mp3"
            output_path = os.path.join(output_dir, output_filename)

            try:
                # Load the audio file
                print(f"Processing: {filename}...")
                audio = AudioSegment.from_mp3(input_path)

                # Export with the desired bitrate
                # The export function handles the conversion.
                audio.export(output_path, format="mp3", bitrate=bitrate)
                
                print(f"  -> Saved as: {output_filename} at {bitrate}")
                processed_count += 1

            except CouldntDecodeError:
                print(f"  -> ERROR: Could not decode {filename}. File might be corrupt or not a valid MP3. Skipping.")
                error_count += 1
            except Exception as e:
                print(f"  -> ERROR: An unexpected error occurred with {filename}: {e}. Skipping.")
                error_count += 1

    print("\n" + "=" * 30)
    print("      Normalization Complete")
    print("=" * 30)
    print(f"Successfully processed: {processed_count}")
    print(f"Skipped (corrupt/error): {error_count}")
    print(f"Output directory: {output_dir}")
    print("=" * 30)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Normalize MP3 files in a directory to 128kbps.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        'input_dir', 
        type=str, 
        help='The path to the folder containing your music files.'
    )
    parser.add_argument(
        'output_dir', 
        type=str, 
        help='The path to the folder where normalized files will be saved.'
    )

    args = parser.parse_args()

    normalize_audio_files(args.input_dir, args.output_dir)
