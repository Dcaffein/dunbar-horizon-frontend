module.exports = {
  dunbarhorizon: {
    input: "http://localhost:8080/v3/api-docs",
    output: {
      mode: "tags-split",
      target: "src/api/generated",
      schemas: "src/api/model",
      client: "fetch",
      override: {
        mutator: {
          path: "src/api/apiClient.ts",
          name: "customFetch",
        },
      },
    },
  },
};
