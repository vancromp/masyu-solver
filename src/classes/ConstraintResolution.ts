export class ConstraintResolution {
    constructor(name) {
        this.name = name;
    }

    static register(resolutions) {
        for (const name in resolutions) {
            ConstraintResolution[name] = new ConstraintResolution(name);
        }
    }

    isViolated() {
        return this === ConstraintResolution.VIOLATED;
    }

    isResolved() {
        return this === ConstraintResolution.RESOLVED;
    }
}

ConstraintResolution.register({
    UNCHANGED: 0,
    CHANGED: 1,
    RESOLVED: 2,
    VIOLATED: 3
});
