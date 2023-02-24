# Experiment: Disposable Object

A good friend for code generating

## Example

This clean and fresh output:

```js
// ---------------------------------
// MAIN FUNCTION

function test() {
  printToken("token2");
  printMoreTokens(/*#__DISPOSE__*/ ["token4", "token5", ...sys.tokens]);

  // ---------------------------------

  printRestFields(
    /*#__DISPOSE__*/ {
      age: { type: "number" },
      tel: { type: "string" },
    }
  );

  // ---------------------------------

  effect("string");
  effect("name");
  effect(/*#__DISPOSE__*/ { type: "number" });
  return h("textInput");
}
```

Comes from this Input:

```js
const secretSchema = /* #__DISPOSE__ */ {
  fields: {
    name: { type: "string" },
    age: { type: "number" },
    tel: { type: "string" },
  },
};

const tokens = /* #__DISPOSE__ */ ["token1", "token2", "token3", "token4", "token5", ...sys.tokens];

// ---------------------------------
// MAIN FUNCTION

function test() {
  const [, secondToken, , ...restTokens] = tokens;
  printToken(secondToken);
  printMoreTokens(restTokens);

  // ---------------------------------

  const source1 = /* #__PURE__ */ createRPCClient();
  const source1$schema = secretSchema;

  const { name: $nameField, ...restFields } = source1$schema.fields;
  printRestFields(restFields);

  // ---------------------------------

  effect($nameField.type);
  effect($nameField.title || "name");
  effect(source1$schema.fields.age);

  return $nameField.type === "string" // render component based on schema type
    ? h("textInput")
    : $nameField.type === "number"
    ? h("numberInput")
    : null;
}
```
