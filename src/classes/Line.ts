import {lines, puzzleSpecialVertices} from "../globals";

export class Line {
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
