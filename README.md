# gift-picker

An intelligent gift exchange assignment tool that automatically generates valid gift assignments for Secret Santa and similar gift exchanges.

## Overview

`gift-picker` solves the constraint satisfaction problem of organizing a gift exchange. Given a list of participants and any constraints (like excluding family members from giving to each other), it automatically finds valid gift assignments that satisfy all constraints.

### The Problem

In a gift exchange, you need to assign each person a recipient to give a gift to. However, there are often constraints:
- No one wants to give a gift to themselves
- Immediate family members shouldn't give to each other
- Two people shouldn't be assigned to give to each other (mutual giving)

Manually figuring out who gives to whom while respecting all constraints is tedious and error-prone.

### The Solution

`gift-picker` uses a backtracking algorithm to find all valid assignments. Simply provide a list of participants and their exclusion list, and the tool will:
1. Generate a random assignment order
2. Systematically find a valid gift assignment
3. Display who gives to whom

If you get "no results," just run it again. The next random order might succeed. This is a quirk of backtracking algorithms—they're not guaranteed to find a solution even when one exists, depending on the initial random order.

## Installation

```bash
npm install -g gift-picker
```

Or clone the repository and run:
```bash
npm install
```

## Usage

### Basic Demo

Try the demo mode to see how it works:

```bash
gift-picker --demo
```

Output:
```
Matt = Lynn
David = Jerry
Louis = Carol
Jerry = Samantha
Allison = David
Samantha = Rhianna
Rhianna = Allison
Carol = Matt
Lynn = Louis
```

### Using Your Own Participants

Create a JSON file with your participants. The format is an array of `[name, [exclusion_list]]` pairs:

```json
[
  ["Alice", ["Bob"]],
  ["Bob", ["Alice", "Charlie"]],
  ["Charlie", ["Bob"]],
  ["Diana", ["Eve"]],
  ["Eve", ["Diana"]]
]
```

Then run:

```bash
gift-picker --file participants.json
```

### Generate a Sample File

Create a template file to fill in:

```bash
gift-picker --generate my-group.json
```

This creates `my-group.json` with sample participant data you can edit.

### Command-line Options

```
Usage: gift-picker [options]

Options:
  -l, --logging              Enable debug logging to see the algorithm's decision process
  -d, --demo                 Run with built-in demo data (ignores --file)
  -f, --file <file>          Load participants from a JSON file
  -g, --generate <file>      Generate a sample participants file
  -h, --help                 Display help information
```

## File Format

The input JSON file must be an array of participants. Each participant is represented as a two-element array:

```json
[
  [name, [exclusion_list]],
  [name, [exclusion_list]],
  ...
]
```

- **name** (string): Participant's name
- **exclusion_list** (array of strings): Names of people this person cannot give a gift to

### Example

```json
[
  ["Alice", ["Bob", "Carol"]],
  ["Bob", ["Alice"]],
  ["Carol", ["Bob"]],
  ["Diana", []],
  ["Eve", ["Diana"]]
]
```

In this example:
- Alice won't give to Bob or Carol
- Bob won't give to Alice
- Carol won't give to Bob
- Diana has no exclusions
- Eve won't give to Diana

## How It Works

The tool uses a recursive backtracking algorithm:

1. **Shuffle participants**: Start with a random order to vary results
2. **Try assignments**: For each person (in order), try assigning them a valid recipient
3. **Check constraints**: A recipient is valid if:
   - They're not the same person (no self-giving)
   - They're not in the person's exclusion list
   - They haven't already been assigned as a giftee
   - The recipient hasn't already been assigned to give to this person (no mutual giving)
4. **Backtrack**: If an assignment leads to an impossible situation, undo it and try a different recipient
5. **Output**: When a complete valid assignment is found, display the results

## Logging

Use `--logging` to see the algorithm's decision-making process:

```bash
gift-picker --demo --logging
```

This outputs detailed logs to stderr while results go to stdout, useful for debugging or understanding how assignments are determined.

## Examples

### Simple Family Exchange

```bash
# Create participants file
cat > family.json << EOF
[
  ["Mom", ["Dad"]],
  ["Dad", ["Mom"]],
  ["Son", []],
  ["Daughter", []]
]
EOF

# Run the picker
gift-picker --file family.json
```

### Office Gift Exchange

```bash
gift-picker --generate office-secret-santa.json
# Edit office-secret-santa.json to add your coworkers and exclusions
gift-picker --file office-secret-santa.json
```

## Exit Status

- The program prints results if a valid assignment is found
- If no valid assignment can be found with the current random order, it suggests running again (the next random order might work)
- Use `--demo` to verify the tool is working correctly

## License

MIT

## Author

Pat Barnes
