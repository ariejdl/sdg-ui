

/*
 * trying to reproduce
 * https://medium.com/ios-os-x-development/demystifying-uikit-spring-animations-2bb868446773
 * https://medium.com/@nathangitter/building-fluid-interfaces-ios-swift-9732bb934bf5
 * https://github.com/nathangitter/fluid-interfaces
 * http://nathangitter.com/projects/fluidinterfaces.html
 *
 * useful: https://gist.github.com/gordonbrander/2ca91ac14beeb804e867
 */

/*
 * can find inspiration from here:
 * - https://github.com/chenglou/react-motion
 * - https://www.react-spring.io/docs/hooks/examples
 *
 * - seems to be a good way to handle change of focus on one of array of things
 *    - e.g. photogallery
 *    - e.g. interruptible/chained transitions
 */

/*
 * possible to use an array to represent a vector, in order to have x,y,z,a,b,c animation properties? for one object?
 * 
 */

const _MASS = 1;
const _S_0 = 1;

const _DECEL_RATE = 0.998; // possibly Apple iOS' constant

class Spring {

    public stiffness: number;
    public damping: number;

    public lambda: number;
    public omega_0: number;
    public omega_d: number;

    constructor(damping: number, response: number) {
        this.stiffness = Math.pow(2 * Math.PI / response, 2);
        this.damping = 4 * Math.PI * damping / response;

        this.lambda = this.damping / (2 * _MASS);
        this.omega_0 = Math.sqrt(this.stiffness / _MASS);
        this.omega_d = Math.sqrt(Math.abs(Math.pow(this.omega_0, 2) - Math.pow(this.lambda, 2)));

        if (this.lambda >= this.omega_0) {
            throw "spring only computed when oscillates";
        }
    }
}

const getPosition = (spring: Spring, t: number, v_0: number = 0): number => {
    if (t < 0) {
        throw "invalid value of t/time";
    }
    const term_1 = Math.exp(-spring.lambda * t)
    const term_2 = _S_0 * Math.cos(spring.omega_d * t)
    const term_3 = (v_0 + _S_0 * spring.lambda) / spring.omega_d;
    const term_4 = Math.sin(spring.omega_d * t);
    return term_1 * (term_2 + term_3 * term_4);
}

const projectPosition = (v: number): number => {
    return (v / 1000) * _DECEL_RATE / (1 - _DECEL_RATE);
}

const relativeVelocity = (absVelocity: number, y_target: number, y_current: number): number => {
    if (y_target - y_current === 0)
        return 0;
    return absVelocity / (y_target - y_current);
}

// mouse speed
// https://github.com/Fil/d3-inertia/blob/master/src/index.js
