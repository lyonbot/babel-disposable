# babel-disposable

[ [GitHub](https://github.com/lyonbot/babel-disposable) | [Demo](https://lyonbot.github.io/babel-disposable) | [NPM](https://npmjs.org/babel-disposable) ]

## Concept

[👉 Here is a easy version introducing](./INTRODUCE.md)

### Disposable Values

You can add `/*#__DISPOSE__*/` magical comment to any objects and arrays, to mark them as disposable.

It's similar to [Constant Folding](https://en.wikipedia.org/wiki/Constant_folding), but is contagious and more aggressive!

We break up the "disposable" values into pieces, and replace each member expressions (like `obj.foo.bar`) with them. The generated new values will be "disposable" too! You can store it as variables, and continue using it.

Once a variable get disposed, it will disappear from the code.

### Disposable Functions

A function can also be disposable. It behaves like [Inline Functions](https://en.wikipedia.org/wiki/Inline_function) of C/C++, but works on JavaScript / TypeScript.

With "disposable" magic and other optimizers like [babel-plugin-minify-constant-folding](https://babeljs.io/docs/babel-plugin-minify-constant-folding), you can generate concise and readable code, from a patchwork mess.

See example below for more information.

## Example

### (Deeply) Dispose Objects

<table>
<tr>
<th>Input</th>
<td>

```js
const responseSchema = /* #__DISPOSE__ */ {
  fields: {
    name: { type: "string", title: "the movie name" },
    age: { type: "number" },
    tel: { type: "string" },
  },
};

const fieldId = "name";

// const fieldSchema = responseSchema.fields[fieldId];
const { [fieldId]: fieldSchema, ...otherFields } = responseSchema.fields;

print(`Field ${fieldId} is a ${fieldSchema.type}`);
print(fieldSchema);

print("Rest fields: ", Object.keys(otherFields));
```

</td>
</tr>

<tr>
<th>Output</th>
<td valign="top">

```js
const fieldId = "name";
// const fieldSchema = responseSchema.fields[fieldId]

print("Field name is a string");
print(
  /*#__DISPOSE__*/ {
    type: "string",
    title: "the movie name",
  }
);

print("Rest fields: ", /*#__DISPOSE__*/ ["age", "tel"]);
```

Note: you can insert `/*#__DISPOSE__*/` before `"name"`, to make the string literal disposable, and dispose `fieldId` variable.

</td>
</tr>
</table>

### Disposable Functions

<table>
<tr>
<th>Input</th>
<td>

```js
const responseSchema = /* #__DISPOSE__ */ {
  fields: {
    name: { type: "string", title: "the movie name" },
    age: { type: "number" },
    tel: { type: "string" },
  },
};

function main() {
  return h("div", {}, [
    AutoFormItem("name", responseSchema.fields),
    AutoFormItem("age", responseSchema.fields),
    AutoFormItem("tel", responseSchema.fields),
  ]);
}

/* #__DISPOSE__ */
function AutoInputBox(schema) {
  const { type } = schema;
  if (type === "string") return h("text-input");
  if (type === "number") return h("number-input");
}

/* #__DISPOSE__ */
function AutoFormItem(id, allFields) {
  const field = allFields[id];
  return h("form-item", { title: field.title || id }, [AutoInputBox(field)]);
}
```

</td>
</tr>

<tr>
<th>Output</th>
<td valign="top">

```js
function main() {
  return h("div", {}, [
    h("form-item", { title: "the movie name" }, [h("text-input")]),
    h("form-item", { title: "age" }, [h("number-input")]),
    h("form-item", { title: "tel" }, [h("text-input")]),
  ]);
}

/* ... */
```

Note: the "disposable" function declarations is omitted in this example output

</td>
</tr>
</table>
