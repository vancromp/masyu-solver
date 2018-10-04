import {Constraint} from "./Constraint";
import {ConstraintResolution} from "./ConstraintResolution";
import {resolvedEdges, recordAnimationStep, EdgeState} from "../globals";
import {Line} from "./Line";


export class SolverEdge extends Constraint {
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
