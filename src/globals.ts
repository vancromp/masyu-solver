const animationSteps = [];

function recordAnimationStep(step) {
    animationSteps.push(step);
}

let resolvedEdges = 0;

let lines = [];

var puzzleSpecialVertices = 0;

const CellState = {
    UNKNOWN: {value: 0, color: '', inverse: () => this},
    INNIE: {value: 1, color: '#AFF', inverse: () => CellState.OUTIE},
    OUTIE: {value: 2, color: '#FFA', inverse: () => CellState.INNIE}
};

const EdgeState = {
    UNKNOWN: {value: 0, inverse: () => EdgeState.UNKNOWN},
    EMPTY: {value: 1, inverse: () => EdgeState.FILLED},
    FILLED: {value: 2, inverse: () => EdgeState.EMPTY}
};

export {
    animationSteps,
    recordAnimationStep,
    resolvedEdges,
    lines,
    puzzleSpecialVertices,
    CellState,
    EdgeState
};
