export class Constraint {
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
