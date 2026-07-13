// JavaScript mavzulari uchun mini-darslar (ikki tilli).
// Kalit — PROG_LANGS.javascript.topics kalitlari bilan bir xil.
// body ichida ```js ... ``` bloklari renderText orqali kod sifatida ko'rsatiladi.
export default {
  intro: {
    title: { uz: "Kirish — JavaScript nima?", en: "Introduction — What is JavaScript?" },
    body: {
      uz: `JavaScript — brauzerda va serverda (Node.js) ishlaydigan dasturlash tili. U ECMAScript standartiga asoslanadi (ECMA International nashr etadi).

Kod yuqoridan pastga, ketma-ket bajariladi. Har buyruqni nuqta-vergul (;) bilan tugatish mumkin.

\`\`\`js
console.log("Salom!");       // konsolga chiqaradi
let ism = "Ali";
console.log("Assalomu alaykum, " + ism);
\`\`\`

💡 Yodda tut: JavaScript ≠ Java. Ular butunlay boshqa tillar.`,
      en: `JavaScript is a programming language that runs in the browser and on the server (Node.js). It is based on the ECMAScript standard (published by ECMA International).

Code runs top to bottom, statement by statement. Each statement can end with a semicolon (;).

\`\`\`js
console.log("Hello!");       // prints to the console
let name = "Ali";
console.log("Hi, " + name);
\`\`\`

💡 Remember: JavaScript ≠ Java. They are completely different languages.`,
    },
  },
  variables: {
    title: { uz: "O'zgaruvchilar va tiplar", en: "Variables & types" },
    body: {
      uz: `O'zgaruvchi — qiymat saqlanadigan nomli "quti". Uch xil e'lon: let (o'zgaradi), const (o'zgarmas), var (eski — ishlatmang).

Tiplar: primitive (string, number, boolean, null, undefined, bigint, symbol) va object (massiv, obyekt, funksiya).

\`\`\`js
let yosh = 25;      // number
const pi = 3.14;    // o'zgarmas
let ism = "Ali";    // string
console.log(typeof yosh); // "number"
\`\`\`

💡 Yodda tut: const qiymatini qayta bermaysiz, lekin obyekt/massiv ichini o'zgartirsa bo'ladi.`,
      en: `A variable is a named "box" that stores a value. Three declarations: let (reassignable), const (constant), var (legacy — avoid).

Types: primitive (string, number, boolean, null, undefined, bigint, symbol) and object (array, object, function).

\`\`\`js
let age = 25;       // number
const pi = 3.14;    // constant
let name = "Ali";   // string
console.log(typeof age); // "number"
\`\`\`

💡 Remember: you can't reassign a const, but you can still mutate the inside of an object/array.`,
    },
  },
  operators: {
    title: { uz: "Operatorlar", en: "Operators" },
    body: {
      uz: `Amallar: + - * / % (qoldiq) ** (daraja). Taqqoslash: === (qat'iy — tip ham tekshiriladi) va == (tipni o'zgartiradi).

Mantiqiy: && (va), || (yoki), ! (inkor). Ternary: shart ? a : b.

\`\`\`js
console.log(5 === "5"); // false (tip farqli)
console.log(5 == "5");  // true (tip o'zgardi)
let katta = 10 > 3 ? "ha" : "yo'q";
\`\`\`

💡 Yodda tut: doim === ishlating, == emas — u kutilmagan natija beradi.`,
      en: `Arithmetic: + - * / % (remainder) ** (power). Comparison: === (strict — checks type too) and == (coerces the type).

Logical: && (and), || (or), ! (not). Ternary: condition ? a : b.

\`\`\`js
console.log(5 === "5"); // false (different types)
console.log(5 == "5");  // true (type coerced)
let big = 10 > 3 ? "yes" : "no";
\`\`\`

💡 Remember: always use ===, not == — the latter gives surprising results.`,
    },
  },
  "control-flow": {
    title: { uz: "Boshqaruv — if / loops", en: "Control flow — if / loops" },
    body: {
      uz: `Shartlar: if / else if / else. Ko'p tarmoq uchun switch.

Sikllar: for (ma'lum marta), while (shart bajarilguncha). break — sikldan chiqadi, continue — keyingi qadamga o'tadi.

\`\`\`js
for (let i = 0; i < 3; i++) {
  if (i === 1) continue; // 1 ni o'tkazadi
  console.log(i);        // 0, 2
}
\`\`\`

💡 Yodda tut: cheksiz siklga ehtiyot bo'l — shart oxir-oqibat false bo'lishini ta'minla.`,
      en: `Conditions: if / else if / else. For many branches, use switch.

Loops: for (a known number of times), while (until a condition is false). break exits the loop, continue skips to the next iteration.

\`\`\`js
for (let i = 0; i < 3; i++) {
  if (i === 1) continue; // skips 1
  console.log(i);        // 0, 2
}
\`\`\`

💡 Remember: watch out for infinite loops — make sure the condition eventually becomes false.`,
    },
  },
  collections: {
    title: { uz: "Massiv va obyektlar", en: "Arrays & objects" },
    body: {
      uz: `Massiv — tartiblangan ro'yxat: [1, 2, 3]. Foydali metodlar: push, pop, map, filter, length.

Obyekt — kalit-qiymat juftliklari: { ism: "Ali", yosh: 25 }. Murojaat: obj.ism yoki obj["ism"].

\`\`\`js
const a = [1, 2, 3];
const juft = a.filter(x => x % 2 === 0); // [2]
const kishi = { ism: "Ali" };
console.log(kishi.ism); // "Ali"
\`\`\`

💡 Yodda tut: massiv indeksi 0 dan boshlanadi (birinchi element — a[0]).`,
      en: `An array is an ordered list: [1, 2, 3]. Handy methods: push, pop, map, filter, length.

An object is key–value pairs: { name: "Ali", age: 25 }. Access: obj.name or obj["name"].

\`\`\`js
const a = [1, 2, 3];
const evens = a.filter(x => x % 2 === 0); // [2]
const person = { name: "Ali" };
console.log(person.name); // "Ali"
\`\`\`

💡 Remember: array indexes start at 0 (the first element is a[0]).`,
    },
  },
  functions: {
    title: { uz: "Funksiyalar", en: "Functions" },
    body: {
      uz: `Funksiya — qayta ishlatiladigan kod bloki. E'lon: function nom() {} yoki strelkali: const nom = () => {}.

Parametr — kirish, return — natija. Standart qiymat: (a = 0).

\`\`\`js
function qoshish(a, b = 0) {
  return a + b;
}
const kvadrat = x => x * x;
console.log(qoshish(2, 3)); // 5
\`\`\`

💡 Yodda tut: return bo'lmasa funksiya undefined qaytaradi.`,
      en: `A function is a reusable block of code. Declaration: function name() {} or arrow: const name = () => {}.

A parameter is the input, return is the result. Default value: (a = 0).

\`\`\`js
function add(a, b = 0) {
  return a + b;
}
const square = x => x * x;
console.log(add(2, 3)); // 5
\`\`\`

💡 Remember: without a return, a function returns undefined.`,
    },
  },
  errors: {
    title: { uz: "Xatoliklar — try/catch", en: "Errors — try/catch" },
    body: {
      uz: `Xatoni ushlash: try { ... } catch (e) { ... }. finally bloki har doim bajariladi. Xato tashlash: throw new Error("...").

Keng tarqalgan turlar: TypeError, ReferenceError, SyntaxError.

\`\`\`js
try {
  null.foo;             // TypeError
} catch (e) {
  console.log(e.name);  // "TypeError"
} finally {
  console.log("tugadi");
}
\`\`\`

💡 Yodda tut: catch bloki dasturni qulashdan saqlaydi.`,
      en: `Catch an error: try { ... } catch (e) { ... }. The finally block always runs. Throw an error: throw new Error("...").

Common types: TypeError, ReferenceError, SyntaxError.

\`\`\`js
try {
  null.foo;             // TypeError
} catch (e) {
  console.log(e.name);  // "TypeError"
} finally {
  console.log("done");
}
\`\`\`

💡 Remember: a catch block keeps your program from crashing.`,
    },
  },
  oop: {
    title: { uz: "Obyektlar va OOP (this, class)", en: "Objects & OOP (this, class)" },
    body: {
      uz: `class — obyektlar shabloni. constructor — yaratilishda ishlaydi. this — joriy obyektga ishora. extends — meros olish.

\`\`\`js
class Hayvon {
  constructor(nom) { this.nom = nom; }
  ovoz() { return this.nom + " ovoz chiqardi"; }
}
class It extends Hayvon {
  ovoz() { return "Vov!"; }
}
console.log(new It("Rex").ovoz());
\`\`\`

💡 Yodda tut: strelkali funksiya o'z this'iga ega emas — tashqi this'ni oladi.`,
      en: `class is a template for objects. constructor runs on creation. this refers to the current object. extends means inheritance.

\`\`\`js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return this.name + " made a sound"; }
}
class Dog extends Animal {
  speak() { return "Woof!"; }
}
console.log(new Dog("Rex").speak());
\`\`\`

💡 Remember: an arrow function has no this of its own — it takes this from the surrounding scope.`,
    },
  },
  async: {
    title: { uz: "Asinxron (Promise, async/await)", en: "Asynchronous (Promise, async/await)" },
    body: {
      uz: `Asinxron kod natijani keyinroq beradi (masalan tarmoq so'rovi). Promise — kelajakdagi qiymat. async/await uni oson o'qiladigan qiladi.

Mikro-vazifalar (Promise.then) makro-vazifalardan (setTimeout) oldin bajariladi.

\`\`\`js
async function ol() {
  const javob = await fetch("/api");
  return javob;
}
Promise.resolve().then(() => console.log("mikro"));
\`\`\`

💡 Yodda tut: await faqat async funksiya ichida ishlaydi.`,
      en: `Asynchronous code delivers its result later (e.g. a network request). A Promise is a future value. async/await makes it easy to read.

Microtasks (Promise.then) run before macrotasks (setTimeout).

\`\`\`js
async function get() {
  const res = await fetch("/api");
  return res;
}
Promise.resolve().then(() => console.log("micro"));
\`\`\`

💡 Remember: await only works inside an async function.`,
    },
  },
  advanced: {
    title: { uz: "Ilg'or (closure, ES6+, generator)", en: "Advanced (closures, ES6+, generators)" },
    body: {
      uz: `Closure — funksiya tashqi o'zgaruvchilarni "eslab qoladi". Spread (...) yoyadi, rest (...) yig'adi. Destrukturizatsiya qiymatlarni ajratadi.

\`\`\`js
function hisoblagich() {
  let n = 0;
  return () => ++n;        // n ni eslaydi (closure)
}
const [a, b] = [1, 2];     // destrukturizatsiya
const yangi = [...[1, 2], 3]; // [1, 2, 3]
\`\`\`

💡 Yodda tut: closure — JSning eng kuchli (va suhbatlarda tez-tez so'raladigan) tushunchasi.`,
      en: `A closure lets a function "remember" outer variables. Spread (...) expands, rest (...) collects. Destructuring pulls values apart.

\`\`\`js
function counter() {
  let n = 0;
  return () => ++n;         // remembers n (closure)
}
const [a, b] = [1, 2];      // destructuring
const merged = [...[1, 2], 3]; // [1, 2, 3]
\`\`\`

💡 Remember: closures are JS's most powerful (and most-asked-in-interviews) concept.`,
    },
  },
};
