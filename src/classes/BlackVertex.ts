import {SimpleVertex} from "./SimpleVertex";
import {EdgeState} from "../globals";
import {ConstraintResolution} from "./ConstraintResolution";

export class BlackVertex extends SimpleVertex {
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
