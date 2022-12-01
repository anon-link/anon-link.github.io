// let palettailor = new Palettailor(20)
// let palette_0 = palettailor.run; 
// let palette_1 = palettailor.run; 
// ...


/**
 * @classNumber color number
 * @weights default [1, 1, 1]
 * the output is a palette: ["#fadade", "#fadadd", ...]
 */
class Palettailor {
    constructor(classNumber, weights) {
        this.weights = weights || [1, 1, 1];
        this.classNumber = classNumber;
        this.criterion_cd = -1;
    }

    get run() {
        return this.calcPalette();
    }

    calcPalette() {
        let colors_scope = { "hue_scope": [0, 360], "lumi_scope": [55, 95] };
        let best_color = this.simulatedAnnealing2FindBestPalette(this.classNumber, (new_palette) => this.evaluatePalette(new_palette), colors_scope);

        return best_color.id;
    }


    /**
     * score the given palette
     */
    evaluatePalette(palette) {
        let class_distance = this.cd_weight;
        // calcualte color distance of given palette
        let class_discriminability = 0,
            name_difference = 0,
            color_discrimination_constraint = 100000;
        let dis;
        for (let i = 0; i < palette.length; i++) {
            // let hcl = rgb2hcl(palette[i])
            // if (i === 5 && hcl.l > 65 || i != 5 && hcl.l < 90) return -10000;
            for (let j = i + 1; j < palette.length; j++) {
                class_discriminability += d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
                let nd = getNameDifference(palette[i], palette[j]);
                name_difference += nd;
                color_discrimination_constraint = (color_discrimination_constraint > dis) ? dis : color_discrimination_constraint;
            }
            dis = d3_ciede2000(d3.lab(palette[i]), d3.lab(d3.rgb(bgcolor)));
            color_discrimination_constraint = (color_discrimination_constraint > dis) ? dis : color_discrimination_constraint;
        }
        if (this.criterion_cd < 0)
            this.criterion_cd = class_discriminability;
        class_discriminability /= this.criterion_cd;
        name_difference /= palette.length * (palette.length - 1) * 0.25;
        // console.log(class_discriminability, name_difference, color_discrimination_constraint);

        return (this.weights[0] * class_discriminability + this.weights[1] * name_difference + this.weights[2] * (color_discrimination_constraint * 0.1));
    }

    /**
     * using simulated annealing to find the best palette of given data
     * @param {*} palette_size 
     * @param {*} evaluateFunc 
     * @param {*} colors_scope: hue range, lightness range, saturation range
     * @param {*} flag 
     */
    simulatedAnnealing2FindBestPalette(palette_size, evaluateFunc, colors_scope = { "hue_scope": [0, 360], "lumi_scope": [25, 85] }, flag = true) {
        let iterate_times = 0;
        //default parameters
        let max_temper = 100000,
            dec = 0.995,
            max_iteration_times = 10000000,
            end_temper = 0.001;
        let cur_temper = max_temper;
        //generate a totally random palette
        let color_palette = this.getColorPaletteRandom(palette_size);
        this.criterion_cd = -1.0;
        //evaluate the default palette
        let o = {
            id: color_palette,
            score: evaluateFunc(color_palette)
        },
            preferredObj = o;

        while (cur_temper > end_temper) {
            for (let i = 0; i < 1; i++) { //disturb at each temperature
                iterate_times++;
                color_palette = o.id.slice();
                this.disturbColors(color_palette, colors_scope);
                let color_palette_2 = color_palette.slice();
                let o2 = {
                    id: color_palette_2,
                    score: evaluateFunc(color_palette_2)
                };

                let delta_score = o.score - o2.score;
                if (delta_score <= 0 || delta_score > 0 && Math.random() <= Math.exp((-delta_score) / cur_temper)) {
                    o = o2;
                    if (preferredObj.score - o.score < 0) {
                        preferredObj = o;
                    }
                }
                if (iterate_times > max_iteration_times) {
                    break;
                }
            }

            cur_temper *= dec;
        }

        return preferredObj;
    }

    getColorPaletteRandom(palette_size) {
        let palette = [];
        for (let i = 0; i < palette_size; i++) {
            let rgb = d3.rgb(getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255), getRandomIntInclusive(0, 255));
            palette.push(rgb);
        }
        return palette;
    }

    /**
     * only use color discrimination
     * @param {} palette 
     * @param {*} colors_scope 
     */
    disturbColors(palette, colors_scope) {
        if (Math.random() < 0.5) {
            this.randomDisturbColors(palette, colors_scope);
        } else {
            // randomly shuffle two colors of the palette 
            let idx_0 = getRandomIntInclusive(0, palette.length - 1),
                idx_1 = getRandomIntInclusive(0, palette.length - 1);
            while (idx_0 === idx_1) {
                idx_1 = getRandomIntInclusive(0, palette.length - 1);
            }
            let tmp = palette[idx_0];
            palette[idx_0] = palette[idx_1];
            palette[idx_1] = tmp;
        }
    }


    randomDisturbColors(palette, colors_scope) {
        let disturb_step = 50;
        // random disturb one color
        let idx = getRandomIntInclusive(0, palette.length - 1),
            rgb = d3.rgb(palette[idx]),
            color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step))),
            hcl = rgb2hcl(color);
        color = hcl2rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
        // test
        // if (idx === 5) {
        //     color = hcl2rgb(d3.lab(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, [55, 65]))));
        // } else {
        //     color = hcl2rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, [90, 100])));
        // }

        palette[idx] = d3.rgb(norm255(color.r), norm255(color.g), norm255(color.b));
        let count = 0,
            sign;
        while (true) {
            while ((sign = this.isDiscriminative(palette)) > 0) {
                count += 1;
                if (count === 100) break;
                rgb = d3.rgb(palette[sign])
                color = d3.rgb(norm255(rgb.r + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.g + getRandomIntInclusive(-disturb_step, disturb_step)), norm255(rgb.b + getRandomIntInclusive(-disturb_step, disturb_step)))
                hcl = d3.hcl(color);
                if (hcl.h >= 85 && hcl.h <= 114 && hcl.l >= 35 && hcl.l <= 75) {
                    if (Math.abs(hcl.h - 85) > Math.abs(hcl.h - 114)) {
                        hcl.h = 115;
                    } else {
                        hcl.h = 84;
                    }
                }
                palette[sign] = hcl2rgb(d3.hcl(normScope(hcl.h, colors_scope.hue_scope), normScope(hcl.c, [0, 100]), normScope(hcl.l, colors_scope.lumi_scope)));
            }
            if (count >= 100 || sign === -1) break;
        }
    }

    isDiscriminative(palette) {
        let idx = -1;
        for (let i = 0; i < palette.length; i++) {
            for (let j = i + 1; j < palette.length; j++) {
                let color_dis = d3_ciede2000(d3.lab(palette[i]), d3.lab(palette[j]));
                if (color_dis < 10) {
                    return j;
                }
            }
        }
        return idx;
    }

}

function inverseFunc(x) {
    x = x == 0 ? 1 : x;
    return 1 / x;
}

function normScope(v, vscope) {
    let normV = Math.max(vscope[0], v);
    normV = Math.min(normV, vscope[1]);
    return normV;
}

function norm255(v) {
    let normV = Math.max(0, v);
    normV = Math.min(normV, 255);
    return normV;
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}

class TupleDictionary {
    constructor() {
        this.dict = new Map();
    }

    tupleToString(tuple) {
        return tuple.join(",");
    }

    put(tuple, val) {
        this.dict.set(this.tupleToString(tuple), val);
    }

    get(tuple) {
        return this.dict.get(this.tupleToString(tuple));
    }

    keys() {
        return this.dict.keys();
    }

    length() {
        return this.dict.size;
    }
}

function rgb2hcl(rgb) {
    return d3.hcl(d3.lab(rgb));
}

function hcl2rgb(hcl) {
    return d3.rgb(d3.lab(hcl));
}


// Name Model


c3 = { version: "1.0.0" }; // semver
function c3_init(json) {
    var i, C, W, T, A, ccount, tcount;

    // parse colors
    c3.color = [];
    for (i = 0; i < json.color.length; i += 3) {
        c3.color[i / 3] = d3.lab(json.color[i], json.color[i + 1], json.color[i + 2]);
    }
    C = c3.color.length;

    // parse terms
    c3.terms = json.terms;
    W = c3.terms.length;

    // parse count table
    c3.T = T = [];
    for (var i = 0; i < json.T.length; i += 2) {
        T[json.T[i]] = json.T[i + 1];
    }

    // construct counts
    c3.color.count = ccount = []; for (i = 0; i < C; ++i) ccount[i] = 0;
    c3.terms.count = tcount = []; for (i = 0; i < W; ++i) tcount[i] = 0;
    d3.keys(T).forEach(function (idx) {
        var c = Math.floor(idx / W),
            w = Math.floor(idx % W),
            v = T[idx] || 0;
        ccount[c] += v;
        tcount[w] += v;
    });

    // parse word association matrix
    c3.A = A = json.A;

    c3.color.cosine = function (a, b) {
        var sa = 0, sb = 0, sc = 0, ta, tb;
        for (var w = 0; w < W; ++w) {
            ta = (T[a * W + w] || 0);
            tb = (T[b * W + w] || 0);
            sa += ta * ta;
            sb += tb * tb;
            sc += ta * tb;
        }
        return sc / (Math.sqrt(sa * sb));
    }
}

c3_init(cd_data_json)
// color name lookup table
let color_name_map = {};
for (var c = 0; c < c3.color.length; ++c) {
    var x = c3.color[c];
    color_name_map[[x.L, x.a, x.b].join(",")] = c;
}
/**
 * reference to "Color Naming Models for Color Selection, Image Editing and Palette Design"
 */
function getColorNameIndex(c) {
    var x = d3.lab(c),
        L = 5 * Math.round(x.L / 5),
        a = 5 * Math.round(x.a / 5),
        b = 5 * Math.round(x.b / 5),
        s = [L, a, b].join(",");
    return color_name_map[s];
}

function getNameDifference(x1, x2) {
    let c1 = getColorNameIndex(x1),
        c2 = getColorNameIndex(x2);
    return 1 - c3.color.cosine(c1, c2);
}
