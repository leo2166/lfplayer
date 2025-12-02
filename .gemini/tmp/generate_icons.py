import os
from PIL import Image

def generate_pwa_icons(base_image_path, output_dir):
    try:
        img = Image.open(base_image_path)
        
        # Define the sizes required by your manifest.json
        sizes = [192, 256, 384, 512]
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        for size in sizes:
            icon_filename = f"icon-{size}x{size}.png"
            icon_path = os.path.join(output_dir, icon_filename)
            
            # Create a copy to resize, maintaining aspect ratio if needed, then paste to a square
            # For simplicity, we'll just resize directly, which might distort if not square
            icon = img.resize((size, size), Image.Resampling.LANCZOS)
            icon.save(icon_path)
            print(f"Generated {icon_path}")
            
    except FileNotFoundError:
        print(f"Error: Base image not found at {base_image_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

# Define paths
base_image = "public/placeholder-logo.png"
output_directory = "public"

# Run the function
generate_pwa_icons(base_image, output_directory)
