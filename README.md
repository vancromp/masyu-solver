# masyu-solver
## Introduction

This is a solver for [Masyu](https://en.wikipedia.org/wiki/Masyu) Puzzles.
The goal of this project is to implement automatic resolution of those puzzles
using local inference and 1-level backtracking.

The current implementation is a [Userscript](https://en.wikipedia.org/wiki/Userscript)
targeting the [Online Masyu by KrazyDad](https://krazydad.com/tablet/masyu/?).
The script has been tested with Tampermonkey on Chromium. 

## Usage

Install Tampermonkey or another userscript plugin in your browser,
then click [this link](masyu-solver.user.js?raw=true) to install the userscript.

## Development

My current solution for maintaining this script is to copy/paste it between my IDE and Tampermonkey's editor.
Since the scripts are stored in SQLite,
[there does not seem to be an easy way to synchronize the two](https://stackoverflow.com/a/11860530/525036()).

### Proposal

- install node dependencies: `yarn install`
- run dev server: `yarn dev`
- build production userscript: `yarn build`

## Implementation
### Constraints and Puzzle Representation

The puzzle is represented by different constraints, all extending `Constraint`:
* `SimpleVertex` is the base class for vertices
  * `WhiteVertex` and `BlackVertex` extend it to represent white and black vertices
* `AdjacentWhiteVerticesPair` handles the special case of 2 adjacent white vertices
* `SolverEdge` represents edges and holds an unknown/empty/filled state
  * `VerticalSolverEdge` or `HorizontalSolverEdge` extend it to represent either orientation
(the orientation does not actually matter much but it makes it easier for debugging)
* `SolverCell` represents cells and holds an unknown/innie/outie state

In additon, a `Line` represents a continuous line of filled edges and is used to quickly detect loops.

The puzzle itself is represented with an additional outer cells that are initialized as "outies".
Their vertices are represented as well, but not the outer edges.
This allow the the constranits close to the edge of the puzzle
to behave the same as if they were located anywhere else.

During initialization, adjacent black vertices and adjacent triplets of white vertices
are detected in order to immediately initialize the edges between them as empty.
This avoids the need to have a specific constraint for those cases.
Note that this would be detected by the hypotheses mechanism anyway if it was not implemented.

### Constraints Resolution

The resolution is implemented by iterating over all constraints,
and calling their `tryResolve()` method.
This method can return either:
* `RESOLVED`, indicating that the constraint is fully satisfied and does not need further processing;
* `VIOLATED`, indicating that it cannot be resolved anymore and backtracking is required;
* `UNCHANGED`, indicating that no change occurred;
* `CHANGED` – not used at the moment by constraints.

The system will loop over all constraints until none of them still causes any change.

### Hypotheses and backtracking

If, after iterating all contraints once, the puzzle is not solved,
the solver will attempt hypotheses and backtrack when reaching a dead end.

#### General Principle

Each constraint can propose a list of hypotheses in the form of either edges to fill or functions to call.
The list of hypotheses must be complementary: at least one of them should be valid.

The solver will try each hypothesis until either

* one leads to a solution, ending the resolution;
* one leads to a violation, rejecting the hypothesis; or
* one leads to a dead-end: resolving the constraint did not lead to one of the above cases.

After attempting all hypotheses of a given constraint,
if only one does not lead to a violation it is reapplied.

#### Backtracking

When an hypothesis does not lead to a solution, the system rolls back all changes that it triggered.

The implementation has been kept voluntarily simple because it tries to mimic human thinking.
Such puzzles can thus not involve several layers of hypotheses, otherwise they loose their fun
(especialy if you solve them using pen and paper).

For this reason, constraints just have simple methods `backup()`/`restore()`
and do not allow stacking of backup states.
These methods are called before and after applying each constraint.

## Animation

During the resolution, all state changes, including those due to hypotheses and backtracking,
are recorded in order to replay the solver "thinking".

As the solver is very fast, those animation steps are played afterwards
to avoid the performance impact due to the redrawing of the canvas.

The animation speed is configurable, as well as the option to go to the next puzzle automatically after the animation
(if the current one was succesfully solved). 
