import json
import sys
from pathlib import Path

INPUT = Path("full_config.json")
OUTPUT = Path("full_config.fixed.json")  # write to new file; safer than in-place


def fix_matrix(matrix, path=""):
    """Ensure every column has at least one 1. Mutates matrix in place."""
    if not matrix or not isinstance(matrix, list):
        return 0

    n_rows = len(matrix)
    n_cols = len(matrix[0]) if n_rows else 0

    # sanity: rectangular
    for r, row in enumerate(matrix):
        if len(row) != n_cols:
            raise ValueError(
                f"Non-rectangular matrix at {path}: row {r} has {len(row)} cols, expected {n_cols}"
            )

    flips = 0
    for c in range(n_cols):
        col = [matrix[r][c] for r in range(n_rows)]
        if any(v == 1 for v in col):
            continue  # already valid

        # pick row with fewest current 1s (tie -> lowest index)
        row_ones = [sum(matrix[r]) for r in range(n_rows)]
        target_row = min(range(n_rows), key=lambda r: (row_ones[r], r))
        matrix[target_row][c] = 1
        flips += 1
        print(f"  [{path}] column {c}: flipped row {target_row} 0 -> 1")

    return flips


def walk(node, path="$"):
    """Recursively walk JSON and fix any RelayersGatewaysBinaryMatrix."""
    total = 0
    if isinstance(node, dict):
        for k, v in node.items():
            child_path = f"{path}.{k}"
            if k == "RelayersGatewaysBinaryMatrix" and isinstance(v, list):
                print(f"Fixing matrix at {child_path}")
                total += fix_matrix(v, child_path)
            else:
                total += walk(v, child_path)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            total += walk(v, f"{path}[{i}]")
    return total


def main():
    if not INPUT.exists():
        sys.exit(f"Missing input file: {INPUT}")

    with INPUT.open("r", encoding="utf-8") as f:
        data = json.load(f)

    flips = walk(data)
    print(f"\nTotal flips: {flips}")

    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Wrote fixed config to {OUTPUT}")


if __name__ == "__main__":
    main()