import {Constraint} from './Constraint';
import {ConstraintResolution} from './ConstraintResolution';
import {EdgeState} from '../globals';

export class SimpleVertex extends Constraint {
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
