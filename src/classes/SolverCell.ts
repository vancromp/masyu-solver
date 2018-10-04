import {Constraint} from "./Constraint";
import {ConstraintResolution} from "./ConstraintResolution";
import {recordAnimationStep, CellState} from "../globals";

export class SolverCell extends Constraint {
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
