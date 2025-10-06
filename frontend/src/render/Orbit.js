// Class to handle elliptic orbit calculations
export class Orbit {
    // Constructor initializes orbital parameters
    constructor({
                    semiMajorAxis = 1,
                    eccentricity = 1 / Math.sqrt(2),
                    inclination = 0,
                    omega = 0,
                    raan = 0,
                    period = 120,
                    tau = 0,
                    numPoints = 250
                }) {
        this.a = semiMajorAxis; // semi-major axis
        this.e = eccentricity; // eccentricity
        this.b = this.a * Math.sqrt(1 - this.e ** 2); // semi-minor axis
        this.c = this.e * this.a; // distance from center to focus
        this.center = [-this.c, 0, 0]; // center at [-a*e, 0, 0], focus at origin
        this.inclination = inclination; // pitch ~ inclination (y-axis rotation)
        this.omega = omega; // yaw ~ longitude of ascending node (z-axis rotation)
        this.raan = raan; // roll ~ RAAN (x-axis rotation)
        this.T = period; // orbital period in seconds
        this.tau = tau; // time of pericenter passage
        this.numPoints = numPoints; // number of points for orbit curve
        this.u = this.generateU(); // parametric angles for orbit
        this.orbitPoints = this.generateEllipsePoints(); // base ellipse points
        this.rotatedOrbits = this.applyRotations(); // rotated orbit points
        //console.log("Orbit initialized with parameters:", this);
    }

    // Generate sequence like seq(-pi, pi, length.out=numPoints)
    generateU() {
        const u = [];
        const step = (2 * Math.PI) / (this.numPoints - 1);
        for (let i = 0; i < this.numPoints; i++) {
            u.push(-Math.PI + i * step);
        }
        return u;
    }

    // Generate ellipse points in the orbital plane
    generateEllipsePoints() {
        const points = [];
        for (let i = 0; i < this.u.length; i++) {
            const cos_u = Math.cos(this.u[i]);
            const sin_u = Math.sin(this.u[i]);
            const x = this.a * (cos_u - this.e); // corrected: -a*e
            const y = this.b * sin_u;
            const z = 0;
            points.push([x, y, z]);
        }
        return points;
    }

    // 3D rotation of a point [x,y,z] around axis [ux,uy,uz] by angle theta (radians)
    rotate3D(point, theta, ux, uy, uz) {
        const len = Math.sqrt(ux ** 2 + uy ** 2 + uz ** 2);
        ux /= len;
        uy /= len;
        uz /= len;

        const cos_theta = Math.cos(theta);
        const sin_theta = Math.sin(theta);
        const one_minus_cos = 1 - cos_theta;

        const m11 = cos_theta + ux * ux * one_minus_cos;
        const m12 = ux * uy * one_minus_cos - uz * sin_theta;
        const m13 = ux * uz * one_minus_cos + uy * sin_theta;
        const m21 = uy * ux * one_minus_cos + uz * sin_theta;
        const m22 = cos_theta + uy * uy * one_minus_cos;
        const m23 = uy * uz * one_minus_cos - ux * sin_theta;
        const m31 = uz * ux * one_minus_cos - uy * sin_theta;
        const m32 = uz * uy * one_minus_cos + ux * sin_theta;
        const m33 = cos_theta + uz * uz * one_minus_cos;

        const x = point[0];
        const y = point[1];
        const z = point[2];
        const new_x = m11 * x + m12 * y + m13 * z;
        const new_y = m21 * x + m22 * y + m23 * z;
        const new_z = m31 * x + m32 * y + m33 * z;

        return [new_x, new_y, new_z];
    }

    // Apply sequential rotations to orbit points and center
    applyRotations() {
        let rotatedPointsInc = [];
        let rotatedPointsOm = [];
        let rotatedPointsRaan = [];

        let centerInc = this.rotate3D(this.center, this.inclination, 0, 1, 0);
        for (let p of this.orbitPoints) {
            rotatedPointsInc.push(this.rotate3D(p, this.inclination, 0, 1, 0));
        }

        let centerOm = this.rotate3D(centerInc, this.omega, 0, 0, 1);
        for (let i = 0; i < this.orbitPoints.length; i++) {
            rotatedPointsOm.push(this.rotate3D(rotatedPointsInc[i], this.omega, 0, 0, 1));
        }

        let centerRaan = this.rotate3D(centerOm, this.raan, 1, 0, 0);
        for (let i = 0; i < this.orbitPoints.length; i++) {
            rotatedPointsRaan.push(this.rotate3D(rotatedPointsOm[i], this.raan, 1, 0, 0));
        }

        return {
            inc: rotatedPointsInc,
            om: rotatedPointsOm,
            raan: rotatedPointsRaan,
            center: centerRaan
        };
    }

    // Kepler starter function for initial guess
    keplerStart3(M) {
        const t34 = this.e ** 2;
        const t35 = this.e * t34;
        const t33 = Math.cos(M);
        return M + (-0.5 * t35 + this.e + (t34 + 1.5 * t33 * t35) * t33) * Math.sin(M);
    }

    // Epsilon functions for Newton-Raphson
    eps1(M, x) {
        return (x - this.e * Math.sin(x) - M) / (1 - this.e * Math.cos(x));
    }

    eps2(M, x) {
        const t1 = -1 + this.e * Math.cos(x);
        const t2 = this.e * Math.sin(x);
        const t3 = -x + t2 + M;
        return t3 / (0.5 * t3 * t2 / t1 + t1);
    }

    eps3(M, x) {
        const t1 = Math.cos(x);
        const t2 = -1 + this.e * t1;
        const t3 = Math.sin(x);
        const t4 = this.e * t3;
        const t5 = -x + t4 + M;
        const t6 = t5 / (0.5 * t5 * t4 / t2 + t2);
        return t5 / ((0.5 * t3 - (1/6) * t1 * t6) * this.e * t6 + t2);
    }

    // Solve Kepler's equation for eccentric anomaly E
    keplerSolve(M) {
        const tol = 1e-14;
        let Mnorm = M % (2 * Math.PI);
        let E0 = this.keplerStart3(Mnorm);
        let dE = tol + 1;
        let count = 0;
        let E = E0;

        while (dE > tol) {
            E = E0 - this.eps3(Mnorm, E0);
            dE = Math.abs(E - E0);
            E0 = E;
            count++;
            if (count === 100) {
                console.log("Astounding! KeplerSolve failed to converge!");
                break;
            }
        }
        return E;
    }

    // Propagate position at given clock time (walkInTime method)
    walkInTime(clock) {
        const n = 2 * Math.PI / this.T; // mean motion
        const M = n * (clock - this.tau); // mean anomaly
        const E = this.keplerSolve(M);
        const cos_E = Math.cos(E);
        const sin_E = Math.sin(E);
        const r = this.a * (1 - this.e * cos_E);

        // Position in orbital plane (focus at origin)
        let s_x = r * ((cos_E - this.e) / (1 - this.e * cos_E));
        let s_y = r * ((Math.sqrt(1 - this.e ** 2) * sin_E) / (1 - this.e * cos_E));
        let s_z = 0;

        // Apply rotations
        let point = [s_x, s_y, s_z];
        point = this.rotate3D(point, this.inclination, 0, 1, 0);
        point = this.rotate3D(point, this.omega, 0, 0, 1);
        point = this.rotate3D(point, this.raan, 1, 0, 0);

        return point;
    }

    // Get the full orbit points (after rotations)
    getOrbitPoints() {
        return this.rotatedOrbits.raan;
    }

    // Get the rotated center (focus position)
    getCenter() {
        return this.rotatedOrbits.center;
    }
}