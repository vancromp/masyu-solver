import {SolverEdge} from "./SolverEdge";

export class VerticalSolverEdge extends SolverEdge {
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
