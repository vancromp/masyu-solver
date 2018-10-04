const message: string = `OMG, it's Typescript!`;
console.log(message);

const solvePuzzle = true;
const animationInterval = 50;
const autoGoToNext = false;
const goToNextDelay = 2000;

if (!solvePuzzle) {
    // to avoid syntax error when the script is run via injection of a script tag...
    throw new Error('stop execution');
}

let puzzWidth = window.puzzWidth;
let puzzHeight = window.puzzHeight;
let myVerts = window.myVerts;
let myEdges = window.myEdges;
let myCells = window.myCells;
if (!puzzWidth || !puzzHeight || !myVerts || !myEdges || !myCells) {
    throw new Error(`Solver: missing key variable (${puzzWidth}, ${puzzHeight}, ${myVerts}, ${myEdges}, ${myCells})`);
}

function getVert(x, y) {
    if (x < 0 || x > puzzWidth || y < 0 || y > puzzHeight) {
        return null;
    }
    return myVerts[x + (puzzWidth + 1) * y];
}
function getEdge(x1, y1, x2, y2) {
    return myEdges.find(e => e.x1 === x1 && e.x2 === x2 && e.y1 === y1 && e.y2 === y2
        || e.x1 === x2 && e.x2 === x1 && e.y1 === y2 && e.y2 === y1);
}
function getCell(x, y) {
    if (x < 0 || x >= puzzWidth || y < 0 || y >= puzzHeight) {
        return null;
    }
    return myCells[x + puzzWidth * y];
}

function delay(millis, value) {
    return new Promise(resolve => setTimeout(resolve, millis, value));
}

async function animate() {
    console.log('Playing animation');
    for (const step of animationSteps) {
        step();
        if (animationInterval) {
            window.refreshCanvas();
            await delay(animationInterval);
        }
    }
    window.refreshCanvas();
}

console.log('Initializing solver for ' + puzzWidth + '×' + puzzHeight);

import {ConstraintResolution} from './classes/ConstraintResolution';
import {SimpleVertex} from './classes/SimpleVertex';
import {WhiteVertex} from './classes/WhiteVertex';
import {BlackVertex} from './classes/BlackVertex';
import {AdjacentWhiteVerticesPair} from './classes/AdjacentWhiteVerticesPair';
import {VerticalSolverEdge} from './classes/VerticalSolverEdge';
import {HorizontalSolverEdge} from './classes/HorizontalSolverEdge';
import {SolverCell} from './classes/SolverCell';
import {Line} from './classes/Line';

import {
    puzzleSpecialVertices,
    resolvedEdges,
    EdgeState,
    CellState,
    animationSteps,
    recordAnimationStep
} from "./globals";

let unsolvedConstraints = [];
const vertices = [];

// vertices
(function buildVertices() {
    for (let i = -1; i <= puzzWidth + 1; i++) {
        vertices[i] = [];
        for (let j = -1; j <= puzzHeight + 1; j++) {
            let puzzVert = getVert(i, j);
            let vertex;
            if (!puzzVert || puzzVert.clue === '_') {
                vertex = new SimpleVertex(i, j);
            } else {
                switch (puzzVert.clue) {
                    case 'O':
                        vertex = new WhiteVertex(i, j);
                        puzzleSpecialVertices++;
                        break;
                    case '@':
                        vertex = new BlackVertex(i, j);
                        puzzleSpecialVertices++;
                        break;
                    default:
                        throw 'Unknown clue: ' + i + ',' + j + ': ' + puzzVert.clue;
                }
            }

            vertices[i][j] = vertex;

            if (i >= 0 && i <= puzzWidth && j >= 0 && j <= puzzHeight) {
                unsolvedConstraints.push(vertex);
            }
        }
    }
})();

function registerIfWhitePair(edge) {
    if (edge.vertex1 instanceof WhiteVertex
        && edge.vertex2 instanceof WhiteVertex) {
        if (edge.vertex1.getOpposedEdge(edge).getOpposedVertex(edge.vertex1) instanceof WhiteVertex) {
            // 3 in a row
            edge.state = EdgeState.EMPTY;
        } else {
            unsolvedConstraints.push(new AdjacentWhiteVerticesPair(edge));
        }
    }
    if (edge.vertex1 instanceof BlackVertex
        && edge.vertex2 instanceof BlackVertex) {
        edge.state = EdgeState.EMPTY;
    }
}

// horizontal edges
const hEdges = [];
(function buildHorizontalEdges() {
    for (let i = -1; i <= puzzWidth; i++) {
        hEdges[i] = [];
        for (let j = 0; j <= puzzHeight; j++) {
            const v1 = vertices[i][j];
            const v2 = vertices[i + 1][j];

            const edge = new HorizontalSolverEdge(v1, v2, getEdge(i, j, i + 1, j));
            hEdges[i][j] = edge;
            if (i < 0 || i === puzzWidth) {
                // bypassing setEmpty() because cells are not set yet
                edge.state = EdgeState.EMPTY;
            } else {
                unsolvedConstraints.push(edge);
            }

            v1.rightEdge = edge;
            v2.leftEdge = edge;
            if (i > 0 && i < puzzWidth - 1) {
                registerIfWhitePair(edge)
            }
        }
    }
})();

// vertical edges
const vEdges = [];
(function buildVerticalEdges() {
    for (let i = 0; i <= puzzWidth; i++) {
        vEdges[i] = [];
        for (let j = -1; j <= puzzHeight; j++) {
            const v1 = vertices[i][j];
            const v2 = vertices[i][j + 1];

            const edge = new VerticalSolverEdge(v1, v2, getEdge(i, j, i, j + 1));
            vEdges[i][j] = edge;
            if (j < 0 || j === puzzHeight) {
                // bypassing setEmpty() because cells are not set yet
                edge.state = EdgeState.EMPTY;
            } else {
                unsolvedConstraints.push(edge);
            }

            v1.bottomEdge = edge;
            v2.topEdge = edge;
            if (j > 0 && j < puzzHeight - 1) {
                registerIfWhitePair(edge)
            }
        }
    }
})();

// cells
const cells = [];
(function buildCells() {
    for (let i = -1; i <= puzzWidth; i++) {
        cells[i] = [];
        for (let j = -1; j <= puzzHeight; j++) {
            let top, left, right, bottom;
            top = j >= 0 ? top = hEdges[i][j] : null;
            left = i >= 0 ? vEdges[i][j] : null;
            right = i < puzzWidth ? vEdges[i+1][j] : null;
            bottom = j < puzzHeight ? hEdges[i][j+1] : null;

            const cell = new SolverCell(top, left, right, bottom, getCell(i, j));
            if (i === -1 || i === puzzWidth || j === -1 || j === puzzHeight) {
                cell.state = CellState.OUTIE;
            } else {
                unsolvedConstraints.push(cell);
            }
            cells[i][j] = cell;

            if (top) top.bottom = cell;
            if (left) left.right = cell;
            if (right) right.left = cell;
            if (bottom) bottom.top = cell;
        }
    }
})();

function resolveConstraints() {
    const oldCount = unsolvedConstraints.length;
    const keptConstraints = [];
    for (const c of unsolvedConstraints) {
        const result = c.tryResolve();
        switch (result) {
            case ConstraintResolution.VIOLATED:
                return ConstraintResolution.VIOLATED;
            case ConstraintResolution.RESOLVED:
                break;
            default:
                keptConstraints.push(c);
        }
    }
    unsolvedConstraints = keptConstraints;
    return oldCount !== unsolvedConstraints.length ? ConstraintResolution.CHANGED : ConstraintResolution.UNCHANGED;
}

function solverLoop() {
    let oldResolvedEdges = resolvedEdges;
    const result = resolveConstraints();
    if (result === ConstraintResolution.VIOLATED) {
        return result;
    }
    if (result === ConstraintResolution.CHANGED || oldResolvedEdges !== resolvedEdges) {
        return ConstraintResolution.CHANGED;
    }
    return ConstraintResolution.UNCHANGED;
}

function iterateConstraints() {
    let result;
    let loops = 0;
    do {
        loops++;
        result = solverLoop();
        if (result === ConstraintResolution.VIOLATED) {
            return result;
        }
        //window.refreshCanvas();
    } while (result === ConstraintResolution.CHANGED);
    return loops > 1 ? ConstraintResolution.CHANGED : ConstraintResolution.UNCHANGED
}

function applyHypothesis(h) {
    h.forEach(hyp => typeof(hyp) === "function" ? hyp() : hyp.setFilled());
    return iterateConstraints();
}

function tryHypotheses() {
    let keptAnHypothesis;
    do {
        window.refreshCanvas();
        keptAnHypothesis = false;
        for (let constraint of unsolvedConstraints) {
            const hypotheses = constraint.getHypotheses();
            let nonViolatingHyps = [];
            for (const h of hypotheses) {
                console.log(`Trying hypothesis ${h}`);
                recordAnimationStep(() => console.log(`Showing hypothesis ${h}`));
                const oldResolvedEdges = resolvedEdges;
                const oldUnsolvedConstraints = unsolvedConstraints.slice(0);
                Line.backup();
                unsolvedConstraints.forEach(c => c.backup());
                const result = applyHypothesis(h);
                if (result !== ConstraintResolution.VIOLATED) {
                    if (Line.isPuzzleSolved()) {
                        console.log('Puzzle appears to be solved');
                        return;
                    }
                    nonViolatingHyps.push(h);
                    recordAnimationStep(() => console.log(`Reverting hypothesis ${h}`));
                } else {
                    console.log('Hypothesis rejected');
                    recordAnimationStep(() => console.log(`Hypothesis ${h} rejected`));
                }
                oldUnsolvedConstraints.forEach(c => c.restore());
                Line.restore();
                unsolvedConstraints = oldUnsolvedConstraints;
                resolvedEdges = oldResolvedEdges;
            }
            console.assert(hypotheses.length === 0 || nonViolatingHyps.length > 0, 'At least one hypothesis should be valid');
            if (nonViolatingHyps.length === 1) {
                const keptHypothesis = nonViolatingHyps[0];
                console.log(`Keeping single valid hypothesis ${keptHypothesis}`);
                recordAnimationStep(() => console.log(`Restoring single valid hypothesis ${keptHypothesis}`));
                applyHypothesis(keptHypothesis);
                keptAnHypothesis = true;
                break;
            }
        }
    } while (keptAnHypothesis);
}

iterateConstraints();
if (!Line.isPuzzleSolved()) {
    console.log("Puzzle not solved, trying hypotheses");
    tryHypotheses();
}

animate().then(() => {
    if (window.checkIfSolved()) {
        window.gPuzzleIsComplete = true;
        window.DebutSuccessAnimation();
        window.SuccessLog();
        console.log('Puzzle solved');
        if (autoGoToNext) {
            if (window.bookNumber === 100 && window.puzzleNumber === window.getMaxPuzzlesPerBook(window.pkind)) {
                console.log('Reached end of last book!');
            } else {
                console.log('Going to next puzzle');
                setTimeout(window.gotoNextPuzzle, goToNextDelay);
            }
        }
    } else {
        console.log('Could not resolve this one...');
        window.gPuzzleIsComplete = false;
    }
    window.refreshCanvas();
});
