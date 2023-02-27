# babel-disposable

## Concept

## Example

<table>
<tr>
<th>Input</th>
<th>Output</th>
</tr>

<tr>
<td>

```js
const secretSchema = /* #__DISPOSE__ */ {
  fields: {
    name: { type: "string" },
    age: { type: "number" },
    tel: { type: "string" },
  },
};

const tokens = /* #__DISPOSE__ */ [
  // disposable array, with external reference inside
  "token1",
  "token2",
  "token3",
  "token4",
  "token5",
  ...sys.tokens,
];

// ---------------------------------
// MAIN FUNCTION

function test() {
  const [, secondToken, , ...restTokens] = tokens;
  printToken2(secondToken);
  printMoreTokens(restTokens);

  // ---------------------------------

  const source1 = /* #__PURE__ */ createRPCClient();
  const source1$schema = secretSchema;

  const fieldId = "name"; // note: change me
  const {
    // destructing
    [fieldId]: $nameField,
    ...restFields
  } = source1$schema.fields;
  printRestFieldIds(Object.keys(restFields));
  printRestFields(restFields);

  // ---------------------------------

  log("[name] type: " + $nameField.type);
  log("[name] title: " + ($nameField.title || "name"));
  log("[age]:", source1$schema.fields.age);

  // ----------------------------------

  const type = $nameField.type;
  if (type === "string") return h("textInput");
  if (type === "number") return h("numberInput");
}
```

</td>
<td valign="top">

```js
// ---------------------------------
// MAIN FUNCTION

function test() {
  printToken2("token2");
  printMoreTokens(/*#__DISPOSE__*/ ["token4", "token5", ...sys.tokens]);

  // ---------------------------------

  printRestFieldIds(["age", "tel"]);
  printRestFields(
    /*#__DISPOSE__*/ {
      age: { type: "number" },
      tel: { type: "string" },
    }
  );

  // ---------------------------------

  log("[name] type: string");
  log("[name] title: name");
  log("[age]:", /*#__DISPOSE__*/ { type: "number" });

  // ----------------------------------

  return h("textInput");
}
```

</td>
</tr>
</table>
