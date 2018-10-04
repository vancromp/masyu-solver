import {SimpleVertex} from "./SimpleVertex";
import {ConstraintResolution} from "./ConstraintResolution";
import {EdgeState} from "../globals";

export class WhiteVertex extends SimpleVertex {
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
