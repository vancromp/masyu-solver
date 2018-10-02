// ==UserScript==
// @name         Krazydad Masyu Solver
// @version    1
// @grant        none
// @include         https://krazydad.com/tablet/masyu/*
// @run-at            document-idle
// ==/UserScript==

const solvePuzzle = true;
const animationInterval = 50;
const autoGoToNext = false;
const goToNextDelay = 2000;

if (!solvePuzzle) {
    return;
}

let puzzWidth = window.puzzWidth;
let puzzHeight = window.puzzHeight;
let myVerts = window.myVerts;
let myEdges = window.myEdges;
let myCells = window.myCells;
if (!puzzWidth || !puzzHeight || !myVerts || !myEdges || !myCells) {
    console.log(`Solver: missing key variable (${puzzWidth}, ${puzzHeight}, ${myVerts}, ${myEdges}, ${myCells})`);
    return;
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

const animationSteps = [];
function recordAnimationStep(step) {
    animationSteps.push(step);
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

class ConstraintResolution {
    constructor(name) {
        this.name = name;
    }

    static register(resolutions) {
        for (const name in resolutions) {
            ConstraintResolution[name] = new ConstraintResolution(name);
        }
    }

    isViolated() {
        return this === ConstraintResolution.VIOLATED;
    }

    isResolved() {
        return this === ConstraintResolution.RESOLVED;
    }
}
ConstraintResolution.register({
    UNCHANGED: 0,
    CHANGED: 1,
    RESOLVED: 2,
    VIOLATED: 3
});

class Constraint {
    tryResolve() {
        throw 'Not Implemented';
    }

    /**
     * Generates some possible hypotheses for this constraint.
     * @param level (TODO) the hypothesis attempt level, i.e. how unlikely the hypothesis have to be
     * @return an array of arrays of either edges that have to be filled to try an hypothesis,
     *         or an array of arrays of functions that set some state to try an hypothesis.
     *         An empty array means no hypothesis is proposed.
     *         Hypotheses have to be complementary: at least one of them should be in the solution.
     *         Corollary: if only one does not lead to a violation, it must be part of the solution.
     */
    getHypotheses() {
        // no hypothesis by default
        return [];
    }

    backup() {
    }

    restore() {
    }
}

class SimpleVertex extends Constraint {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
        this.leftEdge = this.rightEdge = this.topEdge = this.bottomEdge = null;
    }

    tryResolve() {
        const uEdges = this.unknownEdges;
        // console.log('Vertex ' + this.x + ',' + this.y + ' has ' + uEdges.length + ' unknown edge(s)')
        if (uEdges.length === 0) {
            const filledEdges = this.edges.filter(e => e.isFilled()).length;
            return [0,2].includes(filledEdges) ? ConstraintResolution.RESOLVED : ConstraintResolution.VIOLATED;
        }
        if (uEdges.length === 1) {
            // only 1 unknown:
            // if all empty, then remaining one is empty (no dead end)
            // if 1 filled, then remaining one is filled (line must exit)
            // if 2 filled, then remaining one is empty (no self-crossing)
            const numFilled = this.knownEdges.filter(e => e.state === EdgeState.FILLED).length;
            if (numFilled === 3) {
                return ConstraintResolution.VIOLATED;
            }
            return uEdges[0].setFilled(numFilled === 1);
        }
        if (uEdges.length === 2) {
            if (this.knownEdges.every(e => e.state === EdgeState.FILLED)) {
                // console.log('All known edges are FILLED');
                uEdges.forEach(e => {e.state = EdgeState.EMPTY;});
                return ConstraintResolution.RESOLVED;
            }
        }
        return ConstraintResolution.UNCHANGED;
    }

    get edges() {
        return [this.leftEdge, this.rightEdge, this.topEdge, this.bottomEdge];
    }

    get verticalEdges() {
        return [this.topEdge, this.bottomEdge];
    }

    get horizontalEdges() {
        return [this.leftEdge, this.rightEdge];
    }

    get unknownEdges() {
        return this.edges.filter(e => !e.isSolved());
    }

    get knownEdges() {
        return this.edges.filter(e => e.isSolved());
    }

    get cells() {
        return this.topEdge.cells.concat(this.bottomEdge.cells);
    }

    hasSameLineAs(otherVertex) {
        return this.line && this.line === otherVertex.line;
    }

    getOpposedEdge(edge) {
        switch (edge) {
            case this.leftEdge: return this.rightEdge;
            case this.rightEdge: return this.leftEdge;
            case this.topEdge: return this.bottomEdge;
            case this.bottomEdge: return this.topEdge;
            default: throw 'Not my edge: ' + edge;
        }
    }

    getPerpendicularEdges(edge) {
        switch (edge) {
            case this.leftEdge:
            case this.rightEdge:
                return [this.topEdge, this.bottomEdge];
            case this.topEdge:
            case this.bottomEdge:
                return [this.leftEdge, this.rightEdge];
            default: throw 'Not my edge: ' + edge;
        }
    }

    getOpposedCell(cell) {
        switch (cell) {
            case this.leftEdge.top: return this.rightEdge.bottom;
            case this.rightEdge.top: return this.leftEdge.bottom;
            case this.leftEdge.bottom: return this.rightEdge.top;
            case this.rightEdge.bottom: return this.leftEdge.top;
            default: throw 'Not my cell: ' + cell;
        }
    }

    isSpecial() {
        return false;
    }

    getHypotheses() {
        if (!this.line) {
            return [];
        }
        let uEdges = this.unknownEdges;
        return uEdges.length === 2 ? uEdges.map(e => [e]) : [];
    }

    backup() {
        this._lineBackup = this.line;
    }

    restore() {
        this.line = this._lineBackup;
    }

    toString() {
        return this.constructor.name[0] + '(' + this.x + ',' + this.y + ')';
    }
}

class WhiteVertex extends SimpleVertex {
    constructor(x, y) {
        super(x, y);
    }

    tryResolve() {
        const superResolve = super.tryResolve();
        if (superResolve === ConstraintResolution.VIOLATED) {
            return superResolve;
        }
        if (superResolve === ConstraintResolution.RESOLVED) {
            // make sure no angle on white vertex
            if (this.horizontalEdges.filter(e => e.isFilled()).length === 1) {
                return ConstraintResolution.VIOLATED;
            }
            return this.tryEnsureCorner();
        }
        if (this.unknownEdges.length < 4) {
            // any known edge gives the remaining edges
            const kEdges = this.knownEdges;
            for (const e of kEdges) {
                const opposedEdge = this.getOpposedEdge(e);
                if (opposedEdge.setFilled(e.isFilled()) === ConstraintResolution.VIOLATED) {
                    return ConstraintResolution.VIOLATED;
                }
            }
            const remainingFilled = !kEdges.some(e => e.isFilled());
            if (this.unknownEdges.map(e => e.setFilled(remainingFilled)).some(r => r === ConstraintResolution.VIOLATED)) {
                return ConstraintResolution.VIOLATED;
            }
            return this.tryEnsureCorner();
        }
        // no known edge.
        // prevent straight lines & loops
        const opposedPairs = [this.horizontalEdges, this.verticalEdges];
        for (let pair of opposedPairs) {
            if (pair.every(e => e.getOpposedEdge(this).isFilled())) {
                return this.markPairEmpty(pair);
            }
            let opposedVertices = pair.map(e => e.getOpposedVertex(this));
            if (opposedVertices[0].hasSameLineAs(opposedVertices[1])) {
                if (!opposedVertices[0].line.missesOneSpecial()) {
                    return this.markPairEmpty(pair);
                }
                // note that else case cannot be assumed as filled, as it could cause a straight line for another white vertex
            }
        }
        // at least, try fill neighbour cells...
        this.cells.filter(c => c.isSolved()).forEach(c => { this.getOpposedCell(c).state = c.state.inverse() });
        return false;
    }

    markPairEmpty(pair) {
        if (pair.map(e => e.setEmpty()).some(cr => cr.isViolated())
            || this.getPerpendicularEdges(pair[0]).map(e => e.setFilled()).some(cr => cr.isViolated())) {
            return ConstraintResolution.VIOLATED;
        }
        return this.tryEnsureCorner();
    }

    tryEnsureCorner() {
        const filledEdges = this.edges.filter(e => e.state === EdgeState.FILLED);
        if (filledEdges.some(e => e.getOpposedVertex(this).getPerpendicularEdges(e).some(e2 => e2.state === EdgeState.FILLED))) {
            // we found a corner
            return ConstraintResolution.RESOLVED;
        }
        const straightEdge = filledEdges.find(e => e.getOpposedEdge(this).state === EdgeState.FILLED);
        if (straightEdge) {
            const opposedEdge = this.getOpposedEdge(straightEdge).getOpposedEdge(this);
            if (opposedEdge.isFilled()) {
                return ConstraintResolution.VIOLATED;
            }
            opposedEdge.state = EdgeState.EMPTY;
            return ConstraintResolution.RESOLVED;
        }
    }

    getHypotheses() {
        if (this.knownEdges.length === 4) {
            let possibleCorners = this.edges.filter(e => e.isFilled()).map(e => e.getOpposedEdge(this)).filter(e => !e.isSolved());
            if (possibleCorners.length === 2) {
                return possibleCorners.map(e => [() => e.setEmpty()]);
            }
            return [];
        } else {
            return [this.verticalEdges, this.horizontalEdges];
        }
    }

    isSpecial() {
        return true;
    }
}
class BlackVertex extends SimpleVertex {
    constructor(x, y) {
        super(x, y);
    }

    tryResolve() {
        this.unknownEdges.forEach(e => {
            const extendingEdge = e.getOpposedEdge(this);
            // find directions in which second edge is already empty
            if (extendingEdge.state === EdgeState.EMPTY) {
                e.state = EdgeState.EMPTY;
            }
            // check if opposite edge does not already have a perpendicular edge filled
            if (e.getOpposedVertex(this).getPerpendicularEdges(e).some(e2 => e2.state === EdgeState.FILLED)) {
                e.state = EdgeState.EMPTY;
            }
        });
        for (const e of this.knownEdges) {
            const opposedEdge = this.getOpposedEdge(e);
            if (opposedEdge.setFilled(!e.isFilled()).isViolated()) {
                return ConstraintResolution.VIOLATED;
            }
            const edgeToExtend = e.isFilled() ? e : opposedEdge;
            const edgeExtension = edgeToExtend.getOpposedEdge(this);
            if (edgeExtension.setFilled(true).isViolated()) {
                return ConstraintResolution.VIOLATED;
            }
        }
        return this.unknownEdges.length === 0 ? ConstraintResolution.RESOLVED : ConstraintResolution.UNCHANGED;
    }

    getHypotheses() {
        if (!this.topEdge.isSolved()) {
            if (this.leftEdge.isSolved()) {
                return this.verticalEdges.map(e => [e]);
            } else {
                return this.verticalEdges.reduce((acc, ve) => acc.concat(this.horizontalEdges.map(he => [ve, he])), []);
            }
        }
        return this.horizontalEdges.map(e => [e]);
    }

    isSpecial() {
        return true;
    }
}

class AdjacentWhiteVerticesPair extends Constraint {
    constructor(edge) {
        super();
        this.edge = edge;
    }

    tryResolve() {
        const edge = this.edge;
        if (edge.isSolved()) {
            return ConstraintResolution.RESOLVED;
        }
        if (!this.edgesToWatch) {
            const edge1 = edge.vertex1.getOpposedEdge(edge);
            const edge2 = edge.vertex2.getOpposedEdge(edge);
            this.watchedVertex1 = edge1.getOpposedVertex(edge.vertex1);
            this.watchedVertex2 = edge2.getOpposedVertex(edge.vertex2);
            this.edgesToWatch = [
                this.watchedVertex1.getOpposedEdge(edge1),
                this.watchedVertex2.getOpposedEdge(edge2),
            ];
        }
        if (this.watchedVertex1.line && this.watchedVertex1.line === this.watchedVertex2.line
            || this.edgesToWatch.some(e => e.state === EdgeState.FILLED)) {
            // straight through is impossible
            edge.state = EdgeState.EMPTY;
            return ConstraintResolution.RESOLVED;
        }
        if (this.edgesToWatch.every(e => e.state === EdgeState.EMPTY)) {
            // our corners are ensured even with straight through
            return ConstraintResolution.RESOLVED;
        }
        return ConstraintResolution.UNCHANGED;
    }
}

const EdgeState = {
    UNKNOWN: {value: 0, inverse: () => EdgeState.UNKNOWN},
    EMPTY: {value: 1, inverse: () => EdgeState.FILLED},
    FILLED: {value: 2, inverse: () => EdgeState.EMPTY}
};

let resolvedEdges = 0;

class SolverEdge extends Constraint {
    constructor(puzzEdge) {
        super();
        this._state = EdgeState.UNKNOWN;
        this.puzzEdge = puzzEdge;
    }

    isSolved() {
        return this.state !== EdgeState.UNKNOWN;
    }

    isFilled() {
        return this.state === EdgeState.FILLED;
    }

    /**
     * Tries to set this edge's state. State is not changed if a violation would occur.
     * @param filled whether the state should be filled or empty
     * @return ConstraintResolution.RESOLVED if the state could be set,
     *         ConstraintResolution.VIOLATED if a violation occurred and the state could not be set
     */
    setFilled(filled) {
        if (typeof(filled) !== "boolean") {
            filled = true;
        }
        if (this.isSolved()) {
            return this.isFilled() !== filled ? ConstraintResolution.VIOLATED : ConstraintResolution.RESOLVED;
        }
        if (this.cell1.isSolved() && this.cell2.isSolved()) {
            if ((this.cell1.state === this.cell2.state) === filled) {
                return ConstraintResolution.VIOLATED;
            }
        }
        if (filled && this.vertex1.hasSameLineAs(this.vertex2) && !this.vertex1.line.isAlmostSolution()) {
            return ConstraintResolution.VIOLATED;
        }
        this.state = filled ? EdgeState.FILLED : EdgeState.EMPTY;
        return ConstraintResolution.RESOLVED;
    }

    isEmpty() {
        return this.state === EdgeState.EMPTY;
    }

    setEmpty() {
        return this.setFilled(false);
    }

    tryResolve() {
        if (this.isSolved()) {
            return ConstraintResolution.RESOLVED;
        }
        if (this.cell1.isSolved() && this.cell2.isSolved()) {
            return this.setFilled(this.cell1.state !== this.cell2.state)
        }
        if (this.vertex1.line && this.vertex1.line === this.vertex2.line && !this.vertex1.line.containsAllSpecials()) {
            this.state = EdgeState.EMPTY;
            return ConstraintResolution.RESOLVED;
        }
        return ConstraintResolution.UNCHANGED;
    }

    get state() {
        return this._state;
    }

    set state(state) {
        if (this.isSolved() && state !== this._state) {
            throw `IllegalState: ${this} is already solved`;
        }
        switch (state) {
            case EdgeState.EMPTY:
            case EdgeState.FILLED:
                break;
            default:
                throw 'IllegalArgument: ' + state;
        }
        if (this._state !== state) {
            resolvedEdges++;
            this._state = state;
            this.syncWithCanvas();
            if (state === EdgeState.FILLED) {
                Line.recordFilledEdge(this);
            }
        }
    }

    syncWithCanvas() {
        if (this.puzzEdge) {
            const edgeState = this.state.value;
            recordAnimationStep(() => {this.puzzEdge.s = edgeState});
        }
    }

    get vertices() {
        return [this.vertex1, this.vertex2];
    }

    get cells() {
        return [this.cell1, this.cell2];
    }

    contains(vertex) {
        return this.vertices.some(v => v === vertex);
    }

    getOpposedVertex(vertex) {
        return vertex === this.vertex1 ? this.vertex2 : this.vertex1;
    }

    getOpposedEdge(vertex) {
        return this.getOpposedVertex(vertex).getOpposedEdge(this);
    }

    getOpposedCell(cell) {
        return cell === this.cell1 ? this.cell2 : this.cell1;
    }

    backup() {
        this._stateBackup = this._state;
        this._lineBackup = this.line;
    }

    restore() {
        this.line = this._lineBackup;
        if (this._state !== this._stateBackup) {
            this._state = this._stateBackup;
            this.syncWithCanvas();
        }
    }

    toString() {
        return 'E[' + this.vertex1 + '->' + this.vertex2 + ']';
    }
}

class VerticalSolverEdge extends SolverEdge {
    constructor(top, bottom, puzzEdge) {
        super(puzzEdge);
        this.top = top;
        this.bottom = bottom;
        // adjacent cells are set later
        this.left = null;
        this.right = null;
    }

    get cell1() {
        return this.left;
    }

    get cell2() {
        return this.right;
    }

    get vertex1() {
        return this.top;
    }

    get vertex2() {
        return this.bottom;
    }
}

class HorizontalSolverEdge extends SolverEdge {
    constructor(left, right, puzzEdge) {
        super(puzzEdge);
        this.left = left;
        this.right = right;
        // adjacent cells are set later
        this.top = null;
        this.bottom = null;
    }

    get cell1() {
        return this.top;
    }

    get cell2() {
        return this.bottom;
    }

    get vertex1() {
        return this.left;
    }

    get vertex2() {
        return this.right;
    }
}

const CellState = {
    UNKNOWN: {value: 0, color: '', inverse: () => this},
    INNIE: {value: 1, color: '#AFF', inverse: () => CellState.OUTIE},
    OUTIE: {value: 2, color: '#FFA', inverse: () => CellState.INNIE}
};

class SolverCell extends Constraint {
    constructor(top, left, right, bottom, puzzCell) {
        super();
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this._state = CellState.UNKNOWN;
        this.puzzCell = puzzCell;
    }

    isSolved() {
        return this.solved;
    }

    get solved() {
        return this._state !== CellState.UNKNOWN;
    }

    get innie() {
        return this._state === CellState.INNIE;
    }

    get outie() {
        return this._state === CellState.OUTIE;
    }

    tryResolve() {
        if (this.isSolved()) {
            return ConstraintResolution.RESOLVED;
        }
        const edge = this.edges.find(e => e.isSolved() && e.getOpposedCell(this).isSolved());
        if (edge) {
            const opposedCell = edge.getOpposedCell(this);
            this.state = edge.isFilled() ? opposedCell.state.inverse() : opposedCell.state;
            return ConstraintResolution.RESOLVED;
        }
        return ConstraintResolution.UNCHANGED;
    }

    get edges() {
        return [this.top, this.left, this.right, this.bottom];
    }

    get state() {
        return this._state;
    }

    backup() {
        this._stateBackup = this._state;
    }

    restore() {
        this.state = this._stateBackup;
    }

    set state(state) {
        if (this._state !== state) {
            this._state = state;
            if (this.puzzCell) {
                const cellColor = state.color;
                recordAnimationStep(() => { this.puzzCell.fill = cellColor });
            }
        }
    }
}

let lines = [];

class Line {
    constructor(edge) {
        this.edges = [edge];
        this.setLineOn(edge);
        this.specialVertices = edge.vertices.filter(v => v.isSpecial()).length;
        this.start = edge.vertex1;
        this.end = edge.vertex2;
    }

    addEdge(edge) {
        //console.log(`Extending ${this} with ${edge}`);
        this.edges.push(edge);
        this.setLineOn(edge);
        let newVertex;
        if (edge.contains(this.start)) {
            newVertex = this.start = edge.getOpposedVertex(this.start);
            //console.log(`New start: ${this.start}`);
        } else {
            newVertex = this.end = edge.getOpposedVertex(this.end);
            //console.log(`New end: ${this.end}`);
        }
        console.assert(this.start !== this.end || this.isSolution(), "Cannot close incomplete loop");
        if (newVertex.isSpecial() && this.start !== this.end) {
            this.specialVertices++;
            this.checkSpecialVertices();
        }
    }

    setLineOn(edge) {
        edge.line = this;
        edge.vertices.forEach(v => { v.line = this;});
    }

    /**
     * Merges with the given other line using the given connecting edge.
     */
    mergeWith(otherLine, edge) {
        //console.log(`Merging ${this} with ${otherLine} using ${edge}`);
        this.edges.push(edge);
        this.setLineOn(edge);
        this.edges.push(...otherLine.edges);
        this.specialVertices += otherLine.specialVertices;
        this.checkSpecialVertices();
        otherLine.edges.forEach(e => this.setLineOn(e));
        const newLastVertex = edge.contains(otherLine.start) ? otherLine.end : otherLine.start;
        if (edge.contains(this.start)) {
            this.start = newLastVertex;
            //console.log(`New start: ${this.start}`)
        } else {
            this.end = newLastVertex;
            //console.log(`New end: ${this.end}`)
        }
    }

    containsAllSpecials() {
        return this.specialVertices === puzzleSpecialVertices;
    }

    checkSpecialVertices() {
        if (this.specialVertices > puzzleSpecialVertices) {
            throw 'IllegalState, too many specials: ' + this.specialVertices;
        }
    }

    /**
     * @return true if this line contains all special vertices
     */
    isAlmostSolution() {
        return this.specialVertices === puzzleSpecialVertices;
    }

    /**
     * @return true if this line contains all special vertices except one
     */
    missesOneSpecial() {
        return this.specialVertices === puzzleSpecialVertices - 1;
    }

    isSolution() {
        return this.specialVertices === puzzleSpecialVertices && this.start === this.end;
    }

    backup() {
        this._edgesBackup = this.edges.slice(0);
        this._specialVerticesBackup = this.specialVertices;
        this._startBackup = this.start;
        this._endBackup = this.end;
    }

    restore() {
        this.edges = this._edgesBackup;
        this.specialVertices = this._specialVerticesBackup;
        this.start = this._startBackup;
        this.end = this._endBackup;
    }

    toString() {
        return `L[${this.start}->${this.end}]`;
    }

    static recordFilledEdge(edge) {
        const verticesLines = edge.vertices.map(v => v.line).filter(v => v);
        let line = null;
        switch (verticesLines.length) {
            case 0:
                line = new Line(edge);
                lines.push(line);
                break;
            case 1:
                line = verticesLines[0];
                line.addEdge(edge);
                break;
            case 2:
                line = verticesLines[0];
                const otherLine = verticesLines[1];
                if (line === otherLine) {
                    // closing the loop, we got the solution!
                    line.addEdge(edge);
                } else {
                    line.mergeWith(otherLine, edge);
                    lines = lines.filter(l => l !== otherLine);
                }
                break;
        }
    }

    static isPuzzleSolved() {
        return lines.length === 1 && lines[0].isSolution();
    }

    static backup() {
        Line._linesBackup = lines.slice(0);
        lines.forEach(l => l.backup());
    }

    static restore() {
        lines = Line._linesBackup;
        lines.forEach(l => l.restore());
    }
}

var puzzleSpecialVertices = 0;

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