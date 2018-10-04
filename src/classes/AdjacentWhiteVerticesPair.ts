import {Constraint} from "./Constraint";
import {ConstraintResolution} from "./ConstraintResolution";
import {EdgeState} from "../globals";

export class AdjacentWhiteVerticesPair extends Constraint {
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
