import {SolverEdge} from "./SolverEdge";

export class HorizontalSolverEdge extends SolverEdge {
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
