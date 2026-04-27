let msg = "Hello, world";
let msg2 = "Hello, world";
let user1 = {
    name: "john",
    id: 0,
}; //infered type
;
const user2 = {
    name: "Mark",
    id: 1,
}; //says user2 is of type User interface such that if it doesn't match interface, error
class UserAccount {
    name;
    id;
    constructor(name, id) {
        this.name = name;
        this.id = id;
    }
}
const user3 = new UserAccount("Jenny", 3);
let arr1 = ["hi", "apple", "", "soft"];
let arr2 = [3, user2, "test"];
let arr3 = ["test", user3, 4];
export default function logPoint(p) {
    console.log(`(${p.x}, ${p.y})`);
}
const point1 = { x: 4, y: 5 };
const point3d = { x: 4, y: 43, z: 455 };
logPoint(point1); //shape matching
logPoint(point3d); //shape matching only requires a subset of object
// const color = {hex: "fklsadjf"};
// logPoint(color); //doesn't work
//works with objects easily 
class VirtualPoint {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
const newVPoint = new VirtualPoint(13, 56);
logPoint(newVPoint); // logs "13, 56"
