import os
import sys
from pathlib import Path

def get_folder_size(folder_path):
    """Calculate the total size of a folder and its subfolders in bytes."""
    total_size = 0
    try:
        for entry in os.scandir(folder_path):
            if entry.is_file():
                total_size += entry.stat(follow_symlinks=False).st_size
            elif entry.is_dir():
                try:
                    total_size += get_folder_size(entry.path)
                except (PermissionError, OSError):
                    # Skip folders with access denied or other errors
                    continue
    except (PermissionError, OSError):
        # Skip folders that can't be accessed
        return total_size
    return total_size

def format_size(size_in_bytes):
    """Convert bytes to human-readable format (MB or GB)."""
    if size_in_bytes >= 1024**3:  # GB
        return f"{size_in_bytes / (1024**3):.2f} GB"
    else:  # MB
        return f"{size_in_bytes / (1024**2):.2f} MB"

def analyze_drive(drive_path):
    """Analyze storage usage for each folder in the given drive."""
    print(f"Scanning folders in {drive_path}...")
    folder_sizes = []
    
    try:
        for entry in os.scandir(drive_path):
            if entry.is_dir():
                try:
                    size = get_folder_size(entry.path)
                    folder_sizes.append((entry.name, size))
                except (PermissionError, OSError) as e:
                    print(f"Skipping {entry.name}: {str(e)}")
                    continue
    except Exception as e:
        print(f"Error scanning {drive_path}: {str(e)}")
        return

    # Sort folders by size (descending)
    folder_sizes.sort(key=lambda x: x[1], reverse=False)

    # Print results
    print("\nFolder Sizes (sorted by size):")
    print("-" * 40)
    for folder_name, size in folder_sizes:
        print(f"{folder_name}: {format_size(size)}")

def main():
    # Default to C: drive
    drive_path = "C:\\Windows\\WinSxS"
    
    if not os.path.exists(drive_path):
        print(f"Drive {drive_path} does not exist.")
        sys.exit(1)
    
    print(f"Analyzing storage usage for {drive_path}")
    analyze_drive(drive_path)

if __name__ == "__main__":
    main()