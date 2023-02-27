# How to use babel-disposable: a Babel plugin for optimizing your code

_Credits: this article is written by Bing GPT_

Babel is a popular tool for transforming JavaScript code to make it compatible with different browsers and environments. It allows you to write modern JavaScript features like ES6+ syntax, JSX, TypeScript, and more, and compile them down to ES5 code that can run anywhere. Babel also has a rich ecosystem of plugins that can enhance your code in various ways.

One of these plugins is babel-disposable, which introduces a new concept of disposable values and functions. In this blog post, I will explain what disposable values and functions are, how they can help you optimize your code, and how to use them with babel-disposable.

## What are disposable values?

Disposable values are objects and arrays that you marked with a special comment `/*__DISPOSE__*/`. They are only declared temporarily and can be copied to everywhere, then get discarded after usage. For example:

```js
const obj = /*#__DISPOSE__*/ {
  foo: 1,
  bar: 2,
};

console.log(obj.foo + obj.bar); // 3
```

In this example, the object `obj` is marked as disposable. This means that babel-disposable will break up the object into its individual properties and replace each member expression (like `obj.foo` or `obj.bar`) with them. The result will look something like this:

```js
console.log(1 + 2); // 3
```

As you can see, the object `obj` has disappeared from the code entirely. This is because it was never used again after its creation. By marking it as disposable, we tell babel-disposable that we don't care about preserving its identity or reference.

### Difference to Constant Folding

Disposable values are similar to constant folding, but they are more aggressive and contagious.

Constant folding is an optimization technique that evaluates constant expressions at compile time and replaces them with their results. For example:

```js
const x = 2 + 3;
console.log(x); // 5
```

This code can be optimized by constant folding as follows:

```js
console.log(5); // 5
```

However, constant folding only works on primitive values like numbers or strings. It cannot optimize objects or arrays because they are not constant expressions.

Disposable values solve this problem by allowing us to mark any object or array as disposable and let babel-disposable handle the rest.

Beware that disposable values are also contagious because any value derived from a disposable value will also be disposable by default. For example:

```js
const obj = /*#__DISPOSE__*/ {
  foo: {
    bar: [1, 2],
    baz: "hello",
  },
};

const x = obj.foo; // x is also disposable
const y = x.bar[0]; // y is also disposable

console.log(y + x.baz.length); // 6
```

In this example, the object `obj` is marked as disposable. This means that any value obtained from it will also be disposable unless explicitly stated otherwise (more on that later). Therefore, `x` and `y` are also disposable values and will be optimized by babel-disposable accordingly.

## What are disposable functions?

Disposable functions are functions that you can mark with a special comment `/*__DISPOSE__*/` to indicate that they are only used once and can be inlined at their call site. For example:

```js
/*#__DISPOSE__*/
function add(a, b) {
  return a + "!!! " + b;
}

console.log(add("hello", 123));
```

In this example, the function `add` is marked as disposable. This means that babel-disposable will inline its body at its call site and eliminate the function declaration altogether. The result will look something like this:

```js
console.log(/*#__DISPOSED__FUNCTION__*/ "hello!!! 123");
```

As you can see, the function call to `add` has disappeared from the `console.log`.

Disposable functions behave like inline functions of C/C++, but they work on JavaScript / TypeScript code instead.

You can write some [Guard Statements](https://en.wikipedia.org/wiki/Guard_%28computer_science%29) in a disposable function, to leverage the optimizers. For example, in `AutoInputBox` there are lots of if-then-return statements:

```js
const responseSchema = /* #__DISPOSE__ */ {
  fields: {
    name: { type: "string", title: "the movie name" },
    age: { type: "number" },
    tel: { type: "string" },
    joined: { type: "boolean" },
  },
};

function main() {
  return h("div", {}, [
    AutoInputBox(responseSchema.fields.name),
    AutoInputBox(responseSchema.fields.age),
    AutoInputBox(responseSchema.fields.tel),
    AutoInputBox(responseSchema.fields.joined),
  ]);
}

/* #__DISPOSE__ */
function AutoInputBox(schema) {
  const { type } = schema;
  if (type === "string") return h("text-input");
  if (type === "number") return h("number-input");
  if (type === "boolean") return h("checkbox");
}
```

The output will be very concise and clean:

```js
function main() {
  return h("div", {}, [
    /*#__DISPOSED__FUNCTION__*/ h("text-input"),
    /*#__DISPOSED__FUNCTION__*/ h("number-input"),
    /*#__DISPOSED__FUNCTION__*/ h("text-input"),
    /*#__DISPOSED__FUNCTION__*/ h("checkbox"),
  ]);
}
```

## Why use disposable values and functions?

The main benefit of using disposable values and functions is that they can help you optimize your code size and performance by eliminating unnecessary variables and function calls.

With babel-disposable and other optimizers like babel-plugin-minify-constant-folding, you can generate concise and readable code from a patchwork mess. See the example for more information.
