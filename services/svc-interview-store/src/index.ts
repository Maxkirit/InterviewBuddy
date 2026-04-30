import logPoint  from "./practice_script.js";
import type { pointInterface } from "./practice_script.js";
import { prisma, Prisma } from "./lib/prisma.js";

const point2: pointInterface = {
    x: 875,
    y: 323
}

logPoint(point2);

let arr = [];