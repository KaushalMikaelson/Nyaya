import os
import glob

def sync_theme(directory):
    # Mapping of old dark carbon theme hex codes to new navy/gold theme hex codes
    hex_map = {
        "#0a0a0a": "#070b16",
        "#171717": "#0a0f1d",
        "#07070d": "#070b16",
        "#141414": "#0d1224",
        "#1c1c1c": "#111827",
        "#212121": "#131b31",
        "#27272a": "#1e2642",
        "#2a2a2a": "#1e2642",
        "#2f2f2f": "#1a2442",
        "#3a3a3a": "#2d3759",
        "#3f3f46": "#2d3759",
        "#4f4f56": "#3a466d",
        "purple-400": "amber-300",
        "purple-500": "amber-400",
        "purple-600": "yellow-500",
        "indigo-400": "amber-200",
        "indigo-500": "yellow-600",
        "#a855f7": "#d4af37",
        "#c084fc": "#f2d680"
    }

    # Find all ts, tsx, css files
    pattern = os.path.join(directory, "**", "*.*")
    for file_path in glob.glob(pattern, recursive=True):
        if file_path.endswith((".tsx", ".ts", ".css")):
            if "landing" in file_path:
                print(f"Skipping landing page overrides: {file_path}")
                continue # Skip the landing page because we just built it and it already has the theme!
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()

                modified = content
                for old_hex, new_hex in hex_map.items():
                    modified = modified.replace(old_hex, new_hex)
                    modified = modified.replace(old_hex.upper(), new_hex) # Check uppercase just in case

                if modified != content:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(modified)
                    print(f"Updated theme in {file_path}")
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    sync_theme("src")
